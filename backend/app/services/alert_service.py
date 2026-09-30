"""Produce safety and delivery risk rules.

Thresholds are configurable per produce and live in one table, so a spoilage
model can replace the rules without touching the API layer.
"""

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.models import (
    Alert,
    AlertSeverity,
    NotificationType,
    Role,
    Shipment,
    ShipmentStatus,
)
from app.notifications.service import push_notification
from app.schemas.schemas import AlertOut
from app.websocket import events
from app.websocket.manager import manager

# produce -> (min_celsius, max_celsius, (min_humidity, max_humidity))
# Indicative storage bands for a prototype, not universal standards.
PRODUCE_PROFILES: dict[str, tuple[float, float, tuple[float, float]]] = {
    "Tomato": (10.0, 14.0, (85.0, 95.0)),
    "Potato": (6.0, 10.0, (90.0, 95.0)),
    "Onion": (0.0, 4.0, (65.0, 75.0)),
    "Wheat": (10.0, 25.0, (50.0, 65.0)),
    "Rice": (10.0, 25.0, (50.0, 65.0)),
    "Apple": (0.0, 4.0, (90.0, 95.0)),
    "Banana": (13.0, 15.0, (85.0, 95.0)),
    "Grapes": (0.0, 2.0, (90.0, 95.0)),
    "Mango": (11.0, 14.0, (85.0, 90.0)),
    "Leafy Greens": (0.0, 4.0, (95.0, 100.0)),
    "Milk": (2.0, 4.0, (80.0, 90.0)),
}

DEFAULT_PROFILE = (2.0, 20.0, (60.0, 95.0))


def profile_for(produce_type: str) -> tuple[float, float, tuple[float, float]]:
    return PRODUCE_PROFILES.get(produce_type, DEFAULT_PROFILE)


def reading_level(produce_type: str, temperature: float | None) -> str:
    """Normal, Warning, or Critical for one temperature reading."""
    if temperature is None:
        return "UNKNOWN"
    min_c, max_c, _ = profile_for(produce_type)
    if temperature > max_c + 3 or temperature < min_c - 3:
        return "CRITICAL"
    if temperature > max_c or temperature < min_c:
        return "WARNING"
    return "NORMAL"


def _open_alert_exists(db: Session, shipment_id: str, alert_type: str) -> bool:
    """One open alert of each type per shipment keeps the feed readable."""
    return (
        db.query(Alert)
        .filter(
            Alert.shipment_id == shipment_id,
            Alert.alert_type == alert_type,
            Alert.is_resolved.is_(False),
        )
        .first()
        is not None
    )


async def raise_alert(
    db: Session,
    shipment_id: str | None,
    alert_type: str,
    severity: AlertSeverity,
    message: str,
    audience: Role | None = None,
    deduplicate: bool = True,
) -> Alert | None:
    """Create one alert, broadcast it, and mirror it as a notification."""
    if deduplicate and shipment_id and _open_alert_exists(db, shipment_id, alert_type):
        return None

    alert = Alert(
        shipment_id=shipment_id,
        alert_type=alert_type,
        severity=severity,
        message=message,
        audience=audience,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)

    await manager.broadcast(
        events.ALERT_CREATED, AlertOut.model_validate(alert).model_dump()
    )
    await push_notification(
        db,
        title=f"{severity.value}: {alert_type.replace('_', ' ').title()}",
        message=message,
        type_=NotificationType.ALERT,
        reference_id=shipment_id,
        audience=audience,
    )
    return alert


async def evaluate_shipment(db: Session, shipment: Shipment) -> None:
    """Run every rule against one shipment's telemetry and schedule."""
    min_c, max_c, (min_h, max_h) = profile_for(shipment.produce_type)

    if shipment.temperature is not None:
        if shipment.temperature > max_c + 3 or shipment.temperature < min_c - 3:
            await raise_alert(
                db,
                shipment.shipment_id,
                "TEMPERATURE_CRITICAL",
                AlertSeverity.CRITICAL,
                f"{shipment.produce_type} at {shipment.temperature:.1f}C. "
                f"Safe band is {min_c:.0f}C to {max_c:.0f}C. Spoilage risk is high.",
                audience=Role.TRANSPORT,
            )
        elif shipment.temperature > max_c or shipment.temperature < min_c:
            await raise_alert(
                db,
                shipment.shipment_id,
                "TEMPERATURE_WARNING",
                AlertSeverity.WARNING,
                f"{shipment.produce_type} at {shipment.temperature:.1f}C. "
                f"Safe band is {min_c:.0f}C to {max_c:.0f}C.",
                audience=Role.TRANSPORT,
            )

    if shipment.humidity is not None and not (
        min_h - 10 <= shipment.humidity <= max_h + 5
    ):
        await raise_alert(
            db,
            shipment.shipment_id,
            "HUMIDITY_WARNING",
            AlertSeverity.WARNING,
            f"Humidity at {shipment.humidity:.0f}%. "
            f"Target band is {min_h:.0f}% to {max_h:.0f}%.",
            audience=Role.TRANSPORT,
        )

    deadline = shipment.delivery_deadline
    if deadline and shipment.status == ShipmentStatus.IN_TRANSIT:
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        if now > deadline:
            shipment.status = ShipmentStatus.DELAYED
            db.commit()
            await raise_alert(
                db,
                shipment.shipment_id,
                "SHIPMENT_DELAY",
                AlertSeverity.CRITICAL,
                f"Shipment {shipment.shipment_id} passed its delivery deadline.",
                audience=Role.TRANSPORT,
            )
        elif (
            deadline - now
        ).total_seconds() < 3600 and shipment.progress_percentage < 75:
            await raise_alert(
                db,
                shipment.shipment_id,
                "SHIPMENT_DELAY",
                AlertSeverity.WARNING,
                f"Shipment {shipment.shipment_id} is "
                f"{shipment.progress_percentage:.0f}% complete with under one hour "
                "left.",
                audience=Role.TRANSPORT,
            )
