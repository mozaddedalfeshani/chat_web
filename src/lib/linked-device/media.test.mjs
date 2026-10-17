import { test } from "bun:test";
import assert from "node:assert/strict";
import { mediaPlan } from "./media.ts";

const base = { file_url: "https://cdn.test/chat/c/a.jpg", file_name: "a.jpg", content_type: "image/jpeg" };

test("a timed photo is held until it expires, never released unseen", () => {
  assert.equal(mediaPlan({ ...base, file_url: "", view_seconds: 0 }), "wait");
  assert.equal(mediaPlan({ ...base, file_url: "", view_seconds: 10, expired: true }), "nothing");
  assert.equal(mediaPlan({ ...base, file_url: "", locked: true }), "nothing");
});

test("an encrypted file is kept decrypted, retried while its key has not opened", () => {
  assert.equal(mediaPlan({ ...base, enc_meta: "m", sealed_as: { file_name: "file", content_type: "image/x-ababilx-sealed", size_bytes: 9 } }), "sealed");
  assert.equal(mediaPlan({ ...base, enc_meta: "m" }), "unopenable");
  assert.equal(mediaPlan(base), "plain");
});
