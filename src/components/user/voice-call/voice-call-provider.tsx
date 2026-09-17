"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, type ChatConversation, type VoiceCallSession, type VoiceCallSignal, type VoiceCallWsEvent } from "@/lib/api";
import { sendOnAppWs, subscribeAppWs } from "@/lib/notifications/ws-bus";
import type { VoicePeerEngine } from "@/lib/calls/voice-peer-engine";
import { startCallHeartbeat } from "@/lib/calls/call-heartbeat";
import { buildVoiceEngine } from "./build-voice-engine";
import { cameraErrorMessage } from "@/lib/calls/voice-media";
import { useCallMediaToggles } from "./use-call-media-toggles";
import { useCallRingtone } from "@/lib/calls/use-call-ringtone";
import { VoiceCallContext, type WebCallView } from "./voice-call-context";
import { RING_EXPIRY_MS, callError, callStartable, lostCallControl, idleView, isFreshRingingCall, peerDetails, terminalCallEvents } from "./voice-call-helpers";
import VoiceCallOverlay from "./voice-call-overlay";
import { FinishedCallMemory } from "./finished-call-memory";

export default function VoiceCallProvider({ children, currentUserId }: { children: React.ReactNode; currentUserId?: string }) {
  const [view, setViewState] = useState<WebCallView>(idleView);
  const viewRef = useRef(view);
  const callRef = useRef<VoiceCallSession["call"] | null>(null);
  const iceRef = useRef<VoiceCallSession["ice_servers"]>([]);
  const engineRef = useRef<VoicePeerEngine | null>(null);
  const pendingRef = useRef<VoiceCallSignal[]>([]);
  const finishedCallsRef = useRef(new FinishedCallMemory());
  /** `call.ringing` can beat the start response that names the call. */
  const ringingCallsRef = useRef(new Set<string>());
  const operationEpochRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const hangUpRef = useRef<() => Promise<void>>(async () => {});
  /**
   * Kept out of `timerRef`: `clearTimers` fires on connect, and the heartbeat
   * has to outlive that — it is what proves the call is still alive.
   */
  const heartbeatRef = useRef<(() => void) | null>(null);

  const setView = useCallback((next: WebCallView) => {
    viewRef.current = next;
    setViewState(next);
  }, []);
  const clearTimers = useCallback(() => {
    timerRef.current.forEach(clearTimeout);
    timerRef.current = [];
  }, []);
  const reset = useCallback(async (failed?: string) => {
    operationEpochRef.current += 1;
    clearTimers();
    heartbeatRef.current?.();
    heartbeatRef.current = null;
    finishedCallsRef.current.remember(callRef.current?.id);
    await engineRef.current?.dispose();
    engineRef.current = null;
    pendingRef.current = [];
    ringingCallsRef.current.clear();
    callRef.current = null;
    iceRef.current = [];
    setView(failed ? { ...viewRef.current, phase: "failed", error: failed } : idleView);
    if (failed) timerRef.current.push(setTimeout(() => setView(idleView), 5_000));
  }, [clearTimers, setView]);

  const sendSignal = useCallback(async (signal: VoiceCallSignal) => {
    const callId = callRef.current?.id;
    if (!callId) return false;
    for (let attempt = 0; attempt < 25; attempt += 1) {
      if (sendOnAppWs({ type: "call.signal", call_id: callId, signal })) return true;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    return false;
  }, []);

  const fail = useCallback(async (reason: string) => {
    const callId = callRef.current?.id;
    if (callId) void api.actOnVoiceCall(callId, "fail", reason).catch(() => {});
    await reset(callError(new Error(reason)));
  }, [reset]);

  const prepare = useCallback(async (session: VoiceCallSession, caller: boolean) => {
    if (engineRef.current) return;
    const screenOnly = session.call.mode === "screen";
    const video = session.call.mode === "video";
    const engine = buildVoiceEngine({ sendSignal, viewRef, setView, clearTimers, fail, hangUpRef, screenOnly, isOfferer: caller });
    // The camera opens here, before the first offer/answer, so a video call
    // negotiates once. A camera that will not open degrades to audio.
    const media = await engine.prepare(session.ice_servers ?? [], {
      microphone: !screenOnly,
      camera: video,
      screenStream: null,
    });
    if (callRef.current?.id !== session.call.id) return void engine.dispose();
    engineRef.current = engine;
    heartbeatRef.current?.();
    heartbeatRef.current = startCallHeartbeat(session.call.id, (call) => {
      if (callRef.current?.id !== call.id) return;
      void reset(call.status === "ended" ? undefined : callError(new Error(call.end_reason || call.status)));
    }, () => {
      if (callRef.current?.id === session.call.id) void reset();
    });
    if (!screenOnly && !media.microphone) {
      setView({ ...viewRef.current, microphoneUnavailable: true, muted: true });
    }
    if (video && media.cameraError !== undefined) {
      setView({ ...viewRef.current, cameraError: cameraErrorMessage(media.cameraError) });
    }
    for (const signal of pendingRef.current.splice(0)) await engine.handleSignal(signal);
    timerRef.current.push(setTimeout(() => {
      if (viewRef.current.phase === "connecting") void fail("connect_timeout");
    }, 35_000));
    if (caller) {
      await engine.createAndSendOffer();
      timerRef.current.push(setTimeout(() => {
        if (viewRef.current.phase === "connecting" && !engine.answerReceived) void engine.createAndSendOffer(true).catch(() => fail("signaling_unavailable"));
      }, 6_000));
    }
  }, [clearTimers, fail, reset, sendSignal, setView]);

  const beginAccepted = useCallback(async (session: VoiceCallSession, caller: boolean) => {
    callRef.current = session.call;
    iceRef.current = session.ice_servers ?? iceRef.current;
    setView({ ...viewRef.current, ...peerDetails(session.call, currentUserId), mode: session.call.mode ?? "audio", phase: "connecting", microphoneUnavailable: false, cameraError: undefined, error: undefined });
    try { await prepare({ ...session, ice_servers: iceRef.current }, caller); }
    catch (error) {
      const reason = error instanceof Error ? `${error.name}: ${error.message}` : "peer_setup_failed";
      await fail(reason);
    }
  }, [currentUserId, fail, prepare, setView]);

  const begin = useCallback(async (conversation: ChatConversation, video: boolean) => {
    const operationEpoch = ++operationEpochRef.current;
    setView({
      phase: "starting",
      mode: video ? "video" : "audio",
      peerName: conversation.peer_user_name ?? (video ? "Video call" : "Voice call"),
      peerAvatar: conversation.peer_user_avatar,
      muted: false,
    });
    try {
      const session = await api.startVoiceCall(conversation.id, video ? "video" : "audio");
      if (operationEpoch !== operationEpochRef.current) {
        finishedCallsRef.current.remember(session.call.id);
        void api.actOnVoiceCall(session.call.id, "cancel").catch(() => {});
        return;
      }
      callRef.current = session.call;
      iceRef.current = session.ice_servers ?? [];
      const remoteRinging = Boolean(session.call.callee_ringing_at) || ringingCallsRef.current.has(session.call.id);
      setView({ ...viewRef.current, phase: "outgoing-ringing", remoteRinging });
    } catch (error) { await reset(callError(error)); }
  }, [reset, setView]);

  const start = useCallback(async (conversation: ChatConversation, options?: { video?: boolean }) => {
    if (!callStartable(viewRef.current, conversation)) return;
    await begin(conversation, options?.video === true);
  }, [begin]);

  const accept = useCallback(async () => {
    const call = callRef.current;
    if (!call || viewRef.current.phase !== "incoming-ringing") return;
    const operationEpoch = ++operationEpochRef.current;
    setView({ ...viewRef.current, phase: "connecting" });
    try {
      const session = await api.actOnVoiceCall(call.id, "accept");
      if (operationEpoch !== operationEpochRef.current) {
        finishedCallsRef.current.remember(call.id);
        if (session.can_control !== false) void api.actOnVoiceCall(call.id, "end").catch(() => {});
        return;
      }
      // Another device of this account won the answer: end here, quietly.
      if (session.can_control === false) return void reset();
      await beginAccepted(session, false);
    } catch (error) {
      if (operationEpoch === operationEpochRef.current) {
        await reset(lostCallControl(error) ? undefined : callError(error));
      }
    }
  }, [beginAccepted, reset, setView]);

  const hangUp = useCallback(async () => {
    const call = callRef.current;
    const phase = viewRef.current.phase;
    if (phase === "idle") return;
    const action = phase === "incoming-ringing" ? "decline" : phase === "outgoing-ringing" ? "cancel" : "end";
    await reset();
    if (call) void api.actOnVoiceCall(call.id, action).catch(() => {});
  }, [reset]);
  useEffect(() => { hangUpRef.current = hangUp; }, [hangUp]);

  useEffect(() => subscribeAppWs({
    onEvent: (raw) => {
      if (!raw.type.startsWith("call.")) return;
      const event = raw as VoiceCallWsEvent;
      if (terminalCallEvents.has(event.type) && event.call) {
        finishedCallsRef.current.remember(event.call.id);
        if (event.call.id === callRef.current?.id) void reset();
        return;
      }
      if (event.type === "call.signal" && event.call_id === callRef.current?.id && event.signal) {
        const engine = engineRef.current;
        if (engine) void engine.handleSignal(event.signal).catch((error) => fail(error instanceof Error ? error.message : "signaling_unavailable"));
        else pendingRef.current.push(event.signal);
      } else if (event.type === "call.incoming" && event.call
        && viewRef.current.phase === "idle"
        && !finishedCallsRef.current.has(event.call.id)
        && isFreshRingingCall(event.call)) {
        callRef.current = event.call;
        setView({ phase: "incoming-ringing", mode: event.call.mode ?? "audio", ...peerDetails(event.call, currentUserId), muted: false });
        // Tell the caller this device is ringing. Fire-and-forget: a late or
        // duplicate report is a no-op on the server.
        void api.actOnVoiceCall(event.call.id, "ringing").catch(() => {});
      } else if (event.type === "call.ringing" && event.call) {
        // Remembered only while this tab is placing a call, so an idle tab
        // of the same account never accumulates ids.
        if (event.call.id !== callRef.current?.id) {
          if (viewRef.current.phase === "starting") ringingCallsRef.current.add(event.call.id);
        }
        else if (viewRef.current.phase === "outgoing-ringing") setView({ ...viewRef.current, remoteRinging: true });
      } else if (event.type === "call.accepted" && event.call && event.call.id === callRef.current?.id) {
        // One account, several signed-in devices: every one of them rings, and
        // `call.accepted` is the only word any of them gets that somebody
        // picked up. The caller negotiates on it; a device still showing the
        // incoming ring is one that did NOT answer, and has to stop — matching
        // the phase to "outgoing-ringing" alone left it ringing to nobody
        // until the call ended.
        if (viewRef.current.phase === "outgoing-ringing") {
          void beginAccepted({ call: event.call, ice_servers: iceRef.current }, true);
        } else if (viewRef.current.phase === "incoming-ringing") {
          void reset();
        }
      }
    },
    onReconnect: () => {
      const call = callRef.current;
      if (!call) return;
      void api.getVoiceCall(call.id).then((session) => {
        if (["declined", "cancelled", "missed", "ended", "failed"].includes(session.call.status)) return reset();
        // Another device of this account answered or holds the call.
        if (session.can_control === false) return reset();
        if (session.call.status === "accepted" && viewRef.current.phase === "outgoing-ringing") return beginAccepted(session, true);
        // Answered elsewhere while this tab's socket was down.
        if (session.call.status === "accepted" && viewRef.current.phase === "incoming-ringing") return reset();
        if (session.call.callee_ringing_at && viewRef.current.phase === "outgoing-ringing") setView({ ...viewRef.current, remoteRinging: true });
      }).catch(() => {});
    },
  }), [beginAccepted, currentUserId, fail, reset, setView]);

  useEffect(() => () => {
    clearTimers();
    void engineRef.current?.dispose();
  }, [clearTimers]);

  const { toggleMute, toggleScreenShare, toggleCamera } = useCallMediaToggles({ engineRef, viewRef, setView });

  // A ring the server has already given up on must not outlive it here. The
  // terminal event is the normal stop; this is the backstop for when it never
  // arrives, which otherwise left the tab ringing for the rest of the session.
  useEffect(() => {
    if (view.phase !== "incoming-ringing" && view.phase !== "outgoing-ringing") return;
    const timer = setTimeout(() => void reset(), RING_EXPIRY_MS);
    return () => clearTimeout(timer);
  }, [reset, view.phase]);

  // The server expires a ringing call after a minute, which stops this too.
  useCallRingtone(view.phase === "incoming-ringing", {
    title: view.peerName ? `${view.peerName} is calling` : (view.mode === "video" ? "Incoming video call" : "Incoming call"),
  });

  const value = useMemo(
    () => ({ view, active: view.phase !== "idle", start, accept, hangUp, toggleMute, toggleScreenShare, toggleCamera }),
    [view, start, accept, hangUp, toggleMute, toggleScreenShare, toggleCamera],
  );
  return <VoiceCallContext.Provider value={value}>{children}<VoiceCallOverlay call={value} /></VoiceCallContext.Provider>;
}
