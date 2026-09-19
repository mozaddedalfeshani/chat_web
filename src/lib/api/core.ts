export const API_BASE = "/backend";

const SESSION_FLAG_COOKIE = "abx_in";
const TOKEN_MAX_AGE = 30 * 24 * 60 * 60;

const tokenListeners = new Set<() => void>();

function emitStoredTokenChange() {
  tokenListeners.forEach((listener) => listener());
}

function readSessionFlag(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .some((part) => part.trim() === `${SESSION_FLAG_COOKIE}=1`);
}

/** True when this browser has a Next session cookie. Not the Go JWT. */
export function getStoredToken(): string | null {
  return readSessionFlag() ? "session" : null;
}

export function subscribeStoredToken(onChange: () => void): () => void {
  tokenListeners.add(onChange);
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onChange);
  }
  return () => {
    tokenListeners.delete(onChange);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onChange);
    }
  };
}

export function getStoredTokenServerSnapshot(): boolean {
  return false;
}

export function getStoredTokenClientSnapshot(): boolean {
  return readSessionFlag();
}

export function persistStoredToken(_token?: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_FLAG_COOKIE}=1; Path=/; Max-Age=${TOKEN_MAX_AGE}; SameSite=Lax`;
  emitStoredTokenChange();
}

export function clearStoredToken() {
  if (typeof document === "undefined") return;
  localStorage.removeItem("lbot_token");
  document.cookie = `${SESSION_FLAG_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  document.cookie = "lbot_token=; Path=/; Max-Age=0; SameSite=Lax";
  emitStoredTokenChange();
}

export function logout() {
  if (typeof window === "undefined") return;
  clearWsAccessToken();
  void fetch(`${API_BASE}/auth/logout`, {
    method: "POST",
    credentials: "include",
  }).catch(() => {});
  localStorage.removeItem("ababilx_chat_prefs");
  localStorage.removeItem("ababilx_chat_local_index");
  window.dispatchEvent(new Event("ababilx:logout"));
  clearStoredToken();
}

export async function exchangeAuthCode(code: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ code }),
    });
    if (!res.ok) return false;
    const json = await res.json().catch(() => null);
    if (!json?.success) return false;
    persistStoredToken();
    return true;
  } catch {
    return false;
  }
}

let wsTicket: { token: string; at: number } | null = null;

/** Access JWT for the WebSocket handshake. Kept in memory, not storage. */
export async function getWsAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (wsTicket && Date.now() - wsTicket.at < 50_000) return wsTicket.token;
  const res = await fetch(`${API_BASE}/session/ws`, { credentials: "include" });
  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  const token = json?.token as string | undefined;
  if (!token) return null;
  wsTicket = { token, at: Date.now() };
  return token;
}

export function clearWsAccessToken() {
  wsTicket = null;
}

export class ApiError extends Error {
  data: Record<string, unknown>;
  status: number;
  constructor(code: string, data: Record<string, unknown>, status = 0) {
    super(code);
    this.name = "ApiError";
    this.data = data;
    this.status = status;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: init?.headers,
  });

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      logout();
      window.location.href = "/";
    }
    throw new Error("unauthorized");
  }

  const json = await res.json().catch(() => null);
  if (!json || !json.success) {
    throw new ApiError(json?.error ?? "api error", json ?? {}, res.status);
  }
  return json.data as T;
}

export const jsonHeaders = { "Content-Type": "application/json" } as const;
