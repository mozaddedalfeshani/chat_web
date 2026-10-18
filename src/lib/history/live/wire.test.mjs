import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Assembler, decodeFrame, encodeFrame, gunzipLines, pieces, PIECE_BYTES } from "./wire.ts";
import { openSignal, signalAad } from "./signal-seal.ts";

// Pinned by the phone's live_signal_seal_test.dart: key 01..20, zero nonce.
const SIGNAL = { kind: "offer", nonce: "AAAAAAAAAAAAAAAA", sealed: "vVuvYM0wN989RYJqEkKI1ukE7XYdjq5bTxfYvpK58iLD81JcQkwJpIyy" };

// Pinned byte for byte by the phone's live_wire_test.dart.
const GET_FRAME_HEX =
  "0000002a7b2274223a22676574222c22726571223a372c22636f6e76223a226331222c226c696d6974223a32307d";
const GET_PIECE_HEX = "01" + "00000003" + "0000002e" + "00000000" + GET_FRAME_HEX;

const hex = (bytes) => Buffer.from(bytes).toString("hex");

describe("live wire", () => {
  it("encodes a frame exactly as the phone does", () => {
    const frame = encodeFrame({ t: "get", req: 7, conv: "c1", limit: 20 });
    assert.equal(hex(frame), GET_FRAME_HEX);
    assert.deepEqual([...pieces(3, frame)].map(hex), [GET_PIECE_HEX]);
  });

  it("splits big frames at 16 KiB and reassembles interleaved pieces", () => {
    const body = new Uint8Array(40_000).map((_, i) => i % 251);
    const a = [...pieces(1, encodeFrame({ t: "file_data", req: 1, offset: 0 }, body))];
    const b = [...pieces(2, encodeFrame({ t: "pong" }))];
    assert.ok(a.length === 3 && a.every((p) => p.length <= PIECE_BYTES));
    const asm = new Assembler();
    assert.equal(asm.push(a[0]), null);
    const pong = asm.push(b[0]);
    assert.equal(decodeFrame(pong).header.t, "pong");
    assert.equal(asm.push(a[1]), null);
    const done = decodeFrame(asm.push(a[2]));
    assert.equal(done.header.t, "file_data");
    assert.deepEqual([...done.body], [...body]);
  });

  it("refuses a piece that runs past its frame", () => {
    const piece = Buffer.from("01" + "00000001" + "00000002" + "00000001" + "aabb", "hex");
    assert.throws(() => new Assembler().push(new Uint8Array(piece)));
  });

  it("reads a gzip NDJSON page body", async () => {
    const gz = new Uint8Array(
      await new Response(new Blob(['{"id":"a"}\n{"id":"b"}\n']).stream().pipeThrough(new CompressionStream("gzip"))).arrayBuffer(),
    );
    assert.deepEqual((await gunzipLines(gz)).map((l) => JSON.parse(l).id), ["a", "b"]);
  });

  it("binds signals to link, sender and kind", async () => {
    assert.equal(signalAad("L", "source", "offer"), "ababilx-history-live-v1|signal|L|source|offer");
    const key = await crypto.subtle.importKey("raw", new Uint8Array(32).map((_, i) => i + 1), "AES-GCM", false, ["encrypt", "decrypt"]);
    assert.deepEqual(await openSignal(key, "L1", "source", SIGNAL), { type: "offer", sdp: "x" });
    await assert.rejects(openSignal(key, "L1", "destination", SIGNAL));
  });
});
