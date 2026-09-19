import "fake-indexeddb/auto";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { activateImport, dropUnactivated, stageImportedMessages } from "./import-stage.ts";
import { mergeMessages } from "./messages-write.ts";
import { readLocalFeed, readLocalMessage } from "./messages-read.ts";
import { deleteAccountHistory } from "./wipe.ts";

const msg = (id, created, extra = {}) => ({
  id, conversation_id: "c1", user_id: "u", body: id, created_at: created, thread_count: 0, revision: 3, ...extra,
});

describe("import batches activate in one write", () => {
  it("staged rows stay invisible until the batch activates", async () => {
    const user = `stage-${Date.now()}`;
    await stageImportedMessages(user, [msg("a", "2023-01-01T00:00:00Z"), msg("b", "2023-01-02T00:00:00Z")], "job:0", []);
    assert.equal((await readLocalFeed(user, { conversationId: "c1", limit: 10 })).messages.length, 0);
    assert.equal(await readLocalMessage(user, "a"), null);
    await activateImport(user, "job:0");
    assert.deepEqual((await readLocalFeed(user, { conversationId: "c1", limit: 10 })).messages.map((m) => m.id), ["b", "a"]);
    await deleteAccountHistory(user);
  });

  it("a cancelled batch leaves nothing behind, and activated ones stay", async () => {
    const user = `drop-${Date.now()}`;
    await stageImportedMessages(user, [msg("kept", "2023-01-01T00:00:00Z")], "job:0", []);
    await activateImport(user, "job:0");
    await stageImportedMessages(user, [msg("gone", "2023-01-03T00:00:00Z")], "job:1", []);
    assert.equal(await dropUnactivated(user, "job:1"), 1);
    assert.equal(await dropUnactivated(user, "job:0"), 0);
    assert.deepEqual((await readLocalFeed(user, { conversationId: "c1", limit: 10 })).messages.map((m) => m.id), ["kept"]);
    await deleteAccountHistory(user);
  });

  it("an edit of a visible message is returned for the merge, not staged", async () => {
    const user = `repl-${Date.now()}`;
    await mergeMessages(user, [msg("m", "2023-01-01T00:00:00Z", { revision: 2, body: "old" })], "server", []);
    const replacements = await stageImportedMessages(user, [msg("m", "2023-01-01T00:00:00Z", { revision: 9, body: "new" })], "job:0", []);
    assert.equal(replacements.length, 1);
    assert.equal((await readLocalMessage(user, "m")).body, "old");
    await activateImport(user, "job:0");
    await mergeMessages(user, replacements, "phone", []);
    assert.equal((await readLocalMessage(user, "m")).body, "new");
    await deleteAccountHistory(user);
  });

  it("a live server copy replaces a row still waiting for activation", async () => {
    const user = `live-${Date.now()}`;
    await stageImportedMessages(user, [msg("x", "2023-01-01T00:00:00Z", { body: "phone" })], "job:0", []);
    await mergeMessages(user, [msg("x", "2023-01-01T00:00:00Z", { body: "server" })], "server", []);
    assert.equal((await readLocalMessage(user, "x")).body, "server");
    await deleteAccountHistory(user);
  });
});
