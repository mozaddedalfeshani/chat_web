import { apiFetch, jsonHeaders } from "@/lib/api/core";
import type { VoiceIceServer } from "@/lib/api/types/voice-call";
import type { ChatE2EEKeyEnvelope } from "@/lib/api/types/chat-e2ee";

/**
 * The HTTP half of a live history link (server 0175,
 * `ababilx-server/docs/history-live-protocol.md`). Everything else travels
 * over the realtime socket (signals) and the data channel (history).
 */
export type LiveLink = {
  id: string;
  role: "source" | "destination";
  version: number;
  source_device_name: string;
  window_days: number;
  created_at: string;
  ice_servers: VoiceIceServer[];
  /** Destination only: the transfer key sealed to this browser's `h`. */
  transfer_envelope?: string;
};

export const liveApi = {
  link: (id: string) => apiFetch<LiveLink>(`/api/messaging/history-live/${id}`),
  unlink: (id: string) =>
    apiFetch<unknown>(`/api/messaging/history-live/${id}`, { method: "DELETE" }),
  /** Many conversations' key envelopes in one read. */
  keys: (items: { conversation_id: string; versions: number[] }[]) =>
    apiFetch<{ envelopes: { conversation_id: string; key_version: number; envelope: ChatE2EEKeyEnvelope }[] }>(
      "/api/chat/e2ee-keys/batch",
      { method: "POST", headers: jsonHeaders, body: JSON.stringify({ items }) },
    ),
};
