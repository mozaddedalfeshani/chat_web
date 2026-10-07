import { apiFetch, jsonHeaders } from "../core";
import type { ChatMessage } from "../types/chat";
import type { TaskPatch } from "@/lib/chat-task/task-format";

/** Moves a task card's priority and/or status. Either person in the DM may. */
export function updateChatTask(messageId: string, patch: TaskPatch) {
  return apiFetch<ChatMessage>(`/api/chat/messages/${messageId}/task`, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify(patch),
  });
}

/** Every task card in the DM, newest first. Bodies are still sealed. */
export function listChatTasks(conversationId: string) {
  return apiFetch<{ tasks: ChatMessage[] }>(
    `/api/chat/conversations/${conversationId}/tasks`,
  );
}
