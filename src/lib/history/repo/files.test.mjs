import "fake-indexeddb/auto";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getFile, markSegmentDone, markUnavailable, readFileRange, readyFiles, verifyFile, writeFileSlice } from "./files.ts";
import { Sha256 } from "../sha256.ts";
import { deleteAccountHistory } from "./wipe.ts";

const bytes = (n, seed = 3) => Uint8Array.from({ length: n }, (_, i) => (i * seed + 11) & 0xff);
const collect = async (it) => {
  const parts = [];
  for await (const p of it) parts.push(p.slice());
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
};

describe("imported file pieces", () => {
  it("a file across two segments reads back whole and verifies", async () => {
    const user = `files-${Date.now()}`;
    const data = bytes(3_500_000);
    const meta = { url_key: "k1", size: data.length, sha256: new Sha256().update(data).hex(), file_name: "v.mp4", content_type: "video/mp4", segs: 2 };
    await writeFileSlice(user, meta, 0, data.subarray(0, 1_300_000));
    await markSegmentDone(user, "k1", 0);
    assert.equal(await verifyFile(user, "k1"), "partial");
    await writeFileSlice(user, meta, 1_300_000, data.subarray(1_300_000));
    await markSegmentDone(user, "k1", 1);
    assert.equal(await verifyFile(user, "k1"), "ready");
    // A seek into the middle crosses a piece boundary and a segment boundary.
    const mid = await collect(readFileRange(user, "k1", 1_000_000, 2_200_000));
    assert.deepEqual(mid, data.subarray(1_000_000, 2_200_000));
    assert.deepEqual(await readyFiles(user), [{ url_key: "k1", sha256: meta.sha256, size: meta.size }]);
    await deleteAccountHistory(user);
  });

  it("a wrong hash ends as unavailable, never stuck partial", async () => {
    const user = `files-bad-${Date.now()}`;
    const data = bytes(1000);
    const meta = { url_key: "k2", size: 1000, sha256: "0".repeat(64), file_name: "x", content_type: "image/png", segs: 1 };
    await writeFileSlice(user, meta, 0, data);
    await markSegmentDone(user, "k2", 0);
    assert.equal(await verifyFile(user, "k2"), "unavailable");
    await assert.rejects(collect(readFileRange(user, "k2", 0, 10)));
    await deleteAccountHistory(user);
  });

  it("an empty file is a ready file", async () => {
    const user = `files-empty-${Date.now()}`;
    const meta = { url_key: "k3", size: 0, sha256: new Sha256().hex(), file_name: "e", content_type: "text/plain", segs: 1 };
    await writeFileSlice(user, meta, 0, new Uint8Array(0));
    await markSegmentDone(user, "k3", 0);
    assert.equal(await verifyFile(user, "k3"), "ready");
    await markUnavailable(user, meta);
    assert.equal((await getFile(user, "k3")).status, "ready", "a verified file is never downgraded");
    await deleteAccountHistory(user);
  });

  it("a later valid transfer replaces unavailable or mismatched ready bytes", async () => {
    const user = `files-replace-${Date.now()}`;
    const good = bytes(2048, 9);
    const goodMeta = { url_key: "same", size: good.length, sha256: new Sha256().update(good).hex(), file_name: "new", content_type: "image/png", segs: 1 };
    await markUnavailable(user, { ...goodMeta, sha256: "", size: 1 });
    await writeFileSlice(user, goodMeta, 0, good);
    await markSegmentDone(user, "same", 0);
    assert.equal(await verifyFile(user, "same"), "ready");

    const newer = bytes(1024, 17);
    const newerMeta = { ...goodMeta, size: newer.length, sha256: new Sha256().update(newer).hex() };
    await writeFileSlice(user, newerMeta, 0, newer);
    await markSegmentDone(user, "same", 0);
    assert.equal(await verifyFile(user, "same"), "ready");
    assert.deepEqual(await collect(readFileRange(user, "same", 0, newer.length)), newer);
    await deleteAccountHistory(user);
  });
});
