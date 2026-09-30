"""AgroFarm API entrypoint.

AgroFarm - Smart Agricultural Supply Chain Platform.
"""

import contextlib

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import (
    alerts,
    analytics,
    auth,
    chat,
    emergencies,
    forecast,
    inventory,
    notifications,
    shipments,
    telemetry,
    vehicles,
    warehouses,
)
from app.config import settings
from app.database.session import SessionLocal, init_db
from app.simulator import vehicle_simulator
from app.websocket import events
from app.websocket import routes as websocket_routes
from app.websocket.manager import manager


@contextlib.asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    if settings.SEED_DEMO_DATA:
        from app.database.seed import seed

        db = SessionLocal()
        try:
            seed(db)
        finally:
            db.close()
    if settings.SIMULATOR_ENABLED:
        vehicle_simulator.start()
    yield
    await vehicle_simulator.stop()


app = FastAPI(
    title="AgroFarm API",
    description=(
        "AgroFarm - Smart Agricultural Supply Chain Platform. Real-time tracking "
        "and logistics for farm produce: farmer requests, collection, warehouse "
        "inventory, transport, retail demand, emergencies, and live telemetry."
    ),
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(shipments.router)
app.include_router(vehicles.router)
app.include_router(warehouses.router)
app.include_router(inventory.router)
app.include_router(alerts.router)
app.include_router(emergencies.router)
app.include_router(forecast.router)
app.include_router(telemetry.router)
app.include_router(notifications.router)
app.include_router(analytics.router)
app.include_router(chat.router)
app.include_router(websocket_routes.router)


@app.get("/api/health", tags=["system"], summary="Service health")
def health():
    return {
        "status": "ok",
        "service": "agrofarm",
        "app_name": settings.APP_NAME,
        "tagline": settings.APP_TAGLINE,
        "simulator_running": vehicle_simulator.is_running(),
        "websocket_clients": manager.client_count,
        "events": events.ALL_EVENTS,
    }
