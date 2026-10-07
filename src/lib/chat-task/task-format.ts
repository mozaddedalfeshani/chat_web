/**
 * Task cards: a DM message whose `meta.task` carries a priority and a status
 * both people may change. Wire values are the server's (migration 0169) and
 * the phone's (`task_card_data.dart`) — never rename one side alone.
 */
export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export const TASK_STATUSES = [
  "todo",
  "in_progress",
  "review",
  "blocked",
  "done",
  "cancelled",
] as const;

export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskCard = { priority: TaskPriority; status: TaskStatus };
export type TaskPatch = { priority?: TaskPriority; status?: TaskStatus };

/** What rides beside an ordinary send to make it a task card. */
export type ChatSendExtra = { task?: { priority: TaskPriority } };

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  review: "Review",
  blocked: "Blocked",
  done: "Done",
  cancelled: "Cancelled",
};

const GREY = "var(--sig-label-2, #8b8b93)";

/** Meaning, not theme: done is green and blocked is red in either theme. */
export const PRIORITY_COLOR: Record<TaskPriority, string> = {
  low: GREY,
  medium: "#3b82f6",
  high: "#d97706",
  urgent: "#ef4444",
};

export const STATUS_COLOR: Record<TaskStatus, string> = {
  todo: GREY,
  in_progress: "#3b82f6",
  review: "#8b5cf6",
  blocked: "#ef4444",
  done: "#22c55e",
  cancelled: GREY,
};

export function parseTaskPriority(raw: unknown): TaskPriority {
  return TASK_PRIORITIES.find((value) => value === raw) ?? "medium";
}

export function parseTaskStatus(raw: unknown): TaskStatus {
  return TASK_STATUSES.find((value) => value === raw) ?? "todo";
}

/** Nothing left to do on it. */
export function isTaskClosed(status: TaskStatus) {
  return status === "done" || status === "cancelled";
}

/** Null when the message is not a task card. */
export function taskOf(message: {
  meta?: { task?: { priority?: string; status?: string } | null } | null;
  deleted_at?: string | null;
}): TaskCard | null {
  const task = message.meta?.task;
  if (!task || message.deleted_at) return null;
  return {
    priority: parseTaskPriority(task.priority),
    status: parseTaskStatus(task.status),
  };
}

/** One body holds both: the first line is the title, the rest the
 *  description. A client that knows nothing of tasks shows it as that text. */
export function taskBodyText(title: string, description: string) {
  const head = title.trim().replace(/\s*\n\s*/g, " ");
  const rest = description.trim();
  return rest ? `${head}\n${rest}` : head;
}

export function splitTaskText(plain: string) {
  const text = plain.trim();
  const cut = text.indexOf("\n");
  if (cut < 0) return { title: text, description: "" };
  return {
    title: text.slice(0, cut).trim(),
    description: text.slice(cut + 1).trim(),
  };
}

const TITLE_LIMIT = 40;

/**
 * The timeline line for a task change, or null for any other event. `actor`
 * is "You" or a name; `title` is empty when the card is not loaded — the
 * server cannot name the task, its title is sealed.
 */
export function taskEventSentence(
  event: string | undefined,
  value: string | undefined,
  actor: string,
  title: string,
): string | null {
  const short =
    title.length > TITLE_LIMIT ? `${title.slice(0, TITLE_LIMIT).trimEnd()}…` : title;
  const named = short ? `"${short}"` : "a task";
  if (event === "task_status_changed") {
    return `${actor} marked ${named} as ${STATUS_LABEL[parseTaskStatus(value)]}`;
  }
  if (event === "task_priority_changed") {
    return `${actor} set the priority of ${named} to ${PRIORITY_LABEL[parseTaskPriority(value)]}`;
  }
  return null;
}
