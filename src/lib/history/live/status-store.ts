import { create } from "zustand";

/**
 * What the chat shows about the phone: nothing while there is no link,
 * "Connecting to your phone…", connected, or "Open AbabilX on your phone".
 */
export type LiveStatus = "none" | "waiting" | "connecting" | "connected" | "offline";

type LiveState = {
  status: LiveStatus;
  deviceName: string;
  /** Conversations whose history the phone has said ends here. */
  ended: Record<string, true>;
  /** Conversations the phone's hello named: the only ones it can add to. */
  phoneChats: Record<string, true>;
  /** Conversation ids with a phone page in flight (scroll spinner). */
  loading: Record<string, true>;
  set: (patch: Partial<Omit<LiveState, "set">>) => void;
};

export const useLiveHistoryStore = create<LiveState>((set) => ({
  status: "none",
  deviceName: "",
  ended: {},
  phoneChats: {},
  loading: {},
  set: (patch) => set(patch),
}));
