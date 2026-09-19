"use client";

import { useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { LoaderCircle } from "lucide-react";
import type { ChatMessageAttachment } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useSaveAttachment } from "./use-save-attachment";
import {
  IMAGE_PREVIEW_ZOOM_SCALE,
  useImagePreviewZoom,
} from "@/components/shared/use-image-preview-zoom";
import { useLocalAsset } from "./use-local-asset";
import { useAssetMenu } from "@/components/shared/use-asset-menu";
import { openExternal } from "@/lib/files/asset-actions";
import MediaLightboxHeader from "./media-lightbox-header";
import MediaLightboxThumbnails from "./media-lightbox-thumbnails";
import MediaLightboxNav from "./media-lightbox-nav";

function isVideo(attachment: ChatMessageAttachment) {
  return (attachment.content_type ?? "").toLowerCase().startsWith("video/");
}

/**
 * Signal Desktop's lightbox (`Lightbox.dom.tsx` + `Lightbox.scss`): a black
 * surface, a header naming the sender and the moment, the object centred in
 * the space left over, and a strip of thumbnails underneath when the message
 * carried more than one.
 *
 * The picture is the copy this machine already holds — the same `blob:` the
 * bubble drew — so opening it fetches nothing, and Save writes those bytes out
 * rather than asking the CDN for them again. Open in browser sends the file's
 * own address to the default browser, which is the one action that has to use
 * the remote URL: the browser cannot read this app's blob.
 *
 * Colours are the theme's tokens. Signal forces its lightbox dark because it
 * owns the window; ours is one surface inside a themed app.
 */
export default function MediaLightbox({
  items,
  index,
  onIndexChange,
  onClose,
  senderName,
  senderAvatarUrl,
  sentAt,
}: {
  items: ChatMessageAttachment[];
  index: number;
  onIndexChange: (next: number) => void;
  onClose: () => void;
  senderName?: string;
  senderAvatarUrl?: string;
  sentAt?: string;
}) {
  const current = items[index];
  const localUrl = useLocalAsset(current?.file_url ?? "");
  const video = current ? isVideo(current) : false;
  const { save, saving, toast } = useSaveAttachment(
    localUrl ?? "",
    current?.file_name,
  );
  const menu = useAssetMenu({
    url: localUrl,
    fileName: current?.file_name,
    kind: video ? "video" : "image",
  });

  const {
    zoomed,
    pan,
    viewportRef,
    handleViewportMouseMove,
    handleViewportMouseLeave,
    handleImageClick,
  } = useImagePreviewZoom(true, index);

  const step = useCallback(
    (delta: number) => {
      if (items.length <= 1) return;
      onIndexChange((index + delta + items.length) % items.length);
    },
    [index, items.length, onIndexChange],
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, step]);

  if (!current) return null;

  // Signal fades the chrome away while the picture is zoomed, so nothing sits
  // on top of the part being looked at.
  const chrome = zoomed ? "pointer-events-none opacity-0" : "opacity-100";

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex flex-col"
      style={{ background: "var(--sig-bg)" }}
      onClick={onClose}
      role="presentation"
    >
      {/* Clicking the black surface closes, which is Signal's behaviour; the
          parts that do something of their own keep their own click. */}
      <div className="flex min-h-[50px] flex-grow flex-col">
        <div
          className={cn("transition-opacity duration-150", chrome)}
          onClick={(e) => e.stopPropagation()}
        >
          <MediaLightboxHeader
            senderName={senderName}
            senderAvatarUrl={senderAvatarUrl}
            sentAt={sentAt}
            onSave={save}
            onOpen={() => localUrl && void openExternal(localUrl)}
            onClose={onClose}
            saving={saving || !localUrl}
          />
        </div>

        <div
          ref={viewportRef}
          onMouseMove={handleViewportMouseMove}
          onMouseLeave={handleViewportMouseLeave}
          className="relative flex flex-grow items-center justify-center overflow-hidden"
        >
          {!localUrl ? (
            <LoaderCircle
              className="h-6 w-6 animate-spin"
              style={{ color: "var(--sig-label-2)" }}
            />
          ) : video ? (
            <video
              src={localUrl}
              controls
              autoPlay
              onContextMenu={menu.onContextMenu}
              onClick={(e) => e.stopPropagation()}
              className="max-h-full max-w-full object-contain outline-none"
            />
          ) : (
            <img
              src={localUrl}
              alt={current.file_name}
              draggable={false}
              onContextMenu={menu.onContextMenu}
              onClick={(e) => {
                e.stopPropagation();
                handleImageClick();
              }}
              className={cn(
                "max-h-full max-w-full select-none object-contain outline-none",
                zoomed ? "cursor-zoom-out" : "cursor-zoom-in",
              )}
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomed ? IMAGE_PREVIEW_ZOOM_SCALE : 1})`,
                transition: "transform 150ms ease-out",
              }}
            />
          )}

          {items.length > 1 && !zoomed ? <MediaLightboxNav onStep={step} /> : null}

          {menu.menu}

          {toast ? (
            <div
              className="pointer-events-none absolute bottom-11 rounded-lg px-3 py-[7px] text-[12px]"
              style={{ background: "var(--sig-surface-3)", color: "var(--sig-label)" }}
            >
              {toast}
            </div>
          ) : null}
        </div>
      </div>

      <div
        className={cn("px-4 pb-6 pt-4 transition-opacity duration-150", chrome)}
        onClick={(e) => e.stopPropagation()}
      >
        <MediaLightboxThumbnails items={items} index={index} onSelect={onIndexChange} />
      </div>
    </div>,
    document.body,
  );
}
