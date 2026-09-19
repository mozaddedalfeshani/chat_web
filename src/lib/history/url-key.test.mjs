import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { attachmentUrlKey, normaliseAttachmentUrl } from "./url-key.ts";
import fixture from "./fixtures/history-transfer-v2-url-key.json" with { type: "json" };

// ababilx-mobile pins the same file: an imported file is found by this key.
describe("attachment url key matches the phone", () => {
  for (const item of fixture.cases) {
    it(JSON.stringify(item.url), async () => {
      assert.equal(normaliseAttachmentUrl(item.url), item.normalised);
      assert.equal(await attachmentUrlKey(item.url), item.url_key);
    });
  }
});
