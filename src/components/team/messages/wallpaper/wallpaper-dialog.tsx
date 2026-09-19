"use client";

import { Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  chatWallpaperPresets,
  isThemePairPreset,
  presetBackground,
} from "@/lib/chat/chat-wallpaper-presets";
import {
  getChatWallpaperOverride,
  noWallpaper,
  setChatWallpaperOverride,
  setGlobalWallpaper,
  useChatWallpaper,
  wallpaperIsThemePair,
} from "@/lib/chat/chat-wallpaper";
import { useIsDark } from "./use-is-dark";

/** Picker behind "Chat color & wallpaper". Choices apply immediately. */
export default function WallpaperDialog({
  conversationId,
  open,
  onOpenChange,
}: {
  conversationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const wallpaper = useChatWallpaper(conversationId);
  const hasOverride = getChatWallpaperOverride(conversationId) !== null;
  const dark = useIsDark();
  const themePair = wallpaperIsThemePair(wallpaper);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Chat color &amp; wallpaper</DialogTitle>
          <DialogDescription>
            Kept on this device — never synced or sent to the server.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-6 gap-2">
          <button
            type="button"
            aria-label="No background"
            onClick={() =>
              setChatWallpaperOverride(conversationId, noWallpaper)
            }
            className="flex aspect-square items-center justify-center rounded-[10px] border border-[var(--sig-divider)] text-[11px] text-[var(--sig-label-2)]"
          >
            {wallpaper.kind === "none" ? (
              <Check className="h-4 w-4" />
            ) : (
              "None"
            )}
          </button>
          {chatWallpaperPresets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              aria-label={preset.id}
              onClick={() =>
                setChatWallpaperOverride(conversationId, {
                  kind: "preset",
                  preset: preset.id,
                  photo: "",
                  dim: isThemePairPreset(preset) ? false : wallpaper.dim,
                })
              }
              className="flex aspect-square items-center justify-center rounded-[10px]"
              style={{ background: presetBackground(preset, dark) }}
            >
              {wallpaper.kind === "preset" &&
              wallpaper.preset === preset.id ? (
                <Check className="h-4 w-4 text-white drop-shadow" />
              ) : null}
            </button>
          ))}
        </div>

        {wallpaper.kind !== "none" && !themePair ? (
          <button
            type="button"
            onClick={() =>
              setChatWallpaperOverride(conversationId, {
                ...wallpaper,
                dim: !wallpaper.dim,
              })
            }
            className="flex items-center gap-2 text-[13px] text-[var(--sig-label)]"
          >
            <span
              className="flex h-4 w-4 items-center justify-center rounded-[4px] border border-[var(--sig-divider)]"
              style={{
                background: wallpaper.dim
                  ? "var(--sig-accent)"
                  : "transparent",
              }}
            >
              {wallpaper.dim ? (
                <Check className="h-3 w-3 text-white" />
              ) : null}
            </span>
            Dim in dark theme
          </button>
        ) : null}

        <DialogFooter>
          {hasOverride ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setChatWallpaperOverride(conversationId, null)}
            >
              Reset to default
            </Button>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            onClick={() => setGlobalWallpaper(wallpaper)}
          >
            Set for all chats
          </Button>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
