import { ApiError } from "@/lib/api/core";
import { transferApi, type JobState } from "./api";
import { fetchDescriptor } from "./descriptor";
import { downloadBatch } from "./download";
import { closeLocally, finishWithSeal, hasRoomFor, isQuotaError, openSourceInventory, sendDestinationInventory, sleep } from "./importer-steps";
import { journalFor, readJob, saveJob, type ImportJob } from "./jobs";
import { processMediaBatch } from "./process-media";
import { processMessageBatch } from "./process-messages";
import { dropStagedBatch } from "./staging";
import { decodeEnvelope, openEnvelope } from "./v2-crypto";

/**
 * The destination's side of one job, from wherever the journal says it got to.
 *
 * ```
 * waiting   poll until the phone approves (5 min), open the envelope
 * batch n   download + stage + ack → (finalized) descriptor → activate → commit
 * final     open the seal, check it names this batch, apply its deletions, complete
 * ```
 *
 * Every step is recorded before the next begins, so a reload resumes; the
 * server's view is re-read on every pass, and a server ack is never taken as
 * proof that this browser still holds anything.
 */
export type ImportTick = { job: ImportJob; batch?: number; held?: number; chunks?: number; batchKind?: string };

const POLL_MS = 2000;

export async function runImport(
  userId: string,
  jobId: string,
  onTick: (tick: ImportTick) => void,
  signal: AbortSignal,
): Promise<ImportJob> {
  const loaded = await readJob(userId, jobId);
  if (!loaded) throw new Error("import job not found");
  const job: ImportJob = loaded;
  const save = async () => {
    await saveJob(userId, job);
    onTick({ job });
  };
  let failures = 0;

  while (!signal.aborted) {
    let state: JobState;
    try {
      state = await transferApi.job(job.id);
      failures = 0;
      if (job.status === "paused" && job.pauseReason === "offline") {
        job.status = job.transferKey ? "receiving" : "waiting";
        job.pauseReason = undefined;
        await save();
      }
    } catch (error) {
      if (error instanceof ApiError) return settleClosed(userId, job, error, save);
      failures += 1;
      if (failures >= 3 && job.status !== "paused") {
        job.status = "paused";
        job.pauseReason = "offline";
        await save();
      }
      await sleep(Math.min(30_000, 1000 * 2 ** failures), signal);
      continue;
    }
    const transfer = state.transfer;
    if (transfer.status === "cancelled" || transfer.status === "denied") {
      await closeLocally(userId, job, "cancelled");
      await save();
      return job;
    }
    if (transfer.status === "expired" || (!state.live && transfer.status !== "completed")) {
      await closeLocally(userId, job, "expired");
      await save();
      return job;
    }
    if (transfer.status === "pending") {
      await sleep(POLL_MS, signal);
      continue;
    }

    try {
      if (!job.transferKey) {
        job.transferKey = await openEnvelope(job.id, decodeEnvelope(transfer.transfer_envelope ?? ""), job.privateKey);
        job.status = "receiving";
        await save();
      }
      if (!job.destInventorySent) {
        await sendDestinationInventory(userId, job);
        job.destInventorySent = true;
        await save();
      }
      if (!job.inventory) {
        job.inventory = await openSourceInventory(job, state);
        if (job.inventory) await save();
      }

      let next = 0;
      while (job.batches[next]?.state === "committed") next += 1;
      const row = state.batches.find((b) => b.batch === next);
      if (!row) {
        await sleep(POLL_MS, signal);
        continue;
      }
      const journal = journalFor(job, next, row.kind, row.final);
      if (journal.state === "downloading" && row.status !== "committed") {
        if (!(await hasRoomFor(row.chunk_count * 4 * 1024 * 1024))) {
          job.status = "paused";
          job.pauseReason = "space";
          await save();
          return job;
        }
        const held = await downloadBatch({
          userId, jobId: job.id, batch: next, kind: row.kind, key: job.transferKey, signal,
          onStaged: (n) => onTick({ job, batch: next, held: n, chunks: row.chunk_count, batchKind: row.kind }),
        });
        if (row.status !== "finalized" || held < row.chunk_count) {
          await sleep(POLL_MS, signal);
          continue;
        }
        const descriptor = await fetchDescriptor(job.id, next, row.page_count, row.kind, row.chunk_count, job.transferKey);
        if (row.kind === "messages") {
          const done = await processMessageBatch(userId, job.id, descriptor);
          job.counts.messages += done.messages;
          job.counts.conversations += done.conversations;
        }
        if (descriptor.files.length > 0) {
          const media = await processMediaBatch(userId, job.id, descriptor);
          job.counts.filesReady += media.ready;
          job.counts.filesUnavailable += media.unavailable;
        }
        journal.state = "activated";
        await save();
      }
      if (journal.state !== "committed") {
        await transferApi.commit(job.id, next);
        journal.state = "committed";
        await dropStagedBatch(userId, job.id, next).catch(() => {});
        await save();
      }
      if (row.final) {
        const fresh = await transferApi.job(job.id);
        if (await finishWithSeal(userId, job, fresh, next)) {
          job.status = "finished";
          await save();
          return job;
        }
        await sleep(POLL_MS, signal);
      }
    } catch (error) {
      if (isQuotaError(error)) {
        job.status = "paused";
        job.pauseReason = "space";
        await save();
        return job;
      }
      if (error instanceof ApiError) return settleClosed(userId, job, error, save);
      job.error = error instanceof Error ? error.message : "import failed";
      failures += 1;
      if (failures >= 5) {
        job.status = "failed";
        await save();
        return job;
      }
      await sleep(Math.min(30_000, 1000 * 2 ** failures), signal);
    }
  }
  return job;
}

async function settleClosed(userId: string, job: ImportJob, error: ApiError, save: () => Promise<void>) {
  const closed = error.message === "history_transfer_closed" || error.message === "history_transfer_not_found";
  if (!closed && error.message !== "history_transfer_wrong_device") {
    job.status = "failed";
    job.error = error.message;
    await save();
    return job;
  }
  const status = (error.data?.data as { status?: string } | undefined)?.status;
  await closeLocally(userId, job, status === "cancelled" || status === "denied" ? "cancelled" : "expired");
  await save();
  return job;
}
