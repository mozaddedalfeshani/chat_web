import assert from "node:assert/strict";
import test from "node:test";
import { sortConversations } from "./conversation-sort.ts";

function conversation(id, extra = {}) {
  return {
    id,
    team_id: "",
    type: "dm",
    is_private: true,
    created_at: "2026-09-01T00:00:00Z",
    unread_count: 0,
    ...extra,
  };
}

test("pinned conversations stay above newer unread conversations", () => {
  const sorted = sortConversations([
    conversation("new-unread", {
      unread_count: 3,
      last_message_at: "2026-09-22T12:00:00Z",
    }),
    conversation("pinned", {
      pinned: true,
      last_message_at: "2026-09-20T12:00:00Z",
    }),
  ]);

  assert.deepEqual(
    sorted.map((item) => item.id),
    ["pinned", "new-unread"],
  );
});
