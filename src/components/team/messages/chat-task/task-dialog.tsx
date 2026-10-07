"use client";

import { useRef, useState } from "react";
import { Attachment01Icon, Cancel01Icon } from "hugeicons-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MAX_WALL_ATTACHMENT_BYTES } from "@/components/team/wall/wall-attachment-limits";
import {
  PRIORITY_COLOR,
  PRIORITY_LABEL,
  TASK_PRIORITIES,
  type TaskPriority,
} from "@/lib/chat-task/task-format";
import { MAX_TASK_FILES, TaskNotSent, sendTask, type TaskTransport } from "./send-task";

const FIELD =
  "w-full rounded-2xl border bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-[var(--indigo)]";
const FIELD_STYLE = { borderColor: "var(--border)", color: "var(--text)" };
const CAPSULE =
  "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-opacity disabled:opacity-50";

/** A task for the other person: title, description, priority and files.
 *  The phone's "New task" page, as a dialog. */
export default function TaskDialog({
  open,
  onOpenChange,
  transport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transport: TaskTransport;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const picker = useRef<HTMLInputElement>(null);

  function addFiles(list: FileList | null) {
    const picked = Array.from(list ?? []);
    const fits = picked.filter((file) => file.size <= MAX_WALL_ATTACHMENT_BYTES);
    if (fits.length < picked.length) toast.error("A file is too large to send.");
    setFiles((current) => {
      const next = [...current, ...fits];
      if (next.length > MAX_TASK_FILES) toast.error(`Up to ${MAX_TASK_FILES} files per task.`);
      return next.slice(0, MAX_TASK_FILES);
    });
  }

  async function send() {
    if (sending) return;
    setSending(true);
    try {
      await sendTask(transport, { title, description, priority, files });
      setTitle("");
      setDescription("");
      setPriority("medium");
      setFiles([]);
      onOpenChange(false);
    } catch (error) {
      if (!(error instanceof TaskNotSent)) {
        toast.error(error instanceof Error ? error.message : "Could not send the task.");
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (sending ? undefined : onOpenChange(next))}>
      <DialogContent className="flex max-h-[90vh] w-full max-w-lg flex-col gap-3 overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
        </DialogHeader>

        <input
          value={title}
          maxLength={120}
          disabled={sending}
          autoFocus
          placeholder="Title"
          onChange={(event) => setTitle(event.target.value)}
          className={`${FIELD} font-semibold`}
          style={FIELD_STYLE}
        />
        <textarea
          value={description}
          disabled={sending}
          rows={5}
          placeholder="Describe the task (optional)"
          onChange={(event) => setDescription(event.target.value)}
          className={`${FIELD} resize-none`}
          style={FIELD_STYLE}
        />

        <div>
          <p className="mb-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
            Priority
          </p>
          <div className="flex flex-wrap gap-1.5">
            {TASK_PRIORITIES.map((value) => {
              const color = PRIORITY_COLOR[value];
              const selected = value === priority;
              return (
                <button
                  key={value}
                  type="button"
                  disabled={sending}
                  aria-pressed={selected}
                  onClick={() => setPriority(value)}
                  className={CAPSULE}
                  style={{
                    color,
                    background: `color-mix(in srgb, ${color} ${selected ? 20 : 8}%, transparent)`,
                    boxShadow: selected ? `inset 0 0 0 1.5px ${color}` : undefined,
                  }}
                >
                  {PRIORITY_LABEL[value]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            disabled={sending || files.length >= MAX_TASK_FILES}
            onClick={() => picker.current?.click()}
            className={CAPSULE}
            style={{ background: "var(--surface2)", color: "var(--text)" }}
          >
            <Attachment01Icon size={15} />
            Add files
          </button>
          {files.map((file, index) => (
            <span
              key={`${file.name}-${index}`}
              className={`${CAPSULE} max-w-[220px]`}
              style={{ background: "var(--surface2)", color: "var(--text)" }}
            >
              <span className="truncate">{file.name}</span>
              <button
                type="button"
                aria-label={`Remove ${file.name}`}
                disabled={sending}
                onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}
              >
                <Cancel01Icon size={13} />
              </button>
            </span>
          ))}
          <input
            ref={picker}
            type="file"
            multiple
            hidden
            onChange={(event) => {
              addFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" disabled={sending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={sending || !title.trim()} onClick={() => void send()}>
            {sending ? "Sending…" : "Send"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
