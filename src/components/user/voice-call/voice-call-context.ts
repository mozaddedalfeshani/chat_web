"use client";

import { createContext, useContext } from "react";
import type { ChatConversation, VoiceCallMode } from "@/lib/api";

export type WebCallPhase =
  | "idle"
  | "starting"
  | "outgoing-ringing"
  | "incoming-ringing"
  | "connecting"
  | "connected"
  | "failed";

export type WebCallView = {
  phase: WebCallPhase;
  /**
   * "screen" sessions never open a microphone on either side; "video" opens
   * the camera before the first offer. Either side may still turn a camera on
   * during an "audio" call.
   */
  mode: VoiceCallMode;
  peerName: string;
  peerAvatar?: string;
  muted: boolean;
  microphoneUnavailable?: boolean;
  screenSharing?: boolean;
  remoteScreen?: MediaStream;
  screenError?: string;
  /** Our own camera while it is on — the corner preview. */
  localCamera?: MediaStream;
  /** The peer's camera; a shared screen still wins the stage over it. */
  remoteCamera?: MediaStream;
  /** Why the camera is off when it was asked for. The call itself is fine. */
  cameraError?: string;
  /** Caller side: a callee device is ringing, so "Ringing…" not "Calling…". */
  remoteRinging?: boolean;
  connectedAt?: number;
  error?: string;
};

export type VoiceCallContextValue = {
  view: WebCallView;
  active: boolean;
  start: (conversation: ChatConversation, options?: { video?: boolean }) => Promise<void>;
  accept: () => Promise<void>;
  hangUp: () => Promise<void>;
  toggleMute: () => void;
  toggleScreenShare: () => Promise<void>;
  toggleCamera: () => Promise<void>;
};

export const VoiceCallContext = createContext<VoiceCallContextValue | null>(null);

export function useVoiceCall() {
  const value = useContext(VoiceCallContext);
  if (!value) throw new Error("useVoiceCall must be used inside VoiceCallProvider");
  return value;
}
