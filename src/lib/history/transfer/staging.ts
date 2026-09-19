import { localKey, openBytes, sealBytes, type Sealed } from "../idb/local-key";
import { S } from "../idb/schema";
import { openHistoryDb, readTx, req, writeTx } from "../idb/tx";

/**
 * Downloaded chunk plaintext, held until its batch activates.
 *
 * Re-sealed under the account's local key the moment it is opened: the relay
 * copy was sealed under the transfer key, which is only good for this job, and
 * plaintext never touches IndexedDB. `stageChunk` resolves when the write's
 * TRANSACTION completes — only then may the chunk be acknowledged.
 */
type StagedRow = { job_id: string; batch: number; index: number; payload: Sealed };

const label = (job: string, batch: number, index: number) => `history-staging:${job}:${batch}:${index}`;

export async function stageChunk(userId: string, job: string, batch: number, index: number, plain: Uint8Array) {
  const db = await openHistoryDb(userId);
  const key = await localKey(db);
  const payload = await sealBytes(key, plain as BufferSource, label(job, batch, index));
  await writeTx(db, [S.staging], (tx) => {
    tx.objectStore(S.staging).put({ job_id: job, batch, index, payload } satisfies StagedRow);
  });
}

export async function readStagedChunk(userId: string, job: string, batch: number, index: number) {
  const db = await openHistoryDb(userId);
  const row = await readTx(db, [S.staging], (tx) =>
    req<StagedRow | undefined>(tx.objectStore(S.staging).get([job, batch, index])),
  );
  if (!row) return null;
  return new Uint8Array(await openBytes(await localKey(db), row.payload, label(job, batch, index)));
}

/** Which indexes of a batch this browser actually holds — the local truth. */
export async function stagedIndexes(userId: string, job: string, batch: number): Promise<Set<number>> {
  const db = await openHistoryDb(userId);
  const keys = await readTx(db, [S.staging], (tx) =>
    req(tx.objectStore(S.staging).getAllKeys(IDBKeyRange.bound([job, batch, 0], [job, batch, Infinity]))),
  );
  return new Set(keys.map((k) => (k as [string, number, number])[2]));
}

export async function dropStagedBatch(userId: string, job: string, batch: number) {
  const db = await openHistoryDb(userId);
  await writeTx(db, [S.staging], (tx) => {
    tx.objectStore(S.staging).delete(IDBKeyRange.bound([job, batch, 0], [job, batch, Infinity]));
  });
}

export async function dropStagedJob(userId: string, job: string) {
  const db = await openHistoryDb(userId);
  await writeTx(db, [S.staging], (tx) => {
    tx.objectStore(S.staging).delete(IDBKeyRange.bound([job, -Infinity, -Infinity], [job, Infinity, Infinity]));
  });
}
