import asyncio
import json
import os
import urllib.error
import urllib.request
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.config import settings

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=20)


class ChatResponse(BaseModel):
    message: str


SYSTEM_PROMPT = (
    "You are AgroFarm Assistant, a knowledgeable agricultural supply-chain advisor. "
    "Help users with shipments, inventory, forecasting, fleet activity, alerts, "
    "warehouses, crop handling, and reducing produce spoilage. Answer the exact crop "
    "or task the user mentions; do not give generic advice when a specific answer is "
    "possible. For produce questions, cover temperature, humidity or ventilation, "
    "handling, storage duration, and transport checks when relevant. Give a short "
    "direct recommendation followed by 3-5 numbered actionable steps and a brief "
    "warning about common mistakes. Use plain text only: do not use Markdown, "
    "asterisks, or heading symbols. When the user asks for more detail, expand the "
    "previous answer directly; never output planning labels, templates, or fragments. "
    "Do not invent live figures. If the user asks for "
    "data you cannot access, clearly say so and direct them to the relevant AgroFarm "
    "screen. Keep answers under 220 words."
)


def _request_gemini(api_key: str, model: str, body: dict) -> dict:
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        f"?key={api_key}"
    )
    request = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=12) as response:
        return json.loads(response.read().decode("utf-8"))


@router.post("", response_model=ChatResponse, summary="Ask the AgroFarm assistant")
async def chat(payload: ChatRequest):
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="Gemini is not configured. Add GEMINI_API_KEY to backend/.env.",
        )

    contents = [
        {
            "role": "model" if item.role == "assistant" else "user",
            "parts": [{"text": item.content}],
        }
        for item in payload.messages
    ]
    body = {
        "system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "contents": contents,
        "generationConfig": {"temperature": 0.4, "maxOutputTokens": 512},
    }

    try:
        result = await asyncio.to_thread(
            _request_gemini, api_key, settings.GEMINI_MODEL, body
        )
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise HTTPException(
            status_code=502, detail=f"Gemini request failed: {detail[:300]}"
        ) from error
    except (urllib.error.URLError, TimeoutError) as error:
        raise HTTPException(status_code=502, detail="Gemini could not be reached.") from error

    try:
        message = result["candidates"][0]["content"]["parts"][0]["text"].strip()
    except (KeyError, IndexError, TypeError) as error:
        raise HTTPException(status_code=502, detail="Gemini returned no message.") from error
    return ChatResponse(message=message)