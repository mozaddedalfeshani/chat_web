"use client";

import type { ChatMessageAttachment } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAttachmentAsset } from "./use-attachment-asset";

function isVideo(attachment: ChatMessageAttachment) {
  return (attachment.content_type ?? "").toLowerCase().startsWith("video/");
}

/** One 44px square of Signal's `Lightbox__thumbnail`: 6px corners, 8px apart,
 * dimmed until it is the one on screen, which takes a 2px inset white ring. */
function Thumbnail({
  attachment,
  selected,
  onSelect,
}: {
  attachment: ChatMessageAttachment;
  selected: boolean;
  onSelect: () => void;
}) {
  const localUrl = useAttachmentAsset(attachment).src;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={attachment.file_name}
      className={cn(
        "relative me-2 h-11 w-11 shrink-0 overflow-hidden rounded-md",
        "bg-[var(--sig-fill)]",
        // Signal rings the current one in white; the theme's own label colour
        // is white in dark and near-black in light, so it reads either way.
        selected && "ring-2 ring-inset ring-[var(--sig-label)]",
      )}
    >
      {!localUrl ? null : isVideo(attachment) ? (
        <video
          src={localUrl}
          muted
          preload="metadata"
          className="h-full w-full object-cover opacity-80"
        />
      ) : (
        <img src={localUrl} alt="" className="h-full w-full object-contain opacity-80" />
      )}
    </button>
  );
}

export default function MediaLightboxThumbnails({
  items,
  index,
  onSelect,
}: {
  items: ChatMessageAttachment[];
  index: number;
  onSelect: (next: number) => void;
}) {
  if (items.length <= 1) return null;
  return (
    <div className="flex h-11 items-center justify-center">
      {items.map((attachment, i) => (
        <Thumbnail
          key={attachment.id}
          attachment={attachment}
          selected={i === index}
          onSelect={() => onSelect(i)}
        />
      ))}
    </div>
  );
}
