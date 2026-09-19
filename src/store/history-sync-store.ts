import { create } from "zustand";
import type { ServerSyncStatus } from "@/lib/history/sync/server-sync";

/**
 * Progress of the durable history, for the UI. In memory only: the durable
 * facts (cursors, the settled flag, transfer jobs) live in IndexedDB, and this
 * is rebuilt from them on every load.
 */
type HistorySyncState = {
  server: ServerSyncStatus;
  /** True once any full server pass has settled for this account, ever. */
  settledOnce: boolean;
  setServer: (status: ServerSyncStatus) => void;
  setSettledOnce: (value: boolean) => void;
  reset: () => void;
};

const IDLE: ServerSyncStatus = {
  phase: "idle", total: 0, done: 0, empty: 0, failed: 0, messages: 0,
};

export const useHistorySyncStore = create<HistorySyncState>((set) => ({
  server: IDLE,
  settledOnce: false,
  setServer: (server) =>
    set((state) => ({ server, settledOnce: state.settledOnce || server.phase === "settled" })),
  setSettledOnce: (settledOnce) => set({ settledOnce }),
  reset: () => set({ server: IDLE, settledOnce: false }),
}));
