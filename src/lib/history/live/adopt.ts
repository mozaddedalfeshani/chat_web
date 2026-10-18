import { ApiError } from "@/lib/api/core";
import { useHistoryImportStore, viewOf } from "@/store/history-import-store";
import { saveJob, type ImportJob } from "../transfer/jobs";
import { decodeEnvelope, openEnvelope } from "../transfer/v2-crypto";
import { liveApi } from "./api";
import { dialUntilBooted, saveLink } from "./session";

/**
 * After a one-scan sign-in the phone answers the transfer one of two ways:
 * a live link (this build) or the v2 relay (an older phone). The server says
 * which — `GET /api/messaging/history-live/:id`:
 *
 * ```
 * 404 history_live_not_ready   the phone has not answered yet: ask again
 * 200                          live: open the envelope with h, connect
 * anything else                the relay: the ordinary v2 import runs
 * ```
 *
 * One decision per job, shared by the login page and the chat screen.
 */
export type Transport = "live" | "relay";

const POLL_MS = 1000;
const decisions = new Map<string, Promise<Transport>>();

export function decideTransport(userId: string, job: ImportJob): Promise<Transport> {
  let decision = decisions.get(job.id);
  if (!decision) {
    decision = decide(userId, job);
    decisions.set(job.id, decision);
  }
  return decision;
}

async function decide(userId: string, job: ImportJob): Promise<Transport> {
  while (Date.now() < job.expiresAt) {
    try {
      const info = await liveApi.link(job.id);
      if (!info.transfer_envelope) {
        console.warn("[history-live] link has no envelope, using the relay");
        return "relay";
      }
      const key = await openEnvelope(job.id, decodeEnvelope(info.transfer_envelope), job.privateKey);
      // The phone names itself in its hello; the transfer's device name is
      // this browser's own, so it is not used as the phone's label.
      const link = { id: info.id, key, deviceName: "", windowDays: info.window_days };
      await saveLink(userId, link);
      // The relay job is answered: nothing will ever be uploaded for it.
      const done: ImportJob = { ...job, status: "finished", updatedAt: Date.now() };
      await saveJob(userId, done);
      useHistoryImportStore.getState().setView(viewOf(done));
      console.info(`[history-live] linked ${link.id}`);
      void dialUntilBooted(userId, link);
      return "live";
    } catch (error) {
      const waiting = error instanceof ApiError && error.message === "history_live_not_ready";
      // Offline, a 5xx, a refusal to open the envelope mid-boot: ask again.
      const transient =
        !(error instanceof ApiError) || error.status === 0 || error.status >= 500 || error.status === 429;
      if (!waiting && !transient) {
        console.warn("[history-live] no live link, using the relay", error);
        return "relay";
      }
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
  return "relay";
}
