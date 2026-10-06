// The `ababilx-att-v1` file format has to be byte-identical on the web and on
// the phone, or a photo sent from one opens as noise on the other with no
// error that names the cause. The fixed vector below is the one
// `ababilx-mobile/test/features/attachments/attachment_crypto_test.dart` pins.
//
//   bun test src/lib/chat-attachments
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ATTACHMENT_ALGORITHM,
  ATTACHMENT_CHUNK_BYTES,
  ATTACHMENT_TAG_BYTES,
  chunkAad,
  chunkNonce,
  cipherSize,
  paddedSize,
} from "./format.ts";
import { openBytes, openChunks, sealBlob, sealBytes } from "./file-cipher.ts";

const key = Uint8Array.from({ length: 32 }, (_, i) => i);
const bytes = (n) => Uint8Array.from({ length: n }, (_, i) => (i * 31 + 7) & 0xff);
const hex = (b) => Buffer.from(b).toString("hex");
const SEALED_CHUNK = ATTACHMENT_CHUNK_BYTES + ATTACHMENT_TAG_BYTES;

describe("format constants are pinned", () => {
  it("names, sizes, nonce and AAD", () => {
    assert.equal(ATTACHMENT_ALGORITHM, "ababilx-att-v1");
    assert.equal(ATTACHMENT_CHUNK_BYTES, 65536);
    assert.equal(ATTACHMENT_TAG_BYTES, 16);
    assert.equal(hex(chunkNonce(0)), "000000000000000000000000");
    assert.equal(hex(chunkNonce(258)), "000000000000000000000102");
    // "ababilx-att-v1" || u32be(index) || last
    assert.equal(hex(chunkAad(1, false)), "61626162696c782d6174742d76310000000100");
    assert.equal(hex(chunkAad(258, true)), "61626162696c782d6174742d76310000010201");
  });

  it("padding hides the exact size in 5% buckets", () => {
    assert.equal(paddedSize(0), 541);
    assert.equal(paddedSize(1), 541);
    assert.equal(paddedSize(541), 541);
    for (const n of [542, 1000, 65536, 65537, 5 * 1024 * 1024, 350 * 1024 * 1024]) {
      const padded = paddedSize(n);
      assert.ok(padded >= n, `${n}`);
      assert.ok(padded <= Math.ceil(n * 1.05) + 1, `${n}`);
      // Every size in the bucket pads to the same length.
      assert.equal(paddedSize(padded), padded);
    }
    assert.equal(paddedSize(1000), paddedSize(1010));
  });
});

describe("the phone's fixed vector", () => {
  // Key 00..1f, nonce twelve zero bytes, AAD "ababilx-att-v1" || 00000000 ||
  // 01, plaintext 01 02 03 04 05 followed by 536 zero bytes.
  it("5 bytes under key 00..1f", async () => {
    const sealed = await sealBytes(Uint8Array.from([1, 2, 3, 4, 5]), key);
    assert.equal(sealed.length, 557);
    assert.equal(hex(sealed.subarray(0, 16)), "0fbeb6dab02c83bd08a8a935182c9199");
    assert.equal(hex(sealed.subarray(541)), "c5bee65a9bb3f66cd957bfa036c901eb");
    assert.equal(
      hex(await crypto.subtle.digest("SHA-256", sealed)),
      "2366b322bce8926371fca983182682208fcc795eab459a44d82c1fccb6eb9e01",
    );
    assert.deepEqual([...(await openBytes(sealed, key, 5))], [1, 2, 3, 4, 5]);
  });
});

describe("round trips", () => {
  it("across chunk boundaries", async () => {
    for (const n of [0, 1, 540, 541, 65535, 65536, 65537, 200000]) {
      const plain = bytes(n);
      const sealed = await sealBytes(plain, key);
      assert.equal(sealed.length, cipherSize(n), `${n}`);
      assert.deepEqual(await openBytes(sealed, key, n), plain, `${n}`);
    }
  });

  it("a Blob seals to the same object as its bytes", async () => {
    const plain = bytes(150000);
    const blob = await sealBlob(new Blob([plain]), key);
    assert.equal(blob.type, "application/octet-stream");
    assert.deepEqual(
      new Uint8Array(await blob.arrayBuffer()),
      await sealBytes(plain, key),
    );
  });

  it("opens whatever way the network cuts the object up", async () => {
    const plain = bytes(200000);
    const sealed = await sealBytes(plain, key);
    for (const size of [7, 4096, SEALED_CHUNK - 1, SEALED_CHUNK, SEALED_CHUNK + 1]) {
      const parts = [];
      for (let at = 0; at < sealed.length; at += size) parts.push(sealed.subarray(at, at + size));
      const out = [];
      for await (const part of openChunks(parts, key, plain.length)) out.push(...part);
      assert.deepEqual(Uint8Array.from(out), plain, `${size}`);
    }
  });
});

describe("a tampered object never opens", () => {
  const n = 150000; // three chunks once padded
  const sealedOnce = sealBytes(bytes(n), key);
  const refused = async (object, { withKey = key, size = n } = {}) =>
    assert.rejects(openBytes(object, withKey, size));

  it("wrong key", async () => refused(await sealedOnce, { withKey: new Uint8Array(32).fill(9) }));

  it("one flipped byte", async () => {
    const bad = (await sealedOnce).slice();
    bad[70000] ^= 1;
    await refused(bad);
  });

  it("cut at a chunk boundary", async () =>
    refused((await sealedOnce).subarray(0, SEALED_CHUNK * 2)));

  it("cut mid-chunk", async () => {
    const sealed = await sealedOnce;
    await refused(sealed.subarray(0, sealed.length - 40));
  });

  it("chunks swapped", async () => {
    const sealed = await sealedOnce;
    const bad = sealed.slice();
    bad.set(sealed.subarray(SEALED_CHUNK, SEALED_CHUNK * 2), 0);
    bad.set(sealed.subarray(0, SEALED_CHUNK), SEALED_CHUNK);
    await refused(bad);
  });

  it("declared longer than it is", async () => refused(await sealedOnce, { size: 10 * n }));

  it("a stated size that is not a length", async () => {
    await refused(await sealedOnce, { size: -1 });
    await refused(await sealedOnce, { size: 1.5 });
  });

  it("an empty object", async () => refused(new Uint8Array(0), { size: 0 }));

  it("a key of the wrong length", async () =>
    refused(await sealedOnce, { withKey: new Uint8Array(16) }));
});
