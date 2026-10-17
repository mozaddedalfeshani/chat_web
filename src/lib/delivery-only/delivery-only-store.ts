import { create } from "zustand";
import type { ChatConversation } from "@/lib/api/types/chat";

/**
 * Delivery-only chat (server 0173, DELIVERY_ONLY.md): the server keeps a
 * personal message only until every member's phones have it. A browser is not
 * a custody device and keeps no copy, so what it can show is whatever the
 * server still holds — the newest few minutes at most. Until the web gets its
 * own store (phase 5), this module is the honest stopgap:
 *
 *   held chat    timeline of what is still here + a notice where history ends
 *   private DM   (0160 quiet mode) a pointer to the app instead of a timeline
 *
 * `deliveryOnly` comes from `/api/me`; `overrides` from `chat.private_chat`,
 * which is newer than any sidebar row it contradicts.
 */
type DeliveryOnlyState = {
  deliveryOnly: boolean;
  /**
   * This browser is a linked device (server 0174, `lib/linked-device`): the
   * server holds every message until it is in this browser's store, so it
   * reads like a phone — private chats included — and none of the interim
   * "open the app" guards below apply.
   */
  linked: boolean;
  overrides: Record<string, boolean>;
  setDeliveryOnly: (on: boolean) => void;
  setLinked: (on: boolean) => void;
  setPrivateChat: (conversationId: string, enabled: boolean) => void;
  reset: () => void;
};

export const useDeliveryOnlyStore = create<DeliveryOnlyState>((set) => ({
  deliveryOnly: false,
  linked: false,
  overrides: {},
  setDeliveryOnly: (on) => set({ deliveryOnly: on }),
  setLinked: (on) => set({ linked: on }),
  setPrivateChat: (conversationId, enabled) =>
    set((s) => ({ overrides: { ...s.overrides, [conversationId]: enabled } })),
  // Sign-out forgets per-chat switches and the link (the next sign-in links
  // again). `deliveryOnly` is the server's answer for every account, and
  // clearing it here raced the cached /api/me on desktop: an offline start
  // lost the notices until the next fetch.
  reset: () => set({ overrides: {}, linked: false }),
}));

type ConvShape = Pick<ChatConversation, "id" | "type" | "is_self" | "private_chat">;

/**
 * Whether the server lets this conversation's messages go once the phones
 * have them: every DM (Note to Self included) and group. A webhook feed keeps
 * its own trim and is never held.
 */
export function isHeldConversation(
  conv: Pick<ChatConversation, "type"> | null | undefined,
  deliveryOnly: boolean,
): boolean {
  if (!conv || !deliveryOnly) return false;
  return conv.type !== "webhook";
}

/**
 * Whether the server has already let any of this chat's messages go — the
 * only case where "older messages are on your phone" is true. A purge raises
 * `last_private_at`; a chat whose messages are all still here (a new one) has
 * none, and its history really does start where the timeline does.
 */
export function hasPurgedHistory(
  conv: Pick<ChatConversation, "type" | "last_private_at"> | null | undefined,
  deliveryOnly: boolean,
): boolean {
  return isHeldConversation(conv, deliveryOnly) && !!conv?.last_private_at;
}

/**
 * Opening a held chat whose newest message already left the server
 * (`last_message_private`) does not mark it read: that message — and maybe
 * more before it — is only on the phones, and marking read here would clear
 * the phone's badge for messages nobody has seen. A live message arriving
 * while the chat is open clears it as usual (scheduleNotificationClear).
 */
export function keepsUnreadOnOpen(
  conv: Pick<ChatConversation, "type" | "last_message_private"> | null | undefined,
  deliveryOnly: boolean,
  linked = false,
): boolean {
  // A linked browser holds the message the phone-only preview stands for.
  return !linked && isHeldConversation(conv, deliveryOnly) && !!conv?.last_message_private;
}

/** A DM with private chat on. Never a group, never Note to Self. */
export function isPrivateChat(
  conv: ConvShape | null | undefined,
  overrides: Record<string, boolean>,
): boolean {
  if (!conv || conv.type !== "dm" || conv.is_self) return false;
  return overrides[conv.id] ?? !!conv.private_chat;
}

/**
 * Whether `conversationId` is a private-chat DM this browser does not show,
 * from the store's own rows. The store's read paths ask this: such a message
 * is never shown here, so it must never be acknowledged as read or mark the
 * chat read — that would clear the phone's badge for a message nobody has
 * seen. A linked browser shows private chats, so for it this is never true.
 */
export function isPrivateChatId(
  conversationId: string,
  dms: ConvShape[],
): boolean {
  const { overrides, linked } = useDeliveryOnlyStore.getState();
  if (linked) return false;
  const conv = dms.find((d) => d.id === conversationId);
  return isPrivateChat(conv, overrides);
}

export function usePrivateChat(conv: ConvShape | null | undefined): boolean {
  const overrides = useDeliveryOnlyStore((s) => s.overrides);
  return isPrivateChat(conv, overrides);
}

/**
 * A private chat this browser shows only as "open the app": private and not
 * linked. The label and preview still use usePrivateChat — quiet mode is on
 * either way.
 */
export function usePhoneOnlyChat(conv: ConvShape | null | undefined): boolean {
  const linked = useDeliveryOnlyStore((s) => s.linked);
  return usePrivateChat(conv) && !linked;
}

export function usePurgedHistory(
  conv: Pick<ChatConversation, "type" | "last_private_at"> | null | undefined,
): boolean {
  const deliveryOnly = useDeliveryOnlyStore((s) => s.deliveryOnly);
  return hasPurgedHistory(conv, deliveryOnly);
}
