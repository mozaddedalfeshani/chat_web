import { getFile, readFileRange } from "../repo/files";
import { attachmentUrlKey } from "../url-key";
import { historyEnabled } from "../flag";

/**
 * Where an attachment is drawn from. A file imported from the phone is served
 * out of this browser (the media worker, with Range, so video seeks); anything
 * else keeps its network URL. A file the phone did not have is `unavailable` —
 * a final answer the bubble shows as such, never a spinner that never ends.
 */
export type LocalAsset = { src: string | null; unavailable: boolean };

const WORKER = "/history-media-sw.js";
const BLOB_LIMIT = 64 << 20;
const memo = new Map<string, LocalAsset>();
let worker: Promise<boolean> | null = null;

/** True once a worker controls this page and can answer /__history-media/. */
export function ensureHistoryMediaWorker(): Promise<boolean> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return Promise.resolve(false);
  worker ??= navigator.serviceWorker
    .register(WORKER, { scope: "/" })
    .then(() => navigator.serviceWorker.ready)
    .then(() => !!navigator.serviceWorker.controller)
    .catch(() => false);
  return worker;
}

const memoKey = (userId: string, url: string) => `${userId}|${url}`;

export function peekLocalAsset(userId: string, url: string): LocalAsset | undefined {
  return memo.get(memoKey(userId, url));
}

/** Called when an import activates files, so bubbles on screen pick them up. */
export function forgetLocalAssets() {
  memo.clear();
  if (typeof window !== "undefined") window.dispatchEvent(new Event("ababilx:history-files"));
}

async function blobFor(userId: string, key: string, size: number, type: string) {
  const parts: Uint8Array[] = [];
  for await (const part of readFileRange(userId, key, 0, size)) parts.push(part.slice());
  return URL.createObjectURL(new Blob(parts as BlobPart[], { type }));
}

export async function resolveLocalAsset(userId: string, url: string): Promise<LocalAsset> {
  const network: LocalAsset = { src: url || null, unavailable: false };
  if (!userId || !url || !historyEnabled()) return network;
  const found = memo.get(memoKey(userId, url));
  if (found) return found;
  let result = network;
  try {
    const key = await attachmentUrlKey(url);
    const file = key ? await getFile(userId, key) : undefined;
    if (file?.status === "unavailable") {
      result = { src: url, unavailable: true };
    } else if (file?.status === "ready") {
      if (await ensureHistoryMediaWorker()) {
        result = { src: `/__history-media/${encodeURIComponent(userId)}/${key}`, unavailable: false };
      } else if (file.size <= BLOB_LIMIT) {
        // No worker (private window, blocked): small files as a blob. A large
        // video stays on its network URL rather than filling memory.
        result = { src: await blobFor(userId, key, file.size, file.content_type), unavailable: false };
      }
    }
  } catch {
    result = network;
  }
  memo.set(memoKey(userId, url), result);
  return result;
}
