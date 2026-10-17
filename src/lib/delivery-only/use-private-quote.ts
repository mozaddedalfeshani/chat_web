"use client";

import type { ChatMessage, ChatMessageQuote } from "@/lib/api/types/chat";
import { feedKey, useChatStore } from "@/store/chat-store";

/**
 * The quote to draw above `message`. The server's `quote` join wins while the
 * original is still there; once it is purged only `meta.private_quote_id` is
 * left, and the original can come only from what this browser has loaded —
 * the same conversation's main feed, never another chat. Found, it is drawn
 * from that copy (already opened, so `sealed` keeps it out of storage);
 * missing, the quote says where it is rather than vanishing.
 */
export function usePrivateQuote(message: ChatMessage): ChatMessageQuote | undefined {
  const quotedId =
    message.quote && !isPurgedQuote(message.quote)
      ? undefined
      : message.meta?.private_quote_id;
  const original = useChatStore((s) =>
    quotedId
      ? s.feeds[feedKey(message.conversation_id)]?.messages.find((m) => m.id === quotedId)
      : undefined,
  );
  if (!quotedId) return message.quote;
  if (!original || original.content_purged) {
    return { message_id: quotedId, unavailable_here: true };
  }
  return {
    message_id: original.id,
    user_id: original.user_id,
    user_name: original.user_name,
    body: original.decryption_failed ? "" : original.body,
    decryption_failed: original.decryption_failed,
    deleted: !!original.deleted_at,
    attachment_type: original.attachments?.[0]?.content_type,
    sealed: true,
  };
}

/**
 * A quote join that found only a purge tombstone (a thread root or pinned
 * message the server emptied but kept): no text, no ciphertext, no file. It
 * would read "Attachment"; the loaded copy, or "on your phone", is the truth.
 */
function isPurgedQuote(quote: ChatMessageQuote): boolean {
  return (
    !quote.deleted &&
    !quote.long &&
    !quote.decryption_failed &&
    !quote.body &&
    !quote.encrypted_body &&
    !quote.attachment_type
  );
}
