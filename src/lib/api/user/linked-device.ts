import { apiFetch, jsonHeaders } from "../core";
import type { ChatMessage, ChatPrivateOp } from "../types/chat";
import type { MessagingDevice } from "../types/messaging";

/**
 * Linked devices (server 0174): a browser that keeps its own copy registers
 * again with `keeps_archive` and from then on the server holds every message
 * until this browser has it too. Past four linked devices the server answers
 * 409 `linked_device_limit` with the list (`data.devices`).
 */
export function linkMessagingDevice(body: {
  device_id: string;
  platform: string;
  public_key: JsonWebKey;
}) {
  return apiFetch<MessagingDevice & { archive_at?: string | null }>("/api/messaging/devices", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ ...body, keeps_archive: true }),
  });
}

export type PrivatePending = {
  messages: ChatMessage[];
  ops: ChatPrivateOp[];
  has_more: boolean;
};

/** What this device still owes custody for, oldest first, 100 at a time. */
export function listPrivatePending(deviceId: string) {
  return apiFetch<PrivatePending>(
    `/api/chat/private/pending?device_id=${encodeURIComponent(deviceId)}`,
  );
}

/** This device's word that `ids` (messages and ops) are in its store. */
export function postPrivateCustody(deviceId: string, ids: string[]) {
  return apiFetch<{ stored: number }>("/api/chat/private/custody", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ device_id: deviceId, ids }),
  });
}

export type LinkedDeviceInfo = {
  device_id: string;
  platform: string;
  session_id: string;
  label: string;
  linked_at: string;
  last_seen_at: string;
};
