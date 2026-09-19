import type { ChatMessage } from "@/lib/api/types/chat";
import { readLocalFeed } from "./messages-read";

/**
 * Keyword search over the durable history, newest first per conversation.
 *
 * Stored rows are sealed, and E2EE bodies are ciphertext inside that, so a
 * search must open and decrypt what it scans — there is no index to query. It
 * is therefore bounded: at most `scanPerConversation` newest rows each, first
 * hit per conversation, cancelled by the caller when the query changes. The
 * rows imported from the phone are what makes this worth doing: the server
 * search cannot see anything past six months.
 */
export type StoredSearchHit = { conversationId: string; messageId: string; snippet: string };

type Options = {
  scanPerConversation?: number;
  isCancelled?: () => boolean;
  decrypt: (messages: ChatMessage[]) => Promise<ChatMessage[]>;
  toText: (body: string) => string;
};

function snippetAround(body: string, index: number, needle: number) {
  const start = Math.max(0, index - 24);
  const end = Math.min(body.length, index + needle + 36);
  return `${start > 0 ? "…" : ""}${body.slice(start, end)}${end < body.length ? "…" : ""}`;
}

export async function searchStoredHistory(
  userId: string,
  conversationIds: string[],
  query: string,
  options: Options,
): Promise<Map<string, StoredSearchHit>> {
  const needle = query.trim().toLowerCase();
  const hits = new Map<string, StoredSearchHit>();
  if (!needle) return hits;
  const budget = options.scanPerConversation ?? 1500;
  for (const conversationId of conversationIds) {
    let edge = null;
    let scanned = 0;
    while (scanned < budget && !hits.has(conversationId)) {
      if (options.isCancelled?.()) return hits;
      const page = await readLocalFeed(userId, { conversationId, limit: 100, before: edge });
      if (page.messages.length === 0) break;
      scanned += page.messages.length;
      edge = page.edge;
      const opened = await options.decrypt(page.messages.filter((m) => !m.deleted_at));
      for (const message of opened) {
        if (message.decryption_failed) continue;
        const text = options.toText(message.body ?? "");
        const at = text.toLowerCase().indexOf(needle);
        if (at >= 0) {
          hits.set(conversationId, {
            conversationId,
            messageId: message.id,
            snippet: snippetAround(text, at, needle.length),
          });
          break;
        }
      }
    }
  }
  return hits;
}
