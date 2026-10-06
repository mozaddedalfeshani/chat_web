import type { ChatMessageAttachment } from "@/lib/api/types/chat";

/**
 * An attachment row as the server sent it: the real name, type and size this
 * device opened are dropped again, along with the note of a failed open.
 *
 * This is what may be written to storage. A row is kept the way it arrived —
 * sealed — and opened again on read, exactly as a message body is; the file's
 * key was never on the row to begin with.
 */
export function sealedFormAttachment(
  attachment: ChatMessageAttachment,
): ChatMessageAttachment {
  if (!attachment.sealed_as && attachment.seal_failed === undefined) return attachment;
  const row = { ...attachment, ...attachment.sealed_as };
  delete row.sealed_as;
  delete row.seal_failed;
  return row;
}

export function sealedFormAttachments<T extends { attachments?: ChatMessageAttachment[] }>(
  message: T,
): T {
  const attachments = message.attachments;
  if (!attachments?.some((a) => a.sealed_as || a.seal_failed !== undefined)) return message;
  return { ...message, attachments: attachments.map(sealedFormAttachment) };
}
