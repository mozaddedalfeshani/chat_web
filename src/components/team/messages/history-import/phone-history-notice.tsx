"use client";

import { SmartPhone01Icon } from "hugeicons-react";
import { feedKey, useChatStore } from "@/store/chat-store";
import { HeldHistoryNotice } from "@/lib/delivery-only/delivery-only-notices";
import { useLiveHistoryStore } from "@/lib/history/live/status-store";

/**
 * Where a chat's history ends in this browser, once a phone is linked live
 * (server 0175). Older messages come from the phone as you scroll, so the
 * only endings left are: the phone did not answer, or it has nothing older
 * inside the three months it shares. Without a live link this is the
 * delivery-only notice it always was.
 */
export default function PhoneHistoryNotice({
  conversationId,
  empty = false,
  purged = false,
}: {
  conversationId: string;
  empty?: boolean;
  /** Delivery-only already let messages of this chat go from the server. */
  purged?: boolean;
}) {
  const status = useLiveHistoryStore((s) => s.status);
  const ended = useLiveHistoryStore((s) => !!s.ended[conversationId]);
  const loading = useLiveHistoryStore((s) => !!s.loading[conversationId]);
  const deviceName = useLiveHistoryStore((s) => s.deviceName);
  const fromPhone = useLiveHistoryStore((s) => !!s.phoneChats[conversationId]);
  // A chat the phone never had (made after linking, a feed) has nothing to
  // say about the phone.
  if (status === "none" || !fromPhone) return purged ? <HeldHistoryNotice empty={empty} /> : null;
  const offline = status === "offline" && !ended;
  const text = loading
    ? `Loading older messages from ${deviceName || "your phone"}…`
    : offline
      ? "Couldn't reach your phone. Open AbabilX on your phone to load older messages."
      : ended
        ? "Older messages stay on your phone."
        : "";
  // Nothing to say about the phone: an empty chat still reads as the
  // delivery-only notice, never as a blank pane.
  if (!text) return empty && purged ? <HeldHistoryNotice empty /> : null;
  return (
    <div className="flex justify-center px-4 pt-2 pb-3">
      <div className="inline-flex max-w-md items-center gap-2 rounded-xl bg-[var(--sig-fill-strong)] px-3 py-2 text-[12px] leading-5 text-[var(--sig-label-2)]">
        <SmartPhone01Icon size={14} className="shrink-0 text-[var(--indigo)]" />
        <span>{text}</span>
        {offline && !loading ? (
          <button
            type="button"
            className="shrink-0 font-semibold text-[var(--indigo)] hover:underline"
            onClick={() => retry(conversationId)}
          >
            Try again
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** Opens the top of the feed again and asks for the next older page. */
function retry(conversationId: string) {
  const key = feedKey(conversationId, null);
  useChatStore.setState((s) => {
    const feed = s.feeds[key];
    if (!feed) return s;
    return { feeds: { ...s.feeds, [key]: { ...feed, hasMore: true, nextCursor: feed.nextCursor || "local" } } };
  });
  void useChatStore.getState().loadMoreFeed(conversationId, null);
}
