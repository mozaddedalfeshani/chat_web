import { toast } from "sonner";
import { updateChatTask } from "@/lib/api/user/chat-tasks";
import type { ChatMessage } from "@/lib/api/types/chat";
import type { TaskPatch } from "@/lib/chat-task/task-format";
import { feedKey, useChatStore } from "@/store/chat-store";

/** `message` with its task moved; every other meta key is kept. */
export function withTaskPatch(message: ChatMessage, patch: TaskPatch): ChatMessage {
  return {
    ...message,
    meta: { ...message.meta, task: { ...message.meta?.task, ...patch } },
  };
}

/**
 * Moves a task card's priority or status: shown at once, confirmed by the
 * server's `chat.message.updated`. On a refusal the old value comes back —
 * but only while this change is still the one on screen, or it would undo a
 * newer change the other person made meanwhile.
 */
export async function changeTask(message: ChatMessage, patch: TaskPatch) {
  const conversationId = message.conversation_id;
  const next = withTaskPatch(message, patch);
  useChatStore.getState().updateFeedMessage(conversationId, next, null);
  try {
    await updateChatTask(message.id, patch);
    return true;
  } catch {
    const store = useChatStore.getState();
    const shown = store.feeds[feedKey(conversationId, null)]?.messages.find(
      (candidate) => candidate.id === message.id,
    );
    const ours = Object.entries(patch).every(
      ([key, value]) => shown?.meta?.task?.[key as keyof TaskPatch] === value,
    );
    if (shown && ours) {
      store.updateFeedMessage(
        conversationId,
        { ...shown, meta: { ...shown.meta, task: message.meta?.task } },
        null,
      );
    }
    toast.error("Could not update the task.");
    return false;
  }
}
