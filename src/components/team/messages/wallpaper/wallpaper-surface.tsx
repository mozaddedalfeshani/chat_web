"use client";

import type { ReactNode } from "react";
import {
  useChatWallpaper,
  wallpaperBackground,
  wallpaperIsThemePair,
} from "@/lib/chat/chat-wallpaper";
import { useIsDark } from "./use-is-dark";

/**
 * Paints a conversation's wallpaper behind the timeline.
 *
 * Theme-pair presets swap art with brightness. Other presets/photos may dim
 * in dark theme via a black overlay (Signal's model).
 */
export default function WallpaperSurface({
  conversationId,
  children,
}: {
  conversationId: string | null;
  children: ReactNode;
}) {
  const wallpaper = useChatWallpaper(conversationId);
  const dark = useIsDark();
  const background = wallpaperBackground(wallpaper, dark);
  const themePair = wallpaperIsThemePair(wallpaper);
  const dim = wallpaper.dim && dark && !themePair;

  if (!background) return <>{children}</>;

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col"
      style={{ background }}
    >
      {dim ? (
        <div
          className="pointer-events-none absolute inset-0 bg-black/35"
          aria-hidden
        />
      ) : null}
      <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
