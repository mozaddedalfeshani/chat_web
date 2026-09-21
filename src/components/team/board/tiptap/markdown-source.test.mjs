import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { markdownSourceOf } from "./markdown-source.ts";

// Same cases as ababilx-mobile test/features/messages/message_markdown_test.dart:
// the two rules must agree, or one device renders what the other shows raw.
const doc = (...paragraphs) => JSON.stringify({ type: "doc", content: paragraphs });
const p = (...inline) => ({ type: "paragraph", content: inline });
const t = (text, marks) => (marks ? { type: "text", text, marks } : { type: "text", text });

describe("markdownSourceOf", () => {
  it("takes plain text carrying markdown as it is", () => {
    assert.equal(markdownSourceOf("**Deploy** done"), "**Deploy** done");
    assert.equal(markdownSourceOf("# Title\nbody"), "# Title\nbody");
    assert.equal(markdownSourceOf("- one\n- two"), "- one\n- two");
    assert.equal(markdownSourceOf("1. first\n2. second"), "1. first\n2. second");
    assert.equal(markdownSourceOf("```\ncode\n```"), "```\ncode\n```");
    assert.equal(markdownSourceOf("run `flutter test`"), "run `flutter test`");
    assert.notEqual(markdownSourceOf("see [docs](https://a.dev)"), null);
    assert.notEqual(markdownSourceOf("| a | b |\n|---|---|\n| 1 | 2 |"), null);
    assert.equal(markdownSourceOf("> quoted"), "> quoted");
  });

  it("leaves ordinary messages on the TipTap renderer", () => {
    for (const body of ["hello there", "2 * 3 = 6", "price is $5 - cheap", "#hashtag", "https://ababilx.com", "", null]) {
      assert.equal(markdownSourceOf(body), null, String(body));
    }
  });

  it("reads a phone-typed body (newlines inside one paragraph)", () => {
    assert.equal(markdownSourceOf(doc(p(t("## Plan\n- ship\n- test")))), "## Plan\n- ship\n- test");
  });

  it("joins web paragraphs line by line", () => {
    assert.equal(markdownSourceOf(doc(p(t("- a")), p(t("- b")))), "- a\n- b");
  });

  it("keeps real marks, mentions and rich blocks on TipTap", () => {
    assert.equal(markdownSourceOf(doc(p(t("**x**", [{ type: "bold" }])))), null);
    assert.equal(
      markdownSourceOf(doc(p({ type: "mention", attrs: { id: "u1", label: "Ann" } }, t(" **look**")))),
      null,
    );
    assert.equal(markdownSourceOf(JSON.stringify({ type: "doc", content: [{ type: "bulletList", content: [] }] })), null);
  });

  it("never re-reads non-TipTap JSON (the webhook marker) as markdown", () => {
    assert.equal(markdownSourceOf('{"format":"markdown","raw":"**x**"}'), null);
  });
});
