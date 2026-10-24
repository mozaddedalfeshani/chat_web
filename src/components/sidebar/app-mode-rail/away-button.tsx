"use client";

import { useEffect, useRef, useState } from "react";
import { Moon02Icon } from "hugeicons-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { subscribeAppWs } from "@/lib/notifications/ws-bus";
import { usePresenceStore } from "@/store/presence-store";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";

const COPY = {
  en: {
    off: "Away: look offline. You won't see who is online either.",
    on: "Away is on. Click to show as online again.",
    failed: "Could not change Away. Try again.",
  },
  bn: {
    off: "দূরে আছি: অফলাইন দেখাবে। আপনিও কে অনলাইন দেখতে পাবেন না।",
    on: "দূরে আছি চালু। আবার অনলাইন দেখাতে ক্লিক করুন।",
    failed: "দূরে আছি বদলানো যায়নি। আবার চেষ্টা করুন।",
  },
} as const;

/**
 * The rail's Away switch (same as the phone's You sheet → Away). Lit while
 * on. Follows `me.appear_offline` from the account's other devices and
 * re-reads the server after every socket reconnect.
 */
export default function AwayButton({ language }: { language: "en" | "bn" }) {
  const [away, setAway] = useState(false);
  const [busy, setBusy] = useState(false);
  const writes = useRef(0);
  const copy = COPY[language] ?? COPY.en;

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      const stamp = writes.current;
      api
        .getAppearOffline()
        .then((s) => {
          if (!cancelled && stamp === writes.current) setAway(s.enabled);
        })
        .catch(() => {});
    };
    load();
    const unsub = subscribeAppWs({
      onEvent: (ev) => {
        if (ev.type !== "me.appear_offline") return;
        const on = (ev as { appear_offline?: unknown }).appear_offline;
        if (typeof on === "boolean") setAway(on);
      },
      onReconnect: load,
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  async function toggle() {
    if (busy) return;
    const next = !away;
    const stamp = ++writes.current;
    setBusy(true);
    setAway(next);
    try {
      const saved = await api.updateAppearOffline(next);
      if (stamp === writes.current) setAway(saved.enabled);
      // Away sees nobody online; the server's empty roster follows.
      if (saved.enabled) usePresenceStore.getState().setSnapshot([]);
    } catch {
      if (stamp === writes.current) setAway(!next);
      toast.error(copy.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Tooltip content={away ? copy.on : copy.off} side="right">
      <button
        type="button"
        aria-label={away ? copy.on : copy.off}
        aria-pressed={away}
        disabled={busy}
        onClick={() => void toggle()}
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-[10px] transition-colors",
          away
            ? "bg-[var(--sig-accent)] text-white"
            : "text-[var(--sig-label-2)] hover:bg-[var(--sig-fill)] hover:text-[var(--sig-label)]",
        )}
      >
        <Moon02Icon size={20} />
      </button>
    </Tooltip>
  );
}
