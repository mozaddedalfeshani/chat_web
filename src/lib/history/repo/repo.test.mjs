import "fake-indexeddb/auto";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mergeMessages, applyDeletionMarkers } from "./messages-write.ts";
import { readLocalFeed, readLocalMessage } from "./messages-read.ts";
import { storeConversations, readStoredConversations } from "./conversations.ts";
import { deleteAccountHistory } from "./wipe.ts";

// fake-indexeddb implements the spec's transaction semantics, which is what
// these tests lean on. It is not a browser: quota, eviction and reload are
// covered by the manual acceptance steps, not here.
let n = 0;
const account = () => `user-${++n}-${Date.now()}`;
const msg = (id, created, extra = {}) => ({
  id, conversation_id: "c1", user_id: "u", body: `body ${id}`, created_at: created,
  thread_count: 0, revision: 5, ...extra,
});

describe("durable history repository", () => {
  it("merging a server page never drops imported history", async () => {
    const user = account();
    await mergeMessages(user, [msg("old", "2024-01-01T00:00:00Z")], "phone", []);
    await mergeMessages(user, [msg("new", "2026-09-01T00:00:00Z")], "server", []);
    const page = await readLocalFeed(user, { conversationId: "c1", limit: 10 });
    assert.deepEqual(page.messages.map((m) => m.id), ["new", "old"]);
    await deleteAccountHistory(user);
  });

  it("the same message imported twice is stored once", async () => {
    const user = account();
    const counts1 = await mergeMessages(user, [msg("m", "2025-01-01T00:00:00Z")], "phone", []);
    const counts2 = await mergeMessages(user, [msg("m", "2025-01-01T00:00:00Z")], "phone", []);
    assert.equal(counts1.insert, 1);
    assert.equal(counts2.keep, 1);
    const page = await readLocalFeed(user, { conversationId: "c1", limit: 10 });
    assert.equal(page.messages.length, 1);
    await deleteAccountHistory(user);
  });

  it("a retention placeholder never overwrites the phone's copy", async () => {
    const user = account();
    await mergeMessages(user, [msg("m", "2025-01-01T00:00:00Z")], "phone", []);
    await mergeMessages(user, [msg("m", "2025-01-01T00:00:00Z", {
      body: "", deleted_at: "2025-07-01T00:00:00Z", content_purged: true, revision: 99,
    })], "server", []);
    const stored = await readLocalMessage(user, "m");
    assert.equal(stored.body, "body m");
    assert.equal(stored.deleted_at, undefined);
    await deleteAccountHistory(user);
  });

  it("explicit deletion markers remove stored rows and block re-import", async () => {
    const user = account();
    await mergeMessages(user, [msg("a", "2025-01-01T00:00:00Z"), msg("b", "2025-02-01T00:00:00Z")], "phone", []);
    const markers = [{ conversation_id: "c1", message_id: "", through_at: "2025-01-15T00:00:00Z",
      deleted_at: "2025-03-01T00:00:00Z", entire_conversation: false }];
    assert.equal(await applyDeletionMarkers(user, markers), 1);
    const again = await mergeMessages(user, [msg("a", "2025-01-01T00:00:00Z")], "phone", markers);
    assert.equal(again.suppress, 1);
    const page = await readLocalFeed(user, { conversationId: "c1", limit: 10 });
    assert.deepEqual(page.messages.map((m) => m.id), ["b"]);
    await deleteAccountHistory(user);
  });

  it("pages back in time from an edge without skipping rows", async () => {
    const user = account();
    const rows = Array.from({ length: 25 }, (_, i) =>
      msg(`m${String(i).padStart(2, "0")}`, `2025-01-01T00:00:${String(i).padStart(2, "0")}Z`));
    await mergeMessages(user, rows, "server", []);
    const first = await readLocalFeed(user, { conversationId: "c1", limit: 10 });
    const second = await readLocalFeed(user, { conversationId: "c1", limit: 10, before: first.edge });
    const third = await readLocalFeed(user, { conversationId: "c1", limit: 10, before: second.edge });
    const ids = [...first.messages, ...second.messages, ...third.messages].map((m) => m.id);
    assert.equal(ids.length, 25);
    assert.equal(new Set(ids).size, 25);
    assert.equal(ids[0], "m24");
    assert.equal(ids[24], "m00");
    await deleteAccountHistory(user);
  });

  it("stores E2EE messages sealed, without a decrypted body", async () => {
    const user = account();
    await mergeMessages(user, [msg("e", "2025-01-01T00:00:00Z", {
      body: "plaintext that was decrypted in memory", encrypted_body: "abc", encryption_version: 1,
    })], "server", []);
    const stored = await readLocalMessage(user, "e");
    assert.equal(stored.body, "");
    assert.equal(stored.encrypted_body, "abc");
    await deleteAccountHistory(user);
  });

  it("a phone conversation never overwrites the server's row", async () => {
    const user = account();
    await storeConversations(user, [{ id: "c1", name: "server name" }], "server");
    await storeConversations(user, [{ id: "c1", name: "phone name" }, { id: "c2", name: "phone only" }], "phone");
    const stored = await readStoredConversations(user);
    const names = Object.fromEntries(stored.map((c) => [c.id, c.name]));
    assert.deepEqual(names, { c1: "server name", c2: "phone only" });
    await deleteAccountHistory(user);
  });

  it("deleting the account's history removes the database and refuses late writes", async () => {
    const user = account();
    await mergeMessages(user, [msg("m", "2025-01-01T00:00:00Z")], "phone", []);
    await deleteAccountHistory(user);
    const names = (await indexedDB.databases()).map((d) => d.name);
    assert.equal(names.includes(`ababilx-history:${user}`), false);
    // A WebSocket event landing after sign-out must not recreate it.
    await assert.rejects(mergeMessages(user, [msg("late", "2025-01-02T00:00:00Z")], "server", []));
    assert.equal((await indexedDB.databases()).some((d) => d.name === `ababilx-history:${user}`), false);
  });
});
