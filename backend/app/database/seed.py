"""Demo data so every AgroFarm dashboard is populated at a demo.

Locations are real Maharashtra farm belts, mandis, and retail hubs.
"""

import random
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.models import (
    Alert,
    AlertSeverity,
    CollectionPoint,
    CollectionStatus,
    DemandRecord,
    Emergency,
    EmergencyStatus,
    EmergencyType,
    Farmer,
    InventoryItem,
    InventoryTransaction,
    Notification,
    NotificationType,
    Retailer,
    Role,
    Shipment,
    ShipmentStage,
    ShipmentStatus,
    Telemetry,
    TransactionType,
    Vehicle,
    VehicleStatus,
    Warehouse,
)
from app.services.shipment_service import (
    estimated_value,
    generate_id,
    starting_climate,
)

PRODUCE = [
    ("Tomato", "kg"),
    ("Potato", "kg"),
    ("Onion", "kg"),
    ("Wheat", "quintal"),
    ("Rice", "quintal"),
    ("Apple", "kg"),
    ("Banana", "kg"),
]

FARMERS = [
    ("Ramesh Patil", "Ozar, Nashik", 20.0854, 73.9285, "Tomato", "+91 98220 11001"),
    ("Sunita Deshmukh", "Sangamner, Ahmednagar", 19.5726, 74.2113, "Onion", "+91 98220 11002"),
    ("Arjun Yadav", "Baramati, Pune", 18.1514, 74.5815, "Potato", "+91 98220 11003"),
    ("Meena Kulkarni", "Karad, Satara", 17.2896, 74.1845, "Wheat", "+91 98220 11004"),
    ("Vikram Rao", "Miraj, Sangli", 16.8302, 74.6447, "Banana", "+91 98220 11005"),
    ("Kavita Shinde", "Panhala, Kolhapur", 16.8103, 74.1103, "Rice", "+91 98220 11006"),
]

COLLECTION_POINTS = [
    ("Nashik Collection Centre", "Nashik", 19.9975, 73.7898, "+91 98220 22001"),
    ("Ahmednagar Collection Hub", "Ahmednagar", 19.0948, 74.7480, "+91 98220 22002"),
    ("Pune Collection Yard", "Pune", 18.5204, 73.8567, "+91 98220 22003"),
    ("Satara Collection Point", "Satara", 17.6805, 74.0183, "+91 98220 22004"),
]

WAREHOUSES = [
    ("Nashik Cold Chain Depot", "Nashik", 19.9975, 73.7898, 60000, "COLD_STORAGE", "+91 98220 33001"),
    ("Pune Central Warehouse", "Pune", 18.5204, 73.8567, 90000, "AMBIENT", "+91 98220 33002"),
    ("Vashi Cold Hub", "Mumbai", 19.0760, 72.8777, 120000, "COLD_STORAGE", "+91 98220 33003"),
    ("Satara Grain Silo", "Satara", 17.6805, 74.0183, 150000, "GRAIN_SILO", "+91 98220 33004"),
    ("Kolhapur Fresh Depot", "Kolhapur", 16.7050, 74.2433, 70000, "COLD_STORAGE", "+91 98220 33005"),
]

RETAILERS = [
    ("Mumbai Fresh Mart", "Mumbai", 19.0760, 72.8777, "+91 98220 44001"),
    ("Pune Green Bazaar", "Pune", 18.5204, 73.8567, "+91 98220 44002"),
    ("Nashik Daily Needs", "Nashik", 19.9975, 73.7898, "+91 98220 44003"),
    ("Sangli Retail Chain", "Sangli", 16.8524, 74.5815, "+91 98220 44004"),
    ("Kolhapur Super Store", "Kolhapur", 16.7050, 74.2433, "+91 98220 44005"),
]

DRIVERS = [
    ("Ganesh Jadhav", "+91 90000 10001"),
    ("Imran Shaikh", "+91 90000 10002"),
    ("Prakash More", "+91 90000 10003"),
    ("Sanjay Pawar", "+91 90000 10004"),
    ("Nilesh Gaikwad", "+91 90000 10005"),
    ("Joseph Fernandes", "+91 90000 10006"),
    ("Amol Chavan", "+91 90000 10007"),
    ("Rakesh Sawant", "+91 90000 10008"),
    ("Dattatray Bhosale", "+91 90000 10009"),
    ("Firoz Mulla", "+91 90000 10010"),
]

VEHICLE_TYPES = [
    "REFRIGERATED_TRUCK",
    "REFRIGERATED_TRUCK",
    "OPEN_TRUCK",
    "CONTAINER_TRUCK",
    "MINI_PICKUP",
]

# Baseline daily demand per produce, used to build the history series.
DEMAND_BASE = {
    "Tomato": 1200,
    "Potato": 1500,
    "Onion": 1800,
    "Wheat": 900,
    "Rice": 1100,
    "Apple": 700,
    "Banana": 950,
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _naive(value: datetime) -> datetime:
    return value.replace(tzinfo=None)


def seed(db: Session) -> None:
    """Insert demo rows only when the database is empty."""
    if db.query(Shipment).count() > 0:
        return

    for name, village, latitude, longitude, produce, phone in FARMERS:
        db.add(
            Farmer(
                farmer_id=generate_id("FRM"),
                name=name,
                village=village,
                latitude=latitude,
                longitude=longitude,
                primary_produce=produce,
                contact_phone=phone,
            )
        )

    for name, location, latitude, longitude, phone in COLLECTION_POINTS:
        db.add(
            CollectionPoint(
                collection_id=generate_id("COL"),
                name=name,
                location=location,
                latitude=latitude,
                longitude=longitude,
                contact_phone=phone,
            )
        )

    for name, location, latitude, longitude, phone in RETAILERS:
        db.add(
            Retailer(
                retailer_id=generate_id("RET"),
                name=name,
                location=location,
                latitude=latitude,
                longitude=longitude,
                contact_phone=phone,
            )
        )

    warehouses: list[Warehouse] = []
    for name, location, latitude, longitude, capacity, storage, phone in WAREHOUSES:
        warehouse = Warehouse(
            warehouse_id=generate_id("WH"),
            name=name,
            location=location,
            latitude=latitude,
            longitude=longitude,
            total_capacity=capacity,
            available_capacity=capacity,
            storage_type=storage,
            current_utilization=0.0,
            contact_phone=phone,
        )
        warehouses.append(warehouse)
        db.add(warehouse)

    vehicles: list[Vehicle] = []
    for index, (driver, phone) in enumerate(DRIVERS):
        hub = random.choice(COLLECTION_POINTS)
        vehicle = Vehicle(
            vehicle_id=generate_id("VEH"),
            driver_name=driver,
            driver_phone=phone,
            vehicle_number=f"MH{12 + index % 8:02d}-{random.randint(1000, 9999)}",
            vehicle_type=random.choice(VEHICLE_TYPES),
            capacity=random.choice([1500, 2500, 5000, 9000, 12000]),
            status=VehicleStatus.AVAILABLE,
            current_latitude=hub[2],
            current_longitude=hub[3],
            home_hub=hub[0],
        )
        vehicles.append(vehicle)
        db.add(vehicle)
    db.commit()

    _seed_inventory(db, warehouses)
    _seed_demand(db)
    _seed_shipments(db, warehouses, vehicles)
    _seed_emergency(db, vehicles)

    db.add(
        Notification(
            title="Welcome to AgroFarm",
            message="Demo supply chain loaded. Dispatch a shipment to watch the "
            "truck move on the live map.",
            type=NotificationType.SYSTEM,
        )
    )
    db.commit()


def _seed_inventory(db: Session, warehouses: list[Warehouse]) -> None:
    """Opening stock plus a matching ledger entry for every warehouse."""
    for warehouse in warehouses:
        for produce, unit in random.sample(PRODUCE, 4):
            quantity = round(random.uniform(800, 6000), 1)
            db.add(
                InventoryItem(
                    warehouse_id=warehouse.warehouse_id,
                    produce_type=produce,
                    quantity=quantity,
                    unit=unit,
                    reorder_level=round(quantity * random.uniform(0.2, 0.55), 1),
                )
            )
            db.add(
                InventoryTransaction(
                    warehouse_id=warehouse.warehouse_id,
                    produce_type=produce,
                    quantity=quantity,
                    unit=unit,
                    transaction_type=TransactionType.RECEIVED,
                    note="Opening stock",
                    balance_after_transaction=quantity,
                    timestamp=_naive(_now() - timedelta(days=random.randint(3, 12))),
                )
            )
    db.commit()

    for warehouse in warehouses:
        stored = (
            db.query(InventoryItem)
            .filter(InventoryItem.warehouse_id == warehouse.warehouse_id)
            .all()
        )
        used = sum(row.quantity for row in stored)
        warehouse.available_capacity = max(0.0, warehouse.total_capacity - used)
        warehouse.current_utilization = round(
            used / warehouse.total_capacity * 100, 1
        )

        # A few outbound movements so the history page is not one-sided.
        for item in stored[:2]:
            moved = round(item.quantity * random.uniform(0.05, 0.2), 1)
            item.quantity = max(0.0, item.quantity - moved)
            db.add(
                InventoryTransaction(
                    warehouse_id=warehouse.warehouse_id,
                    produce_type=item.produce_type,
                    quantity=moved,
                    unit=item.unit,
                    transaction_type=random.choice(
                        [TransactionType.DISPATCHED, TransactionType.TRANSFERRED]
                    ),
                    note="Outbound to retail",
                    balance_after_transaction=item.quantity,
                    timestamp=_naive(_now() - timedelta(days=random.randint(1, 3))),
                )
            )
    db.commit()


def _seed_demand(db: Session, days: int = 30) -> None:
    """Daily demand history with a mild upward trend and weekly seasonality."""
    for produce, unit in PRODUCE:
        base = DEMAND_BASE[produce]
        for offset in range(days, 0, -1):
            day = _now() - timedelta(days=offset)
            weekend_lift = 1.18 if day.weekday() >= 5 else 1.0
            trend = 1 + (days - offset) * 0.004
            quantity = base * trend * weekend_lift * random.uniform(0.92, 1.08)
            db.add(
                DemandRecord(
                    produce_type=produce,
                    region="Maharashtra",
                    quantity=round(quantity, 1),
                    unit=unit,
                    recorded_on=_naive(day),
                )
            )
    db.commit()


def _seed_shipments(
    db: Session, warehouses: list[Warehouse], vehicles: list[Vehicle]
) -> None:
    farm_points = [(f[1], f[2], f[3], f[0]) for f in FARMERS]
    retail_points = [(r[1], r[2], r[3]) for r in RETAILERS]

    # Delivered history feeds the analytics charts.
    for offset in range(1, 14):
        village, latitude, longitude, farmer = random.choice(farm_points)
        destination, destination_latitude, destination_longitude = random.choice(
            retail_points
        )
        produce, unit = random.choice(PRODUCE)
        temperature, humidity = starting_climate(produce)
        created = _now() - timedelta(days=offset % 10, hours=random.randint(1, 20))
        departed = created + timedelta(minutes=50)
        delivered = departed + timedelta(hours=random.uniform(3, 12))
        deadline = departed + timedelta(hours=random.uniform(6, 13))
        quantity = round(random.uniform(400, 6000), 1)

        db.add(
            Shipment(
                shipment_id=generate_id("SHP"),
                produce_type=produce,
                quantity=quantity,
                quantity_unit=unit,
                farmer_name=farmer,
                created_by=farmer,
                created_by_role=Role.FARMER,
                source=village,
                destination=destination,
                source_latitude=latitude,
                source_longitude=longitude,
                destination_latitude=destination_latitude,
                destination_longitude=destination_longitude,
                vehicle_id=random.choice(vehicles).vehicle_id,
                warehouse_id=random.choice(warehouses).warehouse_id,
                departure_time=_naive(departed),
                delivery_deadline=_naive(deadline),
                delivered_at=_naive(delivered),
                status=ShipmentStatus.DELIVERED,
                stage=ShipmentStage.RETAILER,
                collection_status=CollectionStatus.SENT_TO_WAREHOUSE,
                current_latitude=destination_latitude,
                current_longitude=destination_longitude,
                temperature=temperature,
                humidity=humidity,
                progress_percentage=100.0,
                estimated_value=estimated_value(produce, quantity, unit),
                created_at=_naive(created),
            )
        )

    # Live pipeline: two moving, one assigned, two collecting, one requested.
    live_plan = [
        (ShipmentStatus.IN_TRANSIT, ShipmentStage.TRANSPORT, CollectionStatus.SENT_TO_WAREHOUSE, 24.0),
        (ShipmentStatus.IN_TRANSIT, ShipmentStage.TRANSPORT, CollectionStatus.SENT_TO_WAREHOUSE, 58.0),
        (ShipmentStatus.ASSIGNED, ShipmentStage.COLLECTION, CollectionStatus.PICKUP_ASSIGNED, 0.0),
        (ShipmentStatus.PENDING, ShipmentStage.COLLECTION, CollectionStatus.ACCEPTED, 0.0),
        (ShipmentStatus.PENDING, ShipmentStage.FARM, CollectionStatus.REQUESTED, 0.0),
        (ShipmentStatus.PENDING, ShipmentStage.FARM, CollectionStatus.REQUESTED, 0.0),
    ]

    for status, stage, collection_status, progress in live_plan:
        village, latitude, longitude, farmer = random.choice(farm_points)
        destination, destination_latitude, destination_longitude = random.choice(
            retail_points
        )
        produce, unit = random.choice(PRODUCE)
        temperature, humidity = starting_climate(produce)
        quantity = round(random.uniform(500, 5000), 1)
        current_latitude = latitude + (destination_latitude - latitude) * progress / 100
        current_longitude = (
            longitude + (destination_longitude - longitude) * progress / 100
        )

        vehicle = None
        if status in (ShipmentStatus.IN_TRANSIT, ShipmentStatus.ASSIGNED):
            free = [v for v in vehicles if v.status == VehicleStatus.AVAILABLE]
            vehicle = random.choice(free)
            vehicle.status = (
                VehicleStatus.IN_TRANSIT
                if status == ShipmentStatus.IN_TRANSIT
                else VehicleStatus.ASSIGNED
            )
            vehicle.current_latitude = current_latitude
            vehicle.current_longitude = current_longitude

        shipment = Shipment(
            shipment_id=generate_id("SHP"),
            produce_type=produce,
            quantity=quantity,
            quantity_unit=unit,
            farmer_name=farmer,
            created_by=farmer,
            created_by_role=Role.FARMER,
            source=village,
            destination=destination,
            source_latitude=latitude,
            source_longitude=longitude,
            destination_latitude=destination_latitude,
            destination_longitude=destination_longitude,
            vehicle_id=vehicle.vehicle_id if vehicle else None,
            warehouse_id=random.choice(warehouses).warehouse_id,
            departure_time=(
                _naive(_now() - timedelta(hours=2))
                if status == ShipmentStatus.IN_TRANSIT
                else None
            ),
            delivery_deadline=_naive(_now() + timedelta(hours=random.uniform(4, 16))),
            status=status,
            stage=stage,
            collection_status=collection_status,
            current_latitude=current_latitude,
            current_longitude=current_longitude,
            speed_kmph=round(random.uniform(38, 52), 1) if progress else 0.0,
            temperature=temperature,
            humidity=humidity,
            progress_percentage=progress,
            estimated_value=estimated_value(produce, quantity, unit),
        )
        db.add(shipment)
        db.commit()
        db.refresh(shipment)

        if status == ShipmentStatus.IN_TRANSIT:
            for step in range(8):
                fraction = progress / 100 * (step / 7)
                db.add(
                    Telemetry(
                        shipment_id=shipment.shipment_id,
                        latitude=latitude + (destination_latitude - latitude) * fraction,
                        longitude=longitude
                        + (destination_longitude - longitude) * fraction,
                        temperature=round(temperature + random.uniform(-1, 1.6), 1),
                        humidity=round(humidity + random.uniform(-3, 3), 1),
                        speed_kmph=round(random.uniform(35, 55), 1),
                        timestamp=_naive(_now() - timedelta(minutes=(7 - step) * 15)),
                    )
                )
    db.commit()
    _seed_alerts(db)


def _seed_alerts(db: Session) -> None:
    shipments = db.query(Shipment).order_by(Shipment.created_at.desc()).limit(8).all()
    samples = [
        ("TEMPERATURE_WARNING", AlertSeverity.WARNING, "Cold room temperature drifted above the produce band.", Role.TRANSPORT),
        ("HUMIDITY_WARNING", AlertSeverity.WARNING, "Humidity dropped under the target band for leafy produce.", Role.TRANSPORT),
        ("SHIPMENT_DELAY", AlertSeverity.WARNING, "Shipment is behind schedule on the Pune corridor.", Role.TRANSPORT),
        ("LOW_WAREHOUSE_CAPACITY", AlertSeverity.WARNING, "Vashi Cold Hub is above 80% utilization.", Role.WAREHOUSE),
        ("INVENTORY_ALERT", AlertSeverity.INFO, "Onion stock at Pune Central Warehouse fell under its reorder level.", Role.WAREHOUSE),
        ("DEMAND_SURGE", AlertSeverity.INFO, "Tomato demand in Mumbai is trending 14% above last week.", Role.RETAILER),
        ("VEHICLE_ISSUE", AlertSeverity.WARNING, "MH14 truck reported a brake service due in two days.", Role.TRANSPORT),
        ("TEMPERATURE_CRITICAL", AlertSeverity.CRITICAL, "Reefer unit fault suspected. Load temperature is 6C above the safe band.", Role.TRANSPORT),
        ("INVENTORY_ALERT", AlertSeverity.INFO, "Wheat stock consolidated into the Satara grain silo.", Role.WAREHOUSE),
        ("SHIPMENT_DELAY", AlertSeverity.INFO, "Collection pickup rescheduled to the evening slot.", Role.COLLECTION),
    ]

    for index, (alert_type, severity, message, audience) in enumerate(samples):
        shipment = shipments[index % len(shipments)] if shipments else None
        db.add(
            Alert(
                shipment_id=shipment.shipment_id if shipment else None,
                alert_type=alert_type,
                severity=severity,
                message=message,
                audience=audience,
                is_resolved=index % 4 == 3,
                created_at=_naive(_now() - timedelta(hours=index * 3 + 1)),
            )
        )
    db.commit()


def _seed_emergency(db: Session, vehicles: list[Vehicle]) -> None:
    """One resolved emergency so the history is not empty."""
    vehicle = vehicles[0]
    db.add(
        Emergency(
            emergency_id=f"EMG-{random.randint(100000, 999999)}",
            shipment_id=None,
            vehicle_id=vehicle.vehicle_id,
            emergency_type=EmergencyType.PUNCTURE,
            description="Rear tyre puncture on the Pune bypass. Spare fitted.",
            latitude=18.6011,
            longitude=73.7641,
            severity=AlertSeverity.WARNING,
            status=EmergencyStatus.RESOLVED,
            nearest_warehouse="Pune Central Warehouse (9.4 km)",
            nearest_transport="Pune Collection Yard (9.6 km)",
            nearest_retailer="Pune Green Bazaar (9.6 km)",
            responder="Pune Collection Yard",
            created_at=_naive(_now() - timedelta(days=2)),
            resolved_at=_naive(_now() - timedelta(days=2, hours=-2)),
        )
    )
    db.commit()
