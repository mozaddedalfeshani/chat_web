import type { ChatDeletion } from "../markers";
import { mergeMarkers } from "../markers";
import { S } from "../idb/schema";
import { openHistoryDb, readTx, req, writeTx } from "../idb/tx";

/**
 * The account's deletion markers, mirrored into the history database.
 *
 * `localStorage` stays the synchronous copy the live feed filters with; this
 * one is what the transfer importer reads inside the same database it
 * activates batches into, so "refresh markers, then activate" never races a
 * tab that has not loaded the newer list. Markers hold ids and times only.
 */
type MarkerRow = ChatDeletion & { key: string };

const keyOf = (m: ChatDeletion) => `${m.conversation_id}:${m.message_id}`;

export async function storeDeletionMarkers(userId: string, markers: ChatDeletion[]) {
  if (markers.length === 0) return;
  const db = await openHistoryDb(userId);
  await writeTx(db, [S.deletions], async (tx) => {
    const store = tx.objectStore(S.deletions);
    const current = await req<MarkerRow[]>(store.getAll());
    for (const marker of mergeMarkers(current, markers)) {
      store.put({ ...marker, key: keyOf(marker) });
    }
  });
}

export async function readDeletionMarkers(userId: string): Promise<ChatDeletion[]> {
  const db = await openHistoryDb(userId);
  const rows = await readTx(db, [S.deletions], (tx) =>
    req<MarkerRow[]>(tx.objectStore(S.deletions).getAll()),
  );
  return rows.map((row) => ({
    conversation_id: row.conversation_id,
    message_id: row.message_id,
    through_at: row.through_at,
    deleted_at: row.deleted_at,
    entire_conversation: row.entire_conversation,
  }));
}
