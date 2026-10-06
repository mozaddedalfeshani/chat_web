// Chat files in and out of the `ababilx-att-v1` layout — see format.ts for the
// format itself. One chunk is in memory at a time on both paths: an upload is
// read from its Blob slice by slice, and a download is decrypted as it
// arrives, so a 350 MB video never sits in the page as one buffer.
import {
  ATTACHMENT_CHUNK_BYTES,
  ATTACHMENT_KEY_BYTES,
  ATTACHMENT_SEALED_CHUNK_BYTES,
  ATTACHMENT_TAG_BYTES,
  AttachmentCipherError,
  chunkAad,
  chunkNonce,
  paddedSize,
} from "./format";

type Bytes = Uint8Array<ArrayBuffer>;

export function importAttachmentKey(key: Uint8Array): Promise<CryptoKey> {
  if (key.length !== ATTACHMENT_KEY_BYTES) {
    throw new AttachmentCipherError("file key has the wrong length");
  }
  return crypto.subtle.importKey("raw", key as BufferSource, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

async function sealChunk(key: CryptoKey, chunk: Bytes, index: number, last: boolean) {
  const sealed = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: chunkNonce(index), additionalData: chunkAad(index, last) },
    key,
    chunk,
  );
  return new Uint8Array(sealed);
}

/**
 * `sealed` is `ciphertext || tag`. Rejects with WebCrypto's `OperationError`
 * for a wrong key, a changed byte, a chunk out of place or an object cut
 * short at a chunk boundary.
 */
async function openChunk(key: CryptoKey, sealed: Bytes, index: number, last: boolean) {
  const clear = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: chunkNonce(index), additionalData: chunkAad(index, last) },
    key,
    sealed,
  );
  return new Uint8Array(clear);
}

/**
 * The ciphertext of `file`, chunk by chunk. Each part is exactly one sealed
 * chunk, so a caller can hand them to a `Blob` and let the browser keep them
 * wherever it keeps large blobs.
 */
export async function* sealChunks(file: Blob, key: Uint8Array): AsyncGenerator<Bytes> {
  const secret = await importAttachmentKey(key);
  const padded = paddedSize(file.size);
  let offset = 0;
  for (let index = 0; offset < padded; index++) {
    const length = Math.min(ATTACHMENT_CHUNK_BYTES, padded - offset);
    // Zero-filled, so whatever the file does not cover is the padding.
    const chunk = new Uint8Array(length);
    if (offset < file.size) {
      const end = Math.min(offset + length, file.size);
      const read = new Uint8Array(await file.slice(offset, end).arrayBuffer());
      // The size sealed beside the key is `file.size`; a file that changed
      // under us would be described by a length it no longer has.
      if (read.length !== end - offset) {
        throw new AttachmentCipherError("file changed while it was being read");
      }
      chunk.set(read, 0);
    }
    offset += length;
    yield await sealChunk(secret, chunk, index, offset >= padded);
  }
}

/** Encrypts `file` under `key`. The result's size is `cipherSize(file.size)`. */
export async function sealBlob(file: Blob, key: Uint8Array): Promise<Blob> {
  const parts: Bytes[] = [];
  for await (const part of sealChunks(file, key)) parts.push(part);
  return new Blob(parts, { type: "application/octet-stream" });
}

/**
 * Decrypts an object as it arrives, yielding the file's own bytes with the
 * padding after `plainSize` dropped.
 *
 * The last chunk is authenticated as the last one, so the stream is read one
 * chunk ahead: a chunk is only known to be final once the source has ended
 * behind it. Throws rather than yield a file shorter than its sender stated.
 */
export async function* openChunks(
  source: AsyncIterable<Uint8Array> | Iterable<Uint8Array>,
  key: Uint8Array,
  plainSize: number,
): AsyncGenerator<Bytes> {
  if (!Number.isSafeInteger(plainSize) || plainSize < 0) {
    throw new AttachmentCipherError("stated size is not a length");
  }
  const secret = await importAttachmentKey(key);
  let held: Bytes = new Uint8Array(0);
  let index = 0;
  let written = 0;

  const open = async (sealed: Bytes, last: boolean) => {
    if (sealed.length <= ATTACHMENT_TAG_BYTES) {
      throw new AttachmentCipherError("object ends mid-chunk");
    }
    const clear = await openChunk(secret, sealed, index++, last);
    const keep = Math.min(clear.length, plainSize - written);
    written += Math.max(keep, 0);
    return keep > 0 ? clear.subarray(0, keep) : null;
  };

  for await (const part of source) {
    if (part.length === 0) continue;
    const joined = new Uint8Array(held.length + part.length);
    joined.set(held, 0);
    joined.set(part, held.length);
    let offset = 0;
    // Strictly more than one chunk held: the first cannot be the last.
    while (joined.length - offset > ATTACHMENT_SEALED_CHUNK_BYTES) {
      const clear = await open(
        joined.subarray(offset, offset + ATTACHMENT_SEALED_CHUNK_BYTES),
        false,
      );
      offset += ATTACHMENT_SEALED_CHUNK_BYTES;
      if (clear) yield clear;
    }
    held = joined.slice(offset);
  }
  const clear = await open(held, true);
  if (clear) yield clear;
  if (written !== plainSize) {
    throw new AttachmentCipherError("object is shorter than stated");
  }
}

function concat(parts: Bytes[], total: number): Bytes {
  const out = new Uint8Array(total);
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

export async function sealBytes(plain: Uint8Array, key: Uint8Array): Promise<Bytes> {
  const parts: Bytes[] = [];
  let total = 0;
  for await (const part of sealChunks(new Blob([plain as BlobPart]), key)) {
    parts.push(part);
    total += part.length;
  }
  return concat(parts, total);
}

export async function openBytes(
  cipher: Uint8Array,
  key: Uint8Array,
  plainSize: number,
): Promise<Bytes> {
  // The length comes from the sender; it has to fit inside the object it
  // describes before anything is allocated for it.
  if (plainSize > cipher.length) {
    throw new AttachmentCipherError("stated size does not fit");
  }
  const parts: Bytes[] = [];
  for await (const part of openChunks([cipher], key, plainSize)) parts.push(part);
  return concat(parts, plainSize);
}
