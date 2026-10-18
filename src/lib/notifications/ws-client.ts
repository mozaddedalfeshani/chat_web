import {
  getStoredToken,
  getWsAccessToken,
  subscribeStoredToken,
} from "@/lib/api/core";
import { API_WS_ORIGIN } from "@/lib/api-origin";

const WS_AUTH_SUBPROTOCOL = "ababilx-ws";

export function getNotificationsWsUrl(): string {
  if (typeof window === "undefined") return "";
  return `${API_WS_ORIGIN}/api/notifications/stream`;
}

type Handlers = {
  onEvent: (ev: { type: string; [key: string]: unknown }) => void;
  onReconnect?: () => void;
};

const MIN_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;

let activeSocket: WebSocket | null = null;

/** Send a client→server JSON frame on the shared stream (no-op if disconnected). */
export function sendAppWs(payload: Record<string, unknown>): boolean {
  if (!activeSocket || activeSocket.readyState !== WebSocket.OPEN) return false;
  try {
    activeSocket.send(JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function connectNotificationsWs(handlers: Handlers): () => void {
  let ws: WebSocket | null = null;
  let backoff = MIN_BACKOFF_MS;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let closed = false;

  function clearReconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  function scheduleReconnect() {
    if (closed) return;
    clearReconnect();
    reconnectTimer = setTimeout(() => {
      connect();
      backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
    }, backoff);
  }

  function connect() {
    if (!getStoredToken() || closed) return;

    if (ws) {
      if (activeSocket === ws) activeSocket = null;
      ws.onclose = null;
      ws.close();
      ws = null;
    }

    void getWsAccessToken().then((token) => {
      if (!token || closed) {
        scheduleReconnect();
        return;
      }
      try {
        ws = new WebSocket(getNotificationsWsUrl(), [WS_AUTH_SUBPROTOCOL, token]);
        activeSocket = ws;
      } catch {
        scheduleReconnect();
        return;
      }

      ws.onopen = () => {
        backoff = MIN_BACKOFF_MS;
        handlers.onReconnect?.();
      };

      ws.onmessage = (msg) => {
        try {
          const ev = JSON.parse(String(msg.data)) as { type?: string };
          if (ev?.type) {
            handlers.onEvent(ev as { type: string; [key: string]: unknown });
          }
        } catch {
          // ignore malformed frames
        }
      };

      ws.onclose = () => {
        if (activeSocket === ws) activeSocket = null;
        ws = null;
        if (!closed) scheduleReconnect();
      };

      ws.onerror = () => {
        ws?.close();
      };
    });
  }

  function disconnect() {
    closed = true;
    clearReconnect();
    if (ws) {
      ws.onclose = null;
      ws.close();
      if (activeSocket === ws) activeSocket = null;
      ws = null;
    }
  }

  connect();

  const unsubToken = subscribeStoredToken(() => {
    if (closed) return;
    backoff = MIN_BACKOFF_MS;
    clearReconnect();
    connect();
  });

  const onVisibility = () => {
    if (closed) return;
    if (document.visibilityState !== "visible") {
      // Stay connected in background so notifications + desktop toasts work
      // while the user is on another browser tab.
      return;
    }
    backoff = MIN_BACKOFF_MS;
    clearReconnect();
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      connect();
    }
    handlers.onReconnect?.();
  };

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisibility);
  }

  return () => {
    closed = true;
    unsubToken();
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", onVisibility);
    }
    disconnect();
  };
}
