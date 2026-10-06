"use client";

import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

function fileSize(bytes: number) {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Stands in for an encrypted file that has not been fetched: one too large to
 * download unasked, or one whose download failed. An encrypted file has no
 * address a browser can draw, so until it is fetched and decrypted here this
 * button is all there is of it.
 *
 * A `span`, not a `button`, where it sits inside a tile that is already one —
 * the click is kept from the tile, which would otherwise open a viewer on
 * nothing.
 */
export default function AttachmentFetchButton({
  sizeBytes,
  onFetch,
  variant = "tile",
  className,
}: {
  sizeBytes: number;
  onFetch: () => void;
  /** `tile` sits on a dark media placeholder; `row` in a line of text. */
  variant?: "tile" | "row";
  className?: string;
}) {
  const size = fileSize(sizeBytes);
  const activate = (event: React.SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onFetch();
  };
  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={size ? `Download, ${size}` : "Download"}
      onClick={activate}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") activate(event);
      }}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-full text-[12px] font-medium",
        variant === "tile"
          ? "bg-black/55 px-3 py-1.5 text-white hover:bg-black/70"
          : "bg-[var(--sig-fill-strong)] px-2.5 py-1 text-[var(--sig-label)] hover:opacity-80",
        className,
      )}
    >
      <Download className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {size || "Download"}
    </span>
  );
}
