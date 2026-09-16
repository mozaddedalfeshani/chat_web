"use client";

import { useState } from "react";
import { LoaderCircle, Play } from "lucide-react";
import type { ChatMessageAttachment } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useLocalAsset } from "./use-local-asset";
import MediaLightbox from "./media-lightbox";
import { useAssetMenu } from "@/components/shared/use-asset-menu";
import SingleMedia from "./chat-media-single";

export function isMediaAttachment(attachment: ChatMessageAttachment) {
  const type = (attachment.content_type ?? "").toLowerCase();
  return type.startsWith("image/") || type.startsWith("video/");
}

function isVideo(attachment: ChatMessageAttachment) {
  return (attachment.content_type ?? "").toLowerCase().startsWith("video/");
}

/** Signal's album shapes: 1 keeps its own ratio, 2 splits, 3 is one tall tile
 * plus a stack, 4 is a square, 5+ is 2 over 3 with the rest folded into "+N". */
const MAX_TILES = 5;

function tileClass(count: number, index: number) {
  if (count === 2) return "col-span-3 row-span-2";
  if (count === 3) return index === 0 ? "col-span-3 row-span-2" : "col-span-3 row-span-1";
  if (count === 4) return "col-span-3 row-span-1";
  return index < 2 ? "col-span-3 row-span-1" : "col-span-2 row-span-1";
}

function MediaTile({
  attachment,
  className,
  overflow,
  onOpen,
}: {
  attachment: ChatMessageAttachment;
  className?: string;
  /** Count folded into this tile, Signal's "+N" cover on the last cell. */
  overflow?: number;
  onOpen: () => void;
}) {
  const localUrl = useLocalAsset(attachment.file_url);
  const video = isVideo(attachment);
  // Right-click answers about the picture under the cursor, not the bubble
  // around it — Save, Copy, Open in browser.
  const menu = useAssetMenu({
    url: attachment.file_url,
    fileName: attachment.file_name,
    kind: video ? "video" : "image",
  });

  return (
    <button
      type="button"
      onClick={onOpen}
      onContextMenu={menu.onContextMenu}
      aria-label={`Open ${attachment.file_name}`}
      className={cn(
        "group/tile relative min-h-0 min-w-0 overflow-hidden bg-black/20",
        className,
      )}
    >
      {localUrl ? (
        video ? (
          <video
            src={localUrl}
            preload="metadata"
            muted
            playsInline
            className="h-full w-full object-cover"
          />
        ) : (
          <img
            src={localUrl}
            alt={attachment.file_name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-200 group-hover/tile:scale-[1.02]"
          />
        )
      ) : (
        <span className="flex h-full w-full items-center justify-center">
          <LoaderCircle className="h-4 w-4 animate-spin text-white/70" />
        </span>
      )}

      {video && !overflow ? (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/55">
            <Play className="h-4 w-4 fill-white text-white" />
          </span>
        </span>
      ) : null}

      {overflow ? (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/55 text-[18px] font-semibold text-white">
          +{overflow}
        </span>
      ) : null}

      {menu.menu}
    </button>
  );
}

/** Images and video in one message render as a Signal-style album — a single
 * mosaic — instead of one attachment per row. */
export default function ChatMediaGrid({
  attachments,
  className,
  flush = false,
  senderName,
  senderAvatarUrl,
  sentAt,
}: {
  attachments: ChatMessageAttachment[];
  className?: string;
  /** Media-bubble: no inner radius — the bubble already clips. */
  flush?: boolean;
  /** Who sent it and when — Signal's lightbox names both above the picture. */
  senderName?: string;
  senderAvatarUrl?: string;
  sentAt?: string;
}) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const usable = attachments.filter((a) => !a.locked && a.file_url);
  if (usable.length === 0) {
    return <p className="text-xs text-[var(--sig-label-2)]">Attachment unavailable</p>;
  }

  const tiles = usable.slice(0, MAX_TILES);
  const hidden = usable.length - tiles.length;
  const single = tiles.length === 1;

  return (
    <>
      {single ? (
        <button
          type="button"
          onClick={() => setViewerIndex(0)}
          aria-label={`Open ${tiles[0].file_name}`}
          className={cn(
            "block w-full overflow-hidden",
            !flush && "rounded-[12px]",
            className,
          )}
        >
          <SingleMedia attachment={tiles[0]} />
        </button>
      ) : (
        <div
          className={cn(
            "grid aspect-[4/3] w-full gap-[2px] overflow-hidden",
            "grid-cols-6 grid-rows-2",
            !flush && "rounded-[12px]",
            className,
          )}
        >
          {tiles.map((attachment, i) => (
            <MediaTile
              key={attachment.id}
              attachment={attachment}
              className={tileClass(tiles.length, i)}
              overflow={hidden > 0 && i === tiles.length - 1 ? hidden : undefined}
              onOpen={() => setViewerIndex(i)}
            />
          ))}
        </div>
      )}

      {viewerIndex !== null ? (
        <MediaLightbox
          items={usable}
          index={viewerIndex}
          onIndexChange={setViewerIndex}
          onClose={() => setViewerIndex(null)}
          senderName={senderName}
          senderAvatarUrl={senderAvatarUrl}
          sentAt={sentAt}
        />
      ) : null}
    </>
  );
}
