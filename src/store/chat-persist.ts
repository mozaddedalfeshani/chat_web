import type { ChatMessage } from "@/lib/api";

export const CHAT_PERSIST_KEY = "ababilx_chat_prefs";

const RECENT_MESSAGE_LIMIT = 10;
const THREAD_FEED_MARKER = ":thread:";

function persistenceSafeMessage(message: ChatMessage): ChatMessage {
  // A quote opened on this device lost its ciphertext when it was decrypted,
  // so its body is plaintext; the silent page refetch brings the sealed copy
  // back after a reload.
  const quote = message.quote?.sealed
    ? { ...message.quote, body: "", sealed: undefined }
    : message.quote;
  return { ...message, body: "", decryption_failed: undefined, quote };
}

export function persistenceSafeConversations<T extends { last_message_body?: string }>(
  conversations: T[],
) {
  return conversations.map((conversation) => ({
    ...conversation,
    last_message_body: conversation.last_message_body ? "Message" : "",
  }));
}

/** Keep only instant-open previews; the API restores the complete page silently. */
export function recentChatFeeds(
  feeds: Record<string, { messages: ChatMessage[] }>,
) {
  return Object.fromEntries(
    Object.entries(feeds)
      .filter(([key, feed]) =>
        !key.includes(THREAD_FEED_MARKER) && feed.messages.length > 0,
      )
      .map(([key, feed]) => [
        key,
        {
          messages: feed.messages.slice(-RECENT_MESSAGE_LIMIT).map(persistenceSafeMessage),
          loading: false,
          loadingMore: false,
          nextCursor: "",
          hasMore: false,
          fetchedAt: 0,
        },
      ]),
  );
}
