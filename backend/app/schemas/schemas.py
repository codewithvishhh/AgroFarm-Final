"""Pydantic request and response schemas for the AgroFarm API."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.models import (
    AlertSeverity,
    CollectionStatus,
    EmergencyStatus,
    EmergencyType,
    NotificationType,
    Role,
    ShipmentStage,
    ShipmentStatus,
    TransactionType,
    VehicleStatus,
)


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ------------------------------------------------------------------ auth
class LoginRequest(BaseModel):
    name: str = Field(min_length=1, max_length=64)
    role: Role


class SessionOut(BaseModel):
    user_id: str
    name: str
    role: Role
    display_role: str
    issued_at: datetime


# ------------------------------------------------------------------ vehicle
class VehicleCreate(BaseModel):
    driver_name: str
    vehicle_number: str
    vehicle_type: str = "REFRIGERATED_TRUCK"
    capacity: float = 1000.0
    driver_phone: str | None = None
    current_latitude: float | None = None
    current_longitude: float | None = None
    home_hub: str | None = None


class VehicleOut(ORMModel):
    id: int
    vehicle_id: str
    driver_name: str
    driver_phone: str | None
    vehicle_number: str
    vehicle_type: str
    capacity: float
    status: VehicleStatus
    current_latitude: float | None
    current_longitude: float | None
    home_hub: str | None
    created_at: datetime


# ------------------------------------------------------------------ places
class WarehouseCreate(BaseModel):
    name: str
    location: str
    latitude: float
    longitude: float
    total_capacity: float
    available_capacity: float | None = None
    storage_type: str = "COLD_STORAGE"
    contact_phone: str | None = None


class WarehouseOut(ORMModel):
    id: int
    warehouse_id: str
    name: str
    location: str
    latitude: float
    longitude: float
    total_capacity: float
    available_capacity: float
    storage_type: str
    current_utilization: float
    contact_phone: str | None
    created_at: datetime


class RetailerOut(ORMModel):
    id: int
    retailer_id: str
    name: str
    location: str
    latitude: float
    longitude: float
    contact_phone: str | None


class CollectionPointOut(ORMModel):
    id: int
    collection_id: str
    name: str
    location: str
    latitude: float
    longitude: float
    contact_phone: str | None


class FarmerOut(ORMModel):
    id: int
    farmer_id: str
    name: str
    village: str
    latitude: float
    longitude: float
    primary_produce: str
    contact_phone: str | None


# ------------------------------------------------------------------ shipment
class ShipmentCreate(BaseModel):
    produce_type: str
    quantity: float = Field(gt=0)
    quantity_unit: str = "kg"
    source: str
    destination: str
    source_latitude: float
    source_longitude: float
    destination_latitude: float
    destination_longitude: float
    farmer_name: str | None = None
    created_by: str | None = None
    created_by_role: Role | None = None
    vehicle_id: str | None = None
    warehouse_id: str | None = None
    retailer_id: str | None = None
    delivery_deadline: datetime | None = None


class ShipmentUpdate(BaseModel):
    status: ShipmentStatus | None = None
    stage: ShipmentStage | None = None
    collection_status: CollectionStatus | None = None
    vehicle_id: str | None = None
    warehouse_id: str | None = None
    delivery_deadline: datetime | None = None
    temperature: float | None = None
    humidity: float | None = None


class ShipmentOut(ORMModel):
    id: int
    shipment_id: str
    produce_type: str
    quantity: float
    quantity_unit: str
    farmer_name: str | None
    created_by: str | None
    created_by_role: Role | None
    source: str
    destination: str
    source_latitude: float
    source_longitude: float
    destination_latitude: float
    destination_longitude: float
    vehicle_id: str | None
    warehouse_id: str | None
    retailer_id: str | None
    departure_time: datetime | None
    delivery_deadline: datetime | None
    delivered_at: datetime | None
    status: ShipmentStatus
    stage: ShipmentStage
    collection_status: CollectionStatus
    current_latitude: float | None
    current_longitude: float | None
    bearing: float
    speed_kmph: float
    eta_minutes: float | None
    temperature: float | None
    humidity: float | None
    progress_percentage: float
    estimated_value: float
    created_at: datetime
    updated_at: datetime
    vehicle: VehicleOut | None = None


class AssignVehicleRequest(BaseModel):
    vehicle_id: str


class CollectionUpdate(BaseModel):
    collection_status: CollectionStatus
    collected_quantity: float | None = None
    vehicle_id: str | None = None
    warehouse_id: str | None = None


# ------------------------------------------------------------------ inventory
class InventoryItemOut(ORMModel):
    id: int
    warehouse_id: str
    produce_type: str
    quantity: float
    unit: str
    reorder_level: float
    updated_at: datetime


class InventoryTransactionOut(ORMModel):
    id: int
    warehouse_id: str
    produce_type: str
    quantity: float
    unit: str
    transaction_type: TransactionType
    reference_shipment: str | None
    note: str | None
    balance_after_transaction: float
    timestamp: datetime


class InventoryMoveRequest(BaseModel):
    warehouse_id: str
    produce_type: str
    quantity: float = Field(gt=0)
    unit: str = "kg"
    transaction_type: TransactionType
    reference_shipment: str | None = None
    note: str | None = None


# ------------------------------------------------------------------ allocation
class AllocationCandidate(BaseModel):
    warehouse_id: str
    name: str
    location: str
    distance_km: float
    available_capacity: float
    utilization: float
    storage_type: str
    score: float
    reasons: list[str]
    fits: bool


class AllocationResult(BaseModel):
    produce_type: str
    quantity: float
    recommended: AllocationCandidate | None
    candidates: list[AllocationCandidate]
    explanation: str


class AllocationRequest(BaseModel):
    produce_type: str
    quantity: float = Field(gt=0)
    latitude: float
    longitude: float


# ------------------------------------------------------------------ forecast
class ForecastPoint(BaseModel):
    date: str
    actual: float | None = None
    forecast: float | None = None


class ForecastOut(BaseModel):
    produce_type: str
    unit: str
    method: str
    history: list[ForecastPoint]
    forecast: list[ForecastPoint]
    expected_demand: float
    recommended_stock: float
    current_stock: float
    potential_shortage: float
    potential_surplus: float
    trend_percentage: float


# ------------------------------------------------------------------ emergency
class EmergencyCreate(BaseModel):
    vehicle_id: str
    shipment_id: str | None = None
    emergency_type: EmergencyType
    description: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    severity: AlertSeverity = AlertSeverity.CRITICAL


class NearbyFacility(BaseModel):
    kind: str
    reference_id: str
    name: str
    location: str
    distance_km: float
    eta_minutes: int
    contact_phone: str | None


class EmergencyOut(ORMModel):
    id: int
    emergency_id: str
    shipment_id: str | None
    vehicle_id: str | None
    emergency_type: EmergencyType
    description: str | None
    latitude: float
    longitude: float
    severity: AlertSeverity
    status: EmergencyStatus
    nearest_warehouse: str | None
    nearest_transport: str | None
    nearest_retailer: str | None
    responder: str | None
    created_at: datetime
    resolved_at: datetime | None


class EmergencyDetail(BaseModel):
    emergency: EmergencyOut
    nearby: list[NearbyFacility]


class AssistanceRequest(BaseModel):
    responder: str


# ------------------------------------------------------------------ alerts
class AlertOut(ORMModel):
    id: int
    shipment_id: str | None
    alert_type: str
    severity: AlertSeverity
    message: str
    audience: Role | None
    is_read: bool
    is_resolved: bool
    created_at: datetime


class AlertCreate(BaseModel):
    shipment_id: str | None = None
    alert_type: str
    severity: AlertSeverity = AlertSeverity.INFO
    message: str
    audience: Role | None = None


# ------------------------------------------------------------------ telemetry
class TelemetryOut(ORMModel):
    id: int
    shipment_id: str
    latitude: float
    longitude: float
    temperature: float
    humidity: float
    speed_kmph: float
    timestamp: datetime


# ------------------------------------------------------------------ notification
class NotificationOut(ORMModel):
    id: int
    user_id: str | None
    audience: Role | None
    title: str
    message: str
    type: NotificationType
    reference_id: str | None
    is_read: bool
    created_at: datetime


# ------------------------------------------------------------------ dashboard
class DashboardStats(BaseModel):
    total_shipments: int
    active_shipments: int
    in_transit: int
    delivered: int
    delayed: int
    pending: int
    pending_collections: int
    active_alerts: int
    critical_alerts: int
    active_emergencies: int
    available_vehicles: int
    total_vehicles: int
    total_warehouses: int
    total_inventory: float
    warehouse_utilization: float
    on_time_rate: float


class StatusCount(BaseModel):
    label: str
    value: int


class ProducePerformance(BaseModel):
    produce_type: str
    shipments: int
    delivered: int
    delayed: int
    average_temperature: float | None


class DailyVolume(BaseModel):
    date: str
    shipments: int
    delivered: int


class WarehouseUtilization(BaseModel):
    name: str
    utilization: float
    available_capacity: float


class AnalyticsOut(BaseModel):
    status_breakdown: list[StatusCount]
    produce_performance: list[ProducePerformance]
    daily_volume: list[DailyVolume]
    warehouse_utilization: list[WarehouseUtilization]
    average_delivery_hours: float | None
    on_time_rate: float
    delay_rate: float
    total_quantity_moved: float
    busiest_route: str | None
