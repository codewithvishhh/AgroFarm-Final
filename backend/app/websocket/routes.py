from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.websocket.manager import manager

router = APIRouter()


@router.websocket("/ws/live")
async def live_feed(websocket: WebSocket) -> None:
    """Live channel for shipment location, telemetry, alerts, notifications."""
    await manager.connect(websocket)
    try:
        while True:
            # Client messages are only used as a keep-alive ping for the MVP.
            await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception:
        await manager.disconnect(websocket)
