import type { ChatMessage } from "@/lib/api/types/chat";
import { deletionSnapshot } from "@/lib/messages/deletions";
import { mergeMessages } from "../repo/messages-write";
import { writeMeta } from "../repo/cursors";
import { connectToPhone, type StoredLink } from "./connect";
import { prefetchKeys } from "./keys";
import { useLiveHistoryStore } from "./status-store";

/**
 * Pages of one conversation from the phone into the durable store. Each page
 * is merged as `phone` provenance, every attachment marked `from_phone` (its
 * server copy is gone; the bubble offers a download from the phone instead).
 * In-flight requests are shared, so a scroll and the first-run fill asking
 * for the same page cost one round trip.
 */
const inflight = new Map<string, Promise<PhonePage>>();

export const endedKey = (conversationId: string) => `live-ended:${conversationId}`;

function fromPhone(row: unknown): ChatMessage {
  const message = row as ChatMessage;
  return {
    ...message,
    attachments: (message.attachments ?? []).map((a) => ({ ...a, from_phone: true })),
  };
}

export type PhonePage = { received: number; oldest?: { ms: number; id: string } };

/** Fetches one page; resolves with how many rows came and the oldest of them. */
export function phonePage(
  userId: string,
  link: StoredLink,
  conversationId: string,
  limit: number,
  before?: { ms: number; id: string },
): Promise<PhonePage> {
  const id = `${conversationId}|${before?.ms ?? "newest"}|${before?.id ?? ""}`;
  let run = inflight.get(id);
  if (!run) {
    run = load(userId, link, conversationId, limit, before).finally(() => inflight.delete(id));
    inflight.set(id, run);
  }
  return run;
}

async function load(
  userId: string,
  link: StoredLink,
  conversationId: string,
  limit: number,
  before?: { ms: number; id: string },
) {
  const store = useLiveHistoryStore.getState();
  store.set({ loading: { ...store.loading, [conversationId]: true } });
  try {
    const client = await connectToPhone(link);
    const page = await client.getPage(conversationId, limit, before);
    const messages = page.rows.map(fromPhone).filter((m) => m?.id && m.conversation_id === conversationId);
    await prefetchKeys(userId, messages);
    await mergeMessages(userId, messages, "phone", deletionSnapshot(userId));
    // The phone has nothing older inside the window: scrolling stops here.
    if (!page.more) {
      await writeMeta(userId, endedKey(conversationId), true);
      const ended = useLiveHistoryStore.getState().ended;
      useLiveHistoryStore.getState().set({ ended: { ...ended, [conversationId]: true } });
    }
    const last = messages[messages.length - 1];
    return {
      received: messages.length,
      oldest: last ? { ms: Date.parse(last.created_at), id: last.id } : undefined,
    };
  } finally {
    const loading = { ...useLiveHistoryStore.getState().loading };
    delete loading[conversationId];
    useLiveHistoryStore.getState().set({ loading });
  }
}
