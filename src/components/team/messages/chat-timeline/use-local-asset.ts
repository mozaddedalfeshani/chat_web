"use client";

import { useEffect, useState } from "react";
import { useChatStore } from "@/store/chat-store";
import {
  peekLocalAsset,
  resolveLocalAsset,
  type LocalAsset,
} from "@/lib/history/media/local-asset";
import { historyEnabled } from "@/lib/history/flag";

/**
 * The address an attachment is drawn from: this browser's imported copy when
 * there is one (history older than the server keeps lives nowhere else), the
 * CDN URL otherwise. Null while that is being decided — one IndexedDB read.
 */
export function useLocalAsset(url: string | null | undefined): string | null {
  return useLocalAssetState(url).src;
}

export function useLocalAssetState(url: string | null | undefined): LocalAsset {
  const userId = useChatStore((s) => s.currentUserId);
  const target = url || "";
  const [state, setState] = useState<{ key: string; asset: LocalAsset | undefined }>(() => ({
    key: `${userId}|${target}`,
    asset: peekLocalAsset(userId, target),
  }));
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const refresh = () => setVersion((v) => v + 1);
    window.addEventListener("ababilx:history-files", refresh);
    return () => window.removeEventListener("ababilx:history-files", refresh);
  }, []);

  const enabled = historyEnabled();

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void resolveLocalAsset(userId, target).then((asset) => {
      if (!cancelled) setState({ key: `${userId}|${target}`, asset });
    });
    return () => {
      cancelled = true;
    };
  }, [userId, target, version, enabled]);

  // Off: exactly the old behaviour — the CDN URL, synchronously.
  if (!enabled) return { src: target || null, unavailable: false };
  const current = state.key === `${userId}|${target}` ? state.asset : undefined;
  return current ?? { src: null, unavailable: false };
}
