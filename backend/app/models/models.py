"""SQLAlchemy models for the AgroFarm agricultural supply chain platform."""

import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.session import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Role(str, enum.Enum):
    FARMER = "FARMER"
    COLLECTION = "COLLECTION"
    WAREHOUSE = "WAREHOUSE"
    TRANSPORT = "TRANSPORT"
    RETAILER = "RETAILER"


class ShipmentStatus(str, enum.Enum):
    PENDING = "PENDING"
    ASSIGNED = "ASSIGNED"
    IN_TRANSIT = "IN_TRANSIT"
    DELAYED = "DELAYED"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"


class ShipmentStage(str, enum.Enum):
    FARM = "FARM"
    COLLECTION = "COLLECTION"
    WAREHOUSE = "WAREHOUSE"
    TRANSPORT = "TRANSPORT"
    RETAILER = "RETAILER"


class CollectionStatus(str, enum.Enum):
    REQUESTED = "REQUESTED"
    ACCEPTED = "ACCEPTED"
    PICKUP_ASSIGNED = "PICKUP_ASSIGNED"
    COLLECTED = "COLLECTED"
    SENT_TO_WAREHOUSE = "SENT_TO_WAREHOUSE"


class VehicleStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    ASSIGNED = "ASSIGNED"
    IN_TRANSIT = "IN_TRANSIT"
    MAINTENANCE = "MAINTENANCE"
    EMERGENCY = "EMERGENCY"


class AlertSeverity(str, enum.Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


class NotificationType(str, enum.Enum):
    SHIPMENT = "SHIPMENT"
    ALERT = "ALERT"
    VEHICLE = "VEHICLE"
    WAREHOUSE = "WAREHOUSE"
    EMERGENCY = "EMERGENCY"
    INVENTORY = "INVENTORY"
    SYSTEM = "SYSTEM"


class TransactionType(str, enum.Enum):
    RECEIVED = "RECEIVED"
    STORED = "STORED"
    TRANSFERRED = "TRANSFERRED"
    DISPATCHED = "DISPATCHED"
    SPOILED = "SPOILED"
    ADJUSTMENT = "ADJUSTMENT"


class EmergencyType(str, enum.Enum):
    PUNCTURE = "PUNCTURE"
    ACCIDENT = "ACCIDENT"
    ENGINE_FAILURE = "ENGINE_FAILURE"
    FUEL_PROBLEM = "FUEL_PROBLEM"
    MEDICAL_EMERGENCY = "MEDICAL_EMERGENCY"
    OTHER = "OTHER"


class EmergencyStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    ASSISTANCE_REQUESTED = "ASSISTANCE_REQUESTED"
    RESPONDER_ASSIGNED = "RESPONDER_ASSIGNED"
    RESOLVED = "RESOLVED"
    CANCELLED = "CANCELLED"


class Shipment(Base):
    __tablename__ = "shipments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    shipment_id: Mapped[str] = mapped_column(String(32), unique=True, index=True)

    produce_type: Mapped[str] = mapped_column(String(64), index=True)
    quantity: Mapped[float] = mapped_column(Float)
    quantity_unit: Mapped[str] = mapped_column(String(16), default="kg")

    farmer_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(128), nullable=True)
    created_by_role: Mapped[Role | None] = mapped_column(Enum(Role), nullable=True)

    source: Mapped[str] = mapped_column(String(128))
    destination: Mapped[str] = mapped_column(String(128))
    source_latitude: Mapped[float] = mapped_column(Float)
    source_longitude: Mapped[float] = mapped_column(Float)
    destination_latitude: Mapped[float] = mapped_column(Float)
    destination_longitude: Mapped[float] = mapped_column(Float)

    vehicle_id: Mapped[str | None] = mapped_column(
        String(32), ForeignKey("vehicles.vehicle_id"), nullable=True
    )
    warehouse_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    retailer_id: Mapped[str | None] = mapped_column(String(32), nullable=True)

    departure_time: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    delivery_deadline: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    status: Mapped[ShipmentStatus] = mapped_column(
        Enum(ShipmentStatus), default=ShipmentStatus.PENDING, index=True
    )
    stage: Mapped[ShipmentStage] = mapped_column(
        Enum(ShipmentStage), default=ShipmentStage.FARM, index=True
    )
    collection_status: Mapped[CollectionStatus] = mapped_column(
        Enum(CollectionStatus), default=CollectionStatus.REQUESTED, index=True
    )

    current_latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    current_longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    bearing: Mapped[float] = mapped_column(Float, default=0.0)
    speed_kmph: Mapped[float] = mapped_column(Float, default=0.0)
    eta_minutes: Mapped[float | None] = mapped_column(Float, nullable=True)

    temperature: Mapped[float | None] = mapped_column(Float, nullable=True)
    humidity: Mapped[float | None] = mapped_column(Float, nullable=True)
    progress_percentage: Mapped[float] = mapped_column(Float, default=0.0)
    estimated_value: Mapped[float] = mapped_column(Float, default=0.0)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow
    )

    vehicle = relationship("Vehicle", back_populates="shipments", lazy="joined")
    alerts = relationship(
        "Alert", back_populates="shipment", cascade="all, delete-orphan"
    )
    telemetry = relationship(
        "Telemetry", back_populates="shipment", cascade="all, delete-orphan"
    )


class Vehicle(Base):
    __tablename__ = "vehicles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    vehicle_id: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    driver_name: Mapped[str] = mapped_column(String(128))
    driver_phone: Mapped[str | None] = mapped_column(String(24), nullable=True)
    vehicle_number: Mapped[str] = mapped_column(String(32))
    vehicle_type: Mapped[str] = mapped_column(String(48), default="REFRIGERATED_TRUCK")
    capacity: Mapped[float] = mapped_column(Float, default=1000.0)
    status: Mapped[VehicleStatus] = mapped_column(
        Enum(VehicleStatus), default=VehicleStatus.AVAILABLE, index=True
    )
    current_latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    current_longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    home_hub: Mapped[str | None] = mapped_column(String(128), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    shipments = relationship("Shipment", back_populates="vehicle")


class Warehouse(Base):
    __tablename__ = "warehouses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    warehouse_id: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(128))
    location: Mapped[str] = mapped_column(String(128))
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    total_capacity: Mapped[float] = mapped_column(Float)
    available_capacity: Mapped[float] = mapped_column(Float)
    storage_type: Mapped[str] = mapped_column(String(48), default="COLD_STORAGE")
    current_utilization: Mapped[float] = mapped_column(Float, default=0.0)
    contact_phone: Mapped[str | None] = mapped_column(String(24), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class CollectionPoint(Base):
    __tablename__ = "collection_points"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    collection_id: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(128))
    location: Mapped[str] = mapped_column(String(128))
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    contact_phone: Mapped[str | None] = mapped_column(String(24), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Retailer(Base):
    __tablename__ = "retailers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    retailer_id: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(128))
    location: Mapped[str] = mapped_column(String(128))
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    contact_phone: Mapped[str | None] = mapped_column(String(24), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Farmer(Base):
    __tablename__ = "farmers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    farmer_id: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(128))
    village: Mapped[str] = mapped_column(String(128))
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    primary_produce: Mapped[str] = mapped_column(String(64))
    contact_phone: Mapped[str | None] = mapped_column(String(24), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class InventoryItem(Base):
    """Current stock of one produce type inside one warehouse."""

    __tablename__ = "inventory_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    warehouse_id: Mapped[str] = mapped_column(String(32), index=True)
    produce_type: Mapped[str] = mapped_column(String(64), index=True)
    quantity: Mapped[float] = mapped_column(Float, default=0.0)
    unit: Mapped[str] = mapped_column(String(16), default="kg")
    reorder_level: Mapped[float] = mapped_column(Float, default=500.0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow
    )


class InventoryTransaction(Base):
    """Immutable movement record. One row per quantity change."""

    __tablename__ = "inventory_transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    warehouse_id: Mapped[str] = mapped_column(String(32), index=True)
    produce_type: Mapped[str] = mapped_column(String(64), index=True)
    quantity: Mapped[float] = mapped_column(Float)
    unit: Mapped[str] = mapped_column(String(16), default="kg")
    transaction_type: Mapped[TransactionType] = mapped_column(
        Enum(TransactionType), index=True
    )
    reference_shipment: Mapped[str | None] = mapped_column(String(32), nullable=True)
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    balance_after_transaction: Mapped[float] = mapped_column(Float)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)


class DemandRecord(Base):
    """Historical daily demand per produce type. Input for forecasting."""

    __tablename__ = "demand_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    produce_type: Mapped[str] = mapped_column(String(64), index=True)
    region: Mapped[str] = mapped_column(String(64), default="Pune")
    quantity: Mapped[float] = mapped_column(Float)
    unit: Mapped[str] = mapped_column(String(16), default="kg")
    recorded_on: Mapped[datetime] = mapped_column(DateTime, index=True)


class Emergency(Base):
    __tablename__ = "emergencies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    emergency_id: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    shipment_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    vehicle_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    emergency_type: Mapped[EmergencyType] = mapped_column(Enum(EmergencyType))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    severity: Mapped[AlertSeverity] = mapped_column(
        Enum(AlertSeverity), default=AlertSeverity.CRITICAL
    )
    status: Mapped[EmergencyStatus] = mapped_column(
        Enum(EmergencyStatus), default=EmergencyStatus.ACTIVE, index=True
    )
    nearest_warehouse: Mapped[str | None] = mapped_column(String(160), nullable=True)
    nearest_transport: Mapped[str | None] = mapped_column(String(160), nullable=True)
    nearest_retailer: Mapped[str | None] = mapped_column(String(160), nullable=True)
    responder: Mapped[str | None] = mapped_column(String(160), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    shipment_id: Mapped[str | None] = mapped_column(
        String(32), ForeignKey("shipments.shipment_id"), nullable=True, index=True
    )
    alert_type: Mapped[str] = mapped_column(String(48), index=True)
    severity: Mapped[AlertSeverity] = mapped_column(
        Enum(AlertSeverity), default=AlertSeverity.INFO, index=True
    )
    message: Mapped[str] = mapped_column(Text)
    audience: Mapped[Role | None] = mapped_column(Enum(Role), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    is_resolved: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)

    shipment = relationship("Shipment", back_populates="alerts")


class Telemetry(Base):
    __tablename__ = "telemetry"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    shipment_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("shipments.shipment_id"), index=True
    )
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    temperature: Mapped[float] = mapped_column(Float)
    humidity: Mapped[float] = mapped_column(Float)
    speed_kmph: Mapped[float] = mapped_column(Float, default=0.0)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)

    shipment = relationship("Shipment", back_populates="telemetry")


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    audience: Mapped[Role | None] = mapped_column(Enum(Role), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(160))
    message: Mapped[str] = mapped_column(Text)
    type: Mapped[NotificationType] = mapped_column(
        Enum(NotificationType), default=NotificationType.SYSTEM
    )
    reference_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
