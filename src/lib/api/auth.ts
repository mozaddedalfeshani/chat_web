import { API_BASE, getStoredToken } from "./core";

const SLACK_RETURN_KEY = "slack_return_to";

// Mints a one-time ticket so the browser-redirect connect flow can identify the
// user without putting the JWT in the URL. Returns "" if it can't (caller falls
// back to the legacy ?token= param).
async function fetchConnectTicket(): Promise<string> {
  if (!getStoredToken()) return "";
  try {
    const res = await fetch(`${API_BASE}/api/auth/connect-ticket`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return "";
    const json = await res.json().catch(() => null);
    return json?.success && json.ticket ? (json.ticket as string) : "";
  } catch {
    return "";
  }
}

function resolveSlackReturnPath(explicit?: string): string {
  return explicit ?? "/user/settings";
}

export function consumeSlackReturnPath(): string {
  if (typeof window === "undefined") return "/user/settings";
  const stored = localStorage.getItem(SLACK_RETURN_KEY);
  localStorage.removeItem(SLACK_RETURN_KEY);
  return stored ?? "/user/settings";
}

export function loginWithGitHub() {
  window.location.href = `${API_BASE}/auth/github`;
}

export async function connectGitHub() {
  const ticket = await fetchConnectTicket();
  const suffix = ticket ? `?ticket=${encodeURIComponent(ticket)}` : "";
  window.location.href = `${API_BASE}/auth/github${suffix}`;
}

export async function connectSlack(returnTo?: string) {
  if (!getStoredToken()) return;
  localStorage.setItem(SLACK_RETURN_KEY, resolveSlackReturnPath(returnTo));
  const ticket = await fetchConnectTicket();
  const suffix = ticket ? `?ticket=${encodeURIComponent(ticket)}` : "";
  window.location.href = `${API_BASE}/auth/slack${suffix}`;
}
