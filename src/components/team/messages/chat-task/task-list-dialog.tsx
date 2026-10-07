"use client";

import { useEffect, useState } from "react";
import { Task01Icon } from "hugeicons-react";
import type { ChatMessage } from "@/lib/api/types/chat";
import { listChatTasks } from "@/lib/api/user/chat-tasks";
import { decryptChatMessages } from "@/lib/chat-e2ee/crypto";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { isTaskClosed, taskOf, type TaskPatch } from "@/lib/chat-task/task-format";
import { useChatStore } from "@/store/chat-store";
import ChatAttachment from "../chat-timeline/chat-attachment";
import { TaskCardControls, TaskCardHead } from "./task-card";
import { changeTask, withTaskPatch } from "./task-update";

type Filter = "all" | "open" | "closed";
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
  const [result, setResult] = useState<{
    key: string;
    tasks: ChatMessage[];
    failed: boolean;
  }>({ key: "", tasks: [], failed: false });
  const key = open ? conversationId : "";
  const loading = open && result.key !== key;
  const tasks = result.key === key ? result.tasks : [];

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    listChatTasks(conversationId)
      .then((page) => decryptChatMessages(page.tasks ?? [], currentUserId))
      .then((tasks) => {
        if (!cancelled) setResult({ key: conversationId, tasks, failed: false });
      })
      .catch(() => {
        if (!cancelled) setResult({ key: conversationId, tasks: [], failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [open, conversationId, currentUserId]);

  function replace(next: ChatMessage) {
    setResult((current) => ({
      ...current,
      tasks: current.tasks.map((task) => (task.id === next.id ? next : task)),
    }));
  }

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
          {loading ? (
            <Notice text="Loading…" />
          ) : result.failed ? (
            <Notice text="Could not load tasks." />
          ) : tasks.length === 0 ? (
            <Notice text="No tasks yet. Send one from the task button in this chat." />
          ) : shown.length === 0 ? (
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
