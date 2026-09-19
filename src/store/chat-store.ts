import { syncChatDeletions, deletionSnapshot, messageSurvives, conversationSurvives, rememberDeletedMessage } from "@/lib/messages/deletions";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toast } from "sonner";
import {
  api,
  type ChatAttachmentInput,
  type ChatConversation,
  type ChatMessage,
} from "@/lib/api";
import type { ChatWsEvent } from "@/lib/api/types/chat";
import type { WallReactionGroup } from "@/lib/api/types/wall";
import { subscribeAppWs } from "@/lib/notifications/ws-bus";
import {
  CHAT_PERSIST_KEY,
  persistenceSafeConversations,
  recentChatFeeds,
} from "@/store/chat-persist";
import {
  decryptChatMessage,
  decryptChatMessages,
} from "@/lib/chat-e2ee/crypto";
import { decryptSidebarPreviews } from "@/lib/chat-e2ee/sidebar-preview";
import { fillConversationKeyGaps } from "@/lib/chat-e2ee/key-gaps";
import {
  rememberLocalMessages,
  removeLocalMessage,
} from "@/lib/chat-local-index";
import {
  sendChatMessageDurably,
  type ChatSendBody,
} from "@/lib/messages/outbox";
import { sendEncryptedChat } from "@/lib/chat-e2ee/dm-send";
import { isEncryptedConversation } from "@/lib/chat-e2ee/eligible";
import { acknowledgeMessages } from "@/lib/messages/device";
import {
  composeLatest,
  composeOlder,
  composeThread,
  persistRawMessages,
  type FeedHistoryState,
} from "@/store/chat-feed-history";
import {
  persistRealtimeEvent,
  syncSidebarHistory,
  withLocalOnlyConversations,
} from "@/store/chat-sidebar-history";

const FEED_STALE_MS = 45_000;

// A focus claim (use-chat-focus) normally stops the server creating bell rows for
// the conversation on screen at all. This is the backstop for the gap before a
// claim lands — the first moments after opening a DM, or a frame dropped while
// the socket was still reconnecting.
//
// The delay is load-bearing: the server broadcasts chat.message.created *before*
// it inserts the notification rows, so clearing on arrival would race that insert
// and leave the row unread.
const NOTIFICATION_CLEAR_DELAY_MS = 1_500;

let notificationClearTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleNotificationClear(conversationId: string) {
  // A hidden tab is not reading — leave those notifications alone.
  if (document.visibilityState !== "visible") return;
  if (notificationClearTimer) clearTimeout(notificationClearTimer);
  notificationClearTimer = setTimeout(() => {
    notificationClearTimer = null;
    void api.markChatConversationRead(conversationId).catch(() => {});
  }, NOTIFICATION_CLEAR_DELAY_MS);
}

export function feedKey(conversationId: string, threadRootId?: string | null) {
  return threadRootId
    ? `${conversationId}:thread:${threadRootId}`
    : conversationId;
}

function sortDms(dms: ChatConversation[]) {
  return [...dms].sort((a, b) => {
    const aUnread = a.unread_count > 0 ? 1 : 0;
    const bUnread = b.unread_count > 0 ? 1 : 0;
    if (aUnread !== bUnread) return bUnread - aUnread;

    const ta = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
    const tb = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
    return tb - ta;
  });
}

function channelSortLabel(c: ChatConversation) {
  return (c.name || c.slug || "").toLowerCase();
}

// Channels list unread-first, then alphabetical (Slack-style — stable order that
// doesn't jump around on every new message the way DMs sort by recency).
function sortChannels(channels: ChatConversation[]) {
  return [...channels].sort((a, b) => {
    const aUnread = a.unread_count > 0 ? 1 : 0;
    const bUnread = b.unread_count > 0 ? 1 : 0;
    if (aUnread !== bUnread) return bUnread - aUnread;
    return channelSortLabel(a).localeCompare(channelSortLabel(b));
  });
}

export type ChatFeed = {
  messages: ChatMessage[];
  loading: boolean;
  loadingMore: boolean;
  nextCursor: string;
  hasMore: boolean;
  fetchedAt: number;
  /** Where the durable-history read stopped (main timeline only). */
  history?: FeedHistoryState;
};

function dedupeById(messages: ChatMessage[]) {
  const seen = new Set<string>();
  return messages.filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)));
}

/** Stable snapshot for selectors — never call emptyFeed() inside getSnapshot. */
export const EMPTY_FEED: ChatFeed = {
  messages: [],
  loading: false,
  loadingMore: false,
  nextCursor: "",
  hasMore: false,
  fetchedAt: 0,
};

function emptyFeed(): ChatFeed {
  return {
    messages: [],
    loading: false,
    loadingMore: false,
    nextCursor: "",
    hasMore: false,
    fetchedAt: 0,
  };
}

function patchDm(
  dms: ChatConversation[],
  conversationId: string,
  patch: Partial<ChatConversation> & { bumpUnread?: boolean },
) {
  return sortDms(
    dms.map((c) => {
      if (c.id !== conversationId) return c;
      const { bumpUnread, unread_count, ...rest } = patch;
      let nextUnread = c.unread_count;
      if (unread_count !== undefined) nextUnread = unread_count;
      else if (bumpUnread) nextUnread = c.unread_count + 1;
      return { ...c, ...rest, unread_count: nextUnread };
    }),
  );
}

// Same patch semantics as patchDm but keeps the channel sort order.
function patchChannel(
  channels: ChatConversation[],
  conversationId: string,
  patch: Partial<ChatConversation> & { bumpUnread?: boolean },
) {
  return sortChannels(
    channels.map((c) => {
      if (c.id !== conversationId) return c;
      const { bumpUnread, unread_count, ...rest } = patch;
      let nextUnread = c.unread_count;
      if (unread_count !== undefined) nextUnread = unread_count;
      else if (bumpUnread) nextUnread = c.unread_count + 1;
      return { ...c, ...rest, unread_count: nextUnread };
    }),
  );
}

function upsertFeedMessage(feed: ChatFeed, msg: ChatMessage): ChatFeed {
  if (feed.messages.some((m) => m.id === msg.id)) return feed;
  return { ...feed, messages: [...feed.messages, msg], fetchedAt: Date.now() };
}

/** Move parent to end of main timeline when a thread reply lands; bump thread_count. */
function bumpParentOnReply(
  feed: ChatFeed,
  parentId: string,
  replyAt: string,
): ChatFeed {
  const idx = feed.messages.findIndex((m) => m.id === parentId);
  if (idx < 0) return feed;
  const parent = feed.messages[idx];
  const bumped: ChatMessage = {
    ...parent,
    thread_count: (parent.thread_count || 0) + 1,
    last_activity_at: replyAt,
  };
  const rest = feed.messages.filter((m) => m.id !== parentId);
  return { ...feed, messages: [...rest, bumped], fetchedAt: Date.now() };
}

function updateFeedMessage(feed: ChatFeed, msg: ChatMessage): ChatFeed {
  return {
    ...feed,
    messages: feed.messages.map((m) => (m.id === msg.id ? msg : m)),
    fetchedAt: Date.now(),
  };
}

function removeFeedMessage(feed: ChatFeed, messageId: string): ChatFeed {
  return {
    ...feed,
    messages: feed.messages.map((m) =>
      m.id === messageId
        ? { ...m, deleted_at: new Date().toISOString(), body: "" }
        : m,
    ),
    fetchedAt: Date.now(),
  };
}

function expectedTeamBoundaryError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return message === "not in a team" || message === "conversation not found";
}

function withoutConversation(state: ChatState, conversationId: string) {
  const rootIds = new Set<string>();
  const feeds = Object.fromEntries(
    Object.entries(state.feeds).filter(([key]) => {
      const removed =
        key === conversationId || key.startsWith(`${conversationId}:thread:`);
      if (removed && key.includes(":thread:"))
        rootIds.add(key.split(":thread:")[1]);
      return !removed;
    }),
  );
  const threadRepliesByRoot = Object.fromEntries(
    Object.entries(state.threadRepliesByRoot).filter(
      ([rootId]) => !rootIds.has(rootId),
    ),
  );
  const wasActive = state.activeConversationId === conversationId;
  return {
    channels: state.channels.filter((item) => item.id !== conversationId),
    dms: state.dms.filter((item) => item.id !== conversationId),
    feeds,
    threadRepliesByRoot,
    activeConversationId: wasActive ? null : state.activeConversationId,
    threadRootId: wasActive ? null : state.threadRootId,
  };
}

interface ChatState {
  dms: ChatConversation[];
  channels: ChatConversation[];
  sidebarLoading: boolean;
  /** When the conversation list last loaded successfully; 0 before the first. */
  sidebarFetchedAt: number;
  currentUserId: string;

  activeConversationId: string | null;
  threadRootId: string | null;
  feeds: Record<string, ChatFeed>;
  threadRepliesByRoot: Record<string, ChatMessage[]>;
  sending: boolean;

  unreadOnly: boolean;
  dmSearchQuery: string;
  dmSectionOpen: boolean;
  channelsSectionOpen: boolean;

  setCurrentUserId: (id: string) => void;
  setUnreadOnly: (value: boolean) => void;
  setDmSearchQuery: (query: string) => void;
  setDmSectionOpen: (open: boolean) => void;
  setChannelsSectionOpen: (open: boolean) => void;
  setThreadRootId: (id: string | null) => void;
  setActiveConversationId: (id: string | null) => void;
  resetThreadState: () => void;
  resetTeamChatState: () => void;

  fetchSidebar: (opts?: { silent?: boolean }) => Promise<void>;
  clearUnread: (conversationId: string) => void;
  applyIncomingMessage: (
    conversationId: string,
    msg: ChatMessage,
    bumpUnread: boolean,
  ) => void;
  upsertDM: (dm: ChatConversation) => void;
  upsertChannel: (channel: ChatConversation) => void;
  setConversationMuted: (conversationId: string, muted: boolean) => void;

  loadFeed: (
    conversationId: string,
    threadRootId?: string | null,
    opts?: { force?: boolean },
  ) => Promise<void>;
  loadMoreFeed: (
    conversationId: string,
    threadRootId?: string | null,
  ) => Promise<void>;
  appendFeedMessage: (
    conversationId: string,
    msg: ChatMessage,
    threadRootId?: string | null,
  ) => void;
  updateFeedMessage: (
    conversationId: string,
    msg: ChatMessage,
    threadRootId?: string | null,
  ) => void;
  removeFeedMessage: (
    conversationId: string,
    messageId: string,
    threadRootId?: string | null,
  ) => void;
  updateFeedReactions: (
    conversationId: string,
    messageId: string,
    reactions: WallReactionGroup[],
    threadRootId?: string | null,
  ) => void;
  incrementThreadCount: (
    conversationId: string,
    rootId: string,
    replyAt?: string,
  ) => void;
  /** Idempotent: append reply preview + bump parent to end of main timeline. */
  applyThreadReply: (conversationId: string, msg: ChatMessage) => void;

  setThreadReplies: (rootId: string, replies: ChatMessage[]) => void;
  appendThreadReply: (rootId: string, msg: ChatMessage) => void;
  patchThreadReply: (rootId: string, msg: ChatMessage) => void;
  markThreadReplyDeleted: (rootId: string, messageId: string) => void;
  prefetchThreadSummaries: (conversationId: string, rootIds: string[]) => void;

  sendMessage: (
    body: string,
    attachments: ChatAttachmentInput[],
    mentionedUserIds: string[],
    parentId?: string | null,
    quotedMessageId?: string | null,
  ) => Promise<ChatMessage | null>;
  setSending: (sending: boolean) => void;

  handleWsEvent: (ev: ChatWsEvent) => void;
  initRealtime: () => () => void;
}

let wsTeardown: (() => void) | null = null;
let wsRefCount = 0;

const CONV_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      dms: [],
      channels: [],
      sidebarLoading: false,
      sidebarFetchedAt: 0,
      currentUserId: "",

      activeConversationId: null,
      threadRootId: null,
      feeds: {},
      threadRepliesByRoot: {},
      sending: false,

      unreadOnly: false,
      dmSearchQuery: "",
      dmSectionOpen: true,
      channelsSectionOpen: true,

      setCurrentUserId: (id) => {
        const changed = id !== get().currentUserId;
        set({ currentUserId: id });
        if (id && changed) void get().fetchSidebar({ silent: true });
      },
      setUnreadOnly: (value) => set({ unreadOnly: value }),
      setDmSearchQuery: (query) => set({ dmSearchQuery: query }),
      setDmSectionOpen: (open) => set({ dmSectionOpen: open }),
      setChannelsSectionOpen: (open) => set({ channelsSectionOpen: open }),
      setThreadRootId: (id) => set({ threadRootId: id }),
      // Conversation ids are UUIDs — reject anything else (a bad deep link
      // once persisted a name slug here and broke every feed load).
      setActiveConversationId: (id) =>
        set({ activeConversationId: id && CONV_ID_RE.test(id) ? id : null }),
      resetThreadState: () =>
        set({ threadRootId: null, threadRepliesByRoot: {} }),
      resetTeamChatState: () =>
        set({
          dms: [],
          channels: [],
          activeConversationId: null,
          threadRootId: null,
          feeds: {},
          threadRepliesByRoot: {},
          sidebarLoading: false,
        }),

      fetchSidebar: async (opts) => {
        if (!opts?.silent) set({ sidebarLoading: true });
        try {
          const markers = await syncChatDeletions(get().currentUserId);
          syncSidebarHistory(get().currentUserId, markers);
          set((state) => ({
            dms: state.dms.filter((item) => conversationSurvives(item, markers)),
            channels: state.channels.filter((item) => conversationSurvives(item, markers)),
            feeds: Object.fromEntries(Object.entries(state.feeds).map(([key, feed]) => [key, { ...feed, messages: feed.messages.filter((m) => messageSurvives(m, markers)) }])),
            threadRepliesByRoot: Object.fromEntries(Object.entries(state.threadRepliesByRoot).map(([key, messages]) => [key, messages.filter((m) => messageSurvives(m, markers))])),
          }));
          // Chat is scope-blind since migration 0145 — one membership-driven
          // list, personal and converted groups alike, no scope to narrow.
          const data = await withLocalOnlyConversations(
            get().currentUserId,
            await api.listAllChatConversations(),
            markers,
          );
          // Gives back keys other members lost, without waiting for them to open
          // the chat. Once per unlocked identity; later refreshes are free.
          void fillConversationKeyGaps(get().currentUserId);
          // Groups are sealed exactly like DMs, so both lists are opened.
          const [previewDms, previewChannels] = await Promise.all([
            decryptSidebarPreviews(data.dms ?? [], get().currentUserId),
            decryptSidebarPreviews(data.channels ?? [], get().currentUserId),
          ]);
          const dms = sortDms(previewDms);
          const channels = sortChannels(previewChannels);
          // A conversation opened or created while this request was in flight
          // (startChatDM -> upsertDM -> select) is not in the response yet.
          // Dropping it here blanked the screen mid-click, so keep the local row
          // and never null activeConversationId from a list refresh — loadFeed's
          // "conversation not found" is the authoritative signal for that.
          set((s) => {
            const activeId = s.activeConversationId;
            if (
              !activeId ||
              dms.some((dm) => dm.id === activeId) ||
              channels.some((ch) => ch.id === activeId)
            ) {
              return { dms, channels };
            }
            const localDm = s.dms.find((dm) => dm.id === activeId);
            const localChannel = s.channels.find((ch) => ch.id === activeId);
            return {
              dms: localDm ? sortDms([localDm, ...dms]) : dms,
              channels: localChannel
                ? sortChannels([localChannel, ...channels])
                : channels,
            };
          });
          set({ sidebarFetchedAt: Date.now() });
        } catch (e) {
          if (expectedTeamBoundaryError(e)) {
            get().resetTeamChatState();
          } else if (!opts?.silent) {
            toast.error(
              e instanceof Error ? e.message : "Failed to load conversations",
            );
          }
        } finally {
          set({ sidebarLoading: false });
        }
      },

      clearUnread: (conversationId) => {
        set((s) => ({
          dms: patchDm(s.dms, conversationId, { unread_count: 0 }),
          channels: patchChannel(s.channels, conversationId, {
            unread_count: 0,
          }),
        }));
      },

      applyIncomingMessage: (conversationId, msg, bumpUnread) => {
        const atts = (msg.attachments ?? []).map((a) => ({
          file_name: a.file_name,
          content_type: a.content_type,
        }));
        const firstAtt = atts[0];
        const patch = {
          last_message_at: msg.created_at,
          last_message_body: msg.body,
          last_message_user_id: msg.user_id,
          last_message_attachment_type: firstAtt?.content_type,
          last_message_attachment_name: firstAtt?.file_name,
          last_message_attachments: atts,
          bumpUnread,
        };
        // The conversation is either a DM or a channel; patch both (the list that
        // doesn't own the id is returned unchanged) so channel previews/unread update too.
        set((s) => ({
          dms: patchDm(s.dms, conversationId, patch),
          channels: patchChannel(s.channels, conversationId, patch),
        }));
      },

      upsertDM: (dm) => {
        set((s) => {
          const exists = s.dms.some((d) => d.id === dm.id);
          const next = exists
            ? s.dms.map((d) => (d.id === dm.id ? { ...d, ...dm } : d))
            : [dm, ...s.dms];
          return { dms: sortDms(next) };
        });
      },

      upsertChannel: (channel) => {
        set((s) => {
          const exists = s.channels.some((c) => c.id === channel.id);
          const next = exists
            ? s.channels.map((c) =>
                c.id === channel.id ? { ...c, ...channel } : c,
              )
            : [channel, ...s.channels];
          return { channels: sortChannels(next) };
        });
      },

      setConversationMuted: (conversationId, muted) => {
        set((s) => ({
          dms: s.dms.map((d) =>
            d.id === conversationId ? { ...d, muted } : d,
          ),
          channels: s.channels.map((c) =>
            c.id === conversationId ? { ...c, muted } : c,
          ),
        }));
      },

      loadFeed: async (conversationId, threadRootId, opts) => {
        const key = feedKey(conversationId, threadRootId);
        const existing = get().feeds[key] ?? emptyFeed();
        const hasMessages = existing.messages.length > 0;
        const stale =
          !existing.fetchedAt ||
          Date.now() - existing.fetchedAt > FEED_STALE_MS;

        if (!opts?.force && hasMessages && !stale) {
          return;
        }

        // Only show the loading skeleton on a cold load (no messages yet).
        // Refreshes — forced (WS reconnect / tab-focus) or stale — keep the
        // current messages on screen and swap in the new page silently, so the
        // feed doesn't flicker to a skeleton and back on every reconnect.
        if (!hasMessages) {
          set((s) => ({
            feeds: {
              ...s.feeds,
              [key]: { ...existing, loading: true },
            },
          }));
        }

        try {
          const page = await api.listChatMessages(conversationId, {
            limit: 100,
            thread: threadRootId || undefined,
          });
          const userId = get().currentUserId;
          // Merged into the durable history first, then read back from it —
          // never swapped in wholesale (chat-feed-history.ts).
          const composed = threadRootId
            ? null
            : await composeLatest(userId, conversationId, page);
          const raw = composed
            ? composed.raw
            : await composeThread(userId, conversationId, threadRootId!, page);
          const messages = userId ? await decryptChatMessages(raw, userId) : raw;
          const visible = messages.filter((m) => messageSurvives(m, deletionSnapshot(userId)));
          const sorted = threadRootId ? visible : [...visible].reverse();
          const hasMore = composed ? composed.hasMore : page.has_more;
          set((s) => ({
            feeds: {
              ...s.feeds,
              [key]: {
                messages: sorted,
                loading: false,
                loadingMore: false,
                nextCursor: composed
                  ? composed.history.serverCursor || (hasMore ? "local" : "")
                  : page.next_cursor,
                hasMore,
                fetchedAt: Date.now(),
                history: composed?.history,
              },
            },
          }));
          rememberLocalMessages(conversationId, sorted);
          void acknowledgeMessages(
            "delivered",
            page.messages.map((message) => message.id),
          ).catch(() => {});
          if (
            get().activeConversationId === conversationId &&
            document.visibilityState === "visible"
          ) {
            void acknowledgeMessages(
              "read",
              page.messages.map((message) => message.id),
            ).catch(() => {});
          }
        } catch (e) {
          if (expectedTeamBoundaryError(e)) {
            set({ activeConversationId: null, threadRootId: null });
          } else {
            toast.error(
              e instanceof Error ? e.message : "Failed to load messages",
            );
          }
          set((s) => ({
            feeds: {
              ...s.feeds,
              [key]: { ...(s.feeds[key] ?? emptyFeed()), loading: false },
            },
          }));
        }
      },

      loadMoreFeed: async (conversationId, threadRootId) => {
        const key = feedKey(conversationId, threadRootId);
        const feed = get().feeds[key] ?? emptyFeed();
        if (!feed.hasMore || !feed.nextCursor || feed.loadingMore) return;

        set((s) => ({
          feeds: {
            ...s.feeds,
            [key]: { ...feed, loadingMore: true },
          },
        }));

        try {
          const userId = get().currentUserId;
          // Only messages the server handed over are acknowledged; rows read
          // back from the durable history (an import) were never delivered
          // to this device by the server and must not report so.
          const served: string[] = [];
          const fetchServer = async (cursor: string) => {
            const page = await api.listChatMessages(conversationId, {
              cursor,
              limit: 100,
              thread: threadRootId || undefined,
            });
            served.push(...page.messages.map((message) => message.id));
            return page;
          };
          let raw: ChatMessage[];
          let nextCursor: string;
          let hasMore: boolean;
          let history = feed.history;
          if (!threadRootId && feed.history) {
            const composed = await composeOlder(userId, conversationId, feed.history, fetchServer);
            raw = composed.raw;
            history = composed.history;
            hasMore = composed.hasMore;
            nextCursor = history.serverCursor || (hasMore ? "local" : "");
          } else {
            const page = await fetchServer(feed.nextCursor);
            void persistRawMessages(userId, page.messages);
            raw = page.messages;
            nextCursor = page.next_cursor;
            hasMore = page.has_more;
          }
          const messages = userId ? await decryptChatMessages(raw, userId) : raw;
          const visible = messages.filter((m) => messageSurvives(m, deletionSnapshot(userId)));
          const sorted = threadRootId ? visible : [...visible].reverse();
          set((s) => {
            const current = s.feeds[key] ?? emptyFeed();
            return {
              feeds: {
                ...s.feeds,
                [key]: {
                  messages: dedupeById([...sorted, ...current.messages]),
                  loading: false,
                  loadingMore: false,
                  nextCursor,
                  hasMore,
                  fetchedAt: Date.now(),
                  history,
                },
              },
            };
          });
          rememberLocalMessages(conversationId, sorted);
          void acknowledgeMessages("delivered", served).catch(() => {});
          if (
            get().activeConversationId === conversationId &&
            document.visibilityState === "visible"
          ) {
            void acknowledgeMessages("read", served).catch(() => {});
          }
        } catch (e) {
          if (expectedTeamBoundaryError(e)) {
            set({ activeConversationId: null, threadRootId: null });
          } else {
            toast.error(
              e instanceof Error ? e.message : "Failed to load messages",
            );
          }
          set((s) => ({
            feeds: {
              ...s.feeds,
              [key]: { ...(s.feeds[key] ?? emptyFeed()), loadingMore: false },
            },
          }));
        }
      },

      appendFeedMessage: (conversationId, msg, threadRootId) => {
        const key = feedKey(conversationId, threadRootId);
        set((s) => {
          const feed = s.feeds[key] ?? emptyFeed();
          return {
            feeds: { ...s.feeds, [key]: upsertFeedMessage(feed, msg) },
          };
        });
        rememberLocalMessages(conversationId, [msg]);
      },

      updateFeedMessage: (conversationId, msg, threadRootId) => {
        const key = feedKey(conversationId, threadRootId);
        set((s) => {
          const feed = s.feeds[key];
          if (!feed) return s;
          return {
            feeds: { ...s.feeds, [key]: updateFeedMessage(feed, msg) },
          };
        });
        rememberLocalMessages(conversationId, [msg]);
      },

      removeFeedMessage: (conversationId, messageId, threadRootId) => {
        const key = feedKey(conversationId, threadRootId);
        set((s) => {
          const feed = s.feeds[key];
          if (!feed) return s;
          return {
            feeds: { ...s.feeds, [key]: removeFeedMessage(feed, messageId) },
          };
        });
        removeLocalMessage(conversationId, messageId);
      },

      updateFeedReactions: (
        conversationId,
        messageId,
        reactions,
        threadRootId,
      ) => {
        const key = feedKey(conversationId, threadRootId);
        set((s) => {
          const feed = s.feeds[key];
          if (!feed) return s;
          return {
            feeds: {
              ...s.feeds,
              [key]: {
                ...feed,
                messages: feed.messages.map((m) =>
                  m.id === messageId ? { ...m, reactions } : m,
                ),
                fetchedAt: Date.now(),
              },
            },
          };
        });
      },

      incrementThreadCount: (conversationId, rootId, replyAt) => {
        const key = feedKey(conversationId, null);
        set((s) => {
          const feed = s.feeds[key];
          if (!feed) return s;
          return {
            feeds: {
              ...s.feeds,
              [key]: bumpParentOnReply(
                feed,
                rootId,
                replyAt || new Date().toISOString(),
              ),
            },
          };
        });
      },

      applyThreadReply: (conversationId, msg) => {
        if (!msg.parent_id) return;
        const rootId = msg.parent_id;
        set((s) => {
          const list = s.threadRepliesByRoot[rootId] ?? [];
          if (list.some((m) => m.id === msg.id)) return s;
          const key = feedKey(conversationId, null);
          const feed = s.feeds[key];
          return {
            threadRepliesByRoot: {
              ...s.threadRepliesByRoot,
              [rootId]: [...list, msg],
            },
            feeds: feed
              ? {
                  ...s.feeds,
                  [key]: bumpParentOnReply(feed, rootId, msg.created_at),
                }
              : s.feeds,
          };
        });
        rememberLocalMessages(conversationId, [msg]);
      },

      setThreadReplies: (rootId, replies) => {
        set((s) => {
          if (s.threadRepliesByRoot[rootId] === replies) return s;
          return {
            threadRepliesByRoot: {
              ...s.threadRepliesByRoot,
              [rootId]: replies,
            },
          };
        });
      },

      appendThreadReply: (rootId, msg) => {
        set((s) => {
          const list = s.threadRepliesByRoot[rootId] ?? [];
          if (list.some((m) => m.id === msg.id)) return s;
          return {
            threadRepliesByRoot: {
              ...s.threadRepliesByRoot,
              [rootId]: [...list, msg],
            },
          };
        });
      },

      patchThreadReply: (rootId, msg) => {
        set((s) => {
          const list = s.threadRepliesByRoot[rootId];
          if (!list) return s;
          return {
            threadRepliesByRoot: {
              ...s.threadRepliesByRoot,
              [rootId]: list.map((m) => (m.id === msg.id ? msg : m)),
            },
          };
        });
      },

      markThreadReplyDeleted: (rootId, messageId) => {
        set((s) => {
          const list = s.threadRepliesByRoot[rootId];
          if (!list) return s;
          return {
            threadRepliesByRoot: {
              ...s.threadRepliesByRoot,
              [rootId]: list.map((m) =>
                m.id === messageId
                  ? { ...m, deleted_at: new Date().toISOString(), body: "" }
                  : m,
              ),
            },
          };
        });
      },

      prefetchThreadSummaries: (conversationId, rootIds) => {
        for (const rootId of rootIds) {
          if (get().threadRepliesByRoot[rootId]?.length) continue;
          void api
            .listChatMessages(conversationId, { thread: rootId, limit: 100 })
            .then(async (page) => {
              const messages = get().currentUserId
                ? await decryptChatMessages(page.messages, get().currentUserId)
                : page.messages;
              set((s) =>
                s.threadRepliesByRoot[rootId]?.length
                  ? s
                  : {
                      threadRepliesByRoot: {
                        ...s.threadRepliesByRoot,
                        [rootId]: messages,
                      },
                    },
              );
              void acknowledgeMessages(
                "delivered",
                page.messages.map((message) => message.id),
              ).catch(() => {});
            })
            .catch(() => {});
        }
      },

      sendMessage: async (body, attachments, mentionedUserIds, parentId, quotedMessageId) => {
        const { activeConversationId, threadRootId, currentUserId, dms, channels } =
          get();
        if (!activeConversationId) return null;
        const dm = dms.find(
          (conversation) => conversation.id === activeConversationId,
        );
        const conversation =
          dm ??
          channels.find(
            (candidate) => candidate.id === activeConversationId,
          );
        const encrypted = isEncryptedConversation(conversation);
        if (encrypted && !currentUserId) {
          throw new Error("Secure message participants are unavailable");
        }
        const deliver = (encrypted: ChatSendBody) =>
          sendChatMessageDurably(currentUserId, activeConversationId, {
            ...encrypted,
            parent_id: parentId,
            quoted_message_id: quotedMessageId,
            attachments,
            mentioned_user_ids: dm ? [] : mentionedUserIds,
          });
        const rawMessage =
          encrypted && body.trim()
            ? await sendEncryptedChat(
                activeConversationId,
                body,
                currentUserId,
                deliver,
                conversation?.plaintext_until_keyed
                  ? () => deliver({ body })
                  : undefined,
              )
            : await deliver({ body });
        void persistRawMessages(currentUserId, [rawMessage]);
        const msg = currentUserId
          ? await decryptChatMessage(rawMessage, currentUserId)
          : rawMessage;
        if (parentId) {
          if (threadRootId && parentId === threadRootId) {
            get().appendFeedMessage(activeConversationId, msg, threadRootId);
          }
          get().applyThreadReply(activeConversationId, msg);
        } else {
          get().appendFeedMessage(activeConversationId, msg, null);
        }
        get().applyIncomingMessage(activeConversationId, msg, false);
        return msg;
      },

      setSending: (sending) => set({ sending }),

      handleWsEvent: (ev) => {
        const {
          activeConversationId,
          threadRootId,
          currentUserId,
          applyIncomingMessage,
          appendFeedMessage,
          applyThreadReply,
          updateFeedMessage,
          removeFeedMessage,
          updateFeedReactions,
          patchThreadReply,
          markThreadReplyDeleted,
          fetchSidebar,
        } = get();

        // A message can need decrypting for its own body, for the quote it
        // carries, or both — an attachment-only reply is sent in the clear but
        // can still quote ciphertext. decryptChatMessage clears what it opens,
        // so re-dispatching settles after one pass.
        if (
          (ev.type === "chat.message.created" ||
            ev.type === "chat.message.updated") &&
          currentUserId &&
          ((ev.message.encryption_version === 1 && !ev.message.body) ||
            !!ev.message.quote?.encrypted_body)
        ) {
          void decryptChatMessage(ev.message, currentUserId).then((message) => {
            get().handleWsEvent({ ...ev, message });
          });
          return;
        }

        if (ev.type === "chat.conversation.updated") {
          void fetchSidebar({ silent: true });
          return;
        }

        if (ev.type === "chat.conversation.deleted") {
          void fetchSidebar({ silent: true });
          set((state) => withoutConversation(state, ev.conversation_id));
          return;
        }

        if (ev.type === "chat.receipts.updated") {
          const receipts = new Map(
            ev.receipts.map((receipt) => [
              receipt.message_id,
              receipt.delivery,
            ]),
          );
          set((state) => ({
            feeds: Object.fromEntries(
              Object.entries(state.feeds).map(([key, feed]) => [
                key,
                key === ev.conversation_id ||
                key.startsWith(`${ev.conversation_id}:thread:`)
                  ? {
                      ...feed,
                      messages: feed.messages.map((message) => {
                        const delivery = receipts.get(message.id);
                        return delivery ? { ...message, delivery } : message;
                      }),
                    }
                  : feed,
              ]),
            ),
            threadRepliesByRoot: Object.fromEntries(
              Object.entries(state.threadRepliesByRoot).map(
                ([root, replies]) => [
                  root,
                  replies.map((message) => {
                    const delivery = receipts.get(message.id);
                    return delivery ? { ...message, delivery } : message;
                  }),
                ],
              ),
            ),
          }));
          return;
        }

        if (ev.type === "chat.message.created") {
          const msg = ev.message;
          if (!messageSurvives(msg, deletionSnapshot(currentUserId))) return;
          const isActive = ev.conversation_id === activeConversationId;
          void acknowledgeMessages("delivered", [msg.id]).catch(() => {});
          if (isActive && document.visibilityState === "visible") {
            void acknowledgeMessages("read", [msg.id]).catch(() => {});
          }
          const convKnown =
            get().dms.some((d) => d.id === ev.conversation_id) ||
            get().channels.some((c) => c.id === ev.conversation_id);

          if (!convKnown) {
            void fetchSidebar({ silent: true });
          }

          if (isActive) {
            if (msg.user_id !== currentUserId) {
              scheduleNotificationClear(ev.conversation_id);
            }
            applyIncomingMessage(ev.conversation_id, msg, false);
            if (msg.parent_id) {
              if (threadRootId && msg.parent_id === threadRootId) {
                appendFeedMessage(ev.conversation_id, msg, threadRootId);
              }
              applyThreadReply(ev.conversation_id, msg);
            } else {
              appendFeedMessage(ev.conversation_id, msg, null);
            }
          } else {
            const bumpUnread = msg.user_id !== currentUserId;
            applyIncomingMessage(ev.conversation_id, msg, bumpUnread);
          }
          return;
        }



        if (ev.type === "chat.message.updated") {
          updateFeedMessage(ev.conversation_id, ev.message, null);
          updateFeedMessage(ev.conversation_id, ev.message, threadRootId);
          if (ev.message.parent_id) {
            patchThreadReply(ev.message.parent_id, ev.message);
          }
        }

        if (ev.type === "chat.message.deleted") {
          rememberDeletedMessage(currentUserId, ev.conversation_id, ev.id);
          removeFeedMessage(ev.conversation_id, ev.id, null);
          for (const key of Object.keys(get().feeds)) {
            if (key.startsWith(`${ev.conversation_id}:thread:`)) removeFeedMessage(ev.conversation_id, ev.id, key.split(":thread:")[1]);
          }
          for (const rootId of Object.keys(get().threadRepliesByRoot)) {
            markThreadReplyDeleted(rootId, ev.id);
          }
        }

        if (ev.type === "chat.reaction.updated") {
          updateFeedReactions(ev.conversation_id, ev.id, ev.reactions, null);
          updateFeedReactions(
            ev.conversation_id,
            ev.id,
            ev.reactions,
            threadRootId,
          );
        }
      },

      // Refcounted: the previous version handed a second caller the raw
      // teardown, so that caller's cleanup killed the shared subscription while
      // wsTeardown stayed set — every later initRealtime() then returned a dead
      // teardown and never resubscribed, silently stopping realtime chat.
      initRealtime: () => {
        wsRefCount += 1;
        if (!wsTeardown) {
          wsTeardown = subscribeAppWs({
            onEvent: (ev) => {
              const type = (ev as ChatWsEvent).type;
              if (
                type === "chat.message.created" ||
                type === "chat.message.updated" ||
                type === "chat.message.deleted" ||
                type === "chat.reaction.updated" ||
                type === "chat.conversation.updated" ||
                type === "chat.conversation.deleted"
              ) {
                // Raw, before decryption: the durable copy is stored sealed.
                persistRealtimeEvent(get().currentUserId, ev as ChatWsEvent);
                get().handleWsEvent(ev as ChatWsEvent);
              }
            },
            onReconnect: () => {
              if (document.visibilityState === "visible") {
                void get().fetchSidebar({ silent: true });
                const { activeConversationId, threadRootId } = get();
                if (activeConversationId) {
                  void get().loadFeed(activeConversationId, null, {
                    force: true,
                  });
                  if (threadRootId) {
                    void get().loadFeed(activeConversationId, threadRootId, {
                      force: true,
                    });
                  }
                }
              }
            },
          });
        }
        let released = false;
        return () => {
          if (released) return;
          released = true;
          wsRefCount -= 1;
          if (wsRefCount > 0) return;
          wsTeardown?.();
          wsTeardown = null;
        };
      },
    }),
    {
      name: CHAT_PERSIST_KEY,
      partialize: (s) => ({
        dms: persistenceSafeConversations(s.dms),
        channels: persistenceSafeConversations(s.channels),
        feeds: recentChatFeeds(s.feeds),
        unreadOnly: s.unreadOnly,
        dmSectionOpen: s.dmSectionOpen,
        channelsSectionOpen: s.channelsSectionOpen,
        activeConversationId: s.activeConversationId,
      }),
      // Drop non-UUID conversation ids persisted before validation existed.
      onRehydrateStorage: () => (state) => {
        if (
          state?.activeConversationId &&
          !CONV_ID_RE.test(state.activeConversationId)
        ) {
          state.activeConversationId = null;
        }
      },
    },
  ),
);

export function selectTotalUnread(state: ChatState) {
  const dmUnread = state.dms.reduce((sum, d) => sum + d.unread_count, 0);
  const channelUnread = state.channels.reduce(
    (sum, c) => sum + c.unread_count,
    0,
  );
  return dmUnread + channelUnread;
}

export function selectActiveFeed(
  state: ChatState,
  conversationId: string | null,
  threadRootId?: string | null,
) {
  if (!conversationId) return EMPTY_FEED;
  return state.feeds[feedKey(conversationId, threadRootId)] ?? EMPTY_FEED;
}

export function selectActiveConversation(state: ChatState) {
  if (!state.activeConversationId) return null;
  return (
    state.channels.find((c) => c.id === state.activeConversationId) ??
    state.dms.find((d) => d.id === state.activeConversationId) ??
    null
  );
}

export { emptyFeed };
