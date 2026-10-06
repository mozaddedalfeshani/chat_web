// Encrypted chat files (server migration 0168): the conversation-key half.
//
// A file is sealed under a random key of its own (lib/chat-attachments). What
// crosses the API is that key, with the file's real name, type and size,
// sealed here under the CONVERSATION key — the same key and the same key
// version as the message body it travels with. The server stores the result
// beside the attachment row and can open none of it.
import type {
  ChatAttachmentInput,
  ChatMessage,
  ChatMessageAttachment,
} from "@/lib/api/types/chat";
import { cipherSize } from "@/lib/chat-attachments/format";
import {
  attachmentSealAad,
  decodeSealPayload,
  encodeSealPayload,
  sealedWireName,
  sealedWireType,
} from "@/lib/chat-attachments/seal-payload";
import { rememberSealedFile, safeBlobType } from "@/lib/chat-attachments/sealed-files";
import {
  base64UrlToBytes,
  bytesToBase64Url,
  e2eeDecoder as decoder,
  e2eeEncoder as encoder,
  randomBytes,
} from "./primitives";
import { loadReadKey } from "./read-key";

/** The key of a file this device encrypted and has not sent yet. */
export type UploadSecret = { key: Uint8Array; plainSize: number };

/**
 * `attachments` as they go on the wire for a message sealed under
 * `keyVersion`: an encrypted upload loses its real name and type and gains
 * its sealed meta; anything else passes through untouched.
 *
 * Called again after a re-key — the previous seals name a version somebody
 * in the conversation can no longer read.
 */
export async function sealAttachments(
  conversationId: string,
  currentUserId: string,
  keyVersion: number,
  attachments: ChatAttachmentInput[],
  secretFor: (fileUrl: string) => UploadSecret | undefined,
): Promise<ChatAttachmentInput[]> {
  if (!attachments.some((attachment) => secretFor(attachment.file_url))) {
    return attachments;
  }
  const entry = await loadReadKey(conversationId, currentUserId, keyVersion);
  if (!entry || entry.version !== keyVersion) {
    throw new Error("Secure message key is unavailable");
  }
  const aad = encoder.encode(attachmentSealAad(conversationId, keyVersion, currentUserId));
  return Promise.all(
    attachments.map(async (attachment) => {
      const secret = secretFor(attachment.file_url);
      if (!secret) return attachment;
      const nonce = randomBytes(12);
      const sealed = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: nonce, additionalData: aad },
        entry.key,
        encoder.encode(
          encodeSealPayload({
            key: secret.key,
            fileName: attachment.file_name,
            contentType: attachment.content_type,
            plainSize: secret.plainSize,
          }),
        ),
      );
      return {
        file_url: attachment.file_url,
        // Never the real ones: the server would store them beside ciphertext.
        file_name: sealedWireName(attachment.content_type, attachment.file_name),
        content_type: sealedWireType(attachment.content_type, attachment.file_name),
        size_bytes: cipherSize(secret.plainSize),
        enc_meta: bytesToBase64Url(new Uint8Array(sealed)),
        enc_nonce: bytesToBase64Url(nonce),
      };
    }),
  );
}

/**
 * An image this browser will not be handed as an image — an SVG, which can
 * carry script, or a HEIC it cannot decode — is offered as a file to save
 * instead of a tile that never draws. See `safeBlobType`.
 */
function displayType(contentType: string, fallback: string) {
  if (!contentType) return fallback;
  const drawable = safeBlobType(contentType) !== "application/octet-stream";
  return /^image\//i.test(contentType) && !drawable
    ? "application/octet-stream"
    : contentType;
}

/**
 * Opens one encrypted attachment's key and returns the row describing the
 * real file. A row whose key does not open — a locked vault, a key version
 * this account was never given — comes back marked `seal_failed`, so it is
 * drawn as a file that is not available here rather than failing the message
 * around it.
 *
 * `sealerId` is who wrote the row: the message's sender, which is also the
 * attachment's `uploaded_by`.
 */
export async function openAttachment(
  conversationId: string,
  currentUserId: string,
  attachment: ChatMessageAttachment,
  sealerId?: string,
): Promise<ChatMessageAttachment> {
  if (!attachment.enc_meta || attachment.sealed_as) return attachment;
  try {
    const version = attachment.enc_key_version;
    const entry = await loadReadKey(conversationId, currentUserId, version);
    if (!entry || entry.version !== version) throw new Error("key unavailable");
    const clear = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: base64UrlToBytes(attachment.enc_nonce ?? ""),
        additionalData: encoder.encode(
          attachmentSealAad(conversationId, entry.version, sealerId || attachment.uploaded_by),
        ),
      },
      entry.key,
      base64UrlToBytes(attachment.enc_meta),
    );
    const payload = decodeSealPayload(decoder.decode(clear));
    rememberSealedFile(attachment.file_url, {
      key: payload.key,
      plainSize: payload.plainSize,
      contentType: payload.contentType,
    });
    return {
      ...attachment,
      file_name: payload.fileName || attachment.file_name,
      content_type: displayType(payload.contentType, attachment.content_type),
      size_bytes: payload.plainSize,
      sealed_as: {
        file_name: attachment.file_name,
        content_type: attachment.content_type,
        size_bytes: attachment.size_bytes,
      },
      seal_failed: undefined,
    };
  } catch {
    return { ...attachment, seal_failed: true };
  }
}

/** `message` with every encrypted attachment opened that can be. */
export async function openMessageAttachments(
  message: ChatMessage,
  currentUserId: string,
): Promise<ChatMessage> {
  const attachments = message.attachments;
  if (!attachments?.some((a) => a.enc_meta && !a.sealed_as)) return message;
  return {
    ...message,
    attachments: await Promise.all(
      attachments.map((a) =>
        openAttachment(message.conversation_id, currentUserId, a, message.user_id),
      ),
    ),
  };
}
