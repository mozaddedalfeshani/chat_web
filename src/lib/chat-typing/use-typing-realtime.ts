"use client";

import { useEffect } from "react";
import { api } from "@/lib/api";
import type { ChatTypingEvent, ChatWsEvent } from "@/lib/api/types/chat";
import { subscribeAppWs } from "@/lib/notifications/ws-bus";
import { useTypingStore } from "./typing-store";

/**
 * Mount once beside the chat realtime subscription. Feeds `chat.typing` into
 * the typing store, drops a typist the moment their message lands, and ages
 * out anyone whose "stopped" frame never arrived.
 */
export function useTypingRealtime(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    void api.getTypingIndicators()
      .then((s) => useTypingStore.getState().setEnabled(s.enabled))
      .catch(() => {});
    const unsubscribe = subscribeAppWs({
      onEvent: (raw) => {
        const store = useTypingStore.getState();
        const type = (raw as { type: string }).type;
        if (type === "chat.typing") {
          const ev = raw as ChatTypingEvent;
          if (!store.enabled || !ev.conversation_id || !ev.from_user_id) return;
          store.apply(ev.conversation_id, ev.from_user_id, ev.typing_user_name ?? "", ev.typing !== false);
        } else if (type === "chat.message.created") {
          const ev = raw as Extract<ChatWsEvent, { type: "chat.message.created" }>;
          const senderId = ev.message?.user_id;
          if (senderId) store.clear(ev.conversation_id, senderId);
        }
      },
    });
    const timer = setInterval(() => useTypingStore.getState().prune(Date.now()), 1_000);
    return () => {
      clearInterval(timer);
      unsubscribe();
    };
  }, [enabled]);
}
