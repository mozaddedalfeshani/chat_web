/**
 * Explicit-deletion markers, as `/api/me/chat-deletions` serves them.
 *
 * Pure on purpose: the merge contract, the durable store and the live feed all
 * ask the same question — "did this account delete this?" — and one answer
 * written three times is how a deleted message comes back through the path
 * that was forgotten.
 */
export interface ChatDeletion {
  conversation_id: string;
  message_id: string;
  through_at: string;
  deleted_at: string;
  entire_conversation: boolean;
}

type MarkedMessage = { id: string; conversation_id: string; created_at: string };

/**
 * Microseconds since the epoch. Postgres writes six fractional digits and
 * `Date.parse` keeps three, so two messages in the same millisecond would
 * compare equal against a clear's `through_at` without the tail.
 */
export function timestampMicros(value: string): number {
  const fraction = value.match(/\.(\d+)(?:Z|[+-]\d\d:\d\d)$/)?.[1] ?? "";
  return Date.parse(value) * 1000 + Number(fraction.padEnd(6, "0").slice(3, 6));
}

/** True when one of the markers removes this message for this account. */
export function markerMatches(message: MarkedMessage, markers: ChatDeletion[]): boolean {
  let created: number | null = null;
  for (const item of markers) {
    if (item.conversation_id !== message.conversation_id) continue;
    if (item.message_id) {
      if (item.message_id === message.id) return true;
      continue;
    }
    if (item.entire_conversation) return true;
    created ??= timestampMicros(message.created_at);
    if (created <= timestampMicros(item.through_at)) return true;
  }
  return false;
}

/** Newest marker per (conversation, message) — the server's own upsert key. */
export function mergeMarkers(...lists: ChatDeletion[][]): ChatDeletion[] {
  const merged = new Map<string, ChatDeletion>();
  for (const list of lists) {
    for (const item of list) {
      const key = `${item.conversation_id}:${item.message_id}`;
      const previous = merged.get(key);
      if (!previous || Date.parse(item.deleted_at) >= Date.parse(previous.deleted_at)) {
        merged.set(key, item);
      }
    }
  }
  return [...merged.values()];
}
