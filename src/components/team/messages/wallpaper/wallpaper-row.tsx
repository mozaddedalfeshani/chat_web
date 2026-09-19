"use client";

import { useState } from "react";
import { PaintBoardIcon } from "hugeicons-react";
import {
  chatWallpaperPresetById,
  presetBackground,
} from "@/lib/chat/chat-wallpaper-presets";
import { useChatWallpaper } from "@/lib/chat/chat-wallpaper";
import WallpaperDialog from "./wallpaper-dialog";
import { useIsDark } from "./use-is-dark";

/** Opens the wallpaper picker; shows the current swatch on the right. */
export default function WallpaperRow({
  conversationId,
}: {
  conversationId: string;
}) {
  const wallpaper = useChatWallpaper(conversationId);
  const [open, setOpen] = useState(false);
  const dark = useIsDark();
  const preset =
    wallpaper.kind === "preset"
      ? chatWallpaperPresetById(wallpaper.preset)
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-white/[0.05] [data-theme=light]:hover:bg-black/[0.04]"
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--text)]"
          style={{ background: "var(--surface2)" }}
        >
          <PaintBoardIcon size={18} />
        </span>
        <span className="min-w-0 flex-1 text-sm font-medium text-[var(--text)]">
          Chat color &amp; wallpaper
        </span>
        <span
          className="block h-5 w-5 shrink-0 rounded-full border border-[var(--sig-divider)]"
          style={{
            background: preset ? presetBackground(preset, dark) : "transparent",
          }}
        />
      </button>
      <WallpaperDialog
        conversationId={conversationId}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
