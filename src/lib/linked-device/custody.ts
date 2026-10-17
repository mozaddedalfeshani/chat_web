import { api } from "@/lib/api";
import type { ChatMessage } from "@/lib/api/types/chat";
import { decryptChatMessages } from "@/lib/chat-e2ee/crypto";
import { persistRawMessages } from "@/store/chat-feed-history";
import { forgetLocalAssets } from "@/lib/history/media/local-asset";
import { keepMessageMedia } from "./media";
import { applyStoredOp } from "./ops";

/**
 * A linked browser's custody (server 0160/0173/0174): pull what this device
 * still owes, put it in the durable store, download its files, apply its ops,
 * then say so — and only then may the server let it go. The same pull a phone
 * runs; a message this browser was never shown (tab closed, socket down) is
 * taken here before the 30-day cap takes it instead.
 *
 * Never custody for something not on disk: a store write or a file download
 * that failed leaves the item pending, and the next pull tries again.
 * Messages are drained before ops, so an op's target is already stored when
 * the op is applied. Custody POSTs at most 200 ids; a pending page is 100.
 */
const MAX_PAGES = 50;
const PAUSE_MS = 150;
/** The server's pending page size: a shorter page holds every pending message. */
const PENDING_PAGE = 100;

type Run = { userId: string; deviceId: string };

let running: Promise<void> | null = null;
let queued: Run | null = null;
/** Bumped by stopCustody: a drain from before it stops at its next step. */
let generation = 0;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Starts a pull, or queues one more (for the latest caller) after the pull in flight. */
export function pullCustody(run: Run): Promise<void> {
  if (running) {
    queued = run;
    return running;
  }
  const gen = generation;
  running = (async () => {
    let next: Run | null = run;
    try {
      while (next && gen === generation) {
        queued = null;
        await drain(next, () => gen !== generation);
        next = queued;
      }
    } finally {
      running = null;
    }
    // A pull asked for after a sign-out ended this one starts on its own.
    const late = queued;
    if (late) {
      queued = null;
      void pullCustody(late).catch(() => {});
    }
  })();
  return running;
}

/** Sign-out or account switch: the pull in flight stops at its next step. */
export function stopCustody() {
  generation += 1;
  queued = null;
}

async function drain({ userId, deviceId }: Run, stopped: () => boolean) {
  for (let page = 0; page < MAX_PAGES && !stopped(); page += 1) {
    const pending = await api.listPrivatePending(deviceId);
    const taken = await keepMessages(userId, pending.messages);
    // The store would not take the texts: stop, so nothing below acts on
    // messages that are not on disk. The next pull tries again.
    if (taken === null || stopped()) return;
    if (taken.length > 0) {
      await api.postPrivateCustody(deviceId, taken);
      await sleep(PAUSE_MS);
      continue;
    }
    // No message left to take (none pending, or every one still waiting —
    // a timed photo, a file that keeps failing; all are stored, so ops on
    // them find their target). Ops come after messages, a page at a time.
    // A full page of waiting messages may hide newer pending ones, so then
    // an op whose target is not stored yet is left for a later pull.
    const allSeen = pending.messages.length < PENDING_PAGE;
    const settled: string[] = [];
    for (const op of pending.ops) {
      if (stopped()) return;
      if (await applyStoredOp(userId, op, allSeen).catch(() => false)) settled.push(op.id);
    }
    if (settled.length > 0) await api.postPrivateCustody(deviceId, settled);
    if (!pending.has_more || settled.length === 0) return;
    await sleep(PAUSE_MS);
  }
}

/**
 * The ids of `raw` now in the store with every file kept; null when the
 * store refused the texts themselves.
 */
async function keepMessages(userId: string, raw: ChatMessage[]): Promise<string[] | null> {
  if (raw.length === 0) return [];
  // The durable copy is the sealed one, as every other write path keeps it.
  if (!(await persistRawMessages(userId, raw))) return null;
  // Opening the bodies also opens each encrypted file's key, which the
  // download needs; the opened copies are never written anywhere.
  const opened = await decryptChatMessages(raw, userId);
  const taken: string[] = [];
  let stored = false;
  for (const message of opened) {
    const outcome = await keepMessageMedia(userId, message);
    if (outcome.stored) stored = true;
    if (outcome.result === "kept") taken.push(message.id);
  }
  // Tiles that drew the CDN copy re-read the store once per page, not per file.
  if (stored) forgetLocalAssets();
  return taken;
}
