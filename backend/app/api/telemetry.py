from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import Telemetry
from app.schemas.schemas import TelemetryOut
from app.simulator import vehicle_simulator

router = APIRouter(prefix="/api/telemetry", tags=["telemetry"])


@router.get("", response_model=list[TelemetryOut], summary="Latest sensor readings")
def latest(
    db: Session = Depends(get_db),
    shipment_id: str | None = None,
    limit: int = Query(100, le=500),
):
    query = db.query(Telemetry)
    if shipment_id:
        query = query.filter(Telemetry.shipment_id == shipment_id)
    return query.order_by(Telemetry.timestamp.desc()).limit(limit).all()


@router.get("/simulator", summary="Simulator state")
def simulator_state():
    return {"running": vehicle_simulator.is_running()}


@router.post("/simulator/start", summary="Start the movement simulator")
def start_simulator():
    return {"running": True, "changed": vehicle_simulator.start()}


@router.post("/simulator/stop", summary="Stop the movement simulator")
async def stop_simulator():
    changed = await vehicle_simulator.stop()
    return {"running": False, "changed": changed}
