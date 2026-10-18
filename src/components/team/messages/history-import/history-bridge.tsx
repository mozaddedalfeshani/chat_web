"use client";

import { useEffect } from "react";
import { useHistoryEnabled } from "@/lib/history/flag";
import { useChatStore } from "@/store/chat-store";
import { useServerHistorySync } from "./use-server-history-sync";
import { restoreImport } from "./import-controller";
import { restoreLink } from "@/lib/history/live/session";
import ImportDialog from "./import-dialog";
import ImportPrompt from "./import-prompt";

/**
 * Mounted once, past the vault gate: the background server read, the phone
 * import prompt and dialog, and picking an interrupted import back up.
 */
export default function HistoryBridge({ language }: { language?: string | null }) {
  useServerHistorySync();
  const userId = useChatStore((s) => s.currentUserId);
  const enabled = useHistoryEnabled();
  useEffect(() => {
    if (!userId || !enabled) return;
    void restoreLink(userId);
    void restoreImport(userId);
  }, [userId, enabled]);
  if (!enabled) return null;
  return (
    <>
      <ImportPrompt language={language} />
      <ImportDialog language={language} />
    </>
  );
}
