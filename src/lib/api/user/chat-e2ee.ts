import { apiFetch, jsonHeaders } from "../core";
import type {
  ChatE2EEBackfillItem,
  ChatE2EEConversationKeyStatus,
  ChatE2EEConversationMembers,
  ChatE2EEIdentityEnvelope,
  ChatE2EEKeyEnvelope,
  ChatE2EELinkOffer,
  ChatE2EELinkPoll,
  ChatE2EERecoveryVault,
  ChatE2EEVaultStatus,
  ChatE2EEWrappedValue,
} from "../types/chat";

export function getChatE2EEVault() {
  return apiFetch<ChatE2EEVaultStatus>("/api/chat/e2ee/vault");
}

/**
 * Publishes a device-local identity: the public key only. There is no private
 * half to send — it is generated in this browser and stays here — which is why
 * secure messages need no PIN.
 */
export function putChatE2EEIdentity(publicKey: JsonWebKey) {
  return apiFetch<void>("/api/teams/chat/e2ee/vault", {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify({ public_key: publicKey }),
  });
}

/**
 * Publishes the identity together with its private key wrapped by the user's
 * recovery code, or re-wraps the same identity under a newly generated one.
 *
 * The code itself never appears in this request — only ciphertext the server
 * cannot open. That is what keeps the scheme end-to-end while still letting a
 * second machine catch up.
 */
export function putChatE2EERecoveryVault(body: {
  public_key: JsonWebKey;
  wrapped_key: ChatE2EEWrappedValue;
  salt: string;
  version: number;
}) {
  return apiFetch<void>("/api/chat/e2ee/vault/recovery", {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify(body),
  });
}

/** Sheds the retired PIN-wrapped copy once this device holds the identity. */
export function deleteChatE2EEWrappedKey() {
  return apiFetch<void>("/api/teams/chat/e2ee/vault/wrapped", {
    method: "DELETE",
  });
}

/** Opens a link handshake for this device and returns the token to draw. */
export function createChatE2EELink(deviceName: string) {
  return apiFetch<ChatE2EELinkOffer>("/api/chat/e2ee/link", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ device_name: deviceName }),
  });
}

export function pollChatE2EELink(token: string) {
  return apiFetch<ChatE2EELinkPoll>("/api/chat/e2ee/link/poll", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ token }),
  });
}

/** What the approving device is about to hand a key to. */
export function inspectChatE2EELink(token: string) {
  return apiFetch<{ device_name: string; created_at: string; expires_at: string }>(
    "/api/chat/e2ee/link/info",
    { method: "POST", headers: jsonHeaders, body: JSON.stringify({ token }) },
  );
}

export function approveChatE2EELink(
  token: string,
  identityEnvelope: ChatE2EEIdentityEnvelope,
) {
  return apiFetch<void>("/api/chat/e2ee/link/approve", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ token, identity_envelope: identityEnvelope }),
  });
}

export function denyChatE2EELink(token: string) {
  return apiFetch<void>("/api/chat/e2ee/link/deny", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ token }),
  });
}

export function requestChatE2EEResetCode() {
  return apiFetch<{ email: string; expires_in: number }>(
    "/api/teams/chat/e2ee/reset/code",
    { method: "POST" },
  );
}

/**
 * Replaces the account's message identity after an emailed code. Destructive:
 * everything encrypted to the old identity stays unreadable, here and forever.
 */
export function resetChatE2EEVault(body: {
  code: string;
  public_key: JsonWebKey;
  recovery: ChatE2EERecoveryVault;
}) {
  return apiFetch<{ identity_changed: boolean }>("/api/teams/chat/e2ee/reset", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(body),
  });
}

export function getChatE2EEPublicKey(userId: string) {
  return apiFetch<{ public_key: JsonWebKey }>(
    `/api/chat/e2ee/users/${userId}/public-key`,
  );
}

export function getChatE2EEConversationKey(conversationId: string) {
  return apiFetch<ChatE2EEConversationKeyStatus>(
    `/api/chat/conversations/${conversationId}/e2ee-key`,
  );
}

export function createChatE2EEConversationKey(
  conversationId: string,
  envelopes: Record<string, ChatE2EEKeyEnvelope>,
) {
  return apiFetch<{ key_version: number; envelope: ChatE2EEKeyEnvelope }>(
    `/api/chat/conversations/${conversationId}/e2ee-key`,
    {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ envelopes }),
    },
  );
}

/**
 * Hands existing conversation keys to members who cannot read them.
 *
 * Called by a device that still holds the key after somebody else started a
 * fresh identity — their envelopes were dropped by the reset, but the keys
 * themselves survived here. The server refuses any version the caller does not
 * hold and never overwrites an envelope already in place.
 */
export function backfillChatE2EEConversationKey(
  conversationId: string,
  envelopes: ChatE2EEBackfillItem[],
) {
  return apiFetch<{ inserted: number }>(
    `/api/chat/conversations/${conversationId}/e2ee-key/backfill`,
    {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ envelopes }),
    },
  );
}

/**
 * Every member of a conversation with the public identity a key must be sealed
 * to, plus the members who have none.
 *
 * A DM never needed this — peer_user_id plus one public-key fetch was the whole
 * roster. A group has no such shortcut, and asking per member would be one
 * request per person on every rotation, which happens whenever anybody joins,
 * leaves or resets their identity.
 */
export function getChatE2EEConversationMembers(conversationId: string) {
  return apiFetch<ChatE2EEConversationMembers>(
    `/api/chat/conversations/${conversationId}/e2ee-members`,
  );
}
