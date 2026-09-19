"use client";

import { useState } from "react";
import { LoaderCircle, Play } from "lucide-react";
import type { ChatMessageAttachment } from "@/lib/api";
import { useLocalAssetState } from "./use-local-asset";
import UnavailableMedia from "./unavailable-media";
import { useAssetMenu } from "@/components/shared/use-asset-menu";
import { chatMediaFrame, chatMediaPlaceholder } from "./chat-media-size";

function isVideo(attachment: ChatMessageAttachment) {
  return (attachment.content_type ?? "").toLowerCase().startsWith("video/");
}

/** A lone photo or video keeps its own ratio instead of joining a mosaic. */
export default function SingleMedia({ attachment }: { attachment: ChatMessageAttachment }) {
  const asset = useLocalAssetState(attachment.file_url);
  const localUrl = asset.src;
  const [broken, setBroken] = useState(false);
  const menu = useAssetMenu({
    url: localUrl,
    fileName: attachment.file_name,
    kind: isVideo(attachment) ? "video" : "image",
  });

  if (broken && asset.unavailable) return <UnavailableMedia className={chatMediaPlaceholder} />;
  if (!localUrl) {
    return (
      <span className={chatMediaPlaceholder}>
        <LoaderCircle className="h-4 w-4 animate-spin text-white/70" />
      </span>
    );
  }
  if (isVideo(attachment)) {
    return (
      <span className="relative block w-full" onContextMenu={menu.onContextMenu}>
        {menu.menu}
        <video
          src={localUrl}
          preload="metadata"
          muted
          playsInline
          onError={() => setBroken(true)}
          className={chatMediaFrame}
        />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/55">
            <Play className="h-5 w-5 fill-white text-white" />
          </span>
        </span>
      </span>
    );
  }
  return (
    <>
      <img
        src={localUrl}
        alt={attachment.file_name}
        loading="lazy"
        onError={() => setBroken(true)}
        onContextMenu={menu.onContextMenu}
        className={chatMediaFrame}
      />
      {menu.menu}
    </>
  );
}
