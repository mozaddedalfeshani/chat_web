/**
 * A message batch's stream: ONE gzip member over NDJSON frames, cut into
 * 4 MiB pieces for transport. The pieces are inflated in order as one stream —
 * inflating a piece on its own would fail on every piece but the first — and
 * lines are handed out one at a time, so a batch is never held decompressed.
 *
 * A truncated member makes `DecompressionStream` throw at the end, which is
 * the point: a batch cut short must fail, not import as a shorter history.
 */
export const MAX_LINE = 1 << 20;

export async function* gzipLines(pieces: AsyncIterable<Uint8Array>): AsyncGenerator<string> {
  const iterator = pieces[Symbol.asyncIterator]();
  const source = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const next = await iterator.next();
      if (next.done) controller.close();
      else controller.enqueue(next.value);
    },
  });
  const reader = source
    .pipeThrough(new DecompressionStream("gzip") as unknown as TransformStream<Uint8Array, Uint8Array>)
    .pipeThrough(new TextDecoderStream() as unknown as TransformStream<Uint8Array, string>)
    .getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    let newline = buffer.indexOf("\n");
    while (newline >= 0) {
      const line = buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);
      if (line.length > MAX_LINE) throw new FrameError("a frame is longer than 1 MiB");
      if (line.trim()) yield line;
      newline = buffer.indexOf("\n");
    }
    if (buffer.length > MAX_LINE) throw new FrameError("a frame is longer than 1 MiB");
  }
  if (buffer.trim()) yield buffer;
}

/** Loosely typed on purpose: fields are checked where they are used. */
export type Frame = { t: string } & Record<string, unknown>;

/** Unknown frame types are skipped by the caller; an unparseable line is corruption. */
export function parseFrame(line: string): Frame {
  try {
    const value = JSON.parse(line) as Frame;
    if (!value || typeof value !== "object" || typeof value.t !== "string") throw new Error();
    return value;
  } catch {
    throw new FrameError("a frame is not valid JSON");
  }
}

export class FrameError extends Error {}
