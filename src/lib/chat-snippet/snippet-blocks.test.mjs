import assert from "node:assert/strict";
import test from "node:test";
import { snippetBlocks } from "./snippet-blocks.ts";

test("blocks join back to the text exactly", () => {
  const text = Array.from({ length: 1001 }, (_, i) => `line ${i}`).join("\n") + "\n\n";
  const blocks = snippetBlocks(text);
  assert.equal(blocks.join(""), text);
  assert.equal(blocks.length, 3);
  assert.equal(blocks[0].split("\n").length - 1, 400);
  assert.ok(blocks[0].endsWith("\n"));
});

test("a line with no break is cut by length, never inside an emoji", () => {
  const text = "ab" + "😀".repeat(5);
  const blocks = snippetBlocks(text, 400, 3);
  assert.equal(blocks.join(""), text);
  for (const block of blocks) {
    assert.ok(block.length <= 3);
    const last = block.charCodeAt(block.length - 1);
    assert.ok(!(last >= 0xd800 && last <= 0xdbff), "block ends on half an emoji");
  }
});

test("empty and short text", () => {
  assert.deepEqual(snippetBlocks(""), []);
  assert.deepEqual(snippetBlocks("one"), ["one"]);
});
