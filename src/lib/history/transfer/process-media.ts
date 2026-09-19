import { getFile, markSegmentDone, markUnavailable, verifyFile, writeFileSlice } from "../repo/files";
import { Sha256 } from "../sha256";
import { PIECE_BYTES, type Descriptor, type FileEntry } from "./descriptor";
import { readStagedChunk } from "./staging";

/**
 * Files a media batch carried. Each segment is read out of the staged stream a
 * piece at a time, hashed as it goes and written into the file store; its hash
 * must match before it counts, and a file becomes `ready` only when its last
 * segment lands and the whole file verifies.
 *
 * `omitted` (it changed or vanished on the phone mid-transfer) and `missing`
 * (never on the phone) are final: the file is marked unavailable, earlier
 * segments included, and never left looking like a download in progress.
 */
export type MediaOutcome = { ready: number; unavailable: number };

function metaOf(entry: FileEntry) {
  return {
    url_key: entry.url_key,
    size: entry.size,
    sha256: entry.sha256,
    file_name: entry.file_name,
    content_type: entry.content_type,
    segs: entry.segs ?? 1,
  };
}

export async function processMediaBatch(userId: string, jobId: string, descriptor: Descriptor): Promise<MediaOutcome> {
  const outcome: MediaOutcome = { ready: 0, unavailable: 0 };
  let cached: { index: number; bytes: Uint8Array } | null = null;
  const piece = async (index: number) => {
    if (cached?.index === index) return cached.bytes;
    const bytes = await readStagedChunk(userId, jobId, descriptor.batch, index);
    if (!bytes) throw new Error(`staged chunk ${index} is missing`);
    cached = { index, bytes };
    return bytes;
  };

  for (const entry of descriptor.files) {
    const current = await getFile(userId, entry.url_key);
    if (current?.status === "ready") continue;
    if (entry.status !== "available") {
      await markUnavailable(userId, metaOf(entry));
      outcome.unavailable += 1;
      continue;
    }
    if (current?.status === "unavailable") continue;
    const start = entry.stream_offset ?? 0;
    const length = entry.length ?? 0;
    const hash = new Sha256();
    // Read [start, start+length) of the batch stream, one staged piece at a time.
    let at = start;
    const end = start + length;
    if (length === 0) {
      await writeFileSlice(userId, metaOf(entry), entry.file_offset ?? 0, new Uint8Array(0));
    }
    while (at < end) {
      const index = Math.floor(at / PIECE_BYTES);
      const bytes = await piece(index);
      const from = at - index * PIECE_BYTES;
      const to = Math.min(bytes.length, end - index * PIECE_BYTES);
      const slice = bytes.subarray(from, to);
      hash.update(slice);
      await writeFileSlice(userId, metaOf(entry), (entry.file_offset ?? 0) + (at - start), slice);
      at += slice.length;
      if (slice.length === 0) throw new Error("segment runs past the stream");
    }
    if (hash.hex() !== entry.seg_sha256) {
      await markUnavailable(userId, metaOf(entry));
      outcome.unavailable += 1;
      continue;
    }
    await markSegmentDone(userId, entry.url_key, entry.seg ?? 0);
    const status = await verifyFile(userId, entry.url_key);
    if (status === "ready") outcome.ready += 1;
    if (status === "unavailable") outcome.unavailable += 1;
  }
  return outcome;
}
