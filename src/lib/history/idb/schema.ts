/**
 * One IndexedDB database per account: `ababilx-history:<userId>`.
 *
 * Per account rather than one shared database with a user column, so that
 * signing out can delete the whole thing in one call and no query anywhere can
 * forget a `WHERE user = …` and read another account's history.
 *
 * Only lookup metadata lives in the clear (ids, conversation ids, sort times,
 * revision and state). Message and conversation JSON, file bytes and transfer
 * staging are sealed under the account's local key (`local-key.ts`).
 */
export const HISTORY_DB_PREFIX = "ababilx-history:";
export const HISTORY_DB_VERSION = 2;

export const S = {
  messages: "messages",
  conversations: "conversations",
  files: "files",
  fileChunks: "file_chunks",
  deletions: "deletions",
  cursors: "cursors",
  jobs: "jobs",
  staging: "staging",
  keys: "keys",
  meta: "meta",
} as const;

export type HistoryStore = (typeof S)[keyof typeof S];

export function historyDbName(userId: string) {
  return `${HISTORY_DB_PREFIX}${userId}`;
}

export function upgradeHistoryDb(db: IDBDatabase, tx: IDBTransaction | null) {
  const has = (name: string) => db.objectStoreNames.contains(name);
  if (!has(S.messages)) {
    const store = db.createObjectStore(S.messages, { keyPath: "id" });
    // Main timeline rows carry parent_id "" and sort by last activity, the
    // server's own order; thread rows carry their root and sort by creation.
    store.createIndex("by_feed", ["conversation_id", "parent_id", "sort_at", "id"]);
    store.createIndex("by_conversation", "conversation_id");
  }
  // v2: rows written by an import batch that has not been activated yet are
  // tagged, so the whole batch becomes visible in one write — or not at all.
  const messages = tx?.objectStore(S.messages);
  if (messages && !messages.indexNames.contains("by_activation")) {
    messages.createIndex("by_activation", "activation");
  }
  if (!has(S.conversations)) db.createObjectStore(S.conversations, { keyPath: "id" });
  if (!has(S.files)) db.createObjectStore(S.files, { keyPath: "url_key" });
  if (!has(S.fileChunks)) {
    db.createObjectStore(S.fileChunks, { keyPath: ["url_key", "n"] });
  }
  if (!has(S.deletions)) db.createObjectStore(S.deletions, { keyPath: "key" });
  if (!has(S.cursors)) db.createObjectStore(S.cursors, { keyPath: "conversation_id" });
  if (!has(S.jobs)) db.createObjectStore(S.jobs, { keyPath: "id" });
  if (!has(S.staging)) {
    db.createObjectStore(S.staging, { keyPath: ["job_id", "batch", "index"] });
  }
  if (!has(S.keys)) db.createObjectStore(S.keys, { keyPath: "id" });
  if (!has(S.meta)) db.createObjectStore(S.meta, { keyPath: "id" });
}
