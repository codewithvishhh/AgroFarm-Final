import axios from "axios";

import type {
  Alert,
  AlertSeverity,
  Analytics,
  AppNotification,
  AllocationResult,
  CollectionPoint,
  CollectionStatus,
  DashboardStats,
  Emergency,
  EmergencyDetail,
  EmergencyStatus,
  EmergencyType,
  Farmer,
  FleetRow,
  Forecast,
  InventoryItem,
  InventoryTransaction,
  NearbyFacility,
  Retailer,
  Role,
  Session,
  Shipment,
  ShipmentCreatePayload,
  ShipmentStatus,
  Telemetry,
  TransactionType,
  Vehicle,
  Warehouse,
} from "../types";

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export const http = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const detail =
      error?.response?.data?.detail ??
      (error?.code === "ERR_NETWORK"
        ? "AgroFarm API is unreachable. Showing cached data where available."
        : error?.message) ??
      "Request failed.";
    return Promise.reject(new Error(detail));
  },
);

export const authApi = {
  login: (name: string, role: Role) =>
    http.post<Session>("/api/auth/login", { name, role }).then((r) => r.data),
  roles: () =>
    http
      .get<{ value: Role; label: string }[]>("/api/auth/roles")
      .then((r) => r.data),
};

export const shipmentsApi = {
  list: (params?: {
    status?: ShipmentStatus;
    stage?: string;
    collection_status?: CollectionStatus;
    created_by?: string;
    search?: string;
  }) => http.get<Shipment[]>("/api/shipments", { params }).then((r) => r.data),
  get: (id: string) =>
    http.get<Shipment>(`/api/shipments/${id}`).then((r) => r.data),
  create: (payload: ShipmentCreatePayload) =>
    http.post<Shipment>("/api/shipments", payload).then((r) => r.data),
  assignVehicle: (id: string, vehicleId: string) =>
    http
      .post<Shipment>(`/api/shipments/${id}/assign-vehicle`, {
        vehicle_id: vehicleId,
      })
      .then((r) => r.data),
  dispatch: (id: string) =>
    http.post<Shipment>(`/api/shipments/${id}/dispatch`).then((r) => r.data),
  setStatus: (id: string, status: ShipmentStatus) =>
    http.patch<Shipment>(`/api/shipments/${id}`, { status }).then((r) => r.data),
  advanceCollection: (
    id: string,
    payload: {
      collection_status: CollectionStatus;
      collected_quantity?: number;
      vehicle_id?: string;
      warehouse_id?: string;
    },
  ) =>
    http
      .post<Shipment>(`/api/shipments/${id}/collection`, payload)
      .then((r) => r.data),
  telemetry: (id: string) =>
    http.get<Telemetry[]>(`/api/shipments/${id}/telemetry`).then((r) => r.data),
  spoilageRisk: (id: string) =>
    http
      .get<{ risk: string; score: number; band: number[] }>(
        `/api/shipments/${id}/spoilage-risk`,
      )
      .then((r) => r.data),
};

export const vehiclesApi = {
  list: (status?: string) =>
    http
      .get<Vehicle[]>("/api/vehicles", { params: status ? { status } : {} })
      .then((r) => r.data),
  fleetStatus: () =>
    http.get<FleetRow[]>("/api/vehicles/fleet-status").then((r) => r.data),
  setStatus: (id: string, status: string) =>
    http
      .patch<Vehicle>(`/api/vehicles/${id}/status`, null, { params: { status } })
      .then((r) => r.data),
};

export const warehousesApi = {
  list: () => http.get<Warehouse[]>("/api/warehouses").then((r) => r.data),
  allocate: (payload: {
    produce_type: string;
    quantity: number;
    latitude: number;
    longitude: number;
  }) =>
    http
      .post<AllocationResult>("/api/warehouses/allocate", payload)
      .then((r) => r.data),
  retailers: () => http.get<Retailer[]>("/api/retailers").then((r) => r.data),
  collectionPoints: () =>
    http.get<CollectionPoint[]>("/api/collection-points").then((r) => r.data),
  farmers: () => http.get<Farmer[]>("/api/farmers").then((r) => r.data),
};

export const inventoryApi = {
  current: (warehouseId?: string) =>
    http
      .get<InventoryItem[]>("/api/inventory", {
        params: warehouseId ? { warehouse_id: warehouseId } : {},
      })
      .then((r) => r.data),
  history: (params?: {
    warehouse_id?: string;
    produce_type?: string;
    transaction_type?: TransactionType;
    date_from?: string;
    date_to?: string;
  }) =>
    http
      .get<InventoryTransaction[]>("/api/inventory/history", { params })
      .then((r) => r.data),
  move: (payload: {
    warehouse_id: string;
    produce_type: string;
    quantity: number;
    unit?: string;
    transaction_type: TransactionType;
    reference_shipment?: string | null;
    note?: string | null;
  }) =>
    http
      .post<InventoryTransaction>("/api/inventory/movements", payload)
      .then((r) => r.data),
  lowStock: () =>
    http.get<InventoryItem[]>("/api/inventory/low-stock").then((r) => r.data),
};

export const alertsApi = {
  list: (params?: {
    is_resolved?: boolean;
    severity?: AlertSeverity;
    alert_type?: string;
    audience?: Role;
  }) => http.get<Alert[]>("/api/alerts", { params }).then((r) => r.data),
  markRead: (id: number) =>
    http.patch<Alert>(`/api/alerts/${id}/read`).then((r) => r.data),
  resolve: (id: number) =>
    http.patch<Alert>(`/api/alerts/${id}/resolve`).then((r) => r.data),
};

export const emergenciesApi = {
  list: (activeOnly = false) =>
    http
      .get<Emergency[]>("/api/emergencies", {
        params: { active_only: activeOnly },
      })
      .then((r) => r.data),
  get: (id: string) =>
    http.get<EmergencyDetail>(`/api/emergencies/${id}`).then((r) => r.data),
  create: (payload: {
    vehicle_id: string;
    shipment_id?: string | null;
    emergency_type: EmergencyType;
    description?: string;
    latitude?: number;
    longitude?: number;
  }) =>
    http.post<EmergencyDetail>("/api/emergencies", payload).then((r) => r.data),
  requestAssistance: (id: string, responder: string) =>
    http
      .post<Emergency>(`/api/emergencies/${id}/assistance`, { responder })
      .then((r) => r.data),
  setStatus: (id: string, status: EmergencyStatus) =>
    http
      .patch<Emergency>(`/api/emergencies/${id}/status`, null, {
        params: { status },
      })
      .then((r) => r.data),
  nearby: (latitude: number, longitude: number) =>
    http
      .get<NearbyFacility[]>("/api/emergencies/nearby/facilities", {
        params: { latitude, longitude },
      })
      .then((r) => r.data),
};

export const forecastApi = {
  produceTypes: () =>
    http.get<string[]>("/api/forecast/produce").then((r) => r.data),
  get: (produceType: string, horizon = 7) =>
    http
      .get<Forecast>("/api/forecast", {
        params: { produce_type: produceType, horizon },
      })
      .then((r) => r.data),
  summary: () =>
    http.get<Forecast[]>("/api/forecast/summary").then((r) => r.data),
};

export const notificationsApi = {
  list: (audience?: Role) =>
    http
      .get<AppNotification[]>("/api/notifications", {
        params: audience ? { audience } : {},
      })
      .then((r) => r.data),
  markAllRead: () => http.post("/api/notifications/read-all"),
};

export const dashboardApi = {
  stats: () =>
    http.get<DashboardStats>("/api/dashboard/stats").then((r) => r.data),
  analytics: (days = 14) =>
    http
      .get<Analytics>("/api/dashboard/analytics", { params: { days } })
      .then((r) => r.data),
};

export const systemApi = {
  health: () => http.get("/api/health").then((r) => r.data),
  simulator: () => http.get("/api/telemetry/simulator").then((r) => r.data),
  startSimulator: () => http.post("/api/telemetry/simulator/start"),
  stopSimulator: () => http.post("/api/telemetry/simulator/stop"),
};

export const assistantApi = {
  chat: (messages: { role: "user" | "assistant"; content: string }[]) =>
    http
      .post<{ message: string }>("/api/chat", { messages })
      .then((response) => response.data.message),
};
