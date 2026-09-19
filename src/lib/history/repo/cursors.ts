import { S } from "../idb/schema";
import { openHistoryDb, readTx, req, writeTx } from "../idb/tx";

/**
 * How far background server sync has read back through one conversation.
 *
 * `done` and `empty` are different answers and both are success: `empty` is a
 * conversation the server had nothing for (an empty server history is a valid
 * case, not an error), `done` is one read to its oldest page. `failed` keeps
 * its cursor, so a retry resumes rather than starting over.
 */
export type SyncCursor = {
  conversation_id: string;
  state: "pending" | "running" | "done" | "empty" | "failed";
  /** The server's opaque cursor for the next older page; "" before the first. */
  cursor: string;
  pages: number;
  messages: number;
  /** Newest message creation time this sync has stored. */
  newest_at?: string;
  error?: string;
  updated_at: number;
};

export async function readSyncCursors(userId: string): Promise<Map<string, SyncCursor>> {
  const db = await openHistoryDb(userId);
  const rows = await readTx(db, [S.cursors], (tx) =>
    req<SyncCursor[]>(tx.objectStore(S.cursors).getAll()),
  );
  return new Map(rows.map((row) => [row.conversation_id, row]));
}

export async function writeSyncCursor(userId: string, cursor: SyncCursor) {
  const db = await openHistoryDb(userId);
  await writeTx(db, [S.cursors], (tx) => {
    tx.objectStore(S.cursors).put({ ...cursor, updated_at: Date.now() });
  });
}

/** Small key/value rows: the transfer lease, the settled-sync flag. */
export async function readMeta<T>(userId: string, id: string): Promise<T | undefined> {
  const db = await openHistoryDb(userId);
  const row = await readTx(db, [S.meta], (tx) =>
    req<{ id: string; value: T } | undefined>(tx.objectStore(S.meta).get(id)),
  );
  return row?.value;
}

export async function writeMeta<T>(userId: string, id: string, value: T) {
  const db = await openHistoryDb(userId);
  await writeTx(db, [S.meta], (tx) => {
    tx.objectStore(S.meta).put({ id, value });
  });
}
