import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { decideMerge } from "./merge.ts";
import fixture from "./fixtures/history-transfer-v2-merge.json" with { type: "json" };

// The same file is pinned by ababilx-mobile. A case changed on one side alone
// is two platforms settling one message two ways.
describe("history merge contract (protocol section 7)", () => {
  for (const item of fixture.cases) {
    it(`row ${item.row}: ${item.name}`, () => {
      assert.equal(decideMerge(item.existing, item.incoming, item.markers), item.expect);
    });
  }

  it("equal revisions settle on the server copy in either arrival order", () => {
    const server = { provenance: "server", message: { id: "m", conversation_id: "c", created_at: "2026-01-01T00:00:00Z", revision: 5 } };
    const phone = { provenance: "phone", message: { ...server.message } };
    const settle = (first, second) => {
      const decision = decideMerge(first, second, []);
      return decision === "replace" ? second.provenance : first.provenance;
    };
    assert.equal(settle(phone, server), "server");
    assert.equal(settle(server, phone), "server");
  });
});
