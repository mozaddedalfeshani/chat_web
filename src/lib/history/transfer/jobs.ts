import { S } from "../idb/schema";
import { openHistoryDb, readTx, req, writeTx } from "../idb/tx";

/**
 * The destination's durable journal of one import. The server's state says
 * what the relay holds; this says what THIS browser holds — and a server ack
 * alone never proves the local copy still exists, so resume reconciles the two.
 *
 * Both keys are CryptoKeys stored by structured clone and non-extractable, so
 * a reload can resume and no script can read either one out. Nothing here goes
 * near localStorage.
 */
export type BatchJournal = {
  kind: "messages" | "media";
  final: boolean;
  /** downloading → activated → committed. */
  state: "downloading" | "activated" | "committed";
  /** Chunk indexes whose plaintext is durably staged (and so safe to ack). */
  staged: number[];
  acked: number[];
};

export type ImportCounts = {
  messages: number;
  conversations: number;
  filesReady: number;
  filesUnavailable: number;
  filesExpected: number;
};

export type ImportJob = {
  id: string;
  status: "waiting" | "receiving" | "paused" | "finished" | "cancelled" | "expired" | "failed";
  pauseReason?: "offline" | "space" | "phone";
  createdAt: number;
  expiresAt: number;
  privateKey: CryptoKey;
  publicParam: string;
  qrPayload: string;
  code: string;
  transferKey?: CryptoKey;
  destInventorySent: boolean;
  /** Persisted before the first PUT so retries resend byte-identical bytes. */
  destInventoryCiphertext?: string;
  /** Final batch awaiting the job seal/completion handshake. */
  finalizingBatch?: number;
  inventory?: { messages: number; files: number; file_bytes: number; message_bytes_estimate: number; missing_files: number };
  batches: Record<number, BatchJournal>;
  counts: ImportCounts;
  error?: string;
  updatedAt: number;
};

export const emptyCounts = (): ImportCounts => ({
  messages: 0, conversations: 0, filesReady: 0, filesUnavailable: 0, filesExpected: 0,
});

export async function saveJob(userId: string, job: ImportJob) {
  const db = await openHistoryDb(userId);
  await writeTx(db, [S.jobs], (tx) => {
    tx.objectStore(S.jobs).put({ ...job, updatedAt: Date.now() });
  });
}

export async function readJob(userId: string, id: string): Promise<ImportJob | undefined> {
  const db = await openHistoryDb(userId);
  return readTx(db, [S.jobs], (tx) => req<ImportJob | undefined>(tx.objectStore(S.jobs).get(id)));
}

/** The newest job still worth resuming, if any. */
export async function latestOpenJob(userId: string): Promise<ImportJob | undefined> {
  const db = await openHistoryDb(userId);
  const all = await readTx(db, [S.jobs], (tx) => req<ImportJob[]>(tx.objectStore(S.jobs).getAll()));
  return all
    .filter((j) => j.status === "waiting" || j.status === "receiving" || j.status === "paused")
    .sort((a, b) => b.createdAt - a.createdAt)[0];
}

export function journalFor(job: ImportJob, batch: number, kind: BatchJournal["kind"], final: boolean) {
  job.batches[batch] ??= { kind, final, state: "downloading", staged: [], acked: [] };
  return job.batches[batch];
}
