import { test, expect } from "bun:test";
import { conversationCutoff, markerMatches } from "./markers";

const msg = { id: "m1", conversation_id: "c1", created_at: "2026-10-01T10:00:00.000000Z" };
const marker = (extra) => ({
  conversation_id: "c1",
  message_id: "",
  through_at: "2026-10-18T12:03:17.710376Z",
  deleted_at: "2026-10-18T12:03:17.710387Z",
  entire_conversation: false,
  ...extra,
});

test("start fresh (explicit null) deletes nothing", () => {
  expect(conversationCutoff(marker({ explicit_through_at: null }))).toBe(null);
  expect(markerMatches(msg, [marker({ explicit_through_at: null })])).toBe(false);
});

test("a deliberate delete cuts at explicit_through_at, not through_at", () => {
  const m = marker({ explicit_through_at: "2026-09-05T00:00:00.000000Z" });
  expect(markerMatches(msg, [m])).toBe(false);
  expect(markerMatches({ ...msg, created_at: "2026-09-01T00:00:00.000000Z" }, [m])).toBe(true);
});

test("an old server (no key) keeps through_at", () => {
  expect(markerMatches(msg, [marker({})])).toBe(true);
});
