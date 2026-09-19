import { ApiError } from "@/lib/api/core";
import { linkVerificationCode } from "@/lib/chat-e2ee/device-link";
import { transferApi } from "./api";
import { dropStagedJob } from "./staging";
import { emptyCounts, readJob, saveJob, type ImportJob } from "./jobs";
import { newDestinationKeys } from "./v2-crypto";

/**
 * Opening an import: an ephemeral key pair made here, the public half drawn
 * into the QR, the private half kept only in this browser's history database
 * (non-extractable). The phone reads the key off the screen, never from the
 * server — which is what lets the relay carry history it cannot read.
 */
export class TransferActiveElsewhere extends Error {
  constructor(readonly deviceName: string) {
    super("history_transfer_active");
  }
}

export function deviceName() {
  if (typeof navigator === "undefined") return "Web browser";
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Mac OS X/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} on ${os}` : browser;
}

export async function startImport(userId: string): Promise<ImportJob> {
  // Asked on the user's own action, as browsers expect. A refusal is fine —
  // the import still works; the browser may just evict it under pressure,
  // which the import screen says plainly.
  void navigator.storage?.persist?.().catch(() => false);
  const keys = await newDestinationKeys();
  let created;
  try {
    created = await transferApi.create(deviceName(), keys.param);
  } catch (error) {
    if (error instanceof ApiError && error.message === "history_transfer_active") {
      throw new TransferActiveElsewhere(String(error.data?.data && (error.data.data as Record<string, unknown>).destination_device_name || ""));
    }
    throw error;
  }
  const job: ImportJob = {
    id: created.id,
    status: "waiting",
    createdAt: Date.now(),
    expiresAt: Date.parse(created.expires_at),
    privateKey: keys.privateKey,
    publicParam: keys.param,
    qrPayload: `${created.scheme}${created.token}&k=${keys.param}&v=2`,
    code: await linkVerificationCode(keys.publicJwk),
    destInventorySent: false,
    batches: {},
    counts: emptyCounts(),
    updatedAt: Date.now(),
  };
  await saveJob(userId, job);
  return job;
}

/**
 * Cancelling keeps every batch already activated — that history is this
 * browser's now — and drops what was only staged. Signed URLs already handed
 * out stay valid until they expire (at most 15 minutes); cancelling stops new
 * ones and queues the relay objects for deletion.
 */
export async function cancelImport(userId: string, jobId: string) {
  try {
    await transferApi.cancel(jobId);
  } catch {
    /* already closed, or offline: expiry closes it server-side anyway */
  }
  const job = await readJob(userId, jobId);
  if (job) await saveJob(userId, { ...job, status: "cancelled" });
  await dropStagedJob(userId, jobId).catch(() => {});
}
