"use client";

import { useEffect, useRef } from "react";
import { useChatStore } from "@/store/chat-store";
import { useHistorySyncStore } from "@/store/history-sync-store";
import { startServerHistorySync, SERVER_SYNC_SETTLED } from "@/lib/history/sync/server-sync";
import { readMeta } from "@/lib/history/repo/cursors";
import { deleteOtherAccountsHistory } from "@/lib/history/repo/wipe";
import { useHistoryEnabled } from "@/lib/history/flag";

/**
 * Starts the background server read once per signed-in account per page load,
 * after the vault is unlocked (this hook only mounts past the vault gate) and
 * the conversation list has loaded — an empty list included, which settles at
 * once and is a valid "no server history" answer.
 */
export function useServerHistorySync() {
  const userId = useChatStore((s) => s.currentUserId);
  const fetchedAt = useChatStore((s) => s.sidebarFetchedAt);
  const setServer = useHistorySyncStore((s) => s.setServer);
  const setSettledOnce = useHistorySyncStore((s) => s.setSettledOnce);
  const enabled = useHistoryEnabled();
  const startedFor = useRef("");
  const stopSync = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!userId || !enabled) return;
    // One account's history per browser: another account's copy left behind
    // after a switch is removed as soon as this one is signed in.
    void deleteOtherAccountsHistory(userId).catch(() => {});
    void readMeta<{ at: number }>(userId, SERVER_SYNC_SETTLED)
      .then((value) => setSettledOnce(!!value))
      .catch(() => {});
  }, [userId, enabled, setSettledOnce]);

  // Later sidebar refreshes (every conversation.updated event) must not
  // restart a pass that is running; only a new account or unmount stops it.
  useEffect(() => {
    if (!userId || !fetchedAt || startedFor.current === userId || !enabled) return;
    startedFor.current = userId;
    const { dms, channels } = useChatStore.getState();
    const conversations = [...dms, ...channels].filter((c) => !c.local_only);
    stopSync.current = startServerHistorySync(userId, conversations, setServer);
  }, [userId, fetchedAt, enabled, setServer]);

  useEffect(
    () => () => {
      stopSync.current?.();
      stopSync.current = null;
      startedFor.current = "";
    },
    [userId],
  );
}
