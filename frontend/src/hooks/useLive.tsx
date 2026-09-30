import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { notificationsApi } from "../services/api";
import { liveSocket } from "../services/socket";
import type {
  Alert,
  AppNotification,
  Emergency,
  SocketMessage,
} from "../types";

export interface Toast {
  id: number;
  title: string;
  message: string;
  tone: "info" | "warn" | "danger" | "good";
}

interface LiveContextValue {
  connected: boolean;
  notifications: AppNotification[];
  unreadCount: number;
  toasts: Toast[];
  pushToast: (toast: Omit<Toast, "id">) => void;
  dismissToast: (id: number) => void;
  markAllRead: () => Promise<void>;
  subscribe: (handler: (message: SocketMessage) => void) => () => void;
}

const LiveContext = createContext<LiveContextValue | null>(null);

let toastSeed = 0;

export function LiveProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const handlers = useRef(new Set<(message: SocketMessage) => void>());

  const pushToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = ++toastSeed;
    setToasts((current) => [...current.slice(-3), { ...toast, id }]);
    window.setTimeout(
      () => setToasts((current) => current.filter((item) => item.id !== id)),
      6000,
    );
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  useEffect(() => {
    notificationsApi.list().then(setNotifications).catch(() => undefined);

    const offStatus = liveSocket.onStatusChange(setConnected);
    const offMessage = liveSocket.subscribe((message) => {
      handlers.current.forEach((handler) => handler(message));

      if (message.event === "NOTIFICATION_CREATED") {
        const notification = message.data as AppNotification;
        setNotifications((current) => [notification, ...current].slice(0, 50));
      }

      if (message.event === "ALERT_CREATED") {
        const alert = message.data as Alert;
        pushToast({
          title: alert.alert_type.replace(/_/g, " ").toLowerCase(),
          message: alert.message,
          tone: alert.severity === "CRITICAL" ? "danger" : "warn",
        });
      }

      if (message.event === "EMERGENCY_CREATED") {
        const emergency = message.data as Emergency;
        pushToast({
          title: "Emergency reported",
          message: `${emergency.emergency_type.replace(/_/g, " ")} on ${
            emergency.vehicle_id
          }. Nearby help: ${emergency.nearest_warehouse ?? "searching"}.`,
          tone: "danger",
        });
      }
    });

    liveSocket.connect();
    return () => {
      offStatus();
      offMessage();
    };
  }, [pushToast]);

  const subscribe = useCallback((handler: (message: SocketMessage) => void) => {
    handlers.current.add(handler);
    return () => {
      handlers.current.delete(handler);
    };
  }, []);

  const markAllRead = useCallback(async () => {
    await notificationsApi.markAllRead();
    setNotifications((current) =>
      current.map((item) => ({ ...item, is_read: true })),
    );
  }, []);

  const value = useMemo<LiveContextValue>(
    () => ({
      connected,
      notifications,
      unreadCount: notifications.filter((item) => !item.is_read).length,
      toasts,
      pushToast,
      dismissToast,
      markAllRead,
      subscribe,
    }),
    [
      connected,
      notifications,
      toasts,
      pushToast,
      dismissToast,
      markAllRead,
      subscribe,
    ],
  );

  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export function useLive(): LiveContextValue {
  const context = useContext(LiveContext);
  if (!context) throw new Error("useLive must be used inside LiveProvider");
  return context;
}

/** Subscribe to selected live events without re-rendering the whole tree. */
export function useLiveEvent(
  events: string[],
  handler: (message: SocketMessage) => void,
) {
  const { subscribe } = useLive();
  const saved = useRef(handler);
  saved.current = handler;

  useEffect(
    () =>
      subscribe((message) => {
        if (events.includes(message.event)) saved.current(message);
      }),
    [events.join("|"), subscribe],
  );
}

/** Keep one shipment list in step with the live feed. */
export function mergeShipment<T extends { shipment_id: string }>(
  current: T[],
  updated: T,
): T[] {
  const exists = current.some((row) => row.shipment_id === updated.shipment_id);
  return exists
    ? current.map((row) =>
        row.shipment_id === updated.shipment_id ? updated : row,
      )
    : [updated, ...current];
}
