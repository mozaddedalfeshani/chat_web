"use client";

import { useTypingLabel } from "@/lib/chat-typing/use-typing-label";

/** "Alice is typing…" under a group name; nothing while nobody is. */
export default function GroupTypingLine({ conversationId }: { conversationId: string }) {
  const text = useTypingLabel(conversationId, true);
  if (!text) return null;
  return (
    <span className="truncate text-[11px] font-medium text-[var(--indigo)]">{text}</span>
  );
}
