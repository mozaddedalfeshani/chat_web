import type { ChatConversation } from "@/lib/api/types/chat";
import { useChatStore } from "@/store/chat-store";
import { mergeMarkers, type ChatDeletion } from "../markers";
import { storeConversations } from "../repo/conversations";
import { storeDeletionMarkers } from "../repo/deletions";
import { applyDeletionMarkers } from "../repo/messages-write";
import { readMeta, writeMeta } from "../repo/cursors";
import type { Hello } from "./client";
import { connectToPhone, disconnectPhone, liveClient, onPhoneHello, type StoredLink } from "./connect";
import { activeSession, setCurrentLink } from "./link-state";
import { LIVE_PAGE_EVENT } from "./older";
import { phonePage } from "./pages";
import { useLiveHistoryStore } from "./status-store";

/**
 * The live link as this browser keeps it, and what happens when the phone
 * says hello: its chat list is stored, its deletion markers applied, and on
 * the first connection the newest BOOT messages of every chat are fetched,
 * newest chat first, four at a time — WhatsApp's initial bootstrap. Older
 * messages and files wait until someone scrolls or taps.
 */
const LINK = "live-link";
const BOOTED = "live-booted";
const CHATS = "live-chats";
export const BOOT = 20;
const PARALLEL = 4;

let booting: Promise<void> | null = null;

export async function saveLink(userId: string, link: StoredLink) {
  await writeMeta(userId, LINK, link);
  await writeMeta(userId, BOOTED, false);
  setCurrentLink(userId, link);
  useLiveHistoryStore.getState().set({ status: "waiting", deviceName: link.deviceName, ended: {} });
}

/** On load: pick the link back up. Connects only if the first fill is unfinished. */
export async function restoreLink(userId: string) {
  if (activeSession()?.userId === userId) return;
  const link = await readMeta<StoredLink>(userId, LINK).catch(() => undefined);
  if (!link?.id || !link.key) return;
  setCurrentLink(userId, link);
  const chats = (await readMeta<string[]>(userId, CHATS).catch(() => undefined)) ?? [];
  useLiveHistoryStore.getState().set({ status: "waiting", deviceName: link.deviceName, phoneChats: asSet(chats) });
  void dialUntilBooted(userId, link);
}

const DIAL_FOR_MS = 3 * 60_000;
const REDIAL_MS = 4000;

/**
 * Keeps reaching for the phone until the first fill is done. One dial gives
 * up after 15 s — right after a sign-in the socket may still be opening, or
 * the phone's app still waking — and nothing else would ever try again.
 */
export async function dialUntilBooted(userId: string, link: StoredLink) {
  const until = Date.now() + DIAL_FOR_MS;
  while (Date.now() < until && activeSession()?.link.id === link.id) {
    if (await readMeta<boolean>(userId, BOOTED).catch(() => false)) return;
    if (!liveClient()) {
      await connectToPhone(link).catch((error) => console.info("[history-live] dial missed", String(error)));
    }
    await new Promise((resolve) => setTimeout(resolve, REDIAL_MS));
  }
}

export function forgetLink() {
  disconnectPhone();
  setCurrentLink("", null);
  booting = null;
  useLiveHistoryStore.getState().set({ status: "none", deviceName: "", ended: {}, loading: {}, phoneChats: {} });
}

onPhoneHello((hello) => {
  const session = activeSession();
  if (!session) return;
  void receiveHello(session.userId, session.link, hello).catch((error) =>
    console.warn("[history-live] hello not applied", error),
  );
});

async function receiveHello(userId: string, link: StoredLink, hello: Hello) {
  const started = performance.now();
  if (hello.device) useLiveHistoryStore.getState().set({ deviceName: hello.device });
  const markers = mergeMarkers((hello.deletions ?? []) as ChatDeletion[]);
  await storeDeletionMarkers(userId, markers).catch(() => {});
  await applyDeletionMarkers(userId, markers);
  const convs = [...(hello.convs ?? [])].sort((a, b) => b.newest_ms - a.newest_ms);
  await storeConversations(userId, convs.map((c) => c.c as unknown as ChatConversation), "phone");
  const ids = convs.map((c) => c.c.id);
  await writeMeta(userId, CHATS, ids).catch(() => {});
  useLiveHistoryStore.getState().set({ phoneChats: asSet(ids) });
  void useChatStore.getState().fetchSidebar({ silent: true });
  console.info(`[history-live] hello convs=${convs.length} applied_ms=${Math.round(performance.now() - started)}`);
  if (await readMeta<boolean>(userId, BOOTED)) return;
  booting ??= boot(userId, link, ids).finally(() => {
    booting = null;
  });
}

async function boot(userId: string, link: StoredLink, ids: string[]) {
  const started = performance.now();
  // The open chat jumps the queue.
  const open = useChatStore.getState().activeConversationId;
  const queue = open && ids.includes(open) ? [open, ...ids.filter((id) => id !== open)] : [...ids];
  let failed = false;
  let done = 0;
  const worker = async () => {
    for (let id = queue.shift(); id; id = queue.shift()) {
      try {
        await phonePage(userId, link, id, BOOT);
        done += 1;
        if (done === 1 || done % 10 === 0) refresh();
      } catch {
        failed = true;
        return;
      }
    }
  };
  await Promise.all(Array.from({ length: PARALLEL }, worker));
  refresh();
  if (!failed) await writeMeta(userId, BOOTED, true);
  console.info(`[history-live] boot chats=${done} failed=${failed} ms=${Math.round(performance.now() - started)}`);
}

// A chat the first-run fill had not reached yet got its newest page.
if (typeof window !== "undefined") {
  window.addEventListener(LIVE_PAGE_EVENT, (ev) => {
    const id = (ev as CustomEvent<{ conversationId: string }>).detail?.conversationId;
    const chat = useChatStore.getState();
    if (id && chat.activeConversationId === id) void chat.loadFeed(id, null, { force: true });
  });
}

function refresh() {
  const chat = useChatStore.getState();
  void chat.fetchSidebar({ silent: true });
  if (chat.activeConversationId) void chat.loadFeed(chat.activeConversationId, null, { force: true });
}

function asSet(ids: string[]): Record<string, true> {
  return Object.fromEntries(ids.map((id) => [id, true as const]));
}
