"use client";

import { useEffect } from "react";
import type { ChatPrivateChatEvent, ChatPrivateOpEvent } from "@/lib/api/types/chat";
import { subscribeAppWs } from "@/lib/notifications/ws-bus";
import { useChatStore } from "@/store/chat-store";
import { applyPrivateOp } from "./apply-private-op";
import { useDeliveryOnlyStore } from "./delivery-only-store";

/**
 * Mount once beside the chat realtime subscription.
 *
 * - `chat.private_chat`: either person switched private chat in the app. Both
 *   devices of both people hear it, so an open browser swaps between the
 *   timeline and the "open the app" screen live, and the row is re-read.
 * - `chat.private_op`: a phone edited, reacted to or deleted a held message.
 */
export function useDeliveryOnlyRealtime(currentUserId: string | null | undefined) {
  useEffect(() => {
    if (!currentUserId) {
      useDeliveryOnlyStore.getState().reset();
      return;
    }
    return subscribeAppWs({
      onEvent: (raw) => {
        const type = (raw as { type?: string }).type;
        if (type === "chat.private_chat") {
          const ev = raw as ChatPrivateChatEvent;
          if (!ev.conversation_id) return;
          useDeliveryOnlyStore
            .getState()
            .setPrivateChat(ev.conversation_id, ev.private_chat?.enabled === true);
          void useChatStore.getState().fetchSidebar({ silent: true });
          return;
        }
        if (type === "chat.private_op") {
          const ev = raw as ChatPrivateOpEvent;
          if (ev.private_op) applyPrivateOp(ev.private_op);
        }
      },
    });
  }, [currentUserId]);
}
