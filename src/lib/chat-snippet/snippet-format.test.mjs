import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MAX_SNIPPET_BYTES,
  isSnippetFile,
  isSnippetTooLarge,
  snippetByteLength,
  snippetFileName,
  snippetKindOf,
  snippetPreview,
} from "./snippet-format.ts";

// Same cases as the phone's snippet_format_test.dart.

test("file name comes from the title and the kind", () => {
  assert.equal(snippetFileName("", "markdown"), "snippet.md");
  assert.equal(snippetFileName("  Deploy notes ", "text"), "Deploy notes.txt");
  assert.equal(snippetFileName("notes.txt", "markdown"), "notes.md");
  assert.equal(snippetFileName("a/b\\c:d", "text"), "a b c d.txt");
  assert.equal(snippetFileName("...", "text"), "snippet.txt");
  assert.equal(snippetFileName("বাংলা নোট", "markdown"), "বাংলা নোট.md");
});

test("a long title is cut to 80 characters", () => {
  assert.equal(snippetFileName("x".repeat(200), "text"), `${"x".repeat(80)}.txt`);
});

test("kind is read off the extension", () => {
  assert.equal(snippetKindOf("README.MD"), "markdown");
  assert.equal(snippetKindOf("a.markdown"), "markdown");
  assert.equal(snippetKindOf("log.txt"), "text");
  assert.equal(snippetKindOf("photo.jpg"), null);
  assert.equal(snippetKindOf("file"), null);
});

test("only a text file within 10 MB is a snippet", () => {
  assert.equal(isSnippetFile("a.md", 10), true);
  assert.equal(isSnippetFile("a.txt", MAX_SNIPPET_BYTES), true);
  assert.equal(isSnippetFile("a.txt", MAX_SNIPPET_BYTES + 1), false);
  assert.equal(isSnippetFile("a.pdf", 10), false);
});

test("size is counted in UTF-8 bytes", () => {
  assert.equal(snippetByteLength("abc"), 3);
  assert.equal(snippetByteLength("বাং"), 9);
  assert.equal(isSnippetTooLarge("a".repeat(MAX_SNIPPET_BYTES)), false);
  assert.equal(isSnippetTooLarge("a".repeat(MAX_SNIPPET_BYTES + 1)), true);
});

test("preview keeps the first non-empty lines", () => {
  assert.equal(snippetPreview("\n# Title\n\nbody  \nmore"), "# Title\nbody\nmore");
  assert.equal(snippetPreview("1\n2\n3\n4\n5\n6\n7").split("\n").length, 5);
  assert.equal(snippetPreview("y".repeat(500)).length, 120);
  assert.equal(snippetPreview(""), "");
});
