import type { ChatMessage, ChatMessageQuote } from "@/lib/api/types/chat";
import { tiptapToPlainText } from "@/components/team/board/tiptap/utils";
import { attachmentPreviewLabel } from "./chat-preview-utils";

/** What a reply preview says under the author's name. */
export function quoteSummary(quote: ChatMessageQuote): string {
  if (quote.deleted) return "Original message was deleted";
  // Not an alarm: the reply itself reads fine, and the original is simply one
  // this account was never given a key for — typically sent before it joined.
  if (quote.decryption_failed) return "Original message not available";
  const text = tiptapToPlainText(quote.body ?? "").replace(/\s+/g, " ").trim();
  if (text) return text;
  return attachmentPreviewLabel(quote.attachment_type) ?? "Attachment";
}

/**
 * The reply bar quotes a message that is still in the feed, so it works off the
 * full row rather than the server's join — same shape, so the bar and the sent
 * bubble read identically.
 */
export function quoteFromMessage(message: ChatMessage): ChatMessageQuote {
  return {
    message_id: message.id,
    user_id: message.user_id,
    user_name: message.user_name,
    // Already decrypted in the feed: the bar must never show ciphertext.
    body: message.body,
    attachment_type: message.attachments?.[0]?.content_type,
  };
}
