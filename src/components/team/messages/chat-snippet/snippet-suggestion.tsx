"use client";

import { useMemo } from "react";
import { isMessageTooLong, messagePlainText } from "@/lib/chat-message-limit/message-limit";

/** Under this many characters a draft cannot hold 6000 words, so it is not
 *  parsed at all: the check costs nothing for ordinary messages. */
const SHORTEST_TOO_LONG = 12000;

/** A line over the composer once the draft is past the message limit, offering
 *  to send the same text as a snippet. Draws nothing below the limit. */
export default function SnippetSuggestion({
  body,
  onCreate,
}: {
  body: string;
  onCreate: (text: string) => void;
}) {
  const tooLong = useMemo(() => body.length >= SHORTEST_TOO_LONG && isMessageTooLong(body), [body]);
  if (!tooLong) return null;
  return (
    <div
      className="mb-1.5 flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-xs"
      style={{ background: "var(--sig-bubble, var(--surface))", color: "var(--text)" }}
    >
      <span>This message is over 6000 words. Send it as a snippet instead.</span>
      <button
        type="button"
        className="shrink-0 rounded-md px-2 py-1 font-semibold"
        style={{ color: "var(--indigo)" }}
        onClick={() => onCreate(messagePlainText(body))}
      >
        Create snippet
      </button>
    </div>
  );
}
