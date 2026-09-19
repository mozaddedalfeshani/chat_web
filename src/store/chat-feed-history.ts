import type { ChatMessage, ChatMessagesPage } from "@/lib/api/types/chat";
import type { Provenance } from "@/lib/history/merge";
import { mergeMessages } from "@/lib/history/repo/messages-write";
import { readLocalFeed, type FeedPosition } from "@/lib/history/repo/messages-read";
import { sortMicros } from "@/lib/history/repo/message-rows";
import { deletionSnapshot } from "@/lib/messages/deletions";
import { historyEnabled } from "@/lib/history/flag";

/**
 * The feed reads THROUGH the durable history, it is never replaced by a server
 * page.
 *
 * ```
 * server page -> merge into IndexedDB -> read the local page back -> decrypt -> show
 * ```
 *
 * The server page used to become the feed outright, which threw away anything
 * older than the server's six months — the exact history an import from the
 * phone brings in. Now a page is only new evidence for the store.
 *
 * The floor: while the server still has older pages than the ones merged, a
 * local read stops at the oldest server row seen. Past it, the store holds
 * imported rows but not yet the server's rows for that stretch, and showing
 * them would draw a hole as if nothing had been said.
 */
export type FeedHistoryState = {
  localEdge: FeedPosition | null;
  serverFloor: FeedPosition | null;
  serverCursor: string;
  serverHasMore: boolean;
};

export type ComposedPage = {
  /** Raw (still sealed) messages, newest first for the main timeline. */
  raw: ChatMessage[];
  history: FeedHistoryState;
  hasMore: boolean;
};

const PAGE = 100;
const MAX_FILL_ROUNDS = 4;

const edgeOf = (message: ChatMessage | undefined): FeedPosition | null =>
  message ? [sortMicros(message), message.id] : null;

/** Best effort: a browser that cannot open IndexedDB still gets a working chat. */
export async function persistRawMessages(
  userId: string,
  messages: ChatMessage[],
  provenance: Provenance = "server",
) {
  if (!userId || messages.length === 0 || !historyEnabled()) return false;
  try {
    await mergeMessages(userId, messages, provenance, deletionSnapshot(userId));
    return true;
  } catch {
    return false;
  }
}

function fromServer(page: ChatMessagesPage): ComposedPage {
  return {
    raw: page.messages,
    hasMore: page.has_more,
    history: {
      localEdge: edgeOf(page.messages[page.messages.length - 1]),
      serverFloor: edgeOf(page.messages[page.messages.length - 1]),
      serverCursor: page.next_cursor,
      serverHasMore: page.has_more,
    },
  };
}

/** The newest page of the main timeline. */
export async function composeLatest(
  userId: string,
  conversationId: string,
  page: ChatMessagesPage,
): Promise<ComposedPage> {
  const server = fromServer(page);
  if (!(await persistRawMessages(userId, page.messages))) return server;
  try {
    const local = await readLocalFeed(userId, {
      conversationId,
      limit: PAGE,
      floor: page.has_more ? server.history.serverFloor : null,
    });
    return {
      raw: local.messages,
      hasMore: page.has_more || local.messages.length >= PAGE,
      history: { ...server.history, localEdge: local.edge },
    };
  } catch {
    return server;
  }
}

/** The next older page, filling from the server when the store runs out. */
export async function composeOlder(
  userId: string,
  conversationId: string,
  state: FeedHistoryState,
  fetchServer: (cursor: string) => Promise<ChatMessagesPage>,
): Promise<ComposedPage> {
  if (!historyEnabled()) {
    if (!state.serverHasMore) return { raw: [], hasMore: false, history: state };
    return fromServer(await fetchServer(state.serverCursor));
  }
  let history = { ...state };
  let lastRead: ChatMessage[] = [];
  let lastEdge: FeedPosition | null = history.localEdge;
  for (let round = 0; round < MAX_FILL_ROUNDS; round += 1) {
    let local;
    try {
      local = await readLocalFeed(userId, {
        conversationId,
        limit: PAGE,
        before: history.localEdge,
        floor: history.serverHasMore ? history.serverFloor : null,
      });
    } catch {
      // No store: plain server paging, exactly the old behaviour.
      if (!history.serverHasMore) return { raw: [], hasMore: false, history };
      return fromServer(await fetchServer(history.serverCursor));
    }
    lastRead = local.messages;
    lastEdge = local.edge ?? history.localEdge;
    if (local.messages.length >= PAGE || !history.serverHasMore) {
      const edge = local.edge ?? history.localEdge;
      return {
        raw: local.messages,
        hasMore: history.serverHasMore || local.messages.length >= PAGE,
        history: { ...history, localEdge: edge },
      };
    }
    const page = await fetchServer(history.serverCursor);
    await persistRawMessages(userId, page.messages);
    history = {
      ...history,
      serverFloor: edgeOf(page.messages[page.messages.length - 1]) ?? history.serverFloor,
      serverCursor: page.next_cursor,
      serverHasMore: page.has_more && !!page.next_cursor,
    };
  }
  // Out of rounds (a long stretch the server returned nothing visible for):
  // show what the last read found and let the next scroll continue.
  return { raw: lastRead, hasMore: true, history: { ...history, localEdge: lastEdge } };
}

/**
 * A thread, oldest first. The server's replies are merged, then every stored
 * reply is shown — replies imported from the phone included.
 */
export async function composeThread(
  userId: string,
  conversationId: string,
  rootId: string,
  page: ChatMessagesPage,
): Promise<ChatMessage[]> {
  if (!(await persistRawMessages(userId, page.messages))) return page.messages;
  try {
    const local = await readLocalFeed(userId, {
      conversationId,
      parentId: rootId,
      limit: 2000,
      direction: "next",
    });
    return local.messages.length >= page.messages.length ? local.messages : page.messages;
  } catch {
    return page.messages;
  }
}
