"use client";

import { useState } from "react";
import { Task01Icon } from "hugeicons-react";
import type { ChatMessage } from "@/lib/api/types/chat";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { isTaskClosed, taskOf, type TaskPatch } from "@/lib/chat-task/task-format";
import { useChatStore } from "@/store/chat-store";
import ChatAttachment from "../chat-timeline/chat-attachment";
import { TaskCardControls, TaskCardHead } from "./task-card";
import { changeTask, withTaskPatch } from "./task-update";
import { useTaskPages, type TaskFilter as Filter } from "./use-task-pages";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "closed", label: "Closed" },
];

/** Every task the two people in this DM share, changeable in place. */
export default function TaskListDialog({
  conversationId,
  open,
  onOpenChange,
}: {
  conversationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const currentUserId = useChatStore((s) => s.currentUserId);
  const [filter, setFilter] = useState<Filter>("all");
  const pages = useTaskPages(conversationId, filter, currentUserId, open);
  const { tasks, replace } = pages;

  async function change(message: ChatMessage, patch: TaskPatch) {
    replace(withTaskPatch(message, patch));
    if (!(await changeTask(message, patch))) replace(message);
  }

  const shown = tasks.filter((message) => {
    const task = taskOf(message);
    if (!task) return false;
    return filter === "all" || isTaskClosed(task.status) === (filter === "closed");
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-full max-w-lg flex-col gap-3">
        <DialogHeader>
          <DialogTitle>Tasks</DialogTitle>
        </DialogHeader>
        <div className="flex gap-1.5">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className="h-8 rounded-full px-3.5 text-[13px] font-medium"
              style={
                filter === item.key
                  ? { background: "var(--indigo)", color: "#fff" }
                  : { background: "var(--surface2)", color: "var(--text)" }
              }
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="min-h-[160px] flex-1 space-y-2 overflow-y-auto">
          {pages.loading ? (
            <Notice text="Loading…" />
          ) : pages.failed ? (
            <Notice text="Could not load tasks." />
          ) : tasks.length === 0 && filter === "all" ? (
            <Notice text="No tasks yet. Send one from the task button in this chat." />
          ) : shown.length === 0 && !pages.hasMore ? (
            <Notice text="Nothing here." />
          ) : (
            shown.map((message) => (
              <div
                key={message.id}
                className="rounded-2xl p-3"
                style={{ background: "var(--surface2)", color: "var(--text)" }}
              >
                <TaskCardHead message={message} task={taskOf(message)!} />
                {(message.attachments ?? []).length ? (
                  <div className="space-y-1.5">
                    {(message.attachments ?? []).map((attachment) => (
                      <ChatAttachment key={attachment.id} attachment={attachment} />
                    ))}
                  </div>
                ) : null}
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <TaskCardControls
                    message={message}
                    task={taskOf(message)!}
                    onChange={(patch) => change(message, patch)}
                  />
                  <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                    {message.user_id === currentUserId
                      ? "From you"
                      : `From ${message.user_name ?? "them"}`}
                  </span>
                </div>
              </div>
            ))
          )}
          {pages.hasMore ? (
            <button
              type="button"
              disabled={pages.more === "loading"}
              onClick={() => void pages.showMore()}
              className="mx-auto block h-8 rounded-full px-3.5 text-[13px] font-medium"
              style={{ background: "var(--surface2)", color: "var(--text)" }}
            >
              {pages.more === "loading" ? "Loading…" : pages.more === "failed" ? "Try again" : "Show more"}
            </button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Notice({ text }: { text: string }) {
  return (
    <div
      className="flex flex-col items-center gap-2 py-10 text-center text-sm"
      style={{ color: "var(--text-muted)" }}
    >
      <Task01Icon size={26} />
      {text}
    </div>
  );
}
