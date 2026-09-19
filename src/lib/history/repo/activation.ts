import { S } from "../idb/schema";
import { req } from "../idb/tx";

/**
 * Which import batches are visible. A batch's rows are written tagged with
 * its activation key, and the batch becomes visible when ONE meta row naming
 * that key is written — so a crash half-way through writing a validated batch
 * shows none of it, never a plausible-looking half.
 */
const PREFIX = "activated:";

export const activationMetaId = (key: string) => `${PREFIX}${key}`;

/** Must run inside a transaction that includes the meta store. */
export async function activatedKeys(tx: IDBTransaction): Promise<Set<string>> {
  const range = IDBKeyRange.bound(PREFIX, `${PREFIX}￿`);
  const keys = await req(tx.objectStore(S.meta).getAllKeys(range));
  return new Set(keys.map((k) => String(k).slice(PREFIX.length)));
}

export function isVisible(row: { activation?: string }, activated: Set<string>) {
  return !row.activation || activated.has(row.activation);
}
