import { mergeMarkers, type ChatDeletion } from "../markers";
import { storeDeletionMarkers } from "../repo/deletions";
import { dropUnactivated } from "../repo/import-stage";
import { applyDeletionMarkers } from "../repo/messages-write";
import { readyFiles } from "../repo/files";
import { transferApi, type JobState } from "./api";
import { dropStagedJob } from "./staging";
import { saveJob, type ImportJob } from "./jobs";
import { aad, openJson, sealJson } from "./v2-crypto";

export const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => { clearTimeout(timer); resolve(); }, { once: true });
  });

/** Room for a batch: its staged copy plus the activated copy, with headroom. */
export async function hasRoomFor(bytes: number): Promise<boolean> {
  const estimate = await navigator.storage?.estimate?.().catch(() => null);
  if (!estimate?.quota) return true;
  return estimate.quota - (estimate.usage ?? 0) > bytes * 2.2 + (64 << 20);
}

export function isQuotaError(error: unknown) {
  return error instanceof DOMException && (error.name === "QuotaExceededError" || error.name === "UnknownError");
}

/** The files this browser already holds, sealed for the phone to skip. */
export async function sendDestinationInventory(userId: string, job: ImportJob) {
  if (!job.destInventoryCiphertext) {
    const files = await readyFiles(userId);
    job.destInventoryCiphertext = await sealJson(job.transferKey!, aad.destInventory(job.id), {
      v: 2,
      complete_files: files,
    });
    await saveJob(userId, job);
  }
  await transferApi.putDestInventory(job.id, job.destInventoryCiphertext);
}

export async function openSourceInventory(job: ImportJob, state: JobState) {
  const sealed = state.transfer.inventory_ciphertext;
  if (!sealed || !job.transferKey) return undefined;
  return openJson<NonNullable<ImportJob["inventory"]>>(job.transferKey, aad.inventory(job.id), sealed);
}

type Seal = { v: number; transfer_id: string; last_batch: number; files_missing: number; files_omitted: number; deletions: ChatDeletion[] };

/**
 * The job seal names the last batch. Finishing without it — or with a seal
 * naming another batch — could report a truncated sequence as complete.
 */
export async function finishWithSeal(userId: string, job: ImportJob, state: JobState, finalBatch: number) {
  const sealed = state.transfer.manifest_ciphertext;
  if (!sealed) return false;
  const seal = await openJson<Seal>(job.transferKey!, aad.seal(job.id), sealed);
  if (seal.v !== 2 || seal.transfer_id !== job.id || seal.last_batch !== finalBatch) {
    throw new Error("the transfer's seal does not match the batches received");
  }
  const markers = mergeMarkers(seal.deletions ?? []);
  await storeDeletionMarkers(userId, markers).catch(() => {});
  await applyDeletionMarkers(userId, markers);
  await transferApi.complete(job.id).catch((error) => {
    // Completed already (a lost response on a previous attempt) reads as closed.
    if (!(error instanceof Error && error.message === "history_transfer_closed")) throw error;
  });
  return true;
}

/** A job the server closed: keep activated history, drop anything staged. */
export async function closeLocally(userId: string, job: ImportJob, status: ImportJob["status"]) {
  for (const [batch, journal] of Object.entries(job.batches)) {
    if (journal.state === "downloading") await dropUnactivated(userId, `${job.id}:${batch}`).catch(() => {});
  }
  await dropStagedJob(userId, job.id).catch(() => {});
  job.status = status;
}
