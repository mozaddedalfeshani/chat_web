"use client";

import { FileText, LoaderCircle } from "lucide-react";
import type { ChatMessageAttachment } from "@/lib/api";
import { useAttachmentAsset } from "../chat-timeline/use-attachment-asset";
import AttachmentFetchButton from "../chat-timeline/attachment-fetch-button";

const UNAVAILABLE = "Can't be opened on this device";

/**
 * One tile of the shared-media grid. Drawn from `useAttachmentAsset`, so an
 * encrypted file (server 0168) shows its decrypted copy — or a way to fetch
 * it — and never the ciphertext its URL serves.
 */
export function SharedMediaTile({ item }: { item: ChatMessageAttachment }) {
  const asset = useAttachmentAsset(item);
  const frame = "aspect-square overflow-hidden rounded-lg bg-[var(--surface2)]";
  if (!asset.src) {
    return (
      <div className={`${frame} flex items-center justify-center p-2 text-center text-xs text-muted-foreground`}>
        {asset.unavailable ? (
          UNAVAILABLE
        ) : asset.fetch ? (
          <AttachmentFetchButton variant="row" sizeBytes={item.size_bytes} onFetch={asset.fetch} />
        ) : (
          <LoaderCircle className="size-4 animate-spin" aria-label="Loading" />
        )}
      </div>
    );
  }
  const type = item.content_type.toLowerCase();
  // An encrypted SVG or HEIC is offered as a file, never drawn (safeBlobType).
  if (!type.startsWith("image/") && !type.startsWith("video/")) {
    return (
      <div className={`${frame} flex items-center`}>
        <SharedFileRow item={item} />
      </div>
    );
  }
  return (
    <a href={asset.src} target="_blank" rel="noreferrer" className={frame}>
      {type.startsWith("video/") ? (
        <video src={asset.src} className="h-full w-full object-cover" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={asset.src} alt={item.file_name} className="h-full w-full object-cover" />
      )}
    </a>
  );
}

/** One row of the shared-files list; same rule as the tile above. */
export function SharedFileRow({ item }: { item: ChatMessageAttachment }) {
  const asset = useAttachmentAsset(item);
  const row = "flex items-center gap-2 rounded-lg px-3 py-2 text-sm";
  const label = (
    <>
      <FileText className="size-4 shrink-0" />
      <span className="truncate">{asset.unavailable ? UNAVAILABLE : item.file_name}</span>
    </>
  );
  if (!asset.src) {
    return (
      <div className={`${row} text-muted-foreground`}>
        {label}
        {asset.fetch ? (
          <AttachmentFetchButton
            variant="row"
            sizeBytes={item.size_bytes}
            onFetch={asset.fetch}
            className="ms-auto shrink-0"
          />
        ) : null}
      </div>
    );
  }
  return (
    <a
      href={asset.src}
      // A decrypted copy has no name of its own; without this it would be
      // saved under the blob's id.
      download={item.enc_meta ? item.file_name : undefined}
      target="_blank"
      rel="noreferrer"
      className={`${row} hover:bg-[var(--surface2)]`}
    >
      {label}
    </a>
  );
}
