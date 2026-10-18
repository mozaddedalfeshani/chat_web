import type { ChatMessage } from "@/lib/api/types/chat";
import { unwrapDMKey } from "@/lib/chat-e2ee/dm-key-envelope";
import { readKeys } from "@/lib/chat-e2ee/identity-state";
import { liveApi } from "./api";

/**
 * Opens every conversation key a batch of phone messages names, in ONE
 * request. Without it the first render of twenty chats asks the server
 * twenty times (more after rotations) before a single body can be drawn.
 * Keys land in the same memory cache `loadReadKey` reads, so the ordinary
 * decrypt path finds them there. Best effort: a miss falls back to that path.
 */
export async function prefetchKeys(userId: string, messages: ChatMessage[]) {
  const wanted = new Map<string, Set<number>>();
  const add = (conversationId: string, version: number | undefined) => {
    if (!version || readKeys.has(`${conversationId}:${version}`)) return;
    const set = wanted.get(conversationId) ?? new Set<number>();
    set.add(version);
    wanted.set(conversationId, set);
  };
  for (const m of messages) {
    if (m.encryption_version === 1) add(m.conversation_id, m.encryption_key_version);
    for (const a of m.attachments ?? []) add(m.conversation_id, a.enc_key_version);
  }
  if (wanted.size === 0) return;
  const items = [...wanted].map(([conversation_id, versions]) => ({
    conversation_id,
    versions: [...versions].slice(0, 64),
  }));
  try {
    for (let i = 0; i < items.length; i += 500) {
      const { envelopes } = await liveApi.keys(items.slice(i, i + 500));
      await Promise.all(
        envelopes.map(async (item) => {
          try {
            const key = await unwrapDMKey(item.envelope, userId);
            readKeys.set(`${item.conversation_id}:${item.key_version}`, key);
          } catch {
            /* the per-version path reports an unreadable envelope */
          }
        }),
      );
    }
  } catch {
    /* an older server, or offline: per-conversation reads still work */
  }
}
