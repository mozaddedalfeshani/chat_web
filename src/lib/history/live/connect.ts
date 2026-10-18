import { subscribeAppWs } from "@/lib/notifications/ws-bus";
import { liveApi } from "./api";
import { LiveClient, type Hello } from "./client";
import { LivePeer } from "./peer";
import type { WireSignal } from "./signal-seal";
import { useLiveHistoryStore } from "./status-store";

/**
 * One connection to the phone per tab, opened when something needs it and
 * dropped when the phone goes away. `connectToPhone` resolves once the data
 * channel is open, or rejects after CONNECT_MS — the caller then says "open
 * AbabilX on your phone", which is the honest answer when it is closed.
 */
export type StoredLink = { id: string; key: CryptoKey; deviceName: string; windowDays: number };

const CONNECT_MS = 15000;
const WAKE_EVERY_MS = 3500;

let current: { link: StoredLink; peer: LivePeer; client: LiveClient | null; unsubscribe: () => void } | null = null;
let connecting: Promise<LiveClient> | null = null;
let helloHandler: (hello: Hello) => void = () => {};

export function onPhoneHello(handler: (hello: Hello) => void) {
  helloHandler = handler;
}

export function liveClient(): LiveClient | null {
  return current?.client?.open ? current.client : null;
}

export function connectToPhone(link: StoredLink): Promise<LiveClient> {
  const open = liveClient();
  if (open && current?.link.id === link.id) return Promise.resolve(open);
  connecting ??= dial(link).finally(() => {
    connecting = null;
  });
  return connecting;
}

export function disconnectPhone() {
  current?.client?.close();
  current?.peer.close();
  current?.unsubscribe();
  current = null;
}

async function dial(link: StoredLink): Promise<LiveClient> {
  const store = useLiveHistoryStore.getState();
  store.set({ status: "connecting", deviceName: link.deviceName });
  // Fresh TURN credentials every time: they are short-lived.
  const info = await liveApi.link(link.id);
  // A connection that timed out stays listening (a late offer still lands);
  // dialling again replaces it.
  disconnectPhone();
  return new Promise<LiveClient>((resolve, reject) => {
    let settled = false;
    const finish = (client: LiveClient | null, error?: Error) => {
      if (settled) return;
      settled = true;
      clearInterval(waker);
      clearTimeout(deadline);
      if (client) resolve(client);
      else {
        useLiveHistoryStore.getState().set({ status: "offline" });
        reject(error ?? new Error("phone_offline"));
      }
    };
    const peer = new LivePeer(link.id, link.key, info.ice_servers ?? [], {
      onChannel: (channel) => {
        const client = new LiveClient(channel, (hello) => helloHandler(hello), () => {
          if (current?.client === client) {
            current.client = null;
            useLiveHistoryStore.getState().set({ status: "offline" });
          }
        });
        if (current) current.client = client;
        console.info("[history-live] channel open");
        useLiveHistoryStore.getState().set({ status: "connected" });
        finish(client);
      },
      onClosed: () => finish(null),
    });
    const unsubscribe = subscribeAppWs({
      onEvent: (ev) => {
        const event = ev as { type: string; id?: string; history_signal?: WireSignal };
        if (event.type === "history.signal" && event.id === link.id && event.history_signal) {
          void peer.signal(event.history_signal);
        }
      },
    });
    current = { link, peer, client: null, unsubscribe };
    console.info(`[history-live] waking phone, link ${link.id}`);
    peer.wake();
    // Once the phone has offered, waking again would make it start over.
    const waker = setInterval(() => {
      if (!peer.offered) peer.wake();
    }, WAKE_EVERY_MS);
    const deadline = setTimeout(() => finish(null), CONNECT_MS);
  });
}
