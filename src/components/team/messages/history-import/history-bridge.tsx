"use client";

import { useEffect } from "react";
import { historyEnabled } from "@/lib/history/flag";
import { useChatStore } from "@/store/chat-store";
import { useServerHistorySync } from "./use-server-history-sync";
import { restoreImport } from "./import-controller";
import ImportDialog from "./import-dialog";
import ImportPrompt from "./import-prompt";

/**
 * Mounted once, past the vault gate: the background server read, the phone
 * import prompt and dialog, and picking an interrupted import back up.
 */
export default function HistoryBridge({ language }: { language?: string | null }) {
  useServerHistorySync();
  const userId = useChatStore((s) => s.currentUserId);
  useEffect(() => {
    if (userId && historyEnabled()) void restoreImport(userId);
  }, [userId]);
  if (!historyEnabled()) return null;
  return (
    <>
      <ImportPrompt language={language} />
      <ImportDialog language={language} />
    </>
  );
}
