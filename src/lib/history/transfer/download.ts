import { fetchRelayObject, RelayFetchError, transferApi, type RemoteChunk } from "./api";
import { stageChunk, stagedIndexes } from "./staging";
import { aad, openSealed } from "./v2-crypto";

/**
 * Pulls every uploaded chunk of one batch that this browser does not hold yet:
 * signed GET → authenticate with the chunk AAD → stage (transaction complete)
 * → acknowledge. Two downloads at a time. Returns how many chunks this browser
 * now holds for the batch.
 *
 * The order of the last two is the whole contract: an ack tells the phone the
 * relay copy may go, so it is sent only after the local copy is durable. A tag
 * that fails is a swapped or corrupt object — retried, never skipped.
 */
const PARALLEL = 2;

type Context = {
  userId: string;
  jobId: string;
  batch: number;
  kind: "messages" | "media";
  key: CryptoKey;
  signal?: AbortSignal;
  onStaged?: (held: number) => void;
};

async function withRetry<T>(run: () => Promise<T>, attempts = 5): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      const status = error instanceof RelayFetchError ? error.status : 0;
      // 403 is an expired signature; the caller re-lists for a fresh one.
      if (status === 403 || attempt >= attempts) throw error;
      const base = 400 * 2 ** (attempt - 1);
      await new Promise((r) => setTimeout(r, base + Math.random() * base));
    }
  }
}

async function pullOne(ctx: Context, chunk: RemoteChunk) {
  const sealed = await withRetry(() => fetchRelayObject(chunk.download_url, ctx.signal));
  if (sealed.length !== chunk.size_bytes) throw new Error("relay object has the wrong length");
  const plain = await openSealed(ctx.key, aad.chunk(ctx.jobId, ctx.batch, ctx.kind, chunk.index), sealed);
  await stageChunk(ctx.userId, ctx.jobId, ctx.batch, chunk.index, plain);
}

export async function downloadBatch(ctx: Context): Promise<number> {
  const held = await stagedIndexes(ctx.userId, ctx.jobId, ctx.batch);
  let after = -1;
  let relists = 0;
  for (;;) {
    const { chunks } = await transferApi.chunks(ctx.jobId, ctx.batch, after);
    if (chunks.length === 0) break;
    after = chunks[chunks.length - 1].index;
    const todo = chunks.filter((c) => !held.has(c.index));
    const newlyHeld: number[] = [];
    let expired = false;
    for (let i = 0; i < todo.length; i += PARALLEL) {
      const group = todo.slice(i, i + PARALLEL);
      const results = await Promise.allSettled(group.map((c) => pullOne(ctx, c)));
      results.forEach((result, j) => {
        if (result.status === "fulfilled") {
          held.add(group[j].index);
          newlyHeld.push(group[j].index);
        } else if (result.reason instanceof RelayFetchError && result.reason.status === 403) {
          expired = true;
        } else {
          throw result.reason;
        }
      });
      ctx.onStaged?.(held.size);
      if (expired) break;
    }
    // Acknowledge what is durable locally, and anything the server still
    // lists as unacked that we already held from an earlier run.
    const ack = [...newlyHeld, ...chunks.filter((c) => !c.acked && held.has(c.index)).map((c) => c.index)];
    if (ack.length > 0) await transferApi.ack(ctx.jobId, ctx.batch, [...new Set(ack)]);
    if (expired) {
      // Fresh signatures on the next listing; a job that keeps refusing is
      // closed, and the listing itself will say so.
      if (++relists > 5) throw new Error("relay keeps refusing signed URLs");
      after = -1;
    }
  }
  return held.size;
}
