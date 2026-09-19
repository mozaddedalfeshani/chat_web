"use client";

import { useChatStore } from "@/store/chat-store";
import { useHistoryImportStore, viewOf } from "@/store/history-import-store";
import { forgetLocalAssets } from "@/lib/history/media/local-asset";
import { cancelImport, startImport, TransferActiveElsewhere } from "@/lib/history/transfer/importer-start";
import { runImport } from "@/lib/history/transfer/importer-run";
import { latestOpenJob, readJob, type ImportJob } from "@/lib/history/transfer/jobs";

/**
 * One import per account per browser. The Web Locks API decides which tab
 * runs it; the others read the same durable journal and only watch. A lock is
 * released when its tab closes, so a crashed tab never strands the import.
 */
let running: AbortController | null = null;

const lockName = (userId: string) => `ababilx-history-import:${userId}`;

async function underLock(userId: string, run: () => Promise<void>): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request(lockName(userId), { ifAvailable: true }, async (lock) => {
      if (!lock) return false;
      await run();
      return true;
    });
  }
  await run();
  return true;
}

function refreshChat(job: ImportJob) {
  // A batch just became visible: the sidebar may have new (phone-only)
  // conversations, and bubbles on screen may now have local files.
  forgetLocalAssets();
  const chat = useChatStore.getState();
  void chat.fetchSidebar({ silent: true });
  if (chat.activeConversationId) void chat.loadFeed(chat.activeConversationId, null, { force: true });
  useHistoryImportStore.getState().setView(viewOf(job));
}

export async function resumeImport(userId: string, jobId: string) {
  if (running) return;
  const store = useHistoryImportStore.getState();
  const controller = new AbortController();
  running = controller;
  let committed = -1;
  try {
    const ran = await underLock(userId, async () => {
      store.setOtherTab(false);
      await runImport(userId, jobId, (tick) => {
        const done = Object.values(tick.job.batches).filter((b) => b.state === "committed").length;
        if (done !== committed) {
          committed = done;
          refreshChat(tick.job);
        }
        useHistoryImportStore.getState().setView(viewOf(tick.job));
        if (tick.batch !== undefined) {
          useHistoryImportStore.getState().setTick({
            batch: tick.batch, held: tick.held ?? 0, chunks: tick.chunks ?? 0, kind: tick.batchKind ?? "",
          });
        }
      }, controller.signal);
    });
    if (!ran) store.setOtherTab(true);
  } finally {
    running = null;
    const job = await readJob(userId, jobId).catch(() => undefined);
    if (job) refreshChat(job);
  }
}

export async function beginImport(userId: string) {
  const store = useHistoryImportStore.getState();
  store.setStarting(true);
  try {
    const job = await startImport(userId);
    store.setView(viewOf(job));
    store.setStarting(false);
    void resumeImport(userId, job.id);
  } catch (error) {
    store.setStarting(false, error instanceof TransferActiveElsewhere ? "active" : error instanceof Error ? error.message : "failed");
  }
}

export async function stopImport(userId: string) {
  const view = useHistoryImportStore.getState().view;
  running?.abort();
  if (!view) return;
  await cancelImport(userId, view.id);
  const job = await readJob(userId, view.id);
  if (job) useHistoryImportStore.getState().setView(viewOf(job));
}

/** On load: show the last job, and pick up one this tab can continue. */
export async function restoreImport(userId: string) {
  const job = await latestOpenJob(userId).catch(() => undefined);
  if (!job) return;
  useHistoryImportStore.getState().setView(viewOf(job));
  if (job.status === "receiving" || (job.status === "paused" && job.pauseReason === "offline")) {
    void resumeImport(userId, job.id);
  }
}

/** Another tab owns the lock: follow its progress through the journal. */
export async function pollJournal(userId: string) {
  const view = useHistoryImportStore.getState().view;
  if (!view) return;
  const job = await readJob(userId, view.id).catch(() => undefined);
  if (job) useHistoryImportStore.getState().setView(viewOf(job));
}
