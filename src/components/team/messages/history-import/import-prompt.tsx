"use client";

import { useState } from "react";
import { Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { historyCopy } from "@/lib/history/copy";
import { useChatStore } from "@/store/chat-store";
import { useHistoryImportStore } from "@/store/history-import-store";
import { useHistorySyncStore } from "@/store/history-sync-store";

const dismissKey = (userId: string) => `ababilx_history_import_prompt_dismissed:${userId}`;

function readDismissed(userId: string) {
  try {
    return localStorage.getItem(dismissKey(userId)) === "1";
  } catch {
    return false;
  }
}

/**
 * Offered once the first pass over the server's history has settled — an
 * empty history included, which is exactly when the phone matters most.
 * "Not now" is remembered per browser (a convenience, not state); the import
 * stays reachable from the account menu either way.
 */
export default function ImportPrompt({ language }: { language?: string | null }) {
  const userId = useChatStore((s) => s.currentUserId);
  const settled = useHistorySyncStore((s) => s.settledOnce || s.server.phase === "settled");
  const server = useHistorySyncStore((s) => s.server);
  const view = useHistoryImportStore((s) => s.view);
  const setOpen = useHistoryImportStore((s) => s.setOpen);
  const [dismissed, setDismissed] = useState(() => (userId ? readDismissed(userId) : false));
  const t = (key: Parameters<typeof historyCopy>[1]) => historyCopy(language, key);

  const running = view && (view.status === "receiving" || view.status === "waiting" || view.status === "paused");
  if (!userId || (!running && (dismissed || !settled || view?.status === "finished"))) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-[var(--sig-border)] bg-[var(--sig-surface-2,var(--sig-bg))] p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <Smartphone className="mt-0.5 size-5 shrink-0 text-[var(--sig-label)]" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--sig-label)]">{t("importTitle")}</p>
          <p className="mt-1 text-xs leading-5 text-[var(--sig-label-2)]">
            {running ? t("keepOpen") : server.messages === 0 && server.total > 0 ? t("serverEmpty") : t("importBody")}
          </p>
          {server.failed > 0 && !running ? (
            <p className="mt-1 text-xs text-[var(--sig-label-2)]">{t("serverRetry")}</p>
          ) : null}
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => setOpen(true)}>
              {running ? t("resume") : t("importStart")}
            </Button>
            {!running ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  try {
                    localStorage.setItem(dismissKey(userId), "1");
                  } catch {
                    /* private window: just hide it for now */
                  }
                  setDismissed(true);
                }}
              >
                {t("importLater")}
              </Button>
            ) : null}
          </div>
        </div>
        {!running ? (
          <button type="button" aria-label={t("importLater")} className="text-[var(--sig-label-2)]" onClick={() => setDismissed(true)}>
            <X className="size-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
