"""Shipment lifecycle rules. The API layer stays thin on top of this."""

import random
import string
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.models import (
    CollectionStatus,
    NotificationType,
    Role,
    Shipment,
    ShipmentStage,
    ShipmentStatus,
    Telemetry,
    TransactionType,
    Vehicle,
    VehicleStatus,
)
from app.notifications.service import push_notification
from app.schemas.schemas import ShipmentCreate, ShipmentOut
from app.services import inventory_service
from app.services.alert_service import profile_for
from app.services.eta_prediction_service import estimate_minutes
from app.services.geo import bearing_degrees, haversine_km
from app.websocket import events
from app.websocket.manager import manager

# Indicative farm-gate value per kilogram, rupees. Demo figures only.
PRODUCE_VALUE_PER_KG = {
    "Tomato": 22.0,
    "Potato": 18.0,
    "Onion": 20.0,
    "Wheat": 24.0,
    "Rice": 38.0,
    "Apple": 95.0,
    "Banana": 35.0,
    "Grapes": 70.0,
    "Mango": 80.0,
    "Leafy Greens": 30.0,
    "Milk": 52.0,
}


def generate_id(prefix: str) -> str:
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"{prefix}-{suffix}"


def starting_climate(produce_type: str) -> tuple[float, float]:
    """Pick a sane starting temperature and humidity for the produce."""
    min_c, max_c, (min_h, max_h) = profile_for(produce_type)
    return (
        round(random.uniform(min_c, max_c), 1),
        round(random.uniform(min_h, max_h), 1),
    )


def estimated_value(produce_type: str, quantity: float, unit: str) -> float:
    per_kg = PRODUCE_VALUE_PER_KG.get(produce_type, 25.0)
    multiplier = 100.0 if unit == "quintal" else 1.0
    return round(quantity * multiplier * per_kg, 2)


def route_distance_km(shipment: Shipment) -> float:
    return haversine_km(
        shipment.source_latitude,
        shipment.source_longitude,
        shipment.destination_latitude,
        shipment.destination_longitude,
    )


async def broadcast_shipment(shipment: Shipment, event: str) -> None:
    await manager.broadcast(event, ShipmentOut.model_validate(shipment).model_dump())


async def create_shipment(db: Session, payload: ShipmentCreate) -> Shipment:
    temperature, humidity = starting_climate(payload.produce_type)

    shipment = Shipment(
        shipment_id=generate_id("SHP"),
        produce_type=payload.produce_type,
        quantity=payload.quantity,
        quantity_unit=payload.quantity_unit,
        farmer_name=payload.farmer_name or payload.created_by,
        created_by=payload.created_by,
        created_by_role=payload.created_by_role,
        source=payload.source,
        destination=payload.destination,
        source_latitude=payload.source_latitude,
        source_longitude=payload.source_longitude,
        destination_latitude=payload.destination_latitude,
        destination_longitude=payload.destination_longitude,
        warehouse_id=payload.warehouse_id,
        retailer_id=payload.retailer_id,
        delivery_deadline=payload.delivery_deadline,
        current_latitude=payload.source_latitude,
        current_longitude=payload.source_longitude,
        bearing=bearing_degrees(
            payload.source_latitude,
            payload.source_longitude,
            payload.destination_latitude,
            payload.destination_longitude,
        ),
        temperature=temperature,
        humidity=humidity,
        status=ShipmentStatus.PENDING,
        stage=ShipmentStage.FARM,
        collection_status=CollectionStatus.REQUESTED,
        estimated_value=estimated_value(
            payload.produce_type, payload.quantity, payload.quantity_unit
        ),
    )
    db.add(shipment)
    db.commit()
    db.refresh(shipment)

    if payload.vehicle_id:
        await assign_vehicle(db, shipment, payload.vehicle_id)

    await broadcast_shipment(shipment, events.SHIPMENT_CREATED)
    await push_notification(
        db,
        title="New produce request",
        message=f"{shipment.shipment_id}: {shipment.quantity:g} "
        f"{shipment.quantity_unit} of {shipment.produce_type} from "
        f"{shipment.source} to {shipment.destination}.",
        type_=NotificationType.SHIPMENT,
        reference_id=shipment.shipment_id,
        audience=Role.COLLECTION,
    )
    return shipment


async def assign_vehicle(db: Session, shipment: Shipment, vehicle_id: str) -> Shipment:
    vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == vehicle_id).first()
    if vehicle is None:
        raise ValueError(f"Vehicle {vehicle_id} not found")
    if vehicle.status in (VehicleStatus.MAINTENANCE, VehicleStatus.EMERGENCY):
        raise ValueError(f"Vehicle {vehicle_id} is {vehicle.status.value}")
    if vehicle.capacity < shipment.quantity and shipment.quantity_unit == "kg":
        raise ValueError(
            f"Load of {shipment.quantity:g} kg is over the "
            f"{vehicle.capacity:g} kg capacity of {vehicle.vehicle_number}"
        )

    shipment.vehicle_id = vehicle.vehicle_id
    shipment.status = ShipmentStatus.ASSIGNED
    if shipment.collection_status == CollectionStatus.ACCEPTED:
        shipment.collection_status = CollectionStatus.PICKUP_ASSIGNED
    vehicle.status = VehicleStatus.ASSIGNED
    vehicle.current_latitude = shipment.source_latitude
    vehicle.current_longitude = shipment.source_longitude
    db.commit()
    db.refresh(shipment)

    await broadcast_shipment(shipment, events.SHIPMENT_UPDATED)
    await push_notification(
        db,
        title="Vehicle assigned",
        message=f"{vehicle.vehicle_number} ({vehicle.driver_name}) now carries "
        f"{shipment.shipment_id}.",
        type_=NotificationType.VEHICLE,
        reference_id=shipment.shipment_id,
        audience=Role.TRANSPORT,
    )
    return shipment


async def dispatch(db: Session, shipment: Shipment) -> Shipment:
    """Move a shipment to IN_TRANSIT and start the simulated journey."""
    if shipment.vehicle_id is None:
        raise ValueError("Assign a vehicle before dispatch")

    shipment.status = ShipmentStatus.IN_TRANSIT
    shipment.stage = ShipmentStage.TRANSPORT
    shipment.departure_time = datetime.now(timezone.utc)
    shipment.progress_percentage = 0.0
    shipment.current_latitude = shipment.source_latitude
    shipment.current_longitude = shipment.source_longitude
    shipment.speed_kmph = round(random.uniform(38, 52), 1)
    shipment.bearing = bearing_degrees(
        shipment.source_latitude,
        shipment.source_longitude,
        shipment.destination_latitude,
        shipment.destination_longitude,
    )
    shipment.eta_minutes = estimate_minutes(
        shipment.source_latitude,
        shipment.source_longitude,
        shipment.destination_latitude,
        shipment.destination_longitude,
        shipment.speed_kmph,
    )

    if shipment.vehicle:
        shipment.vehicle.status = VehicleStatus.IN_TRANSIT
    db.commit()
    db.refresh(shipment)

    await broadcast_shipment(shipment, events.SHIPMENT_UPDATED)
    await push_notification(
        db,
        title="Shipment dispatched",
        message=f"{shipment.shipment_id} left {shipment.source} for "
        f"{shipment.destination}.",
        type_=NotificationType.SHIPMENT,
        reference_id=shipment.shipment_id,
    )
    return shipment


async def deliver(db: Session, shipment: Shipment) -> Shipment:
    """Close a shipment and move the produce into warehouse stock."""
    shipment.status = ShipmentStatus.DELIVERED
    shipment.stage = ShipmentStage.RETAILER
    shipment.progress_percentage = 100.0
    shipment.speed_kmph = 0.0
    shipment.eta_minutes = 0.0
    shipment.delivered_at = datetime.now(timezone.utc)
    shipment.current_latitude = shipment.destination_latitude
    shipment.current_longitude = shipment.destination_longitude

    if shipment.vehicle:
        shipment.vehicle.status = VehicleStatus.AVAILABLE
        shipment.vehicle.current_latitude = shipment.destination_latitude
        shipment.vehicle.current_longitude = shipment.destination_longitude

    db.commit()

    if shipment.warehouse_id:
        inventory_service.record_movement(
            db,
            warehouse_id=shipment.warehouse_id,
            produce_type=shipment.produce_type,
            quantity=shipment.quantity,
            transaction_type=TransactionType.RECEIVED,
            unit=shipment.quantity_unit,
            reference_shipment=shipment.shipment_id,
            note=f"Delivered from {shipment.source}",
        )
        await manager.broadcast(
            events.INVENTORY_UPDATED,
            {
                "warehouse_id": shipment.warehouse_id,
                "produce_type": shipment.produce_type,
                "quantity": shipment.quantity,
                "shipment_id": shipment.shipment_id,
            },
        )

    db.refresh(shipment)
    await broadcast_shipment(shipment, events.SHIPMENT_UPDATED)
    await push_notification(
        db,
        title="Shipment delivered",
        message=f"{shipment.shipment_id} reached {shipment.destination}. "
        "Inventory updated.",
        type_=NotificationType.SHIPMENT,
        reference_id=shipment.shipment_id,
    )
    return shipment


async def set_status(
    db: Session, shipment: Shipment, status: ShipmentStatus
) -> Shipment:
    """Apply a manual status change and release the vehicle when finished."""
    if status == ShipmentStatus.IN_TRANSIT:
        return await dispatch(db, shipment)
    if status == ShipmentStatus.DELIVERED:
        return await deliver(db, shipment)

    shipment.status = status
    if status == ShipmentStatus.CANCELLED and shipment.vehicle:
        shipment.vehicle.status = VehicleStatus.AVAILABLE
        shipment.speed_kmph = 0.0

    db.commit()
    db.refresh(shipment)

    await broadcast_shipment(shipment, events.SHIPMENT_UPDATED)
    await push_notification(
        db,
        title=f"Shipment {status.value.lower().replace('_', ' ')}",
        message=f"{shipment.shipment_id} is now {status.value}.",
        type_=NotificationType.SHIPMENT,
        reference_id=shipment.shipment_id,
    )
    return shipment


async def advance_collection(
    db: Session,
    shipment: Shipment,
    collection_status: CollectionStatus,
    collected_quantity: float | None = None,
    warehouse_id: str | None = None,
) -> Shipment:
    """Move a farmer request through the collection stages."""
    shipment.collection_status = collection_status
    if collected_quantity is not None and collected_quantity > 0:
        shipment.quantity = collected_quantity
        shipment.estimated_value = estimated_value(
            shipment.produce_type, collected_quantity, shipment.quantity_unit
        )
    if warehouse_id:
        shipment.warehouse_id = warehouse_id

    if collection_status in (
        CollectionStatus.ACCEPTED,
        CollectionStatus.PICKUP_ASSIGNED,
    ):
        shipment.stage = ShipmentStage.COLLECTION
    if collection_status == CollectionStatus.COLLECTED:
        shipment.stage = ShipmentStage.COLLECTION
    if collection_status == CollectionStatus.SENT_TO_WAREHOUSE:
        shipment.stage = ShipmentStage.WAREHOUSE

    db.commit()
    db.refresh(shipment)

    await broadcast_shipment(shipment, events.SHIPMENT_UPDATED)
    await push_notification(
        db,
        title="Collection update",
        message=f"{shipment.shipment_id} is now "
        f"{collection_status.value.replace('_', ' ').lower()}.",
        type_=NotificationType.SHIPMENT,
        reference_id=shipment.shipment_id,
        audience=Role.FARMER,
    )
    return shipment


def record_telemetry(db: Session, shipment: Shipment) -> Telemetry:
    """Append one telemetry row from the shipment's current reading."""
    reading = Telemetry(
        shipment_id=shipment.shipment_id,
        latitude=shipment.current_latitude or shipment.source_latitude,
        longitude=shipment.current_longitude or shipment.source_longitude,
        temperature=shipment.temperature or 0.0,
        humidity=shipment.humidity or 0.0,
        speed_kmph=shipment.speed_kmph,
    )
    db.add(reading)
    db.commit()
    db.refresh(reading)
    return reading
