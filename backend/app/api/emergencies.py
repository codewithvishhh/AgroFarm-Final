from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import Emergency, EmergencyStatus
from app.schemas.schemas import (
    AssistanceRequest,
    EmergencyCreate,
    EmergencyDetail,
    EmergencyOut,
    NearbyFacility,
)
from app.services import emergency_service

router = APIRouter(prefix="/api/emergencies", tags=["emergencies"])


def _get(db: Session, emergency_id: str) -> Emergency:
    emergency = (
        db.query(Emergency).filter(Emergency.emergency_id == emergency_id).first()
    )
    if emergency is None:
        raise HTTPException(status_code=404, detail="Emergency not found")
    return emergency


@router.get(
    "",
    response_model=list[EmergencyOut],
    summary="List emergencies",
)
def list_emergencies(
    db: Session = Depends(get_db),
    status: EmergencyStatus | None = None,
    active_only: bool = False,
    limit: int = Query(100, le=500),
):
    query = db.query(Emergency)
    if status:
        query = query.filter(Emergency.status == status)
    if active_only:
        query = query.filter(
            Emergency.status.notin_(
                [EmergencyStatus.RESOLVED, EmergencyStatus.CANCELLED]
            )
        )
    return query.order_by(Emergency.created_at.desc()).limit(limit).all()


@router.post(
    "",
    response_model=EmergencyDetail,
    status_code=201,
    summary="Raise an emergency",
    description=(
        "Captures the truck position, finds the nearest warehouse, transport hub "
        "and retailer, and broadcasts EMERGENCY_CREATED to every dashboard."
    ),
)
async def create_emergency(payload: EmergencyCreate, db: Session = Depends(get_db)):
    try:
        emergency = await emergency_service.create_emergency(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return EmergencyDetail(
        emergency=EmergencyOut.model_validate(emergency),
        nearby=emergency_service.nearby_facilities(
            db, emergency.latitude, emergency.longitude
        ),
    )


@router.get(
    "/{emergency_id}",
    response_model=EmergencyDetail,
    summary="One emergency with nearby responders",
)
def get_emergency(emergency_id: str, db: Session = Depends(get_db)):
    emergency = _get(db, emergency_id)
    return EmergencyDetail(
        emergency=EmergencyOut.model_validate(emergency),
        nearby=emergency_service.nearby_facilities(
            db, emergency.latitude, emergency.longitude
        ),
    )


@router.post(
    "/{emergency_id}/assistance",
    response_model=EmergencyOut,
    summary="Send a simulated assistance request",
)
async def request_assistance(
    emergency_id: str, payload: AssistanceRequest, db: Session = Depends(get_db)
):
    emergency = _get(db, emergency_id)
    return await emergency_service.request_assistance(db, emergency, payload.responder)


@router.patch(
    "/{emergency_id}/status",
    response_model=EmergencyOut,
    summary="Update the emergency status",
)
async def update_status(
    emergency_id: str, status: EmergencyStatus, db: Session = Depends(get_db)
):
    emergency = _get(db, emergency_id)
    return await emergency_service.update_status(db, emergency, status)


@router.get(
    "/nearby/facilities",
    response_model=list[NearbyFacility],
    summary="Responders around a point",
)
def nearby(latitude: float, longitude: float, db: Session = Depends(get_db)):
    return emergency_service.nearby_facilities(db, latitude, longitude)
