import { API_BASE, jsonHeaders, persistStoredToken } from "./core";
import type { ChatE2EEIdentityEnvelope } from "./types/chat-e2ee";

export type QrLoginStatus = "pending" | "approved" | "denied" | "expired";

export type QrLoginPoll = {
  status: QrLoginStatus;
  /** One-scan QR: the phone's message identity, sealed to this tab's `k`. */
  identityEnvelope?: ChatE2EEIdentityEnvelope;
};

export type QrLoginSession = {
  token: string;
  qrPayload: string;
  expiresAt: number;
  pollIntervalMs: number;
};

/** Creates a QR handshake; the payload is what the phone scans. */
export async function createQrLoginSession(
  deviceName?: string
): Promise<QrLoginSession> {
  const res = await fetch(`${API_BASE}/auth/qr/session`, {
    method: "POST",
    headers: jsonHeaders,
    credentials: "include",
    body: JSON.stringify({ device_name: deviceName ?? "" }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || "Failed to start QR login");
  }
  return {
    token: data.token as string,
    qrPayload: (data.qr_payload as string) ?? (data.token as string),
    expiresAt: new Date(data.expires_at as string).getTime(),
    pollIntervalMs: Math.max(1, Number(data.poll_interval) || 2) * 1000,
  };
}

/**
 * Polls one handshake. The Next BFF exchanges the one-time code and sets
 * httpOnly cookies; this client only learns that the phone approved.
 */
export async function pollQrLogin(token: string): Promise<QrLoginPoll> {
  const res = await fetch(`${API_BASE}/auth/qr/poll`, {
    method: "POST",
    headers: jsonHeaders,
    credentials: "include",
    body: JSON.stringify({ token }),
  });
  if (res.status === 429) return { status: "pending" };
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || "QR login failed");
  }
  const status = data.status as QrLoginStatus;
  if (status === "approved") persistStoredToken();
  return {
    status,
    identityEnvelope: data.identity_envelope ?? undefined,
  };
}
