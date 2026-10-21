"use client";

import { format, parseISO } from "date-fns";
import type { ChatMessage } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { copyText } from "./bubble-actions";

function stamp(iso?: string | null) {
  if (!iso) return null;
  return format(parseISO(iso), "EEE, MMM d yyyy · h:mm:ss a");
}

function bytes(size?: number) {
  if (!size) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = size;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value < 10 && unit > 0 ? 1 : 0)} ${units[unit]}`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-[13px]">
      <span className="shrink-0 text-[var(--sig-label-2)]">{label}</span>
      <span className="min-w-0 break-words text-right text-[var(--sig-label)]">
        {value}
      </span>
    </div>
  );
}

/** Signal's "Info": who sent it, when, how far it got, and what rode along. */
export default function MessageInfoDialog({
  open,
  onOpenChange,
  message,
  outgoing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: ChatMessage;
  outgoing: boolean;
}) {
  const delivery = message.delivery;
  const attachments = message.attachments ?? [];
  const encrypted = !!message.encryption_version || !!message.encrypted_body;

  const status = !outgoing
    ? null
    : (delivery?.read_devices ?? 0) > 0
      ? `Read · ${delivery?.read_devices} of ${delivery?.targeted_devices ?? 0} devices`
      : (delivery?.delivered_devices ?? 0) > 0
        ? `Delivered · ${delivery?.delivered_devices} of ${delivery?.targeted_devices ?? 0} devices`
        : "Sent";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Message info</DialogTitle>
        </DialogHeader>

        <div className="divide-y" style={{ borderColor: "var(--border)" }}>
          <Row label="From" value={outgoing ? "You" : message.user_name || "AbabilX user"} />
          <Row label="Sent" value={stamp(message.created_at) ?? "—"} />
          {message.edited_at ? (
            <Row label="Edited" value={stamp(message.edited_at) ?? "—"} />
          ) : null}
          {status ? <Row label="Status" value={status} /> : null}
          <Row
            label="Encryption"
            value={encrypted ? "End-to-end encrypted" : "Not encrypted"}
          />
          {message.via_ababilx || message.forwarded_from_name ? (
            <Row
              label="Forwarded"
              value={message.forwarded_from_name ?? "via AbabilX"}
            />
          ) : null}
          {message.thread_count ? (
            <Row label="Thread replies" value={String(message.thread_count)} />
          ) : null}
          {attachments.length ? (
            <Row
              label="Attachments"
              value={attachments
                .map((a) => `${a.file_name}${a.size_bytes ? ` (${bytes(a.size_bytes)})` : ""}`)
                .join("\n")}
            />
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => void copyText(message.id)}
          className="mt-1 self-start text-[12px] text-[var(--sig-label-2)] underline hover:text-[var(--sig-label)]"
        >
          Copy message ID
        </button>
      </DialogContent>
    </Dialog>
  );
}
