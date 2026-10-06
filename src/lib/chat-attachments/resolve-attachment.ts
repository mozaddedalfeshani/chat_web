import type { ChatMessageAttachment } from "@/lib/api/types/chat";
import { resolveLocalAsset } from "@/lib/history/media/local-asset";
import { loadSealedAsset } from "./sealed-assets";

/**
 * The address an attachment's own bytes can be read from, for an action that
 * needs them now: Save, Copy image.
 *
 * An ordinary file answers with its imported copy or its CDN URL. An
 * encrypted one (server 0168) is fetched and decrypted first if it has not
 * been already — its CDN URL would save ciphertext under the real file name.
 * Rejects when the file's key is not on this device.
 */
export async function resolveAttachmentUrl(
  userId: string,
  attachment: Pick<ChatMessageAttachment, "file_url" | "enc_meta">,
): Promise<string> {
  const local = await resolveLocalAsset(userId, attachment.file_url);
  if (!attachment.enc_meta) return local.src ?? attachment.file_url;
  // An imported copy is already the file itself.
  if (local.src && local.src !== attachment.file_url) return local.src;
  return loadSealedAsset(attachment.file_url);
}
