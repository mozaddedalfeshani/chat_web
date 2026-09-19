import { listChatMessages } from "@/lib/api/user/chat";
import type { ChatConversation } from "@/lib/api/types/chat";
import { mergeMessages } from "../repo/messages-write";
import { readSyncCursors, writeMeta, writeSyncCursor, type SyncCursor } from "../repo/cursors";
import { deletionSnapshot } from "@/lib/messages/deletions";
import { timestampMicros } from "../markers";

/**
 * Background read of the server's history into the durable store.
 *
 * Two conversations at a time, newest page first, resuming from a durable
 * per-conversation cursor. Sends NO receipts: this is the browser filling its
 * archive, not the user reading, and a background pass that marked messages
 * read would clear the sender's "unread" on things nobody has seen.
 */
export type ServerSyncStatus = {
  phase: "idle" | "running" | "settled";
  total: number;
  done: number;
  empty: number;
  failed: number;
  messages: number;
};

const WORKERS = 2;
const PAGE = 100;
const PAUSE_MS = 120;
const HIDDEN_PAUSE_MS = 1_000;

export const SERVER_SYNC_SETTLED = "server-sync-settled";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function needsTopRefresh(cursor: SyncCursor, conversation: ChatConversation) {
  if (!conversation.last_message_at) return false;
  const newest = cursor.newest_at ? timestampMicros(cursor.newest_at) : 0;
  return timestampMicros(conversation.last_message_at) > newest;
}

export function startServerHistorySync(
  userId: string,
  conversations: ChatConversation[],
  onStatus: (status: ServerSyncStatus) => void,
): () => void {
  let stopped = false;
  const status: ServerSyncStatus = {
    phase: "running", total: conversations.length, done: 0, empty: 0, failed: 0, messages: 0,
  };
  const report = () => onStatus({ ...status });

  async function syncOne(conversation: ChatConversation, previous: SyncCursor | undefined) {
    const settled = previous?.state === "done" || previous?.state === "empty";
    // A finished conversation only needs its newest page again when the
    // sidebar says something arrived since; history below it is already here.
    if (settled && !needsTopRefresh(previous!, conversation)) {
      status[previous!.state === "done" ? "done" : "empty"] += 1;
      return;
    }
    let cursor: SyncCursor = previous && !settled
      ? { ...previous, state: "running" }
      : { conversation_id: conversation.id, state: "running", cursor: "", pages: 0, messages: 0, updated_at: 0 };
    // A refresh pages down from the newest message until it meets history it
    // already holds; a read-back continues from the stored cursor.
    let refreshCursor = "";
    const knownNewest = previous?.newest_at ? timestampMicros(previous.newest_at) : 0;
    try {
      for (;;) {
        if (stopped) return;
        const page = await listChatMessages(conversation.id, {
          cursor: (settled ? refreshCursor : cursor.cursor) || undefined,
          limit: PAGE,
        });
        refreshCursor = page.next_cursor;
        await mergeMessages(userId, page.messages, "server", deletionSnapshot(userId));
        const newest = page.messages[0]?.created_at;
        cursor = {
          ...cursor,
          cursor: page.next_cursor,
          pages: cursor.pages + 1,
          messages: cursor.messages + page.messages.length,
          newest_at:
            newest && (!cursor.newest_at || timestampMicros(newest) > timestampMicros(cursor.newest_at))
              ? newest
              : cursor.newest_at,
        };
        status.messages += page.messages.length;
        const oldest = page.messages[page.messages.length - 1]?.created_at;
        const metKnown = settled && (!oldest || timestampMicros(oldest) <= knownNewest);
        const finished = metKnown || !page.has_more || !page.next_cursor;
        if (finished) {
          // A refresh keeps the cursor of the completed read-back; only the
          // newest mark (and an empty conversation that now has messages) move.
          const state = settled
            ? previous!.state === "empty" && cursor.messages > 0 ? "done" : previous!.state
            : cursor.messages === 0 ? "empty" : "done";
          await writeSyncCursor(
            userId,
            settled ? { ...previous!, state, newest_at: cursor.newest_at ?? previous!.newest_at } : { ...cursor, state },
          );
          status[state === "empty" ? "empty" : "done"] += 1;
          return;
        }
        await writeSyncCursor(userId, cursor);
        await sleep(document.visibilityState === "visible" ? PAUSE_MS : HIDDEN_PAUSE_MS);
      }
    } catch (error) {
      status.failed += 1;
      // A failed refresh leaves the finished read-back as it was; a failed
      // read-back keeps its cursor so the retry resumes, not restarts.
      if (settled) return;
      await writeSyncCursor(userId, {
        ...cursor,
        state: "failed",
        error: error instanceof Error ? error.message : "sync failed",
      }).catch(() => {});
    } finally {
      report();
    }
  }

  void (async () => {
    let cursors: Map<string, SyncCursor>;
    try {
      cursors = await readSyncCursors(userId);
    } catch {
      status.phase = "settled";
      return report();
    }
    report();
    const queue = [...conversations];
    const worker = async () => {
      for (let next = queue.shift(); next && !stopped; next = queue.shift()) {
        await syncOne(next, cursors.get(next.id));
      }
    };
    await Promise.all(Array.from({ length: WORKERS }, worker));
    if (stopped) return;
    status.phase = "settled";
    await writeMeta(userId, SERVER_SYNC_SETTLED, { at: Date.now(), failed: status.failed }).catch(() => {});
    report();
  })();

  return () => {
    stopped = true;
  };
}
