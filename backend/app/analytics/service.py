"""Aggregates for the dashboards. Plain SQL, no models trained."""

from collections import defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.models import (
    Alert,
    CollectionStatus,
    Emergency,
    EmergencyStatus,
    InventoryItem,
    Shipment,
    ShipmentStatus,
    Vehicle,
    VehicleStatus,
    Warehouse,
)
from app.schemas.schemas import (
    AnalyticsOut,
    DailyVolume,
    DashboardStats,
    ProducePerformance,
    StatusCount,
    WarehouseUtilization,
)

ACTIVE_STATUSES = [
    ShipmentStatus.PENDING,
    ShipmentStatus.ASSIGNED,
    ShipmentStatus.IN_TRANSIT,
    ShipmentStatus.DELAYED,
]


def _count(db: Session, status: ShipmentStatus) -> int:
    return db.query(Shipment).filter(Shipment.status == status).count()


def _on_time_rate(shipments: list[Shipment]) -> float:
    finished = [s for s in shipments if s.status == ShipmentStatus.DELIVERED]
    if not finished:
        return 0.0
    on_time = 0
    for shipment in finished:
        deadline = shipment.delivery_deadline
        delivered = shipment.delivered_at
        if deadline is None or delivered is None:
            on_time += 1
            continue
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)
        if delivered.tzinfo is None:
            delivered = delivered.replace(tzinfo=timezone.utc)
        if delivered <= deadline:
            on_time += 1
    return round(on_time / len(finished) * 100, 1)


def dashboard_stats(db: Session) -> DashboardStats:
    shipments = db.query(Shipment).all()
    warehouses = db.query(Warehouse).all()

    used = sum(w.total_capacity - w.available_capacity for w in warehouses)
    total = sum(w.total_capacity for w in warehouses)

    return DashboardStats(
        total_shipments=len(shipments),
        active_shipments=len(
            [s for s in shipments if s.status in ACTIVE_STATUSES]
        ),
        in_transit=_count(db, ShipmentStatus.IN_TRANSIT),
        delivered=_count(db, ShipmentStatus.DELIVERED),
        delayed=_count(db, ShipmentStatus.DELAYED),
        pending=_count(db, ShipmentStatus.PENDING),
        pending_collections=db.query(Shipment)
        .filter(
            Shipment.collection_status.in_(
                [CollectionStatus.REQUESTED, CollectionStatus.ACCEPTED]
            ),
            Shipment.status != ShipmentStatus.CANCELLED,
        )
        .count(),
        active_alerts=db.query(Alert).filter(Alert.is_resolved.is_(False)).count(),
        critical_alerts=db.query(Alert)
        .filter(Alert.is_resolved.is_(False), Alert.severity == "CRITICAL")
        .count(),
        active_emergencies=db.query(Emergency)
        .filter(
            Emergency.status.notin_(
                [EmergencyStatus.RESOLVED, EmergencyStatus.CANCELLED]
            )
        )
        .count(),
        available_vehicles=db.query(Vehicle)
        .filter(Vehicle.status == VehicleStatus.AVAILABLE)
        .count(),
        total_vehicles=db.query(Vehicle).count(),
        total_warehouses=len(warehouses),
        total_inventory=round(
            sum(row.quantity for row in db.query(InventoryItem).all()), 1
        ),
        warehouse_utilization=round(used / total * 100, 1) if total else 0.0,
        on_time_rate=_on_time_rate(shipments),
    )


def analytics(db: Session, days: int = 14) -> AnalyticsOut:
    shipments = db.query(Shipment).all()

    status_breakdown = [
        StatusCount(label=status.value, value=_count(db, status))
        for status in ShipmentStatus
    ]

    by_produce: dict[str, list[Shipment]] = defaultdict(list)
    for shipment in shipments:
        by_produce[shipment.produce_type].append(shipment)

    produce_performance = []
    for produce_type, rows in sorted(by_produce.items()):
        temperatures = [r.temperature for r in rows if r.temperature is not None]
        produce_performance.append(
            ProducePerformance(
                produce_type=produce_type,
                shipments=len(rows),
                delivered=len(
                    [r for r in rows if r.status == ShipmentStatus.DELIVERED]
                ),
                delayed=len([r for r in rows if r.status == ShipmentStatus.DELAYED]),
                average_temperature=(
                    round(sum(temperatures) / len(temperatures), 1)
                    if temperatures
                    else None
                ),
            )
        )

    today = datetime.now(timezone.utc).date()
    buckets = {
        (today - timedelta(days=offset)).isoformat(): [0, 0]
        for offset in range(days - 1, -1, -1)
    }
    for shipment in shipments:
        key = shipment.created_at.date().isoformat()
        if key in buckets:
            buckets[key][0] += 1
        if shipment.delivered_at:
            delivered_key = shipment.delivered_at.date().isoformat()
            if delivered_key in buckets:
                buckets[delivered_key][1] += 1

    daily_volume = [
        DailyVolume(date=date, shipments=counts[0], delivered=counts[1])
        for date, counts in buckets.items()
    ]

    warehouse_utilization = [
        WarehouseUtilization(
            name=warehouse.name,
            utilization=round(warehouse.current_utilization, 1),
            available_capacity=round(warehouse.available_capacity, 1),
        )
        for warehouse in db.query(Warehouse).order_by(Warehouse.name).all()
    ]

    durations = []
    for shipment in shipments:
        if shipment.delivered_at and shipment.departure_time:
            durations.append(
                (shipment.delivered_at - shipment.departure_time).total_seconds() / 3600
            )

    routes: dict[str, int] = defaultdict(int)
    for shipment in shipments:
        routes[f"{shipment.source} to {shipment.destination}"] += 1
    busiest_route = max(routes, key=routes.get) if routes else None

    delayed = len([s for s in shipments if s.status == ShipmentStatus.DELAYED])

    return AnalyticsOut(
        status_breakdown=status_breakdown,
        produce_performance=produce_performance,
        daily_volume=daily_volume,
        warehouse_utilization=warehouse_utilization,
        average_delivery_hours=(
            round(sum(durations) / len(durations), 2) if durations else None
        ),
        on_time_rate=_on_time_rate(shipments),
        delay_rate=round(delayed / len(shipments) * 100, 1) if shipments else 0.0,
        total_quantity_moved=round(
            sum(
                s.quantity for s in shipments if s.status == ShipmentStatus.DELIVERED
            ),
            2,
        ),
        busiest_route=busiest_route,
    )
