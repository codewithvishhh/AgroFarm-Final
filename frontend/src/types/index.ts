export type Role =
  | "FARMER"
  | "COLLECTION"
  | "WAREHOUSE"
  | "TRANSPORT"
  | "RETAILER";

export type ShipmentStatus =
  | "PENDING"
  | "ASSIGNED"
  | "IN_TRANSIT"
  | "DELAYED"
  | "DELIVERED"
  | "CANCELLED";

export type ShipmentStage =
  | "FARM"
  | "COLLECTION"
  | "WAREHOUSE"
  | "TRANSPORT"
  | "RETAILER";

export type CollectionStatus =
  | "REQUESTED"
  | "ACCEPTED"
  | "PICKUP_ASSIGNED"
  | "COLLECTED"
  | "SENT_TO_WAREHOUSE";

export type VehicleStatus =
  | "AVAILABLE"
  | "ASSIGNED"
  | "IN_TRANSIT"
  | "MAINTENANCE"
  | "EMERGENCY";

export type AlertSeverity = "INFO" | "WARNING" | "CRITICAL";

export type TransactionType =
  | "RECEIVED"
  | "STORED"
  | "TRANSFERRED"
  | "DISPATCHED"
  | "SPOILED"
  | "ADJUSTMENT";

export type EmergencyType =
  | "PUNCTURE"
  | "ACCIDENT"
  | "ENGINE_FAILURE"
  | "FUEL_PROBLEM"
  | "MEDICAL_EMERGENCY"
  | "OTHER";

export type EmergencyStatus =
  | "ACTIVE"
  | "ASSISTANCE_REQUESTED"
  | "RESPONDER_ASSIGNED"
  | "RESOLVED"
  | "CANCELLED";

export interface Session {
  user_id: string;
  name: string;
  role: Role;
  display_role: string;
  issued_at: string;
}

export interface Vehicle {
  id: number;
  vehicle_id: string;
  driver_name: string;
  driver_phone: string | null;
  vehicle_number: string;
  vehicle_type: string;
  capacity: number;
  status: VehicleStatus;
  current_latitude: number | null;
  current_longitude: number | null;
  home_hub: string | null;
  created_at: string;
}

export interface FleetRow {
  vehicle_id: string;
  vehicle_number: string;
  driver_name: string;
  driver_phone: string | null;
  vehicle_type: string;
  capacity: number;
  status: VehicleStatus;
  current_latitude: number | null;
  current_longitude: number | null;
  shipment_id: string | null;
  produce_type: string | null;
  destination: string | null;
  progress_percentage: number | null;
  speed_kmph: number;
  eta_minutes: number | null;
}

export interface Shipment {
  id: number;
  shipment_id: string;
  produce_type: string;
  quantity: number;
  quantity_unit: string;
  farmer_name: string | null;
  created_by: string | null;
  created_by_role: Role | null;
  source: string;
  destination: string;
  source_latitude: number;
  source_longitude: number;
  destination_latitude: number;
  destination_longitude: number;
  vehicle_id: string | null;
  warehouse_id: string | null;
  retailer_id: string | null;
  departure_time: string | null;
  delivery_deadline: string | null;
  delivered_at: string | null;
  status: ShipmentStatus;
  stage: ShipmentStage;
  collection_status: CollectionStatus;
  current_latitude: number | null;
  current_longitude: number | null;
  bearing: number;
  speed_kmph: number;
  eta_minutes: number | null;
  temperature: number | null;
  humidity: number | null;
  progress_percentage: number;
  estimated_value: number;
  created_at: string;
  updated_at: string;
  vehicle: Vehicle | null;
}

export interface Warehouse {
  id: number;
  warehouse_id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  total_capacity: number;
  available_capacity: number;
  storage_type: string;
  current_utilization: number;
  contact_phone: string | null;
  created_at: string;
}

export interface Retailer {
  id: number;
  retailer_id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  contact_phone: string | null;
}

export interface CollectionPoint {
  id: number;
  collection_id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  contact_phone: string | null;
}

export interface Farmer {
  id: number;
  farmer_id: string;
  name: string;
  village: string;
  latitude: number;
  longitude: number;
  primary_produce: string;
  contact_phone: string | null;
}

export interface InventoryItem {
  id: number;
  warehouse_id: string;
  produce_type: string;
  quantity: number;
  unit: string;
  reorder_level: number;
  updated_at: string;
}

export interface InventoryTransaction {
  id: number;
  warehouse_id: string;
  produce_type: string;
  quantity: number;
  unit: string;
  transaction_type: TransactionType;
  reference_shipment: string | null;
  note: string | null;
  balance_after_transaction: number;
  timestamp: string;
}

export interface AllocationCandidate {
  warehouse_id: string;
  name: string;
  location: string;
  distance_km: number;
  available_capacity: number;
  utilization: number;
  storage_type: string;
  score: number;
  reasons: string[];
  fits: boolean;
}

export interface AllocationResult {
  produce_type: string;
  quantity: number;
  recommended: AllocationCandidate | null;
  candidates: AllocationCandidate[];
  explanation: string;
}

export interface ForecastPoint {
  date: string;
  actual?: number | null;
  forecast?: number | null;
}

export interface Forecast {
  produce_type: string;
  unit: string;
  method: string;
  history: ForecastPoint[];
  forecast: ForecastPoint[];
  expected_demand: number;
  recommended_stock: number;
  current_stock: number;
  potential_shortage: number;
  potential_surplus: number;
  trend_percentage: number;
}

export interface Alert {
  id: number;
  shipment_id: string | null;
  alert_type: string;
  severity: AlertSeverity;
  message: string;
  audience: Role | null;
  is_read: boolean;
  is_resolved: boolean;
  created_at: string;
}

export interface Telemetry {
  id: number;
  shipment_id: string;
  latitude: number;
  longitude: number;
  temperature: number;
  humidity: number;
  speed_kmph: number;
  timestamp: string;
}

export interface AppNotification {
  id: number;
  user_id: string | null;
  audience: Role | null;
  title: string;
  message: string;
  type: string;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Emergency {
  id: number;
  emergency_id: string;
  shipment_id: string | null;
  vehicle_id: string | null;
  emergency_type: EmergencyType;
  description: string | null;
  latitude: number;
  longitude: number;
  severity: AlertSeverity;
  status: EmergencyStatus;
  nearest_warehouse: string | null;
  nearest_transport: string | null;
  nearest_retailer: string | null;
  responder: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface NearbyFacility {
  kind: string;
  reference_id: string;
  name: string;
  location: string;
  distance_km: number;
  eta_minutes: number;
  contact_phone: string | null;
}

export interface EmergencyDetail {
  emergency: Emergency;
  nearby: NearbyFacility[];
}

export interface DashboardStats {
  total_shipments: number;
  active_shipments: number;
  in_transit: number;
  delivered: number;
  delayed: number;
  pending: number;
  pending_collections: number;
  active_alerts: number;
  critical_alerts: number;
  active_emergencies: number;
  available_vehicles: number;
  total_vehicles: number;
  total_warehouses: number;
  total_inventory: number;
  warehouse_utilization: number;
  on_time_rate: number;
}

export interface Analytics {
  status_breakdown: { label: string; value: number }[];
  produce_performance: {
    produce_type: string;
    shipments: number;
    delivered: number;
    delayed: number;
    average_temperature: number | null;
  }[];
  daily_volume: { date: string; shipments: number; delivered: number }[];
  warehouse_utilization: {
    name: string;
    utilization: number;
    available_capacity: number;
  }[];
  average_delivery_hours: number | null;
  on_time_rate: number;
  delay_rate: number;
  total_quantity_moved: number;
  busiest_route: string | null;
}

export interface ShipmentCreatePayload {
  produce_type: string;
  quantity: number;
  quantity_unit: string;
  source: string;
  destination: string;
  source_latitude: number;
  source_longitude: number;
  destination_latitude: number;
  destination_longitude: number;
  farmer_name?: string | null;
  created_by?: string | null;
  created_by_role?: Role | null;
  vehicle_id?: string | null;
  warehouse_id?: string | null;
  delivery_deadline?: string | null;
}

export const LIVE_EVENTS = {
  VEHICLE_LOCATION_UPDATED: "VEHICLE_LOCATION_UPDATED",
  SHIPMENT_CREATED: "SHIPMENT_CREATED",
  SHIPMENT_UPDATED: "SHIPMENT_UPDATED",
  TELEMETRY_UPDATED: "TELEMETRY_UPDATED",
  ALERT_CREATED: "ALERT_CREATED",
  EMERGENCY_CREATED: "EMERGENCY_CREATED",
  EMERGENCY_UPDATED: "EMERGENCY_UPDATED",
  INVENTORY_UPDATED: "INVENTORY_UPDATED",
  NOTIFICATION_CREATED: "NOTIFICATION_CREATED",
} as const;

export type LiveEvent = keyof typeof LIVE_EVENTS;

export interface SocketMessage<T = unknown> {
  event: LiveEvent;
  timestamp: string;
  data: T;
}
