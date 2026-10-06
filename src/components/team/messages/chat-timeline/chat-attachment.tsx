"use client";

import { File, LoaderCircle } from "lucide-react";
import type { ChatMessageAttachment } from "@/lib/api";
import { useAttachmentAsset } from "./use-attachment-asset";
import AttachmentFetchButton from "./attachment-fetch-button";
import { useAssetMenu } from "@/components/shared/use-asset-menu";
import AssetActionButtons from "@/components/shared/asset-action-buttons";

export default function ChatAttachment({ attachment }: { attachment: ChatMessageAttachment }) {
  const asset = useAttachmentAsset(attachment);
  const localUrl = asset.src;
  const type = attachment.content_type.toLowerCase();
  const menu = useAssetMenu({
    url: localUrl,
    fileName: attachment.file_name,
    kind: type.startsWith("audio/") ? "audio" : "file",
  });

  if (attachment.locked || !attachment.file_url) {
    return <p className="text-xs text-[var(--sig-label-2)]">Attachment unavailable</p>;
  }
  if (asset.unavailable && !localUrl) {
    // An encrypted file whose key this device was never given.
    return (
      <p className="text-xs text-[var(--sig-label-2)]">
        This file can&apos;t be opened on this device
      </p>
    );
  }
  if (asset.fetch) {
    return (
      <div className="inline-flex max-w-full items-center gap-2 rounded-[12px] bg-[var(--sig-fill)] px-3 py-2 text-[13px]">
        <File className="h-4 w-4 shrink-0" />
        <span className="truncate">{attachment.file_name}</span>
        <AttachmentFetchButton
          variant="row"
          sizeBytes={attachment.size_bytes}
          onFetch={asset.fetch}
          className="ms-1 shrink-0"
        />
      </div>
    );
  }
  if (!localUrl) {
    return (
      <div className="flex items-center gap-2 text-xs text-[var(--sig-label-2)]">
        <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Caching {attachment.file_name}
      </div>
    );
  }
  if (type.startsWith("audio/")) {
    return (
      <>
        <audio
          src={localUrl}
          controls
          preload="metadata"
          onContextMenu={menu.onContextMenu}
          className="h-10 max-w-full"
        />
        {menu.menu}
      </>
    );
  }
  return (
    <>
      <div
        onContextMenu={menu.onContextMenu}
        className="inline-flex max-w-full items-center gap-2 rounded-[12px] bg-[var(--sig-fill)] px-3 py-2 text-[13px]"
      >
        <File className="h-4 w-4 shrink-0" />
        <span className="truncate">{attachment.file_name}</span>
        {/* Save and Open in browser, rather than the row being one dead
            `<a download>` — WKWebView never honoured that anchor. */}
        <AssetActionButtons
          url={localUrl}
          fileName={attachment.file_name}
          variant="inline"
          className="ms-1 shrink-0"
        />
      </div>
      {menu.menu}
    </>
  );
}
