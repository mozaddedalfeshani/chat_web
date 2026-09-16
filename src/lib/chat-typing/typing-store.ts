import { create } from "zustand";

/** A typist disappears this long after their last "typing" frame. */
export const TYPING_TTL_MS = 5_000;

type Typist = { name: string; at: number };

type TypingState = {
  /** conversation id -> user id -> last frame */
  byConversation: Record<string, Record<string, Typist>>;
  /** The account's own switch. Off: send nothing, show nothing. */
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  apply: (conversationId: string, userId: string, name: string, typing: boolean) => void;
  clear: (conversationId: string, userId: string) => void;
  prune: (now: number) => void;
};

function without(map: Record<string, Typist>, userId: string) {
  const next = { ...map };
  delete next[userId];
  return next;
}

export const useTypingStore = create<TypingState>((set, get) => ({
  byConversation: {},
  enabled: true,
  setEnabled: (enabled) => set({ enabled, ...(enabled ? {} : { byConversation: {} }) }),
  apply: (conversationId, userId, name, typing) => {
    if (!typing) return get().clear(conversationId, userId);
    const current = get().byConversation[conversationId] ?? {};
    set({
      byConversation: {
        ...get().byConversation,
        [conversationId]: { ...current, [userId]: { name, at: Date.now() } },
      },
    });
  },
  clear: (conversationId, userId) => {
    const current = get().byConversation[conversationId];
    if (!current?.[userId]) return;
    set({ byConversation: { ...get().byConversation, [conversationId]: without(current, userId) } });
  },
  prune: (now) => {
    let changed = false;
    const next: Record<string, Record<string, Typist>> = {};
    for (const [convId, typists] of Object.entries(get().byConversation)) {
      const live = Object.entries(typists).filter(([, t]) => now - t.at < TYPING_TTL_MS);
      if (live.length !== Object.keys(typists).length) changed = true;
      if (live.length > 0) next[convId] = Object.fromEntries(live);
    }
    if (changed) set({ byConversation: next });
  },
}));

const EMPTY: string[] = [];

/** Names typing in one conversation, oldest first. Stable when empty. */
export function selectTypingNames(state: TypingState, conversationId: string | null | undefined) {
  if (!conversationId || !state.enabled) return EMPTY;
  const typists = state.byConversation[conversationId];
  if (!typists) return EMPTY;
  const list = Object.values(typists).sort((a, b) => a.at - b.at).map((t) => t.name);
  return list.length > 0 ? list : EMPTY;
}
