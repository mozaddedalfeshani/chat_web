"use client";

import { useChatStore } from "@/store/chat-store";
import type { LocalAsset } from "@/lib/history/media/local-asset";
import { fetchFileFromPhone, usePhoneFiles } from "@/lib/history/live/files";

/**
 * An attachment that came from the phone over a live history link: its server
 * copy is gone, so until this browser holds it the bubble shows a download
 * button that asks the phone (WhatsApp's tap-to-download on a linked device).
 * Null when this attachment is not the phone's or is already here.
 */
export function usePhoneAsset(url: string, fromPhone: boolean, local: LocalAsset) {
  const userId = useChatStore((s) => s.currentUserId);
  const state = usePhoneFiles((s) => (url ? s.files[url] : undefined));
  // Held here already: the imported copy's address is this browser's own.
  const held = !!local.src && local.src !== url;
  if (!fromPhone || !url || held || local.unavailable) return null;
  if (state?.status === "loading") return { src: null, unavailable: false };
  if (state?.status === "missing") return { src: null, unavailable: true };
  return {
    src: null,
    unavailable: false,
    fetch: () => void fetchFileFromPhone(userId, url),
  };
}
