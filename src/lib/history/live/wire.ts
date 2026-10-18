/**
 * Live history data-channel framing — `ababilx-server/docs/history-live-protocol.md`
 * section 2, byte-identical with the phone's `live_wire.dart` (both pinned by
 * the same fixture strings in their tests).
 *
 * A frame is `u32be header_len | header JSON | body`, cut into pieces of at
 * most 16 KiB: `u8 1 | u32be frame_id | u32be total | u32be offset | bytes`.
 * 16 KiB is the size every WebRTC stack delivers whole.
 */
export const PIECE_BYTES = 16 * 1024;
export const PIECE_HEAD = 13;
export const MAX_FRAME = 8 << 20;

export type FrameHeader = { t: string } & Record<string, unknown>;
export type Frame = { header: FrameHeader; body: Uint8Array };

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function encodeFrame(header: FrameHeader, body: Uint8Array = new Uint8Array(0)): Uint8Array {
  const head = encoder.encode(JSON.stringify(header));
  const out = new Uint8Array(4 + head.length + body.length);
  new DataView(out.buffer).setUint32(0, head.length);
  out.set(head, 4);
  out.set(body, 4 + head.length);
  return out;
}

export function decodeFrame(bytes: Uint8Array): Frame {
  if (bytes.length < 4) throw new WireError("frame shorter than its length prefix");
  const length = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0);
  if (4 + length > bytes.length) throw new WireError("header runs past the frame");
  const header = JSON.parse(decoder.decode(bytes.subarray(4, 4 + length))) as FrameHeader;
  if (!header || typeof header.t !== "string") throw new WireError("frame has no type");
  return { header, body: bytes.subarray(4 + length) };
}

/** Cuts one encoded frame into channel messages. */
export function* pieces(frameId: number, frame: Uint8Array): Generator<Uint8Array> {
  const room = PIECE_BYTES - PIECE_HEAD;
  for (let offset = 0; offset < frame.length || offset === 0; offset += room) {
    const slice = frame.subarray(offset, Math.min(frame.length, offset + room));
    const piece = new Uint8Array(PIECE_HEAD + slice.length);
    const view = new DataView(piece.buffer);
    piece[0] = 1;
    view.setUint32(1, frameId);
    view.setUint32(5, frame.length);
    view.setUint32(9, offset);
    piece.set(slice, PIECE_HEAD);
    yield piece;
    if (frame.length === 0) return;
  }
}

/** Reassembles pieces; hands out each frame once its last byte arrived. */
export class Assembler {
  private open = new Map<number, { bytes: Uint8Array; got: number }>();

  push(piece: Uint8Array): Uint8Array | null {
    if (piece.length < PIECE_HEAD || piece[0] !== 1) throw new WireError("unknown piece version");
    const view = new DataView(piece.buffer, piece.byteOffset, piece.byteLength);
    const id = view.getUint32(1);
    const total = view.getUint32(5);
    const offset = view.getUint32(9);
    const data = piece.subarray(PIECE_HEAD);
    if (total > MAX_FRAME || offset + data.length > total) throw new WireError("piece outside its frame");
    let entry = this.open.get(id);
    if (!entry) {
      entry = { bytes: new Uint8Array(total), got: 0 };
      this.open.set(id, entry);
    }
    entry.bytes.set(data, offset);
    entry.got += data.length;
    if (entry.got < total) return null;
    this.open.delete(id);
    return entry.bytes;
  }

  clear() {
    this.open.clear();
  }
}

/** gzip NDJSON body of a `page` frame → rows. */
export async function gunzipLines(body: Uint8Array): Promise<string[]> {
  if (body.length === 0) return [];
  const stream = new Blob([body as BlobPart]).stream().pipeThrough(new DecompressionStream("gzip"));
  const text = await new Response(stream).text();
  return text.split("\n").filter((line) => line.trim() !== "");
}

export class WireError extends Error {}
