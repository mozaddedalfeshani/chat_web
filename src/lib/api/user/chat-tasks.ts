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

export type ChatTaskState = "open" | "closed";
export type ChatTaskPage = { tasks: ChatMessage[]; next_cursor?: string | null };

/** One page of the DM's task cards, newest first. Bodies are still sealed.
 *  `cursor` is the page before's `next_cursor`, which is null on the last. */
export function listChatTasks(
  conversationId: string,
  options: { state?: ChatTaskState; cursor?: string; limit?: number } = {},
) {
  const query = new URLSearchParams({ limit: String(options.limit ?? 50) });
  if (options.state) query.set("state", options.state);
  if (options.cursor) query.set("cursor", options.cursor);
  return apiFetch<ChatTaskPage>(
    `/api/chat/conversations/${conversationId}/tasks?${query}`,
  );
}
