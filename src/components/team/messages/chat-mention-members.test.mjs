import { describe, expect, test } from "bun:test";
import { chatMentionMembers } from "./chat-mention-members.ts";

const group = {
  id: "group-1",
  type: "group",
};

describe("chat mention roster", () => {
  test("uses the conversation roster for a personal group", () => {
    expect(
      chatMentionMembers(group, [
        { user_id: "me", name: "Me", joined_at: "2026-01-01" },
        { user_id: "outside-team", name: "Friend", joined_at: "2026-01-01" },
      ]).map((member) => member.user_id),
    ).toEqual(["me", "outside-team"]);
  });

  test("uses only the peer for a DM", () => {
    expect(
      chatMentionMembers(
        {
          id: "dm-1",
          type: "dm",
          peer_user_id: "peer",
          peer_user_name: "Peer",
          peer_user_avatar: "peer.png",
        },
        [{ user_id: "wrong", name: "Wrong", joined_at: "2026-01-01" }],
      ),
    ).toMatchObject([
      { user_id: "peer", name: "Peer", avatar_url: "peer.png" },
    ]);
  });

  test("has no stale suggestions without an active conversation", () => {
    expect(chatMentionMembers(null, [])).toEqual([]);
  });
});
