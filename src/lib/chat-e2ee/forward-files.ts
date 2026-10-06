// Forwarding encrypted chat files (server migration 0168).
//
// A forward copies the attachment row and points it at the SAME object — the
// ciphertext is not uploaded again. But the file's key was sealed under the
// source conversation's key, which the destination's members do not hold, so
// this device opens it and seals it again under each destination's own key.
// The server cannot do that and never sees the key either way.
import type { ChatAttachmentInput, ChatMessageAttachment } from "@/lib/api/types/chat";
import { sealedFileFor } from "@/lib/chat-attachments/sealed-files";
import { sealAttachments, type UploadSecret } from "./attachment-seal";
import type { ForwardAttachmentSeal } from "./forward-targets";

/** An encrypted file of the forwarded message, with the key this device opened. */
export type ForwardFile = { input: ChatAttachmentInput; secret: UploadSecret };

/**
 * The encrypted files among `attachments`, ready to be sealed again.
 *
 * Throws when one of them never opened here — a key version this account was
 * not given. It would arrive at every destination as a file nobody can open,
 * so the forward is refused in words instead.
 */
export function forwardableFiles(attachments: ChatMessageAttachment[]): ForwardFile[] {
  const files: ForwardFile[] = [];
  for (const attachment of attachments) {
    if (!attachment.enc_meta) continue;
    const file = attachment.sealed_as ? sealedFileFor(attachment.file_url) : undefined;
    if (!file) throw new Error("This file can't be forwarded from this device yet");
    files.push({
      input: {
        file_url: attachment.file_url,
        // The real name and type, as the sender sealed them — not the display
        // values, which may have been made safe for this browser.
        file_name: attachment.file_name,
        content_type: file.contentType || attachment.content_type,
        size_bytes: attachment.size_bytes,
      },
      secret: { key: file.key, plainSize: file.plainSize },
    });
  }
  return files;
}

/**
 * Passes `conversation` through when it can take the forward as plaintext.
 * A destination that takes no ciphertext cannot receive an encrypted file:
 * there is no conversation key there to seal the file's key under.
 */
export function needsNoFileKeys<T>(files: ForwardFile[], conversation: T): T {
  if (files.length > 0) {
    throw new Error("Encrypted files can only be forwarded to secure chats");
  }
  return conversation;
}

export async function sealForwardFiles(
  conversationId: string,
  currentUserId: string,
  keyVersion: number,
  files: ForwardFile[],
): Promise<ForwardAttachmentSeal[]> {
  const byUrl = new Map(files.map((file) => [file.input.file_url, file.secret]));
  const sealed = await sealAttachments(
    conversationId,
    currentUserId,
    keyVersion,
    files.map((file) => file.input),
    (fileUrl) => byUrl.get(fileUrl),
  );
  return sealed.map((attachment) => ({
    file_url: attachment.file_url,
    enc_meta: attachment.enc_meta ?? "",
    enc_nonce: attachment.enc_nonce ?? "",
  }));
}
