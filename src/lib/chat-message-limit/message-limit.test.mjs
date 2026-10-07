import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_MESSAGE_BODY_BYTES,
  MAX_MESSAGE_WORDS,
  assertMessageLength,
  countMessageWords,
  isMessageTooLong,
  messagePlainText,
} from "./message-limit.ts";

const doc = (paragraphs) =>
  JSON.stringify({
    type: "doc",
    content: paragraphs.map((text) => ({
      type: "paragraph",
      content: [{ type: "text", text }],
    })),
  });

test("counts words across spaces and line breaks", () => {
  assert.equal(countMessageWords(""), 0);
  assert.equal(countMessageWords("  one  "), 1);
  assert.equal(countMessageWords("one two\nthree\n\n  four"), 4);
  assert.equal(countMessageWords("আমি ভাত খাই"), 3);
});

test("reads the words out of a TipTap body, one block never joining the next", () => {
  assert.equal(countMessageWords(messagePlainText(doc(["one two", "three"]))), 3);
  const mention = JSON.stringify({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "hi " },
          { type: "mention", attrs: { id: "u1", label: "Jo Anne" } },
        ],
      },
    ],
  });
  assert.equal(countMessageWords(messagePlainText(mention)), 3);
});

test("6000 words go, 6001 do not", () => {
  const ok = Array(MAX_MESSAGE_WORDS).fill("word").join(" ");
  assert.equal(isMessageTooLong(doc([ok])), false);
  assert.equal(isMessageTooLong(doc([ok, "more"])), true);
  assert.throws(() => assertMessageLength(doc([ok, "more"])), /6000 words/);
});

test("6000 Bangla words in ordinary paragraphs fit the byte cap", () => {
  const paragraph = Array(20).fill("বাংলাদেশের").join(" ");
  assert.equal(isMessageTooLong(doc(Array(MAX_MESSAGE_WORDS / 20).fill(paragraph))), false);
});

// Each paragraph costs ~54 bytes of JSON around its text, so the byte cap can
// arrive before the word one when nearly every word is its own paragraph.
test("thousands of one-word paragraphs meet the byte cap first", () => {
  assert.equal(isMessageTooLong(doc(Array(MAX_MESSAGE_WORDS).fill("বাংলাদেশের"))), true);
});

test("one endless word is still refused by bytes", () => {
  assert.equal(isMessageTooLong("a".repeat(MAX_MESSAGE_BODY_BYTES + 1)), true);
});
