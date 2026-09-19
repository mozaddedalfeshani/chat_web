import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Sha256 } from "./sha256.ts";

const webcrypto = async (bytes) =>
  Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (b) => b.toString(16).padStart(2, "0")).join("");

describe("incremental sha256", () => {
  for (const size of [0, 1, 55, 56, 63, 64, 65, 119, 120, 1000, 1 << 20]) {
    it(`matches WebCrypto at ${size} bytes, fed in odd pieces`, async () => {
      const data = Uint8Array.from({ length: size }, (_, i) => (i * 31 + 7) & 0xff);
      const hash = new Sha256();
      for (let i = 0; i < size; i += 37) hash.update(data.subarray(i, Math.min(size, i + 37)));
      assert.equal(hash.hex(), await webcrypto(data));
    });
  }
});
