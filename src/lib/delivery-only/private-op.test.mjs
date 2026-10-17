import assert from "node:assert/strict";
import test from "node:test";
import { applyPrivateReaction, editedStandIn, privateOpEffect } from "./private-op.ts";
import { keepPrivatePreviews, PRIVATE_LAST_MESSAGE_PREVIEW } from "./private-preview.ts";

const target = {
  id: "m1",
  conversation_id: "c1",
  user_id: "alice",
  body: "hi",
  created_at: "2026-10-16T10:00:00Z",
  thread_count: 0,
};
const op = (over) => ({
  id: "o1",
  conversation_id: "c1",
  sender_id: "alice",
  kind: "edit",
  target_message_id: "m1",
  encrypted_body: "ct",
  encryption_nonce: "nonce-123456",
  encryption_key_version: 2,
  created_at: "2026-10-16T10:05:00Z",
  ...over,
});

test("only the author edits or deletes; anyone reacts", () => {
  assert.equal(privateOpEffect(op({}), target), "edit");
  assert.equal(privateOpEffect(op({ sender_id: "bob" }), target), "ignore");
  assert.equal(privateOpEffect(op({ kind: "delete" }), target), "delete");
  assert.equal(privateOpEffect(op({ kind: "delete", sender_id: "bob" }), target), "ignore");
  assert.equal(privateOpEffect(op({ kind: "reaction", sender_id: "bob", emoji: "👍" }), target), "react");
  assert.equal(privateOpEffect(op({ kind: "reaction", emoji: "" }), target), "ignore");
});

test("never crosses conversations, never touches a deleted row", () => {
  assert.equal(privateOpEffect(op({ conversation_id: "c2" }), target), "ignore");
  assert.equal(privateOpEffect(op({}), { ...target, deleted_at: "2026-10-16T10:01:00Z" }), "ignore");
});

test("an older edit never replaces a newer one", () => {
  const edited = { ...target, edited_at: "2026-10-16T10:10:00Z" };
  assert.equal(privateOpEffect(op({}), edited), "ignore");
  assert.equal(privateOpEffect(op({ created_at: "2026-10-16T10:11:00Z" }), edited), "edit");
});

test("the edit stand-in is sealed for the ordinary decrypt path", () => {
  const s = editedStandIn(op({}), target);
  assert.equal(s.body, "");
  assert.equal(s.encrypted_body, "ct");
  assert.equal(s.encryption_version, 1);
  assert.equal(s.encryption_key_version, 2);
  assert.equal(s.user_id, "alice");
  assert.equal(s.edited_at, "2026-10-16T10:05:00Z");
});

test("reactions set and clear idempotently", () => {
  const opts = { userId: "bob", currentUserId: "me", emoji: "👍", reacted: true };
  const once = applyPrivateReaction([], opts);
  assert.deepEqual(once, [{ emoji: "👍", count: 1, users: [{ user_id: "bob", user_name: undefined }], reacted_by_me: false }]);
  assert.deepEqual(applyPrivateReaction(once, opts), once);
  assert.deepEqual(applyPrivateReaction(once, { ...opts, reacted: false }), []);
  const mine = applyPrivateReaction(once, { ...opts, userId: "me" });
  assert.equal(mine[0].count, 2);
  assert.equal(mine[0].reacted_by_me, true);
});

test("a private-last row keeps the live preview, else says where it is", () => {
  const row = { id: "c1", type: "dm", last_message_private: true, last_message_at: "2026-10-16T10:00:00Z", last_message_body: "" };
  const live = { ...row, last_message_private: false, last_message_body: "see you", last_message_user_id: "bob" };
  assert.equal(keepPrivatePreviews([row], [live])[0].last_message_body, "see you");
  assert.equal(keepPrivatePreviews([row], [])[0].last_message_body, PRIVATE_LAST_MESSAGE_PREVIEW);
  const stale = { ...live, last_message_at: "2026-10-16T09:00:00Z" };
  assert.equal(keepPrivatePreviews([row], [stale])[0].last_message_body, PRIVATE_LAST_MESSAGE_PREVIEW);
  const plain = { ...row, last_message_private: false, last_message_body: "x" };
  assert.equal(keepPrivatePreviews([plain], [live])[0].last_message_body, "x");
});

test("held, purged and private chats are told apart", async () => {
  const { hasPurgedHistory, isHeldConversation, isPrivateChat } = await import(
    "./delivery-only-store.ts"
  );
  const dm = { id: "d", type: "dm", is_self: false };
  assert.equal(isHeldConversation(dm, true), true);
  assert.equal(isHeldConversation(dm, false), false);
  assert.equal(isHeldConversation({ type: "webhook" }, true), false);
  // Nothing ever purged: the timeline's start is the chat's start.
  assert.equal(hasPurgedHistory(dm, true), false);
  assert.equal(hasPurgedHistory({ ...dm, last_private_at: "2026-10-16T10:00:00Z" }, true), true);
  assert.equal(isPrivateChat({ ...dm, private_chat: true }, {}), true);
  assert.equal(isPrivateChat({ ...dm, private_chat: true }, { d: false }), false);
  assert.equal(isPrivateChat({ ...dm, private_chat: true, is_self: true }, {}), false);
  assert.equal(isPrivateChat({ id: "g", type: "group", private_chat: true }, {}), false);
});
