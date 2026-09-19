import type { ChatDeletion } from "../markers";
import { transferApi } from "./api";
import { aad, fromB64u, openSealed } from "./v2-crypto";

/** One batch's descriptor, protocol section 4.3. */
export type FileEntry = {
  url_key: string;
  sha256: string;
  size: number;
  file_name: string;
  content_type: string;
  status: "available" | "omitted" | "missing";
  seg?: number;
  segs?: number;
  file_offset?: number;
  length?: number;
  stream_offset?: number;
  seg_sha256?: string;
};

export type Descriptor = {
  v: number;
  transfer_id: string;
  batch: number;
  kind: "messages" | "media";
  final: boolean;
  chunk_count: number;
  stream_bytes: number;
  stream_sha256: string;
  messages: number;
  conversations: number;
  deletions: ChatDeletion[];
  files: FileEntry[];
};

export const PIECE_BYTES = 4 * 1024 * 1024;

/**
 * Fetches and opens every page. Each page's AAD binds its index AND the page
 * count, so a relay that dropped or reordered a page fails every page rather
 * than yielding a shorter, valid-looking descriptor.
 */
export async function fetchDescriptor(
  jobId: string,
  batch: number,
  pageCount: number,
  kind: string,
  chunkCount: number,
  key: CryptoKey,
): Promise<Descriptor> {
  const sealed: string[] = [];
  let after = -1;
  while (sealed.length < pageCount) {
    const { pages } = await transferApi.pages(jobId, batch, after);
    if (pages.length === 0) throw new DescriptorError("descriptor pages are missing");
    for (const page of pages) {
      if (page.index !== sealed.length) throw new DescriptorError("descriptor pages are out of order");
      sealed.push(page.ciphertext);
      after = page.index;
    }
  }
  if (sealed.length !== pageCount) throw new DescriptorError("descriptor has extra pages");
  const parts = await Promise.all(
    sealed.map((value, i) => openSealed(key, aad.page(jobId, batch, i, pageCount), fromB64u(value))),
  );
  const bytes = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const part of parts) {
    bytes.set(part, at);
    at += part.length;
  }
  const descriptor = JSON.parse(new TextDecoder().decode(bytes)) as Descriptor;
  const expectChunks = descriptor.stream_bytes === 0 ? 0 : Math.ceil(descriptor.stream_bytes / PIECE_BYTES);
  if (
    descriptor.v !== 2 ||
    descriptor.transfer_id !== jobId ||
    descriptor.batch !== batch ||
    descriptor.kind !== kind ||
    descriptor.chunk_count !== chunkCount ||
    expectChunks !== chunkCount
  ) {
    throw new DescriptorError("descriptor does not match the batch the server finalized");
  }
  descriptor.deletions ??= [];
  descriptor.files ??= [];
  return descriptor;
}

export class DescriptorError extends Error {}
