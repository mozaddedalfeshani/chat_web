"use client";

import { File01Icon } from "hugeicons-react";
import type { ThreadAttachment } from "../thread-types";
import AssetActionButtons from "@/components/shared/asset-action-buttons";
import { useAttachmentAsset } from "@/components/team/messages/chat-timeline/use-attachment-asset";
import AttachmentFetchButton from "@/components/team/messages/chat-timeline/attachment-fetch-button";

function SealedAttachment({ attachment }: { attachment: ThreadAttachment }) {
  const asset = useAttachmentAsset(attachment);
  const type = attachment.content_type.toLowerCase();

  if (asset.src && type.startsWith("image/")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={asset.src}
        alt={attachment.file_name}
        className="block h-auto max-h-48 w-auto max-w-full rounded-lg"
      />
    );
  }
  if (asset.src && type.startsWith("video/")) {
    return (
      <video
        src={asset.src}
        controls
        playsInline
        preload="metadata"
        className="block h-auto max-h-72 w-auto max-w-full rounded-lg border"
        style={{ borderColor: "var(--border)" }}
      />
    );
  }
  if (asset.src && type.startsWith("audio/")) {
    return <audio src={asset.src} controls preload="metadata" className="h-9 w-full max-w-full" />;
  }
  return (
    <div
      className="inline-flex max-w-full items-center gap-1.5 rounded-sm border px-2 py-1 text-xs text-muted-foreground"
      style={{ borderColor: "var(--border)" }}
    >
      <File01Icon size={14} className="shrink-0" />
      <span className="max-w-[200px] truncate">
        {asset.unavailable ? "This file can't be opened on this device" : attachment.file_name}
      </span>
      {asset.src ? (
        <AssetActionButtons url={asset.src} fileName={attachment.file_name} variant="inline" />
      ) : asset.fetch ? (
        <AttachmentFetchButton
          variant="row"
          sizeBytes={attachment.size_bytes}
          onFetch={asset.fetch}
        />
      ) : null}
    </div>
  );
}

/**
 * Encrypted chat files in a thread (server 0168).
 *
 * The ordinary renderer hands `file_url` straight to `<img>`, `<video>` and
 * download links. For an encrypted file that address serves ciphertext, so
 * these are drawn from the copy this browser fetched and decrypted — and
 * offered as a row to fetch, or said to be unavailable, until there is one.
 */
export default function SealedAttachments({
  attachments,
}: {
  attachments: ThreadAttachment[];
}) {
  if (attachments.length === 0) return null;
  return (
    <div className="flex min-w-0 max-w-full flex-col items-start gap-1.5">
      {attachments.map((attachment) => (
        <SealedAttachment key={attachment.id} attachment={attachment} />
      ))}
    </div>
  );
}
