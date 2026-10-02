import asyncio
import json
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
    "You are AgroFarm Assistant, a helpful AI advisor for agricultural operations. "
    "Answer the user's actual question clearly and naturally. Help with crops, "
    "produce handling, storage, shipments, inventory, forecasting, fleet activity, "
    "alerts, and warehouses. Give practical steps when useful and keep answers "
    "concise. Do not invent live dashboard figures or claim to have taken actions. "
    "If asked for live AgroFarm data, say you cannot see the live dashboard and "
    "direct the user to the relevant screen. For crop or food-safety advice, avoid "
    "unsupported certainty and recommend local agricultural guidance when needed."
)


def _request_gemini(body: dict) -> dict:
    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="AI assistant is not configured. Set GEMINI_API_KEY in the backend environment.",
        )
    request = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent",
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": settings.GEMINI_API_KEY,
        },
        method="POST",
    )
    with urllib.request.urlopen(
        request, timeout=settings.GEMINI_TIMEOUT_SECONDS
    ) as response:
        return json.loads(response.read().decode("utf-8"))


@router.post("", response_model=ChatResponse, summary="Ask the AgroFarm assistant")
async def chat(payload: ChatRequest):
    if not any(item.role == "user" for item in payload.messages):
        raise HTTPException(status_code=422, detail="Add a user message to the conversation.")

    body = {
        "system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "contents": [
            {
                "role": "model" if item.role == "assistant" else "user",
                "parts": [{"text": item.content}],
            }
            for item in payload.messages
        ],
        "generationConfig": {"temperature": 0.4, "maxOutputTokens": 512},
    }

    try:
        result = await asyncio.to_thread(_request_gemini, body)
    except HTTPException:
        raise
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise HTTPException(
            status_code=502, detail=f"AI provider request failed: {detail[:300]}"
        ) from error
    except (urllib.error.URLError, TimeoutError) as error:
        raise HTTPException(
            status_code=502, detail="The AI provider could not be reached."
        ) from error
    except (json.JSONDecodeError, KeyError, TypeError) as error:
        raise HTTPException(
            status_code=502, detail="The AI provider returned an invalid response."
        ) from error

    try:
        message = result["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError, TypeError) as error:
        raise HTTPException(
            status_code=502, detail="The AI provider returned no message."
        ) from error
    if not isinstance(message, str) or not message.strip():
        raise HTTPException(status_code=502, detail="The AI provider returned an empty reply.")
    return ChatResponse(message=message.strip())