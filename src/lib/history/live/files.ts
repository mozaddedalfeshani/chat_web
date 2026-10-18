import { create } from "zustand";
import { forgetLocalAssets } from "../media/local-asset";
import { markSegmentDone, verifyFile, writeFileSlice, type FileRecord } from "../repo/files";
import { attachmentUrlKey } from "../url-key";
import type { FileHead } from "./client";
import { connectToPhone } from "./connect";
import { currentLink } from "./link-state";

/**
 * A file from the phone, on request: the bubble's download button. Bytes are
 * written straight into the history file store as they arrive (sealed, 1 MiB
 * pieces) and the file counts only once it hashes to what the phone said —
 * then every bubble showing it redraws from this browser's copy.
 */
export type PhoneFileState = { status: "loading" | "failed" | "missing"; received: number; size: number };

export const usePhoneFiles = create<{ files: Record<string, PhoneFileState> }>(() => ({ files: {} }));

function put(url: string, state: PhoneFileState | null) {
  const files = { ...usePhoneFiles.getState().files };
  if (state) files[url] = state;
  else delete files[url];
  usePhoneFiles.setState({ files });
}

type Meta = Omit<FileRecord, "status" | "done" | "updated_at">;

const running = new Map<string, Promise<void>>();

export function fetchFileFromPhone(userId: string, url: string): Promise<void> {
  let run = running.get(url);
  if (!run) {
    run = download(userId, url).finally(() => running.delete(url));
    running.set(url, run);
  }
  return run;
}

async function download(userId: string, url: string) {
  const link = currentLink(userId);
  const key = await attachmentUrlKey(url);
  if (!link || !key) return put(url, { status: "failed", received: 0, size: 0 });
  put(url, { status: "loading", received: 0, size: 0 });
  // A holder, not a `let`: the sink callbacks fill it in, which narrowing
  // cannot see.
  const got: { meta: Meta | null; received: number } = { meta: null, received: 0 };
  try {
    const client = await connectToPhone(link);
    const found = await client.getFile(url, {
      head: async (head: FileHead) => {
        got.meta = { url_key: key, size: head.size, sha256: head.sha256, file_name: head.name, content_type: head.content_type, segs: 1 };
        put(url, { status: "loading", received: 0, size: head.size });
      },
      data: async (offset, bytes) => {
        if (!got.meta) throw new Error("file data before its head");
        await writeFileSlice(userId, got.meta, offset, bytes);
        got.received += bytes.length;
        put(url, { status: "loading", received: got.received, size: got.meta.size });
      },
    });
    const meta = got.meta;
    if (!found || !meta) {
      put(url, { status: "missing", received: 0, size: 0 });
      return;
    }
    if (meta.size === 0) await writeFileSlice(userId, meta, 0, new Uint8Array(0));
    await markSegmentDone(userId, key, 0);
    // verifyFile marks a file that does not hash to the phone's figure as
    // unavailable itself; nothing half-written is ever served.
    if ((await verifyFile(userId, key)) !== "ready") {
      put(url, { status: "failed", received: 0, size: 0 });
      return;
    }
    put(url, null);
    forgetLocalAssets();
  } catch {
    put(url, { status: "failed", received: got.received, size: 0 });
  }
}
