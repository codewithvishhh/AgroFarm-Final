import type { SocketMessage } from "../types";

const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:8000/ws/live";

type Handler = (message: SocketMessage) => void;
type StatusHandler = (connected: boolean) => void;

/**
 * One shared socket for the whole app, with backoff reconnect and a
 * keep-alive ping so idle proxies do not drop the channel.
 */
class LiveSocket {
  private socket: WebSocket | null = null;
  private handlers = new Set<Handler>();
  private statusHandlers = new Set<StatusHandler>();
  private retries = 0;
  private pingTimer: number | null = null;

  connect() {
    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.socket = new WebSocket(WS_URL);

    this.socket.onopen = () => {
      this.retries = 0;
      this.statusHandlers.forEach((handler) => handler(true));
      this.pingTimer = window.setInterval(() => {
        if (this.socket?.readyState === WebSocket.OPEN) this.socket.send("ping");
      }, 25000);
    };

    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as SocketMessage;
        this.handlers.forEach((handler) => handler(message));
      } catch {
        // Ignore frames that are not AgroFarm events.
      }
    };

    this.socket.onclose = () => {
      this.statusHandlers.forEach((handler) => handler(false));
      if (this.pingTimer) window.clearInterval(this.pingTimer);
      this.retries += 1;
      const delay = Math.min(15000, 1000 * 2 ** this.retries);
      window.setTimeout(() => this.connect(), delay);
    };

    this.socket.onerror = () => this.socket?.close();
  }

  subscribe(handler: Handler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  onStatusChange(handler: StatusHandler) {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }
}

export const liveSocket = new LiveSocket();
