import type { ChatMessage, ChatMessageAttachment } from "@/lib/api/types/chat";
import { loadSealedAsset } from "@/lib/chat-attachments/sealed-assets";
import {
  getFile,
  markSegmentDone,
  PIECE,
  verifyFile,
  writeFileSlice,
} from "@/lib/history/repo/files";
import { Sha256 } from "@/lib/history/sha256";
import { attachmentUrlKey } from "@/lib/history/url-key";

/**
 * A linked browser downloads every new file on arrival, as a phone does: the
 * server deletes its copy once every custody device has the message, and a
 * file this browser did not take would be gone with it. Kept in the same
 * sealed file store the phone import writes, under the url key every platform
 * shares, so the timeline draws it exactly like an imported file.
 *
 * An encrypted file (server 0168) is decrypted first and kept as the file
 * itself — the store is sealed under this browser's local key, and the reader
 * (`useAttachmentAsset`) treats a stored copy as the plaintext, as it does for
 * an import.
 */
export type MediaOutcome = "kept" | "wait" | "failed";

export type Withheld = ChatMessageAttachment & {
  view_seconds?: number | null;
  expired?: boolean;
};

/**
 * Every file of `message` is in the store, or has nothing left to fetch.
 * `stored` says whether this call wrote a file, so the caller can refresh
 * the tiles drawing them once per page.
 */
export async function keepMessageMedia(
  userId: string,
  message: ChatMessage,
): Promise<{ result: MediaOutcome; stored: boolean }> {
  let result: MediaOutcome = "kept";
  let stored = false;
  for (const attachment of message.attachments ?? []) {
    const outcome = await keepAttachment(userId, attachment as Withheld);
    if (outcome === "stored") stored = true;
    if (outcome === "failed") return { result: "failed", stored };
    if (outcome === "wait") result = "wait";
  }
  return { result, stored };
}

/**
 * What custody needs for one file, before any I/O.
 *
 *   wait        a timed photo whose URL is withheld until opened (privacy
 *               mode): releasing it first would delete a photo nobody has
 *               seen, so this browser holds it until it expires, as the phone
 *   nothing     no file left to keep (expired, a locked workspace file)
 *   unopenable  encrypted, and its key did not open here yet. That reads the
 *               same for a vault still locked, a key fetch that failed offline
 *               and an identity that will never open it, so it is retried,
 *               never dropped: a file given up on at startup would be gone
 *   sealed      encrypted: decrypt, keep the file itself
 *   plain       an ordinary file: keep as served
 */
export type MediaPlan = "wait" | "nothing" | "unopenable" | "sealed" | "plain";

export function mediaPlan(attachment: Withheld): MediaPlan {
  if (!attachment.file_url) {
    return attachment.view_seconds != null && !attachment.expired ? "wait" : "nothing";
  }
  if (attachment.enc_meta) return attachment.sealed_as ? "sealed" : "unopenable";
  return "plain";
}

async function keepAttachment(
  userId: string,
  attachment: Withheld,
): Promise<MediaOutcome | "stored"> {
  const plan = mediaPlan(attachment);
  if (plan === "wait") return "wait";
  if (plan === "nothing") return "kept";
  const key = await attachmentUrlKey(attachment.file_url);
  if (!key) return "kept";
  const current = await getFile(userId, key);
  if (current?.status === "ready" || current?.status === "unavailable") return "kept";
  const meta = {
    url_key: key,
    file_name: attachment.file_name,
    content_type: attachment.content_type,
  };
  if (plan === "unopenable") return "failed";
  try {
    const source =
      plan === "sealed"
        ? await fetch(await loadSealedAsset(attachment.file_url))
        : await fetch(attachment.file_url, { credentials: "omit", cache: "no-store" });
    if (!source.ok || !source.body) return "failed";
    await storeStream(userId, meta, source.body);
    return "stored";
  } catch {
    // Offline, quota, CDN refusal: never custody. Tried again on the next pull.
    return "failed";
  }
}

async function storeStream(
  userId: string,
  meta: { url_key: string; file_name: string; content_type: string },
  body: ReadableStream<Uint8Array>,
) {
  const hash = new Sha256();
  const reader = body.getReader();
  let offset = 0;
  let pending: Uint8Array[] = [];
  let pendingBytes = 0;
  // Size and hash are known only at the end. Pieces go in as they arrive
  // (one MiB at a time, never the whole file in memory) under a provisional
  // record; the final write, possibly of no bytes, sets the real ones.
  const flush = async (size: number, sha256: string) => {
    const bytes = new Uint8Array(pendingBytes);
    let at = 0;
    for (const part of pending) {
      bytes.set(part, at);
      at += part.length;
    }
    await writeFileSlice(userId, { ...meta, size, sha256, segs: 1 }, offset, bytes);
    offset += bytes.length;
    pending = [];
    pendingBytes = 0;
  };
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value?.length) continue;
    hash.update(value);
    pending.push(value);
    pendingBytes += value.length;
    if (pendingBytes >= PIECE) await flush(0, "");
  }
  await flush(offset + pendingBytes, hash.hex());
  await markSegmentDone(userId, meta.url_key, 0);
  if ((await verifyFile(userId, meta.url_key)) !== "ready") {
    throw new Error("stored file did not verify");
  }
}
