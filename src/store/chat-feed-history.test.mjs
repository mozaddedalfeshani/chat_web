import "fake-indexeddb/auto";
process.env.NEXT_PUBLIC_HISTORY_IMPORT = "1";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { composeLatest, composeOlder, persistRawMessages } from "./chat-feed-history.ts";
import { deleteAccountHistory } from "../lib/history/repo/wipe.ts";

const at = (i) => new Date(Date.UTC(2026, 0, 1) + i * 60_000).toISOString();
const msg = (id, created, extra = {}) => ({
  id, conversation_id: "c1", user_id: "u", body: id, created_at: created,
  last_activity_at: created, thread_count: 0, revision: 1, ...extra,
});

// 150 server messages, newest first, paged by 100 like the API.
const server = Array.from({ length: 150 }, (_, i) => msg(`s${String(149 - i).padStart(3, "0")}`, at(149 - i)));
const serverPage = (cursor) => {
  const start = cursor ? server.findIndex((m) => m.id === cursor) + 1 : 0;
  const messages = server.slice(start, start + 100);
  const more = start + 100 < server.length;
  return { messages, has_more: more, next_cursor: more ? messages[messages.length - 1].id : "" };
};

describe("feed reads through the durable history", () => {
  it("never shows imported rows across a stretch the server has not paged yet", async () => {
    const user = `feed-${Date.now()}`;
    // Imported from the phone: older than anything the server still holds.
    const imported = Array.from({ length: 30 }, (_, i) => msg(`p${String(i).padStart(3, "0")}`, `2023-05-01T00:00:${String(i).padStart(2, "0")}Z`));
    await persistRawMessages(user, imported, "phone");

    const first = await composeLatest(user, "c1", serverPage(""));
    assert.equal(first.raw.length, 100);
    assert.ok(first.raw.every((m) => m.id.startsWith("s")), "first page is the server's newest 100");
    assert.equal(first.hasMore, true);

    let fetched = 0;
    const older = await composeOlder(user, "c1", first.history, async (cursor) => {
      fetched += 1;
      return serverPage(cursor);
    });
    assert.equal(fetched, 1, "filled from the server exactly once");
    const ids = older.raw.map((m) => m.id);
    assert.equal(ids.filter((id) => id.startsWith("s")).length, 50);
    assert.equal(ids.filter((id) => id.startsWith("p")).length, 30);
    assert.ok(ids.indexOf("s000") < ids.indexOf("p029"), "server rows before older imported rows");
    assert.equal(older.hasMore, false);
    const all = [...first.raw, ...older.raw].map((m) => m.id);
    assert.equal(new Set(all).size, 180);
    await deleteAccountHistory(user);
  });

  it("a refresh after the import keeps the imported history", async () => {
    const user = `feed-refresh-${Date.now()}`;
    await persistRawMessages(user, [msg("old", "2022-01-01T00:00:00Z")], "phone");
    const page = { messages: [msg("new", at(1))], has_more: false, next_cursor: "" };
    const composed = await composeLatest(user, "c1", page);
    assert.deepEqual(composed.raw.map((m) => m.id), ["new", "old"]);
    await deleteAccountHistory(user);
  });
});
