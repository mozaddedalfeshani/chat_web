import "fake-indexeddb/auto";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { processMessageBatch } from "./process-messages.ts";
import { processMediaBatch } from "./process-media.ts";
import { stageChunk } from "./staging.ts";
import { readLocalFeed } from "../repo/messages-read.ts";
import { getFile, readFileRange } from "../repo/files.ts";
import { Sha256 } from "../sha256.ts";
import { deleteAccountHistory } from "../repo/wipe.ts";

// Builds batches exactly as the phone does (gzip NDJSON, 4 MiB pieces) and
// stages them as the downloader would, so this exercises the destination's
// validation and activation, not a hand-simplified shape.
const PIECE = 4 * 1024 * 1024;
async function gzip(text) {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
async function stageStream(user, job, batch, bytes) {
  for (let i = 0; i * PIECE < bytes.length; i += 1) {
    await stageChunk(user, job, batch, i, bytes.subarray(i * PIECE, (i + 1) * PIECE));
  }
  return Math.ceil(bytes.length / PIECE);
}
const conv = { id: "c-old", type: "group", name: "Old friends", created_at: "2022-01-01T00:00:00Z" };
const msg = (i) => ({ id: `m${i}`, conversation_id: "c-old", user_id: "u", body: `hello ${i}`, created_at: `2022-01-0${i}T00:00:00Z`, thread_count: 0, revision: 1 });
const lines = (job, batch, extra = []) => [
  { t: "header", v: 2, transfer_id: job, batch },
  { t: "conv", c: conv },
  msg(1), msg(2), msg(3),
].map((f) => (f.t ? f : { t: "msg", m: f })).concat(extra).map((f) => JSON.stringify(f)).join("\n");

describe("destination batch activation", () => {
  it("a phone-only conversation imports whole and becomes readable", async () => {
    const user = `imp-${Date.now()}`;
    const job = "job-a";
    const bytes = await gzip(lines(job, 0, [{ t: "end", messages: 3, conversations: 1 }]) + "\n");
    const chunks = await stageStream(user, job, 0, bytes);
    const out = await processMessageBatch(user, job, {
      v: 2, transfer_id: job, batch: 0, kind: "messages", final: false, chunk_count: chunks,
      stream_bytes: bytes.length, stream_sha256: new Sha256().update(bytes).hex(), messages: 3, conversations: 1,
      deletions: [], files: [],
    });
    assert.deepEqual(out, { messages: 3, conversations: 1 });
    const feed = await readLocalFeed(user, { conversationId: "c-old", limit: 10 });
    assert.deepEqual(feed.messages.map((m) => m.id), ["m3", "m2", "m1"]);
    await deleteAccountHistory(user);
  });

  it("a batch whose end frame disagrees shows nothing at all", async () => {
    const user = `imp-bad-${Date.now()}`;
    const job = "job-b";
    const bytes = await gzip(lines(job, 0, [{ t: "end", messages: 4, conversations: 1 }]) + "\n");
    const chunks = await stageStream(user, job, 0, bytes);
    await assert.rejects(processMessageBatch(user, job, {
      v: 2, transfer_id: job, batch: 0, kind: "messages", final: false, chunk_count: chunks,
      stream_bytes: bytes.length, stream_sha256: new Sha256().update(bytes).hex(), messages: 3, conversations: 1,
      deletions: [], files: [],
    }));
    assert.equal((await readLocalFeed(user, { conversationId: "c-old", limit: 10 })).messages.length, 0);
    await deleteAccountHistory(user);
  });

  it("an explicit deletion carried by the batch keeps that message out", async () => {
    const user = `imp-del-${Date.now()}`;
    const job = "job-c";
    const bytes = await gzip(lines(job, 0, [{ t: "end", messages: 3, conversations: 1 }]) + "\n");
    const chunks = await stageStream(user, job, 0, bytes);
    await processMessageBatch(user, job, {
      v: 2, transfer_id: job, batch: 0, kind: "messages", final: false, chunk_count: chunks,
      stream_bytes: bytes.length, stream_sha256: new Sha256().update(bytes).hex(), messages: 3, conversations: 1,
      deletions: [{ conversation_id: "c-old", message_id: "m2", through_at: "2026-01-01T00:00:00Z", deleted_at: "2026-01-01T00:00:00Z", entire_conversation: false }],
      files: [],
    });
    const ids = (await readLocalFeed(user, { conversationId: "c-old", limit: 10 })).messages.map((m) => m.id);
    assert.deepEqual(ids, ["m3", "m1"]);
    await deleteAccountHistory(user);
  });

  it("media: a verified segment becomes a ready file, a missing one is final", async () => {
    const user = `imp-media-${Date.now()}`;
    const job = "job-d";
    const photo = Uint8Array.from({ length: 5_000_000 }, (_, i) => (i * 13) & 0xff);
    const chunks = await stageStream(user, job, 1, photo);
    const sha = new Sha256().update(photo).hex();
    const out = await processMediaBatch(user, job, {
      v: 2, transfer_id: job, batch: 1, kind: "media", final: true, chunk_count: chunks, stream_bytes: photo.length,
      stream_sha256: "", messages: 0, conversations: 0, deletions: [],
      files: [
        { url_key: "photo", sha256: sha, size: photo.length, file_name: "p.jpg", content_type: "image/jpeg", status: "available",
          seg: 0, segs: 1, file_offset: 0, length: photo.length, stream_offset: 0, seg_sha256: sha },
        { url_key: "gone", sha256: "", size: 10, file_name: "g.jpg", content_type: "image/jpeg", status: "missing" },
      ],
    });
    assert.deepEqual(out, { ready: 1, unavailable: 1 });
    assert.equal((await getFile(user, "photo")).status, "ready");
    assert.equal((await getFile(user, "gone")).status, "unavailable");
    let length = 0;
    for await (const part of readFileRange(user, "photo", 4_000_000, 4_500_000)) length += part.length;
    assert.equal(length, 500_000);
    await deleteAccountHistory(user);
  });
});
