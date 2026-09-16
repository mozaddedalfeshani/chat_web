import type { ChatConversation, VoiceCall } from "@/lib/api";
import type { WebCallView } from "./voice-call-context";

/** Only idle, two-person DMs with the peer still in the team can be called. */
export function callStartable(view: WebCallView, conversation: ChatConversation) {
  return view.phase === "idle" && conversation.type === "dm" && !conversation.peer_left;
}

export const idleView: WebCallView = {
  phase: "idle",
  mode: "audio",
  peerName: "",
  muted: false,
};

/**
 * The server gives up on a ringing call after a minute and emits a terminal
 * event. When that event never lands — dropped socket, tab frozen in the
 * background — this tab used to ring for the rest of the session, so ringing
 * gets its own local deadline a little past the server's.
 */
export const RING_EXPIRY_MS = 65_000;

export const terminalCallEvents = new Set([
  "call.declined",
  "call.cancelled",
  "call.ended",
  "call.failed",
  "call.missed",
]);

/** Replayed socket snapshots may only ring while the server call still can. */
export function isFreshRingingCall(call: VoiceCall) {
  if (call.status !== "ringing") return false;
  const expiresAt = new Date(call.expires_at).getTime();
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

export function callError(error: unknown) {
  const code = error instanceof Error ? `${error.name}: ${error.message}` : "";
  // The server names which side is busy. Saying "this person" when the caller
  // is the busy one is how a stale row read as the other party's fault on both
  // machines at once.
  if (code.includes("voice_call_busy_self")) return "You are already in another call.";
  if (code.includes("voice_call_busy")) return "This person is already in another call.";
  if (code.includes("voice_call_peer_unavailable")) return "This person is unavailable.";
  if (code.includes("voice_call_ice_not_configured")) return "Calling is not configured on the server yet.";
  if (code.includes("NotAllowedError") || code.includes("Permission")) return "Microphone permission is required for calls.";
  if (code.includes("camera")) return "The camera could not be opened.";
  if (code.includes("browser_unsupported")) return "Voice calls are not supported in this browser.";
  if (code.includes("signaling")) return "The realtime connection was lost.";
  return "The call could not connect. Check your network.";
}

export function callPhaseLabel(view: WebCallView) {
  const screen = view.mode === "screen";
  const video = view.mode === "video";
  switch (view.phase) {
    case "starting": return screen ? "Starting screen share…" : video ? "Starting video call…" : "Starting call…";
    case "outgoing-ringing": return screen ? "Waiting for them to accept…" : view.remoteRinging ? "Ringing…" : "Calling…";
    case "incoming-ringing": return screen ? "Wants to share their screen" : video ? "Incoming video call" : "Incoming voice call";
    case "connecting": return "Connecting…";
    case "connected": return "Connected";
    case "failed": return view.error ?? "The call could not connect.";
    default: return "";
  }
}

export function peerDetails(call: VoiceCall, currentUserId?: string) {
  const isCaller = call.caller_id === currentUserId;
  return isCaller
    ? { peerName: call.callee_name, peerAvatar: call.callee_avatar_url }
    : { peerName: call.caller_name, peerAvatar: call.caller_avatar_url };
}

/** Label for the surface: the peer's name, else what kind of call this is. */
export function callKindTitle(view: WebCallView) {
  if (view.mode === "screen") return "Screen share";
  if (view.mode === "video") return "Video call";
  return "Voice call";
}
