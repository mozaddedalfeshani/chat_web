import type { ChatMessage } from "@/lib/api/types/chat";
import { localKey } from "../idb/local-key";
import { S } from "../idb/schema";
import { openHistoryDb, readTx, req } from "../idb/tx";
import { openMessageRow, type MessageRow } from "./message-rows";
import { activatedKeys, isVisible } from "./activation";

/** A position in a feed: (sort_at, id), the index's own order. */
export type FeedPosition = [number, string];

export type LocalFeedPage = {
  /** Newest first for the main timeline, oldest first for a thread. */
  messages: ChatMessage[];
  /** The last row returned, to continue from. Null when nothing came back. */
  edge: FeedPosition | null;
};

type PageQuery = {
  conversationId: string;
  parentId?: string;
  /** Exclusive upper bound (main timeline, reading back in time). */
  before?: FeedPosition | null;
  /**
   * Inclusive lower bound. Set while the server still has older pages than
   * the ones merged, so a local read never jumps a range the server has not
   * filled in yet and shows imported rows around a hole.
   */
  floor?: FeedPosition | null;
  limit: number;
  direction?: "prev" | "next";
};

/** Null when the window is empty — `bound` throws on lower == open upper. */
function rangeFor(q: PageQuery): IDBKeyRange | null {
  const parent = q.parentId ?? "";
  const lower = q.floor ? [q.conversationId, parent, ...q.floor] : [q.conversationId, parent, -Infinity];
  const upper = q.before ? [q.conversationId, parent, ...q.before] : [q.conversationId, parent, Infinity];
  const order = indexedDB.cmp(lower, upper);
  if (order > 0 || (order === 0 && q.before)) return null;
  return IDBKeyRange.bound(lower, upper, false, !!q.before);
}

async function readRows(db: IDBDatabase, q: PageQuery): Promise<MessageRow[]> {
  const range = rangeFor(q);
  if (!range) return [];
  return readTx(db, [S.messages, S.meta], async (tx) => {
    const activated = await activatedKeys(tx);
    const index = tx.objectStore(S.messages).index("by_feed");
    const rows: MessageRow[] = [];
    await new Promise<void>((resolve, reject) => {
      const cursor = index.openCursor(range, q.direction ?? "prev");
      cursor.onerror = () => reject(cursor.error);
      cursor.onsuccess = () => {
        const current = cursor.result;
        if (!current || rows.length >= q.limit) return resolve();
        const row = current.value as MessageRow;
        if (isVisible(row, activated)) rows.push(row);
        current.continue();
      };
    });
    return rows;
  });
}

export async function readLocalFeed(userId: string, q: PageQuery): Promise<LocalFeedPage> {
  const db = await openHistoryDb(userId);
  const rows = await readRows(db, q);
  const key = await localKey(db);
  const opened = await Promise.all(rows.map((row) => openMessageRow(key, row)));
  const last = rows[rows.length - 1];
  return {
    messages: opened.filter((m): m is ChatMessage => !!m),
    edge: last ? [last.sort_at, last.id] : null,
  };
}

export async function readLocalMessage(userId: string, id: string): Promise<ChatMessage | null> {
  const db = await openHistoryDb(userId);
  const found = await readTx(db, [S.messages, S.meta], async (tx) => {
    const row = await req<MessageRow | undefined>(tx.objectStore(S.messages).get(id));
    return row && isVisible(row, await activatedKeys(tx)) ? row : undefined;
  });
  const row = found;
  if (!row) return null;
  return openMessageRow(await localKey(db), row);
}

/** Every stored conversation id with at least one message, for local-only discovery. */
export async function conversationsWithMessages(userId: string): Promise<Set<string>> {
  const db = await openHistoryDb(userId);
  return readTx(db, [S.messages], async (tx) => {
    const index = tx.objectStore(S.messages).index("by_conversation");
    const ids = new Set<string>();
    await new Promise<void>((resolve, reject) => {
      const cursor = index.openKeyCursor(null, "nextunique");
      cursor.onerror = () => reject(cursor.error);
      cursor.onsuccess = () => {
        const current = cursor.result;
        if (!current) return resolve();
        ids.add(String(current.key));
        current.continue();
      };
    });
    return ids;
  });
}
