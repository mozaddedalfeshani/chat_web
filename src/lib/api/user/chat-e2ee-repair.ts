import { apiFetch, jsonHeaders } from "../core";

/**
 * Tells the server this account's envelope at `keyVersion` does not open under
 * `publicKey`, the identity this browser holds. The server drops the row only
 * while that is still the account's published identity — which hands the
 * version to the ordinary rotation and backfill repairs.
 */
export function reportUnreadableChatE2EEEnvelope(
  conversationId: string,
  keyVersion: number,
  publicKey: JsonWebKey,
) {
  return apiFetch<{ removed: boolean }>(
    `/api/teams/chat/conversations/${conversationId}/e2ee-key/unreadable`,
    {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ key_version: keyVersion, public_key: publicKey }),
    },
  );
}

/** Conversations where this account holds a key version another member lost. */
export function getChatE2EEFillableGaps() {
  return apiFetch<{ conversation_ids: string[] }>("/api/teams/chat/e2ee/gaps");
}
