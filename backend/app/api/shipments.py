from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import (
    CollectionStatus,
    Shipment,
    ShipmentStage,
    ShipmentStatus,
    Telemetry,
)
from app.schemas.schemas import (
    AssignVehicleRequest,
    CollectionUpdate,
    ShipmentCreate,
    ShipmentOut,
    ShipmentUpdate,
    TelemetryOut,
)
from app.services import shipment_service
from app.services.route_optimization_service import plan_route
from app.services.spoilage_prediction_service import risk_score

router = APIRouter(prefix="/api/shipments", tags=["shipments"])


def _get(db: Session, shipment_id: str) -> Shipment:
    shipment = db.query(Shipment).filter(Shipment.shipment_id == shipment_id).first()
    if shipment is None:
        raise HTTPException(status_code=404, detail="Shipment not found")
    return shipment


@router.get(
    "",
    response_model=list[ShipmentOut],
    summary="List shipments",
    description="Filter by status, stage, collection status, produce, or free text.",
)
def list_shipments(
    db: Session = Depends(get_db),
    status: ShipmentStatus | None = None,
    stage: ShipmentStage | None = None,
    collection_status: CollectionStatus | None = None,
    produce_type: str | None = None,
    created_by: str | None = None,
    search: str | None = None,
    limit: int = Query(200, le=500),
):
    query = db.query(Shipment)
    if status:
        query = query.filter(Shipment.status == status)
    if stage:
        query = query.filter(Shipment.stage == stage)
    if collection_status:
        query = query.filter(Shipment.collection_status == collection_status)
    if produce_type:
        query = query.filter(Shipment.produce_type == produce_type)
    if created_by:
        query = query.filter(Shipment.created_by == created_by)
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            Shipment.shipment_id.ilike(pattern)
            | Shipment.source.ilike(pattern)
            | Shipment.destination.ilike(pattern)
            | Shipment.produce_type.ilike(pattern)
        )
    return query.order_by(Shipment.created_at.desc()).limit(limit).all()


@router.post(
    "",
    response_model=ShipmentOut,
    status_code=201,
    summary="Create a produce shipment request",
)
async def create_shipment(payload: ShipmentCreate, db: Session = Depends(get_db)):
    try:
        return await shipment_service.create_shipment(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/{shipment_id}", response_model=ShipmentOut, summary="One shipment")
def get_shipment(shipment_id: str, db: Session = Depends(get_db)):
    return _get(db, shipment_id)


@router.patch(
    "/{shipment_id}", response_model=ShipmentOut, summary="Update a shipment"
)
async def update_shipment(
    shipment_id: str, payload: ShipmentUpdate, db: Session = Depends(get_db)
):
    shipment = _get(db, shipment_id)
    try:
        if payload.vehicle_id:
            await shipment_service.assign_vehicle(db, shipment, payload.vehicle_id)
        if payload.warehouse_id is not None:
            shipment.warehouse_id = payload.warehouse_id
        if payload.stage is not None:
            shipment.stage = payload.stage
        if payload.delivery_deadline is not None:
            shipment.delivery_deadline = payload.delivery_deadline
        if payload.temperature is not None:
            shipment.temperature = payload.temperature
        if payload.humidity is not None:
            shipment.humidity = payload.humidity
        db.commit()
        db.refresh(shipment)
        if payload.collection_status is not None:
            await shipment_service.advance_collection(
                db, shipment, payload.collection_status
            )
        if payload.status is not None:
            await shipment_service.set_status(db, shipment, payload.status)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return shipment


@router.post(
    "/{shipment_id}/assign-vehicle",
    response_model=ShipmentOut,
    summary="Assign a vehicle",
)
async def assign_vehicle(
    shipment_id: str, payload: AssignVehicleRequest, db: Session = Depends(get_db)
):
    shipment = _get(db, shipment_id)
    try:
        return await shipment_service.assign_vehicle(db, shipment, payload.vehicle_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post(
    "/{shipment_id}/dispatch",
    response_model=ShipmentOut,
    summary="Start the journey and the live simulation",
)
async def dispatch(shipment_id: str, db: Session = Depends(get_db)):
    shipment = _get(db, shipment_id)
    try:
        return await shipment_service.dispatch(db, shipment)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post(
    "/{shipment_id}/collection",
    response_model=ShipmentOut,
    summary="Advance the collection stage",
)
async def update_collection(
    shipment_id: str, payload: CollectionUpdate, db: Session = Depends(get_db)
):
    shipment = _get(db, shipment_id)
    try:
        if payload.vehicle_id:
            await shipment_service.assign_vehicle(db, shipment, payload.vehicle_id)
        return await shipment_service.advance_collection(
            db,
            shipment,
            payload.collection_status,
            payload.collected_quantity,
            payload.warehouse_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get(
    "/{shipment_id}/telemetry",
    response_model=list[TelemetryOut],
    summary="Sensor history for one shipment",
)
def shipment_telemetry(
    shipment_id: str, db: Session = Depends(get_db), limit: int = Query(120, le=500)
):
    _get(db, shipment_id)
    rows = (
        db.query(Telemetry)
        .filter(Telemetry.shipment_id == shipment_id)
        .order_by(Telemetry.timestamp.desc())
        .limit(limit)
        .all()
    )
    return list(reversed(rows))


@router.get("/{shipment_id}/route", summary="Route line for the map")
def shipment_route(shipment_id: str, db: Session = Depends(get_db)):
    shipment = _get(db, shipment_id)
    return {
        "shipment_id": shipment.shipment_id,
        **plan_route(
            shipment.source_latitude,
            shipment.source_longitude,
            shipment.destination_latitude,
            shipment.destination_longitude,
        ),
    }


@router.get("/{shipment_id}/spoilage-risk", summary="Rule-based spoilage risk")
def spoilage_risk(shipment_id: str, db: Session = Depends(get_db)):
    shipment = _get(db, shipment_id)
    return {
        "shipment_id": shipment.shipment_id,
        **risk_score(shipment.produce_type, shipment.temperature),
    }


@router.delete("/{shipment_id}", status_code=204, summary="Delete a shipment")
def delete_shipment(shipment_id: str, db: Session = Depends(get_db)):
    shipment = _get(db, shipment_id)
    db.delete(shipment)
    db.commit()
