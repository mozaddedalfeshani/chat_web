import { Link01Icon, MessageMultiple01Icon } from "hugeicons-react";
import { TaskCardHead } from "@/components/team/messages/chat-task/task-card";
import { PRIORITY_COLOR, PRIORITY_LABEL, STATUS_COLOR, STATUS_LABEL } from "@/lib/chat-task/task-format";
import type { ChatMessage } from "@/lib/api";
import { AppComposer, AppHeader, WebStage } from "./feature-card";
import { FEATURE_COPY } from "./feature-copy";

const TASK_MESSAGE = {
  body: "Book tickets for Eid\nTwo seats, morning train.",
} as ChatMessage;

export function TasksCard() {
  const c = FEATURE_COPY.tasks;
  return (
    <WebStage active={c.peer}>
      <AppHeader title={c.peer} />
      <div className="flex min-h-0 flex-1 flex-col justify-end px-3 pb-3">
        <div
          className="ml-auto max-w-[min(50vw,32rem)] px-3 py-2"
          style={{
            borderRadius: "18px",
            background: "var(--sig-bubble)",
            color: "var(--sig-label)",
          }}
        >
          <TaskCardHead message={TASK_MESSAGE} task={{ priority: "high", status: "in_progress" }} />
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Pill label={PRIORITY_LABEL.high} color={PRIORITY_COLOR.high} />
            <Pill label={STATUS_LABEL.in_progress} color={STATUS_COLOR.in_progress} />
          </div>
        </div>
      </div>
      <AppComposer />
    </WebStage>
  );
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex h-7 items-center rounded-full px-2.5 text-[12px] font-semibold"
      style={{ color, background: `color-mix(in srgb, ${color} 14%, transparent)` }}
    >
      {label}
    </span>
  );
}

export function FlocksCard() {
  const c = FEATURE_COPY.flocks;
  return (
    <WebStage active={c.name}>
      <AppHeader title={c.name} encrypted={false} />
      <div className="min-h-0 flex-1 px-4 py-3">
        <article className="relative flex min-w-0 gap-3 py-2 pr-2">
          <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--indigo)_15%,transparent)] text-[var(--indigo)]">
            <Link01Icon size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-sm font-semibold text-[var(--text)]">{c.from}</span>
              <span className="rounded bg-[color-mix(in_srgb,var(--indigo)_15%,transparent)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--indigo)]">
                webhook
              </span>
              <time className="text-xs text-muted-foreground">2:14 PM</time>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-[var(--text)]">{c.body}</p>
          </div>
          <div className="absolute right-2 top-1 flex items-center gap-0.5 rounded-full border border-[var(--border)] bg-[var(--sig-surface,var(--background))] px-1 py-0.5 shadow-sm">
            <span className="flex h-7 items-center gap-1 rounded-full px-2 text-xs text-[var(--sig-label-2)]">
              <MessageMultiple01Icon size={15} />
              <span>Thread</span>
            </span>
          </div>
        </article>
      </div>
    </WebStage>
  );
}
