// Encrypted chat files, downloaded and decrypted for display.
//
// An encrypted attachment is never drawn from its URL — that address serves
// ciphertext. It is fetched, decrypted chunk by chunk as it arrives and held
// as a `blob:` URL, in memory only: nothing decrypted is written to storage
// by this app. One download per file however many tiles show it.
import { openChunks } from "./file-cipher";
import { ATTACHMENT_SEALED_CHUNK_BYTES, AttachmentCipherError } from "./format";
import { forgetSealedFiles, safeBlobType, sealedFileFor } from "./sealed-files";

export type SealedAsset = {
  /** `blob:` address of the decrypted file, once there is one. */
  src: string | null;
  status: "idle" | "loading" | "ready" | "failed";
};

type Entry = { asset: SealedAsset; bytes: number; usedAt: number; load?: Promise<string> };

/**
 * How much decrypted media is kept before the least recently shown is let
 * go. A released file is simply decrypted again when it is next on screen.
 */
const BUDGET_BYTES = 512 * 1024 * 1024;

const IDLE: SealedAsset = { src: null, status: "idle" };
const LOADING: SealedAsset = { src: null, status: "loading" };
const FAILED: SealedAsset = { src: null, status: "failed" };

const entries = new Map<string, Entry>();
const listeners = new Set<() => void>();
let clock = 0;

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeSealedAssets(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The current state of one file. Stable between changes, so it can be a store snapshot. */
export function sealedAsset(fileUrl: string): SealedAsset {
  const entry = entries.get(fileUrl);
  if (!entry) return IDLE;
  entry.usedAt = ++clock;
  return entry.asset;
}

function release(fileUrl: string) {
  const entry = entries.get(fileUrl);
  if (entry?.asset.src) URL.revokeObjectURL(entry.asset.src);
  entries.delete(fileUrl);
}

function trim(keep: string) {
  let total = 0;
  for (const entry of entries.values()) total += entry.bytes;
  const oldestFirst = [...entries.entries()]
    .filter(([url, entry]) => url !== keep && entry.asset.status === "ready")
    .sort((a, b) => a[1].usedAt - b[1].usedAt);
  for (const [url, entry] of oldestFirst) {
    if (total <= BUDGET_BYTES) break;
    total -= entry.bytes;
    release(url);
  }
}

function settle(fileUrl: string, blob: Blob) {
  const src = URL.createObjectURL(blob);
  entries.set(fileUrl, {
    asset: { src, status: "ready" },
    bytes: blob.size,
    usedAt: ++clock,
  });
  trim(fileUrl);
  emit();
  return src;
}

async function* bodyChunks(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return;
      if (value) yield value;
    }
  } finally {
    reader.cancel().catch(() => {});
  }
}

async function download(fileUrl: string): Promise<Blob> {
  const file = sealedFileFor(fileUrl);
  if (!file) throw new AttachmentCipherError("no key for this file on this device");
  // No credentials: the object is public ciphertext on the CDN, and the
  // session cookie has no business travelling there.
  const response = await fetch(fileUrl, { credentials: "omit" });
  if (!response.ok || !response.body) {
    throw new Error(`Could not download file (${response.status})`);
  }
  // The length is the sender's word. It has to fit inside the object before
  // anything is decrypted against it.
  const declared = Number(response.headers.get("Content-Length") ?? "");
  if (declared > 0 && file.plainSize > declared) {
    throw new AttachmentCipherError("stated size does not fit");
  }
  const parts: BlobPart[] = [];
  let pending: Uint8Array<ArrayBuffer>[] = [];
  let pendingBytes = 0;
  const flush = () => {
    // Folded into a Blob every few megabytes, so the browser — not the JS
    // heap — holds a large video while the rest of it is still arriving.
    if (pending.length) parts.push(new Blob(pending));
    pending = [];
    pendingBytes = 0;
  };
  for await (const clear of openChunks(bodyChunks(response.body), file.key, file.plainSize)) {
    pending.push(clear);
    pendingBytes += clear.length;
    if (pendingBytes >= 64 * ATTACHMENT_SEALED_CHUNK_BYTES) flush();
  }
  flush();
  return new Blob(parts, { type: safeBlobType(file.contentType) });
}

/**
 * Downloads and decrypts one file, once. Resolves to its `blob:` URL; rejects
 * when the key is not on this device, the download fails, or the object does
 * not authenticate — in which case nothing of it is kept.
 */
export function loadSealedAsset(fileUrl: string): Promise<string> {
  const existing = entries.get(fileUrl);
  if (existing?.asset.src) return Promise.resolve(existing.asset.src);
  if (existing?.load) return existing.load;
  const entry: Entry = { asset: LOADING, bytes: 0, usedAt: ++clock };
  entry.load = download(fileUrl).then(
    (blob) => {
      // Signed out, or released, while it was downloading.
      if (entries.get(fileUrl) !== entry) throw new Error("cancelled");
      return settle(fileUrl, blob);
    },
    (error) => {
      if (entries.get(fileUrl) === entry) {
        entries.set(fileUrl, { asset: FAILED, bytes: 0, usedAt: ++clock });
        emit();
      }
      throw error;
    },
  );
  entries.set(fileUrl, entry);
  emit();
  return entry.load;
}

/**
 * Files the plaintext this browser just encrypted under its upload's URL, so
 * the sender's own photo is drawn from the copy already here instead of being
 * downloaded and decrypted straight back.
 */
export function adoptSealedAsset(fileUrl: string, plain: Blob, contentType: string) {
  if (!fileUrl || entries.get(fileUrl)?.asset.src) return;
  settle(fileUrl, plain.slice(0, plain.size, safeBlobType(contentType)));
}

/** A failed download is tried again the next time the file is shown. */
function forgetFailures() {
  let changed = false;
  for (const [url, entry] of entries) {
    if (entry.asset.status !== "failed") continue;
    entries.delete(url);
    changed = true;
  }
  if (changed) emit();
}

export function forgetSealedAssets() {
  for (const url of [...entries.keys()]) release(url);
  forgetSealedFiles();
  emit();
}

if (typeof window !== "undefined") {
  window.addEventListener("online", forgetFailures);
  // Decrypted files and their keys belong to the account that signed out.
  window.addEventListener("ababilx:logout", forgetSealedAssets);
}
