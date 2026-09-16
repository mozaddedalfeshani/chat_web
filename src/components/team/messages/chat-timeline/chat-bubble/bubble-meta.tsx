"use client";

import { format, isToday, parseISO } from "date-fns";
import type { ChatMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import BubbleStatus from "./bubble-status";

function bubbleTime(iso: string) {
  const when = parseISO(iso);
  return isToday(when) ? format(when, "h:mm a") : format(when, "MMM d, h:mm a");
}

/** Signal's in-bubble footer: time, an "Edited" marker when the body has been
 * changed since it was sent, and — on your own messages — the delivery ticks. */
export default function BubbleMeta({
  message,
  outgoing,
  inset = false,
  onMedia = false,
}: {
  message: ChatMessage;
  outgoing: boolean;
  /** Media-only bubbles have no padding of their own. */
  inset?: boolean;
  /** Time sits on the photo: light ink + shadow, no extra gap. */
  onMedia?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-1 text-[11px] leading-none",
        onMedia
          ? "mt-0 text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.8)]"
          : "mt-1 text-[var(--sig-label-2)]",
        inset && !onMedia && "px-2 pb-1",
      )}
    >
      {message.edited_at ? <span>Edited</span> : null}
      <time dateTime={message.created_at}>{bubbleTime(message.created_at)}</time>
      {/* Only the sender sees ticks — on an incoming message they would be
          reporting the reader's own state back at them. */}
      {outgoing ? <BubbleStatus delivery={message.delivery} /> : null}
    </div>
  );
}
