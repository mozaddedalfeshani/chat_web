import type { ChatConversation, ChatSidebar, ChatWsEvent } from "@/lib/api/types/chat";
import type { ChatDeletion } from "@/lib/history/markers";
import { conversationsWithMessages } from "@/lib/history/repo/messages-read";
import {
  applyDeletionMarkers,
  deleteConversationMessages,
  forgetMessage,
} from "@/lib/history/repo/messages-write";
import {
  readStoredConversations,
  storeConversations,
} from "@/lib/history/repo/conversations";
import { storeDeletionMarkers } from "@/lib/history/repo/deletions";
import { conversationSurvives } from "@/lib/messages/deletions";
import { persistRawMessages } from "./chat-feed-history";
import { historyEnabled } from "@/lib/history/flag";

/**
 * The sidebar's half of the durable history.
 *
 * Conversations the server no longer lists — a group this account left, or a
 * thread that only ever existed in history imported from the phone — stay
 * readable here. They are marked `local_only` and closed for sending: the
 * server is still the only authority on who may post, and a stored row is not
 * membership.
 */
export function syncSidebarHistory(userId: string, markers: ChatDeletion[]) {
  if (!userId || !historyEnabled()) return;
  void storeDeletionMarkers(userId, markers)
    .then(() => applyDeletionMarkers(userId, markers))
    .catch(() => {});
}

export async function withLocalOnlyConversations(
  userId: string,
  sidebar: ChatSidebar,
  markers: ChatDeletion[],
): Promise<ChatSidebar> {
  if (!userId || !historyEnabled()) return sidebar;
  const listed = [...(sidebar.dms ?? []), ...(sidebar.channels ?? [])];
  try {
    await storeConversations(userId, listed, "server");
    const serverIds = new Set(listed.map((c) => c.id));
    const [stored, withMessages] = await Promise.all([
      readStoredConversations(userId),
      conversationsWithMessages(userId),
    ]);
    const localOnly = stored
      .filter((c) => !serverIds.has(c.id) && withMessages.has(c.id))
      .filter((c) => conversationSurvives(c, markers))
      .map(closeForSending);
    if (localOnly.length === 0) return sidebar;
    return {
      dms: [...(sidebar.dms ?? []), ...localOnly.filter((c) => c.type === "dm")],
      channels: [...(sidebar.channels ?? []), ...localOnly.filter((c) => c.type !== "dm")],
    };
  } catch {
    // No durable store in this browser: the server's list is the whole list.
    return sidebar;
  }
}

function closeForSending(conversation: ChatConversation): ChatConversation {
  return {
    ...conversation,
    local_only: true,
    can_message: false,
    lock_reason: "local_only",
    unread_count: 0,
    request_state: "none",
  };
}

/**
 * Writes a realtime event's RAW message before the store decrypts it, so the
 * durable copy is the sealed one. A live delete forgets the row (its marker
 * stops any import restoring it); a deleted conversation drops its history.
 */
export function persistRealtimeEvent(userId: string, ev: ChatWsEvent) {
  if (!userId || !historyEnabled()) return;
  if (ev.type === "chat.message.created" || ev.type === "chat.message.updated") {
    void persistRawMessages(userId, [ev.message]);
  } else if (ev.type === "chat.message.deleted") {
    void forgetMessage(userId, ev.id).catch(() => {});
  } else if (ev.type === "chat.conversation.deleted") {
    void deleteConversationMessages(userId, ev.conversation_id).catch(() => {});
  }
}
