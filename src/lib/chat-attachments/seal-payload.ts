// What crosses the API beside an encrypted chat file (server migration 0168).
//
// The file is sealed under a random key of its own (file-cipher.ts). That key,
// with the file's real name, type and size, travels as a small JSON document
// sealed under the CONVERSATION key and stored beside the attachment row. The
// server keeps only a coarse kind and a generic name, and can open none of it.
//
// Every string in this file is wire format, byte-identical on the phone
// (`ababilx-mobile`, `attachment_secret.dart`) and pinned by
// `seal-payload.test.mjs`.
import { ATTACHMENT_KEY_BYTES } from "./format";

/** What R2 is told an encrypted object is, whatever the file really is. */
export const SEALED_OBJECT_TYPE = "application/octet-stream";
/** The two names an encrypted row may carry on the server. */
export const SEALED_FILE_NAME = "file";
export const SEALED_VOICE_NAME = "voice-message";

const IMAGE_NAME = /\.(jpe?g|png|gif|webp|bmp|heic|heif|avif|svg)$/i;
const VIDEO_NAME = /\.(mp4|m4v|mov|webm|mkv|avi|3gp)$/i;
const AUDIO_NAME = /\.(m4a|aac|mp3|ogg|opus|wav)$/i;

/**
 * `image/…`, `video/…`, `audio/…` or a plain file: the only thing the server
 * is told about an encrypted upload. Decided from the name as well as the
 * type, because pickers hand over `application/octet-stream` for plenty of
 * photos. The server normalizes to the same values whatever a client sends
 * (`SealedAttachmentContentType`).
 */
export function sealedWireType(contentType: string, fileName: string): string {
  const type = contentType.toLowerCase();
  for (const kind of ["image", "video", "audio"]) {
    if (type.startsWith(`${kind}/`)) return `${kind}/x-ababilx-sealed`;
  }
  if (IMAGE_NAME.test(fileName)) return "image/x-ababilx-sealed";
  if (VIDEO_NAME.test(fileName)) return "video/x-ababilx-sealed";
  if (AUDIO_NAME.test(fileName)) return "audio/x-ababilx-sealed";
  return SEALED_OBJECT_TYPE;
}

/**
 * A voice note keeps the recorder's prefix: the server's group media
 * permissions and the push label both recognise one by it.
 */
export function sealedWireName(contentType: string, fileName: string): string {
  const voice =
    sealedWireType(contentType, fileName).startsWith("audio/") &&
    (fileName.split("/").pop() ?? "").toLowerCase().startsWith("voice-");
  return voice ? SEALED_VOICE_NAME : SEALED_FILE_NAME;
}

/** True for the names the server keeps for an encrypted file — they name nothing. */
export function isSealedWireName(fileName: string | undefined): boolean {
  return fileName === SEALED_FILE_NAME || fileName === SEALED_VOICE_NAME;
}

/**
 * The AAD a sealed meta is authenticated with: the conversation, the
 * conversation key version it is sealed under, and whoever sealed it (the
 * message's sender). The prefix differs from a message body's, so a sealed
 * meta can never be replayed as a message, and naming the conversation and
 * the sender means it cannot be moved to another of either.
 */
export function attachmentSealAad(
  conversationId: string,
  keyVersion: number,
  sealerId: string,
): string {
  return `ababilx-att-meta-v1:${conversationId}:${keyVersion}:${sealerId}`;
}

export type AttachmentSealPayload = {
  key: Uint8Array;
  fileName: string;
  contentType: string;
  plainSize: number;
};

const SEAL_VERSION = 1;

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

/**
 * The plaintext inside a sealed meta:
 *
 * ```json
 * {"v":1,"k":"<base64url key>","n":"IMG_0012.jpg","t":"image/jpeg","s":123456}
 * ```
 *
 * Key order is spelled out rather than left to an object literal elsewhere:
 * the bytes are authenticated, not compared, but one layout on every client
 * is what lets a test on each side pin the same string.
 */
export function encodeSealPayload(payload: AttachmentSealPayload): string {
  return JSON.stringify({
    v: SEAL_VERSION,
    k: toBase64Url(payload.key),
    n: payload.fileName,
    t: payload.contentType,
    s: payload.plainSize,
  });
}

/**
 * Throws for anything that is not a usable v1 payload — a wrong key length
 * most of all, since the cipher would reject it later with an error that
 * names nothing.
 */
export function decodeSealPayload(text: string): AttachmentSealPayload {
  const json: unknown = JSON.parse(text);
  if (typeof json !== "object" || json === null) {
    throw new Error("malformed attachment seal");
  }
  const { v, k, n, t, s } = json as Record<string, unknown>;
  if (v !== SEAL_VERSION) throw new Error("unknown attachment seal version");
  if (typeof k !== "string" || typeof s !== "number") {
    throw new Error("malformed attachment seal");
  }
  const key = fromBase64Url(k);
  if (key.length !== ATTACHMENT_KEY_BYTES || !Number.isSafeInteger(s) || s < 0) {
    throw new Error("malformed attachment seal");
  }
  return {
    key,
    fileName: typeof n === "string" ? n : "",
    contentType: typeof t === "string" ? t : "",
    plainSize: s,
  };
}
