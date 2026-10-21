"use client";

import type { ChatMessageQuote } from "@/lib/api/types/chat";
import { cn } from "@/lib/utils";
import { quoteSummary } from "../../chat-quote-utils";
import { authorColorVar } from "./author-color";

/**
 * Signal's quote card: an accent rail, the original author, one clamped line of
 * what they said. Clicking it jumps to the original — the reason a quoted reply
 * stays in the main feed instead of collapsing into a thread.
 */
export default function BubbleQuote({
  quote,
  onJump,
}: {
  quote: ChatMessageQuote;
  onJump?: (messageId: string) => void;
}) {
  const jumpable = !quote.deleted && !quote.unavailable_here && !!onJump;
  return (
    <button
      type="button"
      disabled={!jumpable}
      onClick={jumpable ? () => onJump(quote.message_id) : undefined}
      className={cn(
        "mb-1 flex w-full min-w-0 gap-2 rounded-md py-1 pl-2 pr-2 text-left",
        // A theme token, not `dark:`: this tree themes on `data-theme`, so a
        // `dark:` variant answers the OS instead of the app.
        "bg-[var(--sig-fill-strong)]",
        jumpable ? "cursor-pointer hover:opacity-90" : "cursor-default",
      )}
    >
      <span
        aria-hidden
        className="w-[3px] shrink-0 self-stretch rounded-full"
        style={{ background: authorColorVar(quote.user_id ?? "") }}
      />
      <span className="min-w-0 flex-1">
        <span
          className="block truncate text-[12px] font-semibold leading-tight"
          style={{ color: authorColorVar(quote.user_id ?? "") }}
        >
          {quote.user_name || "AbabilX user"}
        </span>
        <span
          className={cn(
            "line-clamp-2 block text-[12px] leading-snug",
            quote.deleted && "italic",
            "text-[var(--sig-label-2)]",
          )}
        >
          {quoteSummary(quote)}
        </span>
      </span>
    </button>
  );
}
