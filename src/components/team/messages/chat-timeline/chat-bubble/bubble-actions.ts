import { toast } from "sonner";
import type { ChatMessage, ChatMessageAttachment } from "@/lib/api";
import { tiptapToPlainText } from "@/components/team/board/tiptap/utils";
import {
  copyImageToClipboard,
  saveAssetsToFolder,
  saveAssetToDownloads,
} from "@/lib/files/asset-actions";
import { resolveLocalAsset } from "@/lib/history/media/local-asset";

/** Plain text of a message body, TipTap JSON or not. */
export function messagePlainText(message: ChatMessage) {
  return tiptapToPlainText(message.body ?? "").trim();
}

export async function copyText(text: string) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied");
  } catch {
    toast.error("Copy failed");
  }
}

export async function copyImage(userId: string, attachment: ChatMessageAttachment) {
  try {
    const asset = await resolveLocalAsset(userId, attachment.file_url);
    await copyImageToClipboard(asset.src ?? attachment.file_url);
    toast.success("Image copied");
  } catch {
    toast.error("Could not copy image");
  }
}

/**
 * Save every attachment on this message.
 *
 * It went through an `<a download>` until 2026-09-09, which does nothing at
 * all inside WKWebView — the menu row looked like it worked and no file ever
 * appeared. The bytes are already on this machine; Rust writes them out.
 */
export async function saveAttachments(userId: string, attachments: ChatMessageAttachment[]) {
  try {
    const resolved = await Promise.all(attachments.map(async (attachment) => ({
      attachment,
      url: (await resolveLocalAsset(userId, attachment.file_url)).src ?? attachment.file_url,
    })));
    if (attachments.length === 1) {
      const only = resolved[0];
      const outcome = await saveAssetToDownloads(only.url, only.attachment.file_name);
      if (outcome.saved) toast.success("Saved");
      return;
    }
    // One folder chosen once, rather than a save panel per attachment.
    const outcome = await saveAssetsToFolder(
      resolved.map(({ attachment, url }) => ({ url, fileName: attachment.file_name })),
    );
    if (outcome.saved) toast.success(`${outcome.count ?? attachments.length} files saved`);
  } catch (error) {
    console.warn("[chat] could not save attachments", error);
    toast.error(`Could not save: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/** Text the user highlighted inside this bubble, if any. */
export function selectionInside(node: Node | null) {
  if (!node) return "";
  const selection = window.getSelection();
  const text = selection?.toString().trim() ?? "";
  if (!text || !selection?.anchorNode) return "";
  return node.contains(selection.anchorNode) ? text : "";
}
