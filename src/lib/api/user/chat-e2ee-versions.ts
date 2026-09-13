import { apiFetch } from "../core";
import type { ChatE2EEKeyVersions } from "../types/chat";

/**
 * This account's own envelopes for exactly `versions` of a conversation key.
 *
 * `getChatE2EEConversationKey` answers "what do I seal with?" and returns the
 * newest version alone. A message sealed before a rotation needs the version it
 * names, and this is the only place the server hands a retired one back.
 */
export function getChatE2EEConversationKeyVersions(
  conversationId: string,
  versions: number[],
) {
  const query = encodeURIComponent(versions.join(","));
  return apiFetch<ChatE2EEKeyVersions>(
    `/api/teams/chat/conversations/${conversationId}/e2ee-keys?versions=${query}`,
  );
}
