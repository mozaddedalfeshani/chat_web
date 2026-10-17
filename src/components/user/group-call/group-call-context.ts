"use client";

import { createContext, useContext } from "react";
import type { GroupCall } from "@/lib/api";

export type GroupCallPhase = "idle" | "joining" | "connected" | "failed";

export type GroupParticipantView = {
  identity: string;
  name: string;
  avatarUrl?: string;
  isLocal: boolean;
  isSpeaking: boolean;
  isMuted: boolean;
};

export type GroupScreenView = {
  participantName: string;
  isLocal: boolean;
  /** The LiveKit track reduced to what a <video> element takes. */
  stream: MediaStream;
};

/** What a media provider must be able to say about the room it is carrying. */
export type GroupMediaSnapshot = {
  participants: GroupParticipantView[];
  screen: GroupScreenView | null;
  muted: boolean;
  sharingScreen: boolean;
  audioBlocked: boolean;
};

export type GroupRoomView = {
  phase: GroupCallPhase;
  call: GroupCall | null;
  participants: GroupParticipantView[];
  screen: GroupScreenView | null;
  muted: boolean;
  microphoneUnavailable: boolean;
  sharingScreen: boolean;
  audioBlocked: boolean;
  error?: string;
};

export type GroupCallContextValue = {
  view: GroupRoomView;
  screenSharePending: boolean;
  activeCalls: Record<string, GroupCall>;
  /** Group call ringing on this tab right now, if any. */
  invite: GroupCall | null;
  refresh: (conversationId: string) => Promise<void>;
  /** `ring`: who a NEW call rings; undefined = everyone (server 0172). */
  join: (conversationId: string, ring?: string[]) => Promise<void>;
  leave: () => Promise<void>;
  toggleMute: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;
  enableAudio: () => Promise<void>;
  acceptInvite: () => void;
  /** Local-only: silences this tab, the call keeps running for everyone else. */
  declineInvite: () => void;
};

export const GroupCallContext = createContext<GroupCallContextValue | null>(null);

export function useGroupCall() {
  const value = useContext(GroupCallContext);
  if (!value) throw new Error("useGroupCall must be used inside GroupCallProvider");
  return value;
}
