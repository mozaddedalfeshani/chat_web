import { readMeta } from "../repo/cursors";
import type { FeedPosition } from "../repo/messages-read";
import { currentLink } from "./link-state";
import { endedKey, phonePage } from "./pages";

/**
 * What the feed asks when this browser has nothing older to show: the phone,
 * over the live link. The answer decides what the top of the timeline says.
 *
 * ```
 * fetched  new rows are in the store — read them back, keep scrolling
 * ended    the phone has nothing older inside the 90-day window
 * offline  the phone did not answer — "open AbabilX on your phone"
 * none     no live link on this browser
 * ```
 */
export type PhoneAnswer = "fetched" | "ended" | "offline" | "none";
export type Position = { ms: number; id: string };

export const OLDER_PAGE = 50;
export const LIVE_PAGE_EVENT = "ababilx:history-live-page";

/**
 * `edge` is the feed's oldest position — its SORT time (last activity), not
 * the creation time of that row: a thread root sorts by its newest reply, so
 * cutting at its creation would skip every message written between the two.
 * Cutting at the sort time asks the phone for a little it already sent
 * (merged away) and never for less. `after` overrides it with the oldest row
 * of a previous phone page, when everything that page carried was already
 * here. `next` is that row.
 */
export async function olderFromPhone(
  userId: string,
  conversationId: string,
  edge: FeedPosition | null,
  after?: Position,
): Promise<{ answer: PhoneAnswer; next?: Position }> {
  const link = currentLink(userId);
  if (!link) return { answer: "none" };
  if (await readMeta<boolean>(userId, endedKey(conversationId)).catch(() => false)) return { answer: "ended" };
  const before = after ?? (edge ? { ms: Math.floor(edge[0] / 1000) + 1, id: "" } : undefined);
  try {
    const page = await phonePage(userId, link, conversationId, OLDER_PAGE, before);
    return { answer: page.received > 0 ? "fetched" : "ended", next: page.oldest };
  } catch {
    return { answer: "offline" };
  }
}

/**
 * The newest page of a chat the first-run fill has not reached yet, without
 * holding the feed up: the store is told when it lands (LIVE_PAGE_EVENT).
 */
const asked = new Set<string>();

export function latestFromPhone(userId: string, conversationId: string) {
  const link = currentLink(userId);
  if (!link || asked.has(conversationId)) return;
  asked.add(conversationId);
  void phonePage(userId, link, conversationId, 20)
    .then((page) => {
      if (page.received > 0 && typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(LIVE_PAGE_EVENT, { detail: { conversationId } }));
      }
    })
    .catch(() => asked.delete(conversationId));
}
