"use client";

import { Cancel01Icon } from "hugeicons-react";
import type { ChatMessageQuote } from "@/lib/api/types/chat";
import { quoteSummary } from "../chat-quote-utils";

/**
 * Sits above the composer while a reply is being written — Signal's, and the
 * only place the pending quote is visible before it is sent. Dismissing it is
 * the only way to cancel a reply, so the × is never hidden behind a hover.
 */
export default function ReplyPreviewBar({
  quote,
  selfUserId,
  onCancel,
}: {
  quote: ChatMessageQuote;
  selfUserId: string;
  onCancel: () => void;
}) {
  const toSelf = !!quote.user_id && quote.user_id === selfUserId;
  return (
    <div className="flex items-center gap-2 px-3 pt-2">
      <div
        className="flex min-w-0 flex-1 gap-2 rounded-md py-1.5 pl-2 pr-2"
        style={{ background: "var(--sig-surface-2)" }}
      >
        <span
          aria-hidden
          className="w-[3px] shrink-0 self-stretch rounded-full"
          style={{ background: "var(--sig-accent)" }}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px] font-semibold text-[var(--sig-accent)]">
            {toSelf ? "Replying to yourself" : `Replying to ${quote.user_name || "AbabilX user"}`}
          </span>
          <span className="block truncate text-[12px] text-[var(--sig-label-2)]">
            {quoteSummary(quote)}
          </span>
        </span>
      </div>
      <button
        type="button"
        aria-label="Cancel reply"
        title="Cancel reply"
        onClick={onCancel}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--sig-label-2)] hover:bg-[var(--sig-fill-strong)] hover:text-[var(--sig-label)]"
      >
        <Cancel01Icon size={15} />
      </button>
    </div>
  );
}
