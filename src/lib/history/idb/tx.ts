import { historyDbName, upgradeHistoryDb, HISTORY_DB_VERSION } from "./schema";

/**
 * Transaction plumbing.
 *
 * **A write is done when its transaction completes, not when its request
 * succeeds.** A request's success means the value was accepted into a
 * transaction that can still abort — on quota, on a crash, on the tab closing.
 * Anything that is about to tell the server "I have this" (an ack, a commit)
 * must wait for `complete`, which is what `txDone` resolves on.
 */
export function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("indexeddb transaction failed"));
    tx.onabort = () => reject(tx.error ?? new DOMException("aborted", "AbortError"));
  });
}

export function req<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const handles = new Map<string, Promise<IDBDatabase>>();
// Databases this tab has deleted. A write still in flight after sign-out (a
// WebSocket event, a background page) would otherwise recreate the database,
// with a fresh key, for an account that has just left.
const retired = new Set<string>();

export function retireHistoryDb(userId: string) {
  retired.add(historyDbName(userId));
}

export function openHistoryDb(userId: string): Promise<IDBDatabase> {
  if (!userId) return Promise.reject(new Error("history store needs a signed-in account"));
  const name = historyDbName(userId);
  if (retired.has(name)) return Promise.reject(new Error("history store was signed out"));
  let handle = handles.get(name);
  if (!handle) {
    handle = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name, HISTORY_DB_VERSION);
      request.onupgradeneeded = () => upgradeHistoryDb(request.result, request.transaction);
      request.onsuccess = () => {
        const db = request.result;
        // Another tab deleting this account's history (sign-out) or upgrading
        // it must not be blocked by a handle held open here.
        db.onversionchange = () => {
          db.close();
          handles.delete(name);
        };
        db.onclose = () => handles.delete(name);
        resolve(db);
      };
      request.onerror = () => {
        handles.delete(name);
        reject(request.error);
      };
      request.onblocked = () => {
        handles.delete(name);
        reject(new Error("history store is blocked by another tab"));
      };
    });
    handles.set(name, handle);
  }
  return handle;
}

/** Closes and forgets this tab's handle, so a delete is not blocked by it. */
export async function closeHistoryDb(userId: string) {
  const name = historyDbName(userId);
  const handle = handles.get(name);
  handles.delete(name);
  if (!handle) return;
  try {
    (await handle).close();
  } catch {
    /* never opened */
  }
}

/**
 * Runs `body` inside one readwrite transaction and resolves on `complete`.
 *
 * `body` may await only IndexedDB requests (`req(...)`). Awaiting anything
 * else — WebCrypto, a fetch, a timer — lets the transaction auto-commit
 * half-way, and the next request throws `TransactionInactiveError`. Seal
 * payloads BEFORE opening the transaction.
 */
export async function writeTx(
  db: IDBDatabase,
  stores: string[],
  body: (tx: IDBTransaction) => void | Promise<void>,
): Promise<void> {
  const tx = db.transaction(stores, "readwrite");
  const done = txDone(tx);
  try {
    await body(tx);
  } catch (error) {
    try {
      tx.abort();
    } catch {
      /* already finished */
    }
    await done.catch(() => {});
    throw error;
  }
  await done;
}

export async function readTx<T>(
  db: IDBDatabase,
  stores: string[],
  body: (tx: IDBTransaction) => Promise<T>,
): Promise<T> {
  const tx = db.transaction(stores, "readonly");
  const done = txDone(tx);
  const result = await body(tx);
  await done;
  return result;
}
