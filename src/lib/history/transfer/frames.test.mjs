import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { gzipLines } from "./frames.ts";

async function gzip(text) {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
async function* pieces(bytes, size) {
  for (let i = 0; i < bytes.length; i += size) yield bytes.subarray(i, i + size);
}
const all = async (it) => { const out = []; for await (const l of it) out.push(l); return out; };

describe("message batch stream", () => {
  it("inflates pieces as one stream and yields every line", async () => {
    const lines = Array.from({ length: 2000 }, (_, i) => JSON.stringify({ t: "msg", m: { id: `m${i}`, body: "x".repeat(i % 50) } }));
    const bytes = await gzip(lines.join("\n") + "\n");
    // Pieces smaller than anything gzip aligns to: only whole-stream inflation works.
    assert.deepEqual(await all(gzipLines(pieces(bytes, 97))), lines);
  });

  it("a truncated stream fails instead of importing a shorter history", async () => {
    const bytes = await gzip(Array.from({ length: 500 }, (_, i) => `{"t":"msg","m":{"id":"${i}"}}`).join("\n"));
    await assert.rejects(all(gzipLines(pieces(bytes.subarray(0, bytes.length - 12), 64))));
  });

  it("refuses a frame longer than 1 MiB", async () => {
    const bytes = await gzip(`{"t":"msg","m":{"body":"${"a".repeat((1 << 20) + 10)}"}}\n`);
    await assert.rejects(all(gzipLines(pieces(bytes, 1 << 16))), /longer than 1 MiB/);
  });
});
