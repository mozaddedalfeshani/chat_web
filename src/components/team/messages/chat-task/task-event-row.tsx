"use client";

import type { ChatMessage } from "@/lib/api/types/chat";
import { tiptapToPlainText } from "@/components/team/board/tiptap/utils";
import { splitTaskText, taskEventSentence } from "@/lib/chat-task/task-format";
import { feedKey, useChatStore } from "@/store/chat-store";

export function isTaskEvent(message: ChatMessage) {
  const event = message.meta?.event;
  return event === "task_status_changed" || event === "task_priority_changed";
}

/**
 * "You marked "Fix login" as Done". The server's line cannot name the task —
 * its title is sealed — so the title is looked up in the open timeline, and
 * the line says "a task" when that card is not loaded.
 */
export default function TaskEventRow({
  message,
  currentUserId,
}: {
  message: ChatMessage;
  currentUserId: string;
}) {
  const meta = message.meta;
  const title = useChatStore((s) => {
    const card = s.feeds[feedKey(message.conversation_id, null)]?.messages.find(
      (candidate) => candidate.id === meta?.message_id,
    );
    return card && !card.deleted_at
      ? splitTaskText(tiptapToPlainText(card.body ?? "")).title
      : "";
  });
  const actor =
    meta?.actor_id === currentUserId ? "You" : meta?.actor_name?.trim() || "Someone";
  return (
    <div className="py-2 text-center text-xs italic text-muted-foreground">
      {taskEventSentence(meta?.event, meta?.value, actor, title) ?? message.body}
    </div>
  );
}
