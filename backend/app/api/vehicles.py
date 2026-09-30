from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import Shipment, ShipmentStatus, Vehicle, VehicleStatus
from app.schemas.schemas import VehicleCreate, VehicleOut
from app.services.shipment_service import generate_id

router = APIRouter(prefix="/api/vehicles", tags=["vehicles"])


@router.get("", response_model=list[VehicleOut], summary="List the fleet")
def list_vehicles(db: Session = Depends(get_db), status: VehicleStatus | None = None):
    query = db.query(Vehicle)
    if status:
        query = query.filter(Vehicle.status == status)
    return query.order_by(Vehicle.vehicle_number).all()


@router.post("", response_model=VehicleOut, status_code=201, summary="Add a vehicle")
def create_vehicle(payload: VehicleCreate, db: Session = Depends(get_db)):
    vehicle = Vehicle(vehicle_id=generate_id("VEH"), **payload.model_dump())
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    return vehicle


@router.get("/fleet-status", summary="Fleet with the shipment each truck carries")
def fleet_status(db: Session = Depends(get_db)):
    active = {
        shipment.vehicle_id: shipment
        for shipment in db.query(Shipment)
        .filter(
            Shipment.status.in_(
                [
                    ShipmentStatus.ASSIGNED,
                    ShipmentStatus.IN_TRANSIT,
                    ShipmentStatus.DELAYED,
                ]
            )
        )
        .all()
        if shipment.vehicle_id
    }

    rows = []
    for vehicle in db.query(Vehicle).order_by(Vehicle.vehicle_number).all():
        shipment = active.get(vehicle.vehicle_id)
        rows.append(
            {
                "vehicle_id": vehicle.vehicle_id,
                "vehicle_number": vehicle.vehicle_number,
                "driver_name": vehicle.driver_name,
                "driver_phone": vehicle.driver_phone,
                "vehicle_type": vehicle.vehicle_type,
                "capacity": vehicle.capacity,
                "status": vehicle.status.value,
                "current_latitude": vehicle.current_latitude,
                "current_longitude": vehicle.current_longitude,
                "shipment_id": shipment.shipment_id if shipment else None,
                "produce_type": shipment.produce_type if shipment else None,
                "destination": shipment.destination if shipment else None,
                "progress_percentage": (
                    shipment.progress_percentage if shipment else None
                ),
                "speed_kmph": shipment.speed_kmph if shipment else 0.0,
                "eta_minutes": shipment.eta_minutes if shipment else None,
            }
        )
    return rows


@router.get("/{vehicle_id}", response_model=VehicleOut, summary="One vehicle")
def get_vehicle(vehicle_id: str, db: Session = Depends(get_db)):
    vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == vehicle_id).first()
    if vehicle is None:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle


@router.patch(
    "/{vehicle_id}/status", response_model=VehicleOut, summary="Set vehicle status"
)
def set_vehicle_status(
    vehicle_id: str, status: VehicleStatus, db: Session = Depends(get_db)
):
    vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == vehicle_id).first()
    if vehicle is None:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    vehicle.status = status
    db.commit()
    db.refresh(vehicle)
    return vehicle
