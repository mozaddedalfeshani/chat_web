import { localKey, openBytes, sealBytes, type Sealed } from "../idb/local-key";
import { S } from "../idb/schema";
import { openHistoryDb, readTx, req, writeTx } from "../idb/tx";
import { Sha256 } from "../sha256";

/**
 * Attachment bytes imported from the phone, in sealed pieces of at most 1 MiB
 * keyed by file offset, so a video can be read — and seeked — a piece at a time
 * and never has to exist as one buffer. Keyed by the attachment's url key, the
 * identity every platform shares (`attachmentUrlKey`).
 *
 * A file is `ready` only once every segment arrived AND the whole thing hashes
 * to the phone's SHA-256 at the declared length. `unavailable` is a final
 * answer (the phone did not have it, or it changed mid-transfer), never a
 * download still pending.
 */
export const PIECE = 1 << 20;

export type FileRecord = {
  url_key: string;
  size: number;
  sha256: string;
  file_name: string;
  content_type: string;
  status: "partial" | "ready" | "unavailable";
  segs: number;
  done: number[];
  updated_at: number;
};

type PieceRow = { url_key: string; n: number; length: number; payload: Sealed };

const pieceLabel = (urlKey: string, offset: number) => `history-file:${urlKey}:${offset}`;

export async function getFile(userId: string, urlKey: string) {
  const db = await openHistoryDb(userId);
  return readTx(db, [S.files], (tx) => req<FileRecord | undefined>(tx.objectStore(S.files).get(urlKey)));
}

/** Writes one slice of a segment. Idempotent: the same offset overwrites. */
export async function writeFileSlice(
  userId: string,
  meta: Omit<FileRecord, "status" | "done" | "updated_at">,
  fileOffset: number,
  bytes: Uint8Array,
) {
  const db = await openHistoryDb(userId);
  const key = await localKey(db);
  const pieces: PieceRow[] = [];
  for (let at = 0; at < bytes.length; at += PIECE) {
    const slice = bytes.subarray(at, Math.min(bytes.length, at + PIECE));
    const n = fileOffset + at;
    pieces.push({ url_key: meta.url_key, n, length: slice.length, payload: await sealBytes(key, slice as BufferSource, pieceLabel(meta.url_key, n)) });
  }
  await writeTx(db, [S.files, S.fileChunks], async (tx) => {
    const files = tx.objectStore(S.files);
    const current = await req<FileRecord | undefined>(files.get(meta.url_key));
    if (current?.status === "ready") return;
    files.put({ ...meta, status: "partial", done: current?.done ?? [], updated_at: Date.now() });
    for (const piece of pieces) tx.objectStore(S.fileChunks).put(piece);
  });
}

export async function markSegmentDone(userId: string, urlKey: string, seg: number) {
  const db = await openHistoryDb(userId);
  await writeTx(db, [S.files], async (tx) => {
    const files = tx.objectStore(S.files);
    const row = await req<FileRecord | undefined>(files.get(urlKey));
    if (!row || row.done.includes(seg)) return;
    files.put({ ...row, done: [...row.done, seg], updated_at: Date.now() });
  });
}

/** Final "no": drops any pieces so nothing half-written is ever served. */
export async function markUnavailable(userId: string, meta: Omit<FileRecord, "status" | "done" | "updated_at">) {
  const db = await openHistoryDb(userId);
  await writeTx(db, [S.files, S.fileChunks], async (tx) => {
    const files = tx.objectStore(S.files);
    const current = await req<FileRecord | undefined>(files.get(meta.url_key));
    if (current?.status === "ready") return;
    files.put({ ...meta, status: "unavailable", done: [], updated_at: Date.now() });
    tx.objectStore(S.fileChunks).delete(IDBKeyRange.bound([meta.url_key, -Infinity], [meta.url_key, Infinity]));
  });
}

/** Plaintext of [start, end), one piece at a time. */
export async function* readFileRange(userId: string, urlKey: string, start: number, end: number) {
  const db = await openHistoryDb(userId);
  const key = await localKey(db);
  let at = start;
  while (at < end) {
    const rows = await readTx(db, [S.fileChunks], (tx) =>
      req<PieceRow[]>(
        tx.objectStore(S.fileChunks).getAll(IDBKeyRange.bound([urlKey, Math.max(0, at - PIECE + 1)], [urlKey, end - 1]), 8),
      ),
    );
    const usable = rows.filter((r) => r.n + r.length > at);
    if (usable.length === 0) throw new Error("file piece missing");
    for (const row of usable) {
      const plain = new Uint8Array(await openBytes(key, row.payload, pieceLabel(urlKey, row.n)));
      const from = Math.max(at, row.n) - row.n;
      const to = Math.min(end, row.n + row.length) - row.n;
      if (row.n > at) throw new Error("file piece gap");
      yield plain.subarray(from, to);
      at = row.n + to;
      if (at >= end) return;
    }
  }
}

/** Whole-file check once every segment is in. Ready or unavailable, never stuck. */
export async function verifyFile(userId: string, urlKey: string): Promise<FileRecord["status"]> {
  const row = await getFile(userId, urlKey);
  if (!row || row.status !== "partial" || row.done.length < row.segs) return row?.status ?? "partial";
  const hash = new Sha256();
  let length = 0;
  try {
    for await (const slice of readFileRange(userId, urlKey, 0, row.size)) {
      hash.update(slice);
      length += slice.length;
    }
  } catch {
    length = -1;
  }
  const ok = length === row.size && hash.hex() === row.sha256;
  if (!ok) {
    await markUnavailable(userId, row);
    return "unavailable";
  }
  const db = await openHistoryDb(userId);
  await writeTx(db, [S.files], (tx) => {
    tx.objectStore(S.files).put({ ...row, status: "ready", updated_at: Date.now() });
  });
  return "ready";
}

/** What the phone may skip on a new transfer: verified files only. */
export async function readyFiles(userId: string) {
  const db = await openHistoryDb(userId);
  const rows = await readTx(db, [S.files], (tx) => req<FileRecord[]>(tx.objectStore(S.files).getAll()));
  return rows.filter((r) => r.status === "ready").map((r) => ({ url_key: r.url_key, sha256: r.sha256, size: r.size }));
}
