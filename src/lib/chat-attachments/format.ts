/**
 * The wire format of an encrypted chat file, `ababilx-att-v1`.
 *
 * ```
 * key        32 random bytes, one per file, never reused
 * plaintext  the file, then zero bytes up to paddedSize(length)
 * chunk i    64 KiB of that (the last one shorter)
 * nonce i    4 zero bytes || u64 big-endian i
 * aad i      "ababilx-att-v1" || u32 big-endian i || 1 if last chunk else 0
 * output i   AES-256-GCM ciphertext || 16-byte tag
 * object     output 0 || output 1 || …
 * ```
 *
 * The key is unique to the file, so a counter nonce can never repeat. The
 * chunk index in the AAD stops chunks being reordered; the last-chunk flag
 * stops the object being cut short at a chunk boundary, which would otherwise
 * decrypt cleanly into a shorter file.
 *
 * **Every constant here is the format.** The phone writes and reads the same
 * bytes (`ababilx-mobile`, `attachment_crypto_format.dart`), and
 * `file-cipher.test.mjs` pins them with the vector the phone pins. Changing
 * one makes every file already uploaded unopenable, with nothing that names
 * the cause.
 */
export const ATTACHMENT_ALGORITHM = "ababilx-att-v1";
export const ATTACHMENT_KEY_BYTES = 32;
export const ATTACHMENT_CHUNK_BYTES = 64 * 1024;
export const ATTACHMENT_TAG_BYTES = 16;
export const ATTACHMENT_NONCE_BYTES = 12;

/** One chunk as it sits in the object: its ciphertext and its tag. */
export const ATTACHMENT_SEALED_CHUNK_BYTES =
  ATTACHMENT_CHUNK_BYTES + ATTACHMENT_TAG_BYTES;

/**
 * Nothing smaller than this is uploaded, so a short note and a 400-byte file
 * are the same size to the server.
 */
export const ATTACHMENT_MIN_PADDED_BYTES = 541;

const label = new TextEncoder().encode(ATTACHMENT_ALGORITHM);

/**
 * The size a file of `plainBytes` is padded to before it is encrypted.
 *
 * Sizes fall into buckets 5% apart, so the server (and anyone watching the
 * upload) learns a bucket rather than the exact length — exact lengths
 * identify known files. A reader never recomputes this: it is told the real
 * length inside the sealed meta and stops there, so two clients may pad
 * differently without breaking each other.
 */
export function paddedSize(plainBytes: number): number {
  if (plainBytes <= ATTACHMENT_MIN_PADDED_BYTES) return ATTACHMENT_MIN_PADDED_BYTES;
  const steps = Math.ceil(Math.log(plainBytes) / Math.log(1.05));
  const bucket = Math.floor(Math.pow(1.05, steps));
  // Floating point can land one bucket low right at a boundary.
  return Math.max(bucket, plainBytes);
}

export function chunkCount(paddedBytes: number): number {
  return Math.ceil(paddedBytes / ATTACHMENT_CHUNK_BYTES);
}

/** The encrypted object's length for a plaintext padded to `paddedBytes`. */
export function cipherSizeForPadded(paddedBytes: number): number {
  return paddedBytes + chunkCount(paddedBytes) * ATTACHMENT_TAG_BYTES;
}

/** The encrypted object's length for a file of `plainBytes`. */
export function cipherSize(plainBytes: number): number {
  return cipherSizeForPadded(paddedSize(plainBytes));
}

export function chunkNonce(index: number): Uint8Array<ArrayBuffer> {
  const nonce = new Uint8Array(ATTACHMENT_NONCE_BYTES);
  // The index is a u64 on the wire. A file is at most a few thousand chunks,
  // so only the low half is ever non-zero.
  new DataView(nonce.buffer).setUint32(8, index);
  return nonce;
}

export function chunkAad(index: number, last: boolean): Uint8Array<ArrayBuffer> {
  const aad = new Uint8Array(label.length + 5);
  aad.set(label, 0);
  new DataView(aad.buffer).setUint32(label.length, index);
  aad[label.length + 4] = last ? 1 : 0;
  return aad;
}

export function newAttachmentKey(): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(ATTACHMENT_KEY_BYTES));
}

/**
 * The object is not a well-formed `ababilx-att-v1` file: cut off mid-chunk,
 * or shorter than the length its sender declared. A wrong key or a changed
 * byte surfaces as WebCrypto's own `OperationError` instead.
 */
export class AttachmentCipherError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AttachmentCipherError";
  }
}
