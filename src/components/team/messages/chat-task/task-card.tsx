"use client";

import { useState } from "react";
import { Flag02Icon, Task01Icon, TaskDone01Icon } from "hugeicons-react";
import type { ChatMessage } from "@/lib/api/types/chat";
import { tiptapToPlainText } from "@/components/team/board/tiptap/utils";
import {
  PRIORITY_COLOR,
  PRIORITY_LABEL,
  STATUS_COLOR,
  STATUS_LABEL,
  TASK_PRIORITIES,
  TASK_STATUSES,
  isTaskClosed,
  splitTaskText,
  type TaskCard,
  type TaskPatch,
} from "@/lib/chat-task/task-format";
import TaskPill from "./task-pill";
import { changeTask } from "./task-update";

const PRIORITY_OPTIONS = TASK_PRIORITIES.map((value) => ({
  value,
  label: PRIORITY_LABEL[value],
  color: PRIORITY_COLOR[value],
}));
const STATUS_OPTIONS = TASK_STATUSES.map((value) => ({
  value,
  label: STATUS_LABEL[value],
  color: STATUS_COLOR[value],
}));

/** The "Task" label, the title and the description: the card's top half. */
export function TaskCardHead({ message, task }: { message: ChatMessage; task: TaskCard }) {
  const { title, description } = splitTaskText(tiptapToPlainText(message.body ?? ""));
  const closed = isTaskClosed(task.status);
  return (
    <div className="mb-1.5 min-w-[220px]">
      <div
        className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase"
        style={{ color: "var(--sig-label-2)" }}
      >
        <Task01Icon size={14} />
        Task
      </div>
      <p
        className="whitespace-pre-wrap break-words text-[15px] font-semibold leading-snug"
        style={closed ? { textDecoration: "line-through", opacity: 0.7 } : undefined}
      >
        {title || "Untitled task"}
      </p>
      {description ? (
        <p
          className="mt-1 whitespace-pre-wrap break-words text-[13.5px] leading-[1.4]"
          style={{ color: "var(--sig-label-2)" }}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}

/** The two dropdowns under the card. Either person in the DM may use both. */
export function TaskCardControls({
  message,
  task,
  onChange,
}: {
  message: ChatMessage;
  task: TaskCard;
  /** Replaces the default (the open chat's own store) — the Tasks list. */
  onChange?: (patch: TaskPatch) => Promise<unknown>;
}) {
  const [busy, setBusy] = useState(false);

  async function apply(patch: TaskPatch) {
    if (busy) return;
    setBusy(true);
    try {
      await (onChange ? onChange(patch) : changeTask(message, patch));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <TaskPill
        caption="Priority"
        icon={<Flag02Icon size={13} />}
        value={task.priority}
        options={PRIORITY_OPTIONS}
        disabled={busy}
        onChange={(priority) => void apply({ priority })}
      />
      <TaskPill
        caption="Status"
        icon={<TaskDone01Icon size={13} />}
        value={task.status}
        options={STATUS_OPTIONS}
        disabled={busy}
        onChange={(status) => void apply({ status })}
      />
    </div>
  );
}
