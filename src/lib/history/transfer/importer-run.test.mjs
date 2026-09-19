import "fake-indexeddb/auto";
import { describe, it, mock } from "bun:test";
import assert from "node:assert/strict";
import { FakeServer } from "./fake-server.mjs";
import { Sha256 } from "../sha256.ts";

// One fake server per test; the api module is swapped for its in-memory twin.
let server;
mock.module("./api.ts", () => ({
  transferApi: new Proxy({}, { get: (_t, name) => (...args) => server.api()[name](...args) }),
  fetchRelayObject: (url) => server.api().fetchRelay(url),
  RelayFetchError: class extends Error {},
}));

const { runImport } = await import("./importer-run.ts");
const { saveJob, readJob, emptyCounts } = await import("./jobs.ts");
const { newDestinationKeys } = await import("./v2-crypto.ts");
const { readLocalFeed } = await import("../repo/messages-read.ts");
const { getFile } = await import("../repo/files.ts");
const { deleteAccountHistory } = await import("../repo/wipe.ts");

async function newJob(user, id) {
  const keys = await newDestinationKeys();
  await saveJob(user, { id, status: "waiting", createdAt: Date.now(), expiresAt: Date.now() + 300000,
    privateKey: keys.privateKey, publicParam: keys.param, qrPayload: "", code: "000000",
    destInventorySent: false, batches: {}, counts: emptyCounts(), updatedAt: Date.now() });
  return keys;
}

describe("runImport against a phone-format relay", () => {
  it("messages first, then media, then the seal — and the job completes", async () => {
    const user = `run-${Date.now()}`;
    const id = "11111111-2222-3333-4444-555555555555";
    server = new FakeServer(id);
    const keys = await newJob(user, id);
    await server.approve(keys.publicJwk);
    await server.addMessages([
      { t: "header", v: 2, transfer_id: id, batch: 0 },
      { t: "conv", c: { id: "c1", type: "dm", created_at: "2021-01-01T00:00:00Z" } },
      { t: "msg", m: { id: "old-1", conversation_id: "c1", user_id: "u", body: "from 2021", created_at: "2021-02-01T00:00:00Z", thread_count: 0, attachments: [] } },
      { t: "end", messages: 1, conversations: 1 },
    ], false);
    const video = Uint8Array.from({ length: 9_000_000 }, (_, i) => (i * 7) & 0xff);
    const sha = new Sha256().update(video).hex();
    await server.addBatch("media", true, video, { files: [{ url_key: "vid", sha256: sha, size: video.length, file_name: "v.mp4",
      content_type: "video/mp4", status: "available", seg: 0, segs: 1, file_offset: 0, length: video.length, stream_offset: 0, seg_sha256: sha }] });
    await server.sealJob(1);

    const ticks = [];
    const job = await runImport(user, id, (t) => ticks.push(t.job.status), new AbortController().signal);
    assert.equal(job.status, "finished");
    assert.equal(server.completed, true);
    assert.ok(server.destInventory.length > 0, "told the phone which files it already has");
    assert.deepEqual((await readLocalFeed(user, { conversationId: "c1", limit: 5 })).messages.map((m) => m.id), ["old-1"]);
    assert.equal((await getFile(user, "vid")).status, "ready");
    assert.equal(job.counts.messages, 1);
    assert.equal(job.counts.filesReady, 1);
    await deleteAccountHistory(user);
  });

  it("a job cancelled on the phone keeps nothing half-imported", async () => {
    const user = `run-cancel-${Date.now()}`;
    const id = "99999999-2222-3333-4444-555555555555";
    server = new FakeServer(id);
    const keys = await newJob(user, id);
    await server.approve(keys.publicJwk);
    server.status = "cancelled";
    const job = await runImport(user, id, () => {}, new AbortController().signal);
    assert.equal(job.status, "cancelled");
    assert.equal((await readJob(user, id)).status, "cancelled");
    await deleteAccountHistory(user);
  });
});
