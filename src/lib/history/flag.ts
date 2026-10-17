import { useDeliveryOnlyStore } from "@/lib/delivery-only/delivery-only-store";

/**
 * Whether this browser keeps the durable history (IndexedDB) and offers the
 * phone import.
 *
 * On whenever the server is delivery-only (`/api/me` `delivery_only`, always
 * true since 0173): the server lets a message go once every custody device has
 * it, so a browser that kept no copy would lose its chats on reload. A linked
 * browser (server 0174, `lib/linked-device`) is one of those custody devices
 * and reads its timeline from here. `NEXT_PUBLIC_HISTORY_IMPORT=1` still
 * forces it on, for development against a server without `delivery_only`.
 */
export function historyEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_HISTORY_IMPORT === "1" ||
    useDeliveryOnlyStore.getState().deliveryOnly
  );
}

/** historyEnabled for render: re-renders when `/api/me` turns it on. */
export function useHistoryEnabled(): boolean {
  const deliveryOnly = useDeliveryOnlyStore((s) => s.deliveryOnly);
  return process.env.NEXT_PUBLIC_HISTORY_IMPORT === "1" || deliveryOnly;
}
