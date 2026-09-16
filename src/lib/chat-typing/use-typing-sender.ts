"use client";

import { useCallback, useEffect, useRef } from "react";
import { sendOnAppWs } from "@/lib/notifications/ws-bus";
import { useTypingStore } from "./typing-store";

/** Receivers expire a typist after 5 s, so re-assert well inside that. */
const RESEND_MS = 3_000;

/**
 * Reports this device's draft state for one conversation. `onDraftChange`
 * is called with every edit; `stop` on send. A frame that cannot go out now
 * is dropped, never queued — stale typing is worse than none.
 */
export function useTypingSender(conversationId: string | null | undefined) {
  const sentAtRef = useRef(0);
  const enabled = useTypingStore((s) => s.enabled);

  const send = useCallback((typing: boolean) => {
    if (!conversationId) return;
    sendOnAppWs({ type: "chat.typing", conversation_id: conversationId, typing });
  }, [conversationId]);

  const stop = useCallback(() => {
    if (sentAtRef.current === 0) return;
    sentAtRef.current = 0;
    send(false);
  }, [send]);

  const onDraftChange = useCallback((empty: boolean) => {
    if (!enabled || !conversationId) return;
    if (empty) return stop();
    const now = Date.now();
    if (now - sentAtRef.current < RESEND_MS) return;
    sentAtRef.current = now;
    send(true);
  }, [conversationId, enabled, send, stop]);

  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState !== "visible") stop();
    };
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      stop();
    };
  }, [stop]);

  return { onDraftChange, stop };
}
