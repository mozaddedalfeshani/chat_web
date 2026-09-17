import { api } from "@/lib/api";
import type { VoiceCall } from "@/lib/api/types/voice-call";

/** One beat every 20s: six can be missed before the server gives up on us. */
const HEARTBEAT_MS = 20_000;

/**
 * Tells the server this tab is still on the call.
 *
 * An accepted call used to end only when a client said so, and the two
 * commonest ways a call dies — the network going away, the tab being closed —
 * are exactly the two that stop that message from being sent. The row then
 * stayed live forever and both people were refused every later call as busy.
 *
 * The reply carries the row, so this is also how a tab that was offline long
 * enough for the server to end its call finds out.
 */
export function startCallHeartbeat(
  callId: string,
  onEndedRemotely: (call: VoiceCall) => void,
  /** Another device of this account owns the call now. */
  onLostControl?: () => void,
) {
  let stopped = false;
  const timer = setInterval(async () => {
    if (stopped) return;
    try {
      const session = await api.actOnVoiceCall(callId, "heartbeat");
      const status = session.call.status;
      if (status !== "accepted" && !stopped) {
        stop();
        onEndedRemotely(session.call);
      }
    } catch (error) {
      // A server that predates the action says so once; there is nothing to
      // gain by asking again. Anything else — a timeout, a 5xx, no network —
      // is exactly the condition a heartbeat exists to ride out, so keep
      // beating.
      const code = error instanceof Error ? error.message : "";
      if (code === "voice_call_answered_elsewhere" && !stopped) {
        stop();
        onLostControl?.();
        return;
      }
      if (code === "invalid_voice_call_action" || code === "voice_call_not_found") stop();
    }
  }, HEARTBEAT_MS);

  function stop() {
    stopped = true;
    clearInterval(timer);
  }
  return stop;
}
