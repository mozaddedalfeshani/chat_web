import { currentLink } from "@/lib/history/live/link-state";
import { latestFromPhone, olderFromPhone, type Position } from "@/lib/history/live/older";
import { useLiveHistoryStore } from "@/lib/history/live/status-store";
import type { ComposedPage } from "./chat-feed-history";

/**
 * The phone as the last source of a feed (live history link, server 0175).
 * The order of sources is unchanged — this browser's store, then the server —
 * and only when both have run out is the phone asked, a page at a time, the
 * way WhatsApp's companion asks its phone for older messages on scroll.
 */
const BOOT = 20;
const ROUNDS = 3;

/**
 * True while the phone may still hold older messages of this chat: a chat
 * its hello named (a chat made after linking, or a feed, has nothing older
 * on the phone than what this browser already keeps) and not yet said to
 * end.
 */
export function phoneMayHaveMore(userId: string, conversationId: string) {
  const state = useLiveHistoryStore.getState();
  return !!currentLink(userId) && !!state.phoneChats[conversationId] && !state.ended[conversationId];
}

/** A newest page: keep the top open for the phone, and fetch its newest rows. */
export function withPhoneLatest(userId: string, conversationId: string, page: ComposedPage): ComposedPage {
  if (page.hasMore || !phoneMayHaveMore(userId, conversationId)) return page;
  if (page.raw.length < BOOT) latestFromPhone(userId, conversationId);
  return { ...page, hasMore: true };
}

/** An older page that came up short: ask the phone, then read the store again. */
export async function withPhoneOlder(
  userId: string,
  conversationId: string,
  page: ComposedPage,
  reread: () => Promise<ComposedPage>,
): Promise<ComposedPage> {
  if (page.hasMore || !phoneMayHaveMore(userId, conversationId)) return page;
  const edge = page.history.localEdge;
  let after: Position | undefined;
  for (let round = 0; round < ROUNDS; round += 1) {
    const { answer, next } = await olderFromPhone(userId, conversationId, edge, after);
    if (answer !== "fetched") return { ...page, hasMore: false };
    const again = await reread();
    if (again.raw.length > page.raw.length) return { ...again, hasMore: true };
    // Everything the phone sent was already here or suppressed: step past it.
    after = next;
  }
  return { ...page, hasMore: true };
}
