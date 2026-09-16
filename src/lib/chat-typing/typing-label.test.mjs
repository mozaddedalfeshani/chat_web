import assert from "node:assert/strict";
import test from "node:test";
import { typingLabel } from "./typing-label.ts";

test("nobody typing says nothing", () => {
  assert.equal(typingLabel([], true), "");
  assert.equal(typingLabel([], false), "");
});

test("a DM never names the peer", () => {
  assert.equal(typingLabel(["Alice"], false), "typing…");
});

test("a group names who", () => {
  assert.equal(typingLabel(["Alice"], true), "Alice is typing…");
  assert.equal(typingLabel(["Alice", "Bob"], true), "Alice and Bob are typing…");
  assert.equal(typingLabel(["A", "B", "C"], true), "A, B and C are typing…");
  assert.equal(
    typingLabel(["A", "B", "C", "D", "E"], true),
    "A, B and 3 others are typing…",
  );
  assert.equal(typingLabel(["  "], true), "Someone is typing…");
});
