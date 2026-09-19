import type { ChatMessage } from "@/lib/api/types/chat";
import type { ChatDeletion } from "../markers";
import { decideMerge } from "../merge";
import { localKey } from "../idb/local-key";
import { S } from "../idb/schema";
import { openHistoryDb, req, writeTx } from "../idb/tx";
import { activatedKeys, activationMetaId, isVisible } from "./activation";
import { buildMessageRow, rowSide, type MessageRow } from "./message-rows";

/**
 * A phone batch lands in three steps:
 *
 * ```
 * stage     new messages written tagged, invisible; replacements collected
 * activate  one meta row — the whole batch appears at once
 * replace   the collected edits merged through the ordinary contract
 * ```
 *
 * New rows are the history a crash must never show half of, so they wait for
 * the single activating write. A replacement is a newer copy of a message that
 * is already visible; applying some before a crash shows an older edit of a
 * message for a moment, never a hole — so it runs after activation, through
 * `mergeMessages`, which re-decides against whatever is stored by then.
 */
export async function stageImportedMessages(
  userId: string,
  messages: ChatMessage[],
  activation: string,
  markers: ChatDeletion[],
): Promise<ChatMessage[]> {
  const valid = messages.filter((m) => m?.id && m.conversation_id && m.created_at);
  if (valid.length === 0) return [];
  const db = await openHistoryDb(userId);
  const key = await localKey(db);
  const rows = await Promise.all(valid.map((m) => buildMessageRow(key, m, "phone")));
  const replacements: ChatMessage[] = [];
  await writeTx(db, [S.messages, S.meta], async (tx) => {
    const store = tx.objectStore(S.messages);
    const activated = await activatedKeys(tx);
    for (let i = 0; i < valid.length; i += 1) {
      const stored = await req<MessageRow | undefined>(store.get(valid[i].id));
      const existing = stored && isVisible(stored, activated) ? stored : undefined;
      const decision = decideMerge(existing ? rowSide(existing) : null, { provenance: "phone", message: valid[i] }, markers);
      if (decision === "insert" && !existing) {
        // A staged row of another, unactivated batch is replaced by this one.
        store.put({ ...rows[i], activation });
      } else if (decision === "replace") {
        replacements.push(valid[i]);
      } else if (decision === "suppress" && existing) {
        store.delete(valid[i].id);
      }
    }
  });
  return replacements;
}

/** The single write that makes a staged batch visible. Idempotent. */
export async function activateImport(userId: string, activation: string) {
  const db = await openHistoryDb(userId);
  await writeTx(db, [S.meta], (tx) => {
    tx.objectStore(S.meta).put({ id: activationMetaId(activation), value: Date.now() });
  });
}

/**
 * Removes what a batch staged but never activated — a cancelled import, or a
 * batch whose later validation failed. Activated rows are never touched.
 */
export async function dropUnactivated(userId: string, activation: string) {
  const db = await openHistoryDb(userId);
  let dropped = 0;
  await writeTx(db, [S.messages, S.meta], async (tx) => {
    const activated = await activatedKeys(tx);
    if (activated.has(activation)) return;
    const index = tx.objectStore(S.messages).index("by_activation");
    const keys = await req(index.getAllKeys(IDBKeyRange.only(activation)));
    const store = tx.objectStore(S.messages);
    for (const k of keys) store.delete(k);
    dropped = keys.length;
  });
  return dropped;
}
