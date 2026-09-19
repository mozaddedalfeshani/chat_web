import type { ChatMessage } from "@/lib/api/types/chat";
import { markerMatches, type ChatDeletion } from "../markers";
import { decideMerge, type MergeDecision, type Provenance } from "../merge";
import { localKey } from "../idb/local-key";
import { S } from "../idb/schema";
import { openHistoryDb, req, writeTx } from "../idb/tx";
import { buildMessageRow, rowSide, type MessageRow } from "./message-rows";
import { activatedKeys, isVisible } from "./activation";

export type MergeCounts = Record<MergeDecision, number>;

/**
 * Merges messages into the account's durable history.
 *
 * Payloads are sealed first, then every decision is made and written inside
 * ONE transaction that re-reads each existing row — so two tabs, or a page and
 * a WebSocket event landing together, cannot both decide against a row the
 * other is about to replace. Resolves when that transaction has completed.
 */
export async function mergeMessages(
  userId: string,
  messages: ChatMessage[],
  provenance: Provenance,
  markers: ChatDeletion[],
): Promise<MergeCounts> {
  const counts: MergeCounts = { insert: 0, replace: 0, keep: 0, suppress: 0 };
  const valid = messages.filter((m) => m?.id && m.conversation_id && m.created_at);
  if (valid.length === 0) return counts;
  const db = await openHistoryDb(userId);
  const key = await localKey(db);
  const rows = await Promise.all(valid.map((m) => buildMessageRow(key, m, provenance)));
  await writeTx(db, [S.messages, S.meta], async (tx) => {
    const store = tx.objectStore(S.messages);
    const activated = await activatedKeys(tx);
    for (let i = 0; i < valid.length; i += 1) {
      const incoming = valid[i];
      const stored = await req<MessageRow | undefined>(store.get(incoming.id));
      // A row staged by an import that has not activated is not history yet:
      // a live copy arriving meanwhile simply takes its place.
      const existing = stored && isVisible(stored, activated) ? stored : undefined;
      const decision = decideMerge(existing ? rowSide(existing) : null, { provenance, message: incoming }, markers);
      counts[decision] += 1;
      if (decision === "insert" || decision === "replace") store.put(rows[i]);
      else if (decision === "suppress" && existing) store.delete(incoming.id);
    }
  });
  return counts;
}

/**
 * Applies explicit deletions to what is already stored. Absence from a server
 * page is never a deletion; only a marker is.
 */
export async function applyDeletionMarkers(userId: string, markers: ChatDeletion[]) {
  if (markers.length === 0) return 0;
  const db = await openHistoryDb(userId);
  const conversations = [...new Set(markers.map((m) => m.conversation_id))];
  let removed = 0;
  await writeTx(db, [S.messages], async (tx) => {
    const index = tx.objectStore(S.messages).index("by_conversation");
    for (const conversationId of conversations) {
      const scoped = markers.filter((m) => m.conversation_id === conversationId);
      await new Promise<void>((resolve, reject) => {
        const cursor = index.openCursor(IDBKeyRange.only(conversationId));
        cursor.onerror = () => reject(cursor.error);
        cursor.onsuccess = () => {
          const current = cursor.result;
          if (!current) return resolve();
          const row = current.value as MessageRow;
          if (markerMatches(row, scoped)) {
            current.delete();
            removed += 1;
          }
          current.continue();
        };
      });
    }
  });
  return removed;
}

/**
 * Forgets one stored message after a live `chat.message.deleted`. The marker
 * recorded beside it (`rememberDeletedMessage`) is what stops a later import
 * or sync from writing it back.
 */
export async function forgetMessage(userId: string, messageId: string) {
  const db = await openHistoryDb(userId);
  await writeTx(db, [S.messages], (tx) => {
    tx.objectStore(S.messages).delete(messageId);
  });
}

/** Drops every stored message of one conversation (group deleted). */
export async function deleteConversationMessages(userId: string, conversationId: string) {
  const db = await openHistoryDb(userId);
  await writeTx(db, [S.messages, S.conversations, S.cursors], async (tx) => {
    const index = tx.objectStore(S.messages).index("by_conversation");
    const keys = await req(index.getAllKeys(IDBKeyRange.only(conversationId)));
    const store = tx.objectStore(S.messages);
    for (const key of keys) store.delete(key);
    tx.objectStore(S.conversations).delete(conversationId);
    tx.objectStore(S.cursors).delete(conversationId);
  });
}
