// The upload half of an encrypted chat file (server migration 0168).
//
// Every chat upload goes presign -> PUT -> send. This is the one place those
// three steps learn about encryption, so the composer, the thread panel and
// the voice recorder all stay as they were: they ask for an upload slot, PUT
// through `putPresignedUpload`, and send the attachment they were given.
//
//   presign   a fresh key; the server is asked for a ciphertext slot and told
//             only the kind of file and the ciphertext's length
//   PUT       the file is encrypted here and the ciphertext goes up
//   send      the key is sealed under the conversation key (chat-store)
//
// A NEW upload path that PUTs the file itself, skipping `putPresignedUpload`,
// uploads plaintext into a slot the server believes is ciphertext.
import type { ChatConversation } from "@/lib/api/types/chat";
import { isEncryptedConversation } from "@/lib/chat-e2ee/eligible";
import { sealBlob } from "./file-cipher";
import { cipherSize, newAttachmentKey } from "./format";
import { SEALED_OBJECT_TYPE, sealedWireName, sealedWireType } from "./seal-payload";
import { adoptSealedAsset } from "./sealed-assets";

export type PresignedUpload = {
  upload_url: string;
  public_url: string;
  /** Present when the file must be encrypted on this device before the PUT. */
  seal?: (file: Blob) => Promise<Blob>;
};

type Presign = (
  contentType: string,
  fileName: string,
  sizeBytes: number,
  encrypted?: boolean,
) => Promise<{ upload_url: string; public_url: string }>;

type UploadSecret = { key: Uint8Array; plainSize: number };

// Keys of uploads not yet sent, by public URL. A key stays here until its
// message is CONFIRMED: a send that failed is sent again from the composer's
// own attachment list, which never carried the key, and without it the
// ciphertext would be described to the server as an ordinary file.
const uploads = new Map<string, UploadSecret>();

// `encrypted_attachments` as `/api/me` last reported it — always true on a
// current server. Off until told: a server older than 0168 has no such field
// and would store the ciphertext without its key.
let enabled = false;

export function setEncryptedAttachmentsEnabled(value: boolean | undefined) {
  enabled = value === true;
}

export function encryptedAttachmentsEnabled() {
  return enabled;
}

export function uploadSecretFor(fileUrl: string): UploadSecret | undefined {
  return uploads.get(fileUrl);
}

/** After a confirmed send, or when the upload is discarded. */
export function forgetUploadSecret(fileUrl: string) {
  uploads.delete(fileUrl);
}

/**
 * Whether an upload into `conversation` is encrypted on this device first.
 *
 * - `enabled` is `encrypted_attachments` on `/api/me`: always true on a
 *   current server, absent on one that predates 0168. Reading an encrypted
 *   file needs no flag.
 * - The conversation has to be one whose messages are sealed, because the
 *   file's key travels sealed under the conversation key. A webhook feed has
 *   none.
 * - A group the server marks `plaintext_until_keyed` may still fall back to a
 *   plaintext send while somebody in it has no identity. An encrypted file
 *   would then arrive with nowhere to put its key, so its uploads stay as
 *   they are until the group is keyed.
 */
export function shouldSealUpload(
  enabled: boolean,
  conversation?: Pick<ChatConversation, "type" | "scope" | "plaintext_until_keyed"> | null,
): boolean {
  if (!enabled || !conversation) return false;
  return isEncryptedConversation(conversation) && !conversation.plaintext_until_keyed;
}

/**
 * An upload slot for one chat file. With `seal` set the slot is for
 * ciphertext, and the returned `seal` step is what produces it.
 */
export async function presignChatUpload(
  presign: Presign,
  seal: boolean,
  contentType: string,
  fileName: string,
  sizeBytes: number,
): Promise<PresignedUpload> {
  if (!seal) return presign(contentType, fileName, sizeBytes);
  const key = newAttachmentKey();
  const slot = await presign(
    sealedWireType(contentType, fileName),
    sealedWireName(contentType, fileName),
    cipherSize(sizeBytes),
    true,
  );
  uploads.set(slot.public_url, { key, plainSize: sizeBytes });
  return {
    ...slot,
    seal: async (file) => {
      // The size sealed beside the key is the one the reader stops at, so it
      // is taken from the bytes actually encrypted, never the caller's figure.
      uploads.set(slot.public_url, { key, plainSize: file.size });
      const sealed = await sealBlob(file, key);
      adoptSealedAsset(slot.public_url, file, contentType);
      return sealed;
    },
  };
}

/**
 * PUTs one file into its presigned slot — encrypted first when the slot asks
 * for it. The declared type has to be the one the URL was signed for: the
 * real one for a plaintext file, octet-stream for ciphertext.
 */
export async function putPresignedUpload(
  presign: PresignedUpload,
  file: Blob,
  contentType: string,
): Promise<Response> {
  const body = presign.seal ? await presign.seal(file) : file;
  return fetch(presign.upload_url, {
    method: "PUT",
    headers: { "Content-Type": presign.seal ? SEALED_OBJECT_TYPE : contentType },
    body,
  });
}

if (typeof window !== "undefined") {
  window.addEventListener("ababilx:logout", () => {
    uploads.clear();
    enabled = false;
  });
}
