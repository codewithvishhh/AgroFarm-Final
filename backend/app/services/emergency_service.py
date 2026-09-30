"""Emergency handling and nearby responder lookup."""

import random
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.models import (
    AlertSeverity,
    CollectionPoint,
    Emergency,
    EmergencyStatus,
    NotificationType,
    Retailer,
    Role,
    Shipment,
    Vehicle,
    VehicleStatus,
    Warehouse,
)
from app.notifications.service import push_notification
from app.schemas.schemas import EmergencyCreate, EmergencyOut, NearbyFacility
from app.services.alert_service import raise_alert
from app.services.geo import haversine_km
from app.websocket import events
from app.websocket.manager import manager

# Assumed response speed on rural roads, km per hour.
RESPONSE_SPEED_KMPH = 24.0


def _eta_minutes(distance_km: float) -> int:
    return max(1, round(distance_km / RESPONSE_SPEED_KMPH * 60))


def nearby_facilities(
    db: Session, latitude: float, longitude: float, per_kind: int = 2
) -> list[NearbyFacility]:
    """Closest warehouse, transport hub, and retailer around a point."""
    found: list[NearbyFacility] = []

    for warehouse in db.query(Warehouse).all():
        distance = haversine_km(
            latitude, longitude, warehouse.latitude, warehouse.longitude
        )
        found.append(
            NearbyFacility(
                kind="WAREHOUSE",
                reference_id=warehouse.warehouse_id,
                name=warehouse.name,
                location=warehouse.location,
                distance_km=round(distance, 1),
                eta_minutes=_eta_minutes(distance),
                contact_phone=warehouse.contact_phone,
            )
        )

    for point in db.query(CollectionPoint).all():
        distance = haversine_km(latitude, longitude, point.latitude, point.longitude)
        found.append(
            NearbyFacility(
                kind="TRANSPORT",
                reference_id=point.collection_id,
                name=point.name,
                location=point.location,
                distance_km=round(distance, 1),
                eta_minutes=_eta_minutes(distance),
                contact_phone=point.contact_phone,
            )
        )

    for retailer in db.query(Retailer).all():
        distance = haversine_km(
            latitude, longitude, retailer.latitude, retailer.longitude
        )
        found.append(
            NearbyFacility(
                kind="RETAILER",
                reference_id=retailer.retailer_id,
                name=retailer.name,
                location=retailer.location,
                distance_km=round(distance, 1),
                eta_minutes=_eta_minutes(distance),
                contact_phone=retailer.contact_phone,
            )
        )

    ranked: list[NearbyFacility] = []
    for kind in ("WAREHOUSE", "TRANSPORT", "RETAILER"):
        of_kind = sorted(
            (item for item in found if item.kind == kind),
            key=lambda item: item.distance_km,
        )
        ranked.extend(of_kind[:per_kind])
    return sorted(ranked, key=lambda item: item.distance_km)


def _nearest_label(facilities: list[NearbyFacility], kind: str) -> str | None:
    for facility in facilities:
        if facility.kind == kind:
            return f"{facility.name} ({facility.distance_km} km)"
    return None


async def create_emergency(db: Session, payload: EmergencyCreate) -> Emergency:
    vehicle = (
        db.query(Vehicle).filter(Vehicle.vehicle_id == payload.vehicle_id).first()
    )
    if vehicle is None:
        raise ValueError(f"Vehicle {payload.vehicle_id} not found")

    shipment = None
    if payload.shipment_id:
        shipment = (
            db.query(Shipment)
            .filter(Shipment.shipment_id == payload.shipment_id)
            .first()
        )

    latitude = (
        payload.latitude
        if payload.latitude is not None
        else (
            (shipment.current_latitude if shipment else None)
            or vehicle.current_latitude
            or 18.5204
        )
    )
    longitude = (
        payload.longitude
        if payload.longitude is not None
        else (
            (shipment.current_longitude if shipment else None)
            or vehicle.current_longitude
            or 73.8567
        )
    )

    facilities = nearby_facilities(db, latitude, longitude)

    emergency = Emergency(
        emergency_id=f"EMG-{random.randint(100000, 999999)}",
        shipment_id=payload.shipment_id,
        vehicle_id=payload.vehicle_id,
        emergency_type=payload.emergency_type,
        description=payload.description,
        latitude=latitude,
        longitude=longitude,
        severity=payload.severity,
        status=EmergencyStatus.ACTIVE,
        nearest_warehouse=_nearest_label(facilities, "WAREHOUSE"),
        nearest_transport=_nearest_label(facilities, "TRANSPORT"),
        nearest_retailer=_nearest_label(facilities, "RETAILER"),
    )
    db.add(emergency)

    vehicle.status = VehicleStatus.EMERGENCY
    if shipment:
        shipment.speed_kmph = 0.0
    db.commit()
    db.refresh(emergency)

    await manager.broadcast(
        events.EMERGENCY_CREATED, EmergencyOut.model_validate(emergency).model_dump()
    )
    await raise_alert(
        db,
        payload.shipment_id,
        "EMERGENCY",
        payload.severity,
        f"{payload.emergency_type.value.replace('_', ' ').title()} reported by "
        f"{vehicle.vehicle_number} ({vehicle.driver_name}).",
        deduplicate=False,
    )
    await push_notification(
        db,
        title="Emergency reported",
        message=f"{vehicle.vehicle_number} needs assistance near "
        f"{emergency.nearest_warehouse or 'the current location'}.",
        type_=NotificationType.EMERGENCY,
        reference_id=emergency.emergency_id,
        audience=Role.TRANSPORT,
    )
    return emergency


async def request_assistance(
    db: Session, emergency: Emergency, responder: str
) -> Emergency:
    """Simulated dispatch call to the chosen responder."""
    emergency.status = EmergencyStatus.ASSISTANCE_REQUESTED
    emergency.responder = responder
    db.commit()
    db.refresh(emergency)

    await manager.broadcast(
        events.EMERGENCY_UPDATED, EmergencyOut.model_validate(emergency).model_dump()
    )
    await push_notification(
        db,
        title="Assistance request sent",
        message=f"{responder} was contacted for {emergency.emergency_id}.",
        type_=NotificationType.EMERGENCY,
        reference_id=emergency.emergency_id,
    )
    return emergency


async def update_status(
    db: Session, emergency: Emergency, status: EmergencyStatus
) -> Emergency:
    emergency.status = status
    if status in (EmergencyStatus.RESOLVED, EmergencyStatus.CANCELLED):
        emergency.resolved_at = datetime.now(timezone.utc)
        vehicle = (
            db.query(Vehicle)
            .filter(Vehicle.vehicle_id == emergency.vehicle_id)
            .first()
        )
        if vehicle and vehicle.status == VehicleStatus.EMERGENCY:
            shipment = (
                db.query(Shipment)
                .filter(Shipment.shipment_id == emergency.shipment_id)
                .first()
            )
            vehicle.status = (
                VehicleStatus.IN_TRANSIT
                if shipment and shipment.status.value == "IN_TRANSIT"
                else VehicleStatus.AVAILABLE
            )
            if shipment and shipment.status.value == "IN_TRANSIT":
                shipment.speed_kmph = round(random.uniform(35, 50), 1)
    db.commit()
    db.refresh(emergency)

    await manager.broadcast(
        events.EMERGENCY_UPDATED, EmergencyOut.model_validate(emergency).model_dump()
    )
    return emergency


def severity_of(emergency_type: str) -> AlertSeverity:
    if emergency_type in ("ACCIDENT", "MEDICAL_EMERGENCY"):
        return AlertSeverity.CRITICAL
    return AlertSeverity.WARNING
