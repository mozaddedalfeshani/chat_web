import type { ChatMessage, ChatPrivateOp } from "@/lib/api/types/chat";
import { useChatStore } from "@/store/chat-store";
import { applyPrivateReaction, editedStandIn, privateOpEffect } from "./private-op";

/** The loaded copy of `messageId` in `conversationId`, from any feed or thread. */
function loadedMessage(conversationId: string, messageId: string): ChatMessage | null {
  const { feeds, threadRepliesByRoot } = useChatStore.getState();
  for (const [key, feed] of Object.entries(feeds)) {
    if (key !== conversationId && !key.startsWith(`${conversationId}:thread:`)) continue;
    const hit = feed.messages.find((m) => m.id === messageId);
    if (hit) return hit;
  }
  for (const replies of Object.values(threadRepliesByRoot)) {
    const hit = replies.find((m) => m.id === messageId && m.conversation_id === conversationId);
    if (hit) return hit;
  }
  return null;
}

function authorName(op: ChatPrivateOp): string | undefined {
  const { dms } = useChatStore.getState();
  const dm = dms.find((d) => d.id === op.conversation_id);
  return dm?.peer_user_id === op.sender_id ? dm.peer_user_name : undefined;
}

/**
 * A phone's edit, reaction or delete on a held message (`chat.private_op`).
 * A target the server still holds also arrives as the ordinary event, so
 * applying both is harmless; a target already purged is only fixable here,
 * and only if this browser loaded it. Each effect goes back through the
 * store's own realtime path, so feeds, threads and the reply previews update
 * exactly as they do for any other event — an edit is decrypted there too.
 */
export function applyPrivateOp(op: ChatPrivateOp) {
  const target = loadedMessage(op.conversation_id, op.target_message_id);
  if (!target) return;
  const store = useChatStore.getState();
  switch (privateOpEffect(op, target)) {
    case "react":
      store.handleWsEvent({
        type: "chat.reaction.updated",
        conversation_id: op.conversation_id,
        id: target.id,
        reactions: applyPrivateReaction(target.reactions ?? [], {
          userId: op.sender_id,
          currentUserId: store.currentUserId,
          emoji: op.emoji ?? "",
          reacted: op.reacted === true,
          userName: authorName(op),
        }),
      });
      return;
    case "edit":
      store.handleWsEvent({
        type: "chat.message.updated",
        conversation_id: op.conversation_id,
        message: editedStandIn(op, target),
      });
      return;
    case "delete":
      store.handleWsEvent({
        type: "chat.message.deleted",
        conversation_id: op.conversation_id,
        id: target.id,
      });
      return;
    case "ignore":
      return;
  }
}
