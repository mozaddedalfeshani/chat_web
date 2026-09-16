"use client";

import { useShallow } from "zustand/react/shallow";
import { typingLabel } from "./typing-label";
import { selectTypingNames, useTypingStore } from "./typing-store";

/** "typing…" / "Alice is typing…" for one conversation, or "" when nobody is. */
export function useTypingLabel(conversationId: string | null | undefined, isGroup: boolean) {
  const names = useTypingStore(useShallow((s) => selectTypingNames(s, conversationId)));
  return typingLabel(names, isGroup);
}
