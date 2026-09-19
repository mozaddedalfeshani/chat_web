import { HISTORY_DB_PREFIX, historyDbName } from "../idb/schema";
import { closeHistoryDb, retireHistoryDb } from "../idb/tx";

/**
 * Deleting an account's local history: messages, media, staging, cursors,
 * transfer jobs and the local key, in one `deleteDatabase`.
 *
 * Called on an EXPLICIT sign-out and on an account switch — never on a network
 * failure, a refresh or a forced 401, which would throw away an imported
 * archive the user never asked to lose.
 */
export async function deleteAccountHistory(userId: string) {
  if (!userId) return;
  retireHistoryDb(userId);
  await closeHistoryDb(userId);
  await deleteDatabase(historyDbName(userId));
}

/**
 * Removes every other account's history from this browser. A different
 * account signing in is an account switch; the previous account's history
 * must not stay behind on a machine it no longer owns a session on.
 */
export async function deleteOtherAccountsHistory(currentUserId: string) {
  if (!currentUserId || typeof indexedDB.databases !== "function") return;
  const keep = historyDbName(currentUserId);
  const all = await indexedDB.databases().catch(() => []);
  for (const entry of all) {
    const name = entry.name ?? "";
    if (name.startsWith(HISTORY_DB_PREFIX) && name !== keep) {
      await deleteDatabase(name).catch(() => {});
    }
  }
}

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    // Another tab still holds it open; its onversionchange closes it, after
    // which the delete completes on its own. Nothing to wait on here.
    request.onblocked = () => resolve();
  });
}
