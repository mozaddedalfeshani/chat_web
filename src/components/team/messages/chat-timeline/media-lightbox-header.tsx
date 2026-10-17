"use client";

import { Download, ExternalLink, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatAttachmentTimestamp } from "@/lib/text/attachment-timestamp";
import { chatInitials } from "../chat-utils";

/**
 * Signal's `Lightbox__header`: who sent this and when on the left, the actions
 * on the right. 52px tall, 16px inset, 32px between controls — its numbers.
 *
 * Signal's Forward button is deliberately absent: the forward dialog is opened
 * from the message, and a control that does nothing is worse than a missing
 * one. Open in browser is ours and sits beside Save — a picture people can
 * save is one they may want to open somewhere that can zoom, print or share
 * it.
 *
 * Colours are the app's tokens, not Signal's hardcoded white-on-black. Signal
 * forces its lightbox dark because it owns the window; ours is a surface
 * inside a themed app, and a permanently black viewer in light mode reads as
 * a bug — the same call the group-call surface already made.
 */
export default function MediaLightboxHeader({
  senderName,
  senderAvatarUrl,
  sentAt,
  onSave,
  onOpen,
  onClose,
  saving,
  noSave = false,
}: {
  senderName?: string;
  senderAvatarUrl?: string;
  sentAt?: string;
  onSave: () => void;
  onOpen: () => void;
  onClose: () => void;
  saving: boolean;
  /** A `no_save` file: Save and Open in browser are not offered. */
  noSave?: boolean;
}) {
  return (
    <div className="mb-4 flex h-[52px] min-h-[52px] items-center justify-between px-4">
      <div className="flex min-w-0 items-center">
        <Avatar className="me-[10px] h-8 w-8 shrink-0">
          <AvatarImage src={senderAvatarUrl || undefined} alt="" />
          <AvatarFallback
            className="text-[11px]"
            style={{ background: "var(--sig-fill-strong)", color: "var(--sig-label)" }}
          >
            {chatInitials(senderName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div
            className="truncate text-[13px] font-bold leading-[18px]"
            style={{ color: "var(--sig-label)" }}
          >
            {senderName || "Unknown"}
          </div>
          {sentAt ? (
            <div
              className="truncate text-[12px] leading-4"
              style={{ color: "var(--sig-label-2)" }}
            >
              {formatAttachmentTimestamp(sentAt)}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-8">
        {noSave ? null : (
          <>
            <button
              type="button"
              aria-label="Save to Downloads"
              title="Save to Downloads"
              onClick={onSave}
              disabled={saving}
              style={{ color: "var(--sig-label)" }}
              className="transition-opacity hover:opacity-70 disabled:opacity-40"
            >
              <Download className="h-6 w-6" />
            </button>
            <button
              type="button"
              aria-label="Open in browser"
              title="Open in browser"
              onClick={onOpen}
              style={{ color: "var(--sig-label)" }}
              className="transition-opacity hover:opacity-70"
            >
              <ExternalLink className="h-6 w-6" />
            </button>
          </>
        )}
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          style={{ color: "var(--sig-label)" }}
          className="transition-opacity hover:opacity-70"
        >
          <X className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
