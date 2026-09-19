"use client";

import { historyCopy } from "@/lib/history/copy";
import type { ImportTickView, ImportView } from "@/store/history-import-store";

function formatBytes(bytes: number) {
  if (bytes >= 1 << 30) return `${(bytes / (1 << 30)).toFixed(1)} GB`;
  if (bytes >= 1 << 20) return `${Math.round(bytes / (1 << 20))} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** One honest line for whatever state the import is in. */
export default function ImportStatus({
  view,
  tick,
  language,
}: {
  view: ImportView;
  tick: ImportTickView;
  language?: string | null;
}) {
  const t = (key: Parameters<typeof historyCopy>[1], vars?: Record<string, string | number>) =>
    historyCopy(language, key, vars);
  const lines: string[] = [];
  const inventory = view.inventory;
  if (view.status === "waiting") lines.push(t("compareCode"), t("updateRequired"));
  if (view.status === "receiving") {
    if (!inventory) lines.push(t("preparing"));
    else lines.push(t("estimate", { size: formatBytes(inventory.file_bytes + inventory.message_bytes_estimate) }));
    if (view.messagesDone && inventory) {
      lines.push(t("messagesReady", { done: view.counts.filesReady, total: inventory.files }));
    } else if (tick && tick.kind === "messages") {
      lines.push(t("importingMessages", { done: tick.held, total: tick.chunks }));
    }
    lines.push(t("keepOpen"));
  }
  if (view.status === "paused") {
    lines.push(
      view.pauseReason === "space" ? t("pausedSpace") : view.pauseReason === "phone" ? t("pausedPhone") : t("pausedOffline"),
    );
  }
  if (view.status === "expired") lines.push(t("expired"));
  if (view.status === "cancelled") lines.push(t("cancelled"));
  if (view.status === "failed") lines.push(t("failed", { reason: view.error || "—" }));
  if (view.status === "finished") {
    lines.push(t("finished"));
    const unavailable = view.counts.filesUnavailable;
    if (unavailable > 0) lines.push(t("unavailableFiles", { count: unavailable }));
  }
  return (
    <div className="space-y-1.5 text-sm leading-6 text-[var(--sig-label-2)]">
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}
