"""Single in-process WebSocket hub.

Every connected client receives every event. Swap the broadcast for Redis
pub/sub when AgroFarm runs on more than one worker.
"""

import asyncio
import json
from datetime import datetime, timezone
from typing import Any

from fastapi import WebSocket


def _encode(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections.add(websocket)

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            self._connections.discard(websocket)

    @property
    def client_count(self) -> int:
        return len(self._connections)

    async def broadcast(self, event: str, payload: dict) -> None:
        """Send one typed event to every client. Dead sockets are dropped."""
        message = json.dumps(
            {
                "event": event,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "data": payload,
            },
            default=_encode,
        )
        async with self._lock:
            targets = list(self._connections)

        dead: list[WebSocket] = []
        for connection in targets:
            try:
                await connection.send_text(message)
            except Exception:
                dead.append(connection)

        if dead:
            async with self._lock:
                for connection in dead:
                    self._connections.discard(connection)


manager = ConnectionManager()
