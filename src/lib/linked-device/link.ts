import { create } from "zustand";
import { api, ApiError } from "@/lib/api";
import type { LinkedDeviceInfo } from "@/lib/api/user/linked-device";
import { useDeliveryOnlyStore } from "@/lib/delivery-only/delivery-only-store";
import { openHistoryDb } from "@/lib/history/idb/tx";
import { ensureMessagingDevice } from "@/lib/messages/device";

/**
 * Making this browser a linked device (server 0174): registered again with
 * `keeps_archive`, after which the server holds every message until it is in
 * this browser's durable store, as it does for the phones.
 *
 *   linked  the server said so (`archive_at`); custody runs
 *   limit   four devices are already linked (409, with their labels)
 *   off     cannot keep a copy (no IndexedDB, a private window), or a server
 *           without 0174 — this browser stays an ordinary tab
 */
export type LinkStatus = "idle" | "linking" | "linked" | "limit" | "off";

type LinkState = {
  status: LinkStatus;
  limit: number;
  devices: LinkedDeviceInfo[];
  deviceId: string;
  set: (next: Partial<Omit<LinkState, "set">>) => void;
};

export const useLinkedDeviceStore = create<LinkState>((set) => ({
  status: "idle",
  limit: 0,
  devices: [],
  deviceId: "",
  set: (next) => set(next),
}));

/** Links this browser; resolves to the status it settled on. */
export async function linkThisDevice(userId: string): Promise<LinkStatus> {
  const store = useLinkedDeviceStore.getState();
  store.set({ status: "linking" });
  const settle = (status: LinkStatus, extra: Partial<LinkState> = {}) => {
    useLinkedDeviceStore.getState().set({ status, ...extra });
    useDeliveryOnlyStore.getState().setLinked(status === "linked");
    return status;
  };
  try {
    // Custody is a promise that the copy is on disk. A browser that cannot
    // open its store must not make it.
    await openHistoryDb(userId);
  } catch {
    return settle("off");
  }
  try {
    const device = await ensureMessagingDevice(userId);
    const linked = await api.linkMessagingDevice({
      device_id: device.deviceId,
      platform: "web",
      public_key: device.publicKey,
    });
    return settle(linked.archive_at ? "linked" : "off", { deviceId: device.deviceId });
  } catch (error) {
    if (error instanceof ApiError && error.message === "linked_device_limit") {
      const data = (error.data.data ?? {}) as { limit?: number; devices?: LinkedDeviceInfo[] };
      return settle("limit", { limit: data.limit ?? 4, devices: data.devices ?? [] });
    }
    if (error instanceof ApiError && error.message === "session_binding_required") {
      return settle("off");
    }
    // Offline or a server error: not linked yet, tried again later.
    useLinkedDeviceStore.getState().set({ status: "idle" });
    throw error;
  }
}

export function resetLinkedDevice() {
  useLinkedDeviceStore.getState().set({ status: "idle", limit: 0, devices: [], deviceId: "" });
  useDeliveryOnlyStore.getState().setLinked(false);
}
