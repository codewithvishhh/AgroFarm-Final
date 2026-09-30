"""Simulated GPS movement for shipments that are on the road.

One asyncio loop advances every moving shipment along its route, updates
speed, bearing and ETA, stores telemetry, runs the alert rules, and
broadcasts the change. Start and stop are controllable from the API.
"""

import asyncio
import contextlib
import random

from sqlalchemy.orm import Session

from app.config import settings
from app.database.session import SessionLocal
from app.models.models import Shipment, ShipmentStatus, VehicleStatus
from app.schemas.schemas import TelemetryOut
from app.services import shipment_service
from app.services.alert_service import evaluate_shipment
from app.services.eta_prediction_service import estimate_minutes
from app.services.geo import bearing_degrees, interpolate
from app.simulator import telemetry_simulator
from app.websocket import events
from app.websocket.manager import manager

BASE_SPEED_KMPH = 45.0


async def _advance(db: Session, shipment: Shipment) -> None:
    # A truck waiting for emergency assistance does not move.
    if shipment.vehicle and shipment.vehicle.status == VehicleStatus.EMERGENCY:
        return

    distance_km = shipment_service.route_distance_km(shipment)
    speed = shipment.speed_kmph or BASE_SPEED_KMPH
    speed = max(18.0, min(70.0, speed + random.uniform(-4, 4)))

    if distance_km <= 0:
        fraction_step = 1.0
    else:
        travelled_km = (
            speed
            * (settings.SIMULATOR_TICK_SECONDS * settings.SIMULATOR_SPEED_FACTOR)
            / 3600.0
        )
        fraction_step = travelled_km / distance_km

    previous_latitude = shipment.current_latitude or shipment.source_latitude
    previous_longitude = shipment.current_longitude or shipment.source_longitude

    progress = min(1.0, shipment.progress_percentage / 100.0 + fraction_step)
    latitude, longitude = interpolate(
        shipment.source_latitude,
        shipment.source_longitude,
        shipment.destination_latitude,
        shipment.destination_longitude,
        progress,
    )

    temperature, humidity = telemetry_simulator.next_reading(
        shipment.produce_type, shipment.temperature, shipment.humidity
    )

    shipment.current_latitude = round(latitude, 6)
    shipment.current_longitude = round(longitude, 6)
    shipment.progress_percentage = round(progress * 100, 1)
    shipment.speed_kmph = round(speed, 1)
    shipment.bearing = round(
        bearing_degrees(
            previous_latitude, previous_longitude, latitude, longitude
        )
        if (previous_latitude, previous_longitude) != (latitude, longitude)
        else shipment.bearing,
        1,
    )
    shipment.eta_minutes = estimate_minutes(
        latitude,
        longitude,
        shipment.destination_latitude,
        shipment.destination_longitude,
        speed,
    )
    shipment.temperature = temperature
    shipment.humidity = humidity

    if shipment.vehicle:
        shipment.vehicle.current_latitude = shipment.current_latitude
        shipment.vehicle.current_longitude = shipment.current_longitude

    db.commit()
    db.refresh(shipment)

    reading = shipment_service.record_telemetry(db, shipment)
    await manager.broadcast(
        events.TELEMETRY_UPDATED, TelemetryOut.model_validate(reading).model_dump()
    )
    await manager.broadcast(
        events.VEHICLE_LOCATION_UPDATED,
        {
            "shipment_id": shipment.shipment_id,
            "vehicle_id": shipment.vehicle_id,
            "latitude": shipment.current_latitude,
            "longitude": shipment.current_longitude,
            "bearing": shipment.bearing,
            "speed_kmph": shipment.speed_kmph,
            "progress_percentage": shipment.progress_percentage,
            "eta_minutes": shipment.eta_minutes,
        },
    )
    await shipment_service.broadcast_shipment(shipment, events.SHIPMENT_UPDATED)
    await evaluate_shipment(db, shipment)

    if shipment.progress_percentage >= 100.0:
        await shipment_service.deliver(db, shipment)


async def tick() -> None:
    """One simulation step across every moving shipment."""
    db = SessionLocal()
    try:
        moving = (
            db.query(Shipment)
            .filter(
                Shipment.status.in_(
                    [ShipmentStatus.IN_TRANSIT, ShipmentStatus.DELAYED]
                )
            )
            .all()
        )
        for shipment in moving:
            await _advance(db, shipment)
    finally:
        db.close()


async def _loop() -> None:
    while True:
        try:
            await tick()
        except Exception as exc:  # keep the simulator alive on any row error
            print(f"[simulator] tick failed: {exc}")
        await asyncio.sleep(settings.SIMULATOR_TICK_SECONDS)


_task: asyncio.Task | None = None


def is_running() -> bool:
    return _task is not None and not _task.done()


def start() -> bool:
    global _task
    if is_running():
        return False
    _task = asyncio.create_task(_loop())
    return True


async def stop() -> bool:
    global _task
    if _task is None:
        return False
    _task.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await _task
    _task = None
    return True
