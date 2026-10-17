"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { api, type GroupCall } from "@/lib/api";
import {
  GroupCallContext,
  type GroupMediaSnapshot,
  type GroupRoomView,
} from "./group-call-context";
import { connectLiveKitSession } from "./group-media/livekit-session";
import type { GroupMediaSession } from "./group-media/group-media-session";
import GroupCallOverlay from "./group-call-overlay";
import { groupCallErrorMessage, idleGroupRoomView } from "./group-call-state";
import { useGroupCallInvite } from "./use-group-call-invite";
import { useGroupScreenShare } from "./use-group-screen-share";
import { useGroupCallLeave } from "./use-group-call-leave";
import { useGroupCallEvents } from "./use-group-call-events";

export default function GroupCallProvider({
  children,
  currentUserId,
}: {
  children: React.ReactNode;
  currentUserId?: string;
}) {
  const [view, setView] = useState<GroupRoomView>(idleGroupRoomView);
  const [activeCalls, setActiveCalls] = useState<Record<string, GroupCall>>({});
  const sessionRef = useRef<GroupMediaSession | null>(null);
  const callRef = useRef<GroupCall | null>(null);
  const joinPendingRef = useRef(false);
  const joinEpochRef = useRef(0);
  const { allowRejoin, leaveOnce } = useGroupCallLeave(callRef);

  const applySnapshot = useCallback((snapshot: GroupMediaSnapshot) => {
    const call = callRef.current;
    if (!call) return;
    setView((current) => ({ ...current, ...snapshot, call, phase: "connected" }));
  }, []);

  const applyCall = useCallback((call: GroupCall) => {
    callRef.current = call;
    setActiveCalls((current) => ({ ...current, [call.conversation_id]: call }));
    setView((current) => (current.call?.id === call.id ? { ...current, call } : current));
    // Only matters for providers that take the screen owner from the server.
    sessionRef.current?.refreshSnapshot(call.screen_sharer_id);
  }, []);

  const clearRoom = useCallback((error?: string) => {
    const session = sessionRef.current;
    sessionRef.current = null;
    callRef.current = null;
    session?.disconnect();
    setView(error ? { ...idleGroupRoomView, phase: "failed", error } : idleGroupRoomView);
  }, []);

  const {
    pending: screenSharePending,
    toggle: toggleScreenShareState,
    handleScreenEnded,
    reset: resetScreenShare,
  } = useGroupScreenShare({
    sessionRef,
    callRef,
    onCallUpdated: applyCall,
    currentUserId,
    screenOwnerId: view.call?.screen_sharer_id,
    screenOwnerName: view.call?.screen_sharer_name,
    localSharing: view.sharingScreen,
  });

  const {
    invite,
    dismiss: dismissInvite,
    markAnswered: markInviteAnswered,
    handleEvent: handleInviteEvent,
  } = useGroupCallInvite({ currentUserId });

  const handleClosed = useCallback((reason?: string) => {
    const call = callRef.current;
    resetScreenShare();
    clearRoom(reason);
    if (call) void leaveOnce(call.id);
    if (reason) toast.error(reason);
  }, [clearRoom, leaveOnce, resetScreenShare]);

  const join = useCallback(async (conversationId: string, ring?: string[]) => {
    if (joinPendingRef.current || sessionRef.current || callRef.current) return;
    joinPendingRef.current = true;
    const joinEpoch = ++joinEpochRef.current;
    dismissInvite();
    setView({ ...idleGroupRoomView, phase: "joining" });
    try {
      const session = await api.joinGroupCall(conversationId, ring);
      if (joinEpoch !== joinEpochRef.current) {
        // Left during the join request; do not let its late response build media.
        await leaveOnce(session.call.id);
        return;
      }
      allowRejoin(session.call.id);
      markInviteAnswered(session.call.id);
      callRef.current = session.call;
      setActiveCalls((current) => ({ ...current, [conversationId]: session.call }));
      const media = await connectLiveKitSession(session.livekit, {
        onSnapshot: applySnapshot,
        onClosed: handleClosed,
        onScreenEnded: handleScreenEnded,
      });
      // The user may have left while the media server was still connecting.
      if (joinEpoch !== joinEpochRef.current) {
        media.disconnect();
        await leaveOnce(session.call.id);
        return;
      }
      sessionRef.current = media;
      media.refreshSnapshot(session.call.screen_sharer_id);
      if (!media.microphoneAvailable) {
        setView((current) => ({ ...current, microphoneUnavailable: true }));
      }
    } catch (error) {
      if (joinEpoch !== joinEpochRef.current) return;
      const call = callRef.current;
      // Everything up to the signaling socket — the microphone, the offer —
      // fails with no trace on the server, so this is the only record of it.
      console.error("[group-call] join failed", error);
      const message = groupCallErrorMessage(error);
      clearRoom(message);
      if (call) void leaveOnce(call.id);
      toast.error(message);
    } finally {
      joinPendingRef.current = false;
    }
  }, [allowRejoin, applySnapshot, clearRoom, dismissInvite, handleClosed,
    handleScreenEnded, leaveOnce, markInviteAnswered]);

  const leave = useCallback(async () => {
    joinEpochRef.current += 1;
    const call = callRef.current;
    resetScreenShare();
    clearRoom();
    if (call) await leaveOnce(call.id);
  }, [clearRoom, leaveOnce, resetScreenShare]);

  const toggleMute = useCallback(async () => {
    const session = sessionRef.current;
    if (!session || view.microphoneUnavailable) return;
    await session.setMuted(!view.muted);
  }, [view.microphoneUnavailable, view.muted]);

  const toggleScreenShare = useCallback(
    () => toggleScreenShareState(view.sharingScreen),
    [toggleScreenShareState, view.sharingScreen],
  );

  const enableAudio = useCallback(async () => {
    try {
      await sessionRef.current?.resumeAudio();
    } catch {
      toast.error("Your browser is still blocking call audio.");
    }
  }, []);

  const refresh = useGroupCallEvents({
    callRef,
    setActiveCalls,
    onCallUpdated: applyCall,
    onCallEnded: clearRoom,
    onInviteEvent: handleInviteEvent,
  });

  useEffect(() => () => {
    joinEpochRef.current += 1;
    const session = sessionRef.current;
    sessionRef.current = null;
    callRef.current = null;
    session?.disconnect();
  }, []);

  const acceptInvite = useCallback(() => {
    if (invite) void join(invite.conversation_id);
  }, [invite, join]);

  const value = useMemo(() => ({
    view, screenSharePending, activeCalls, refresh, join, leave,
    toggleMute, toggleScreenShare, enableAudio,
    invite, acceptInvite, declineInvite: dismissInvite,
  }), [acceptInvite, activeCalls, dismissInvite, enableAudio, invite, join, leave,
    refresh, screenSharePending, toggleMute, toggleScreenShare, view]);

  return <GroupCallContext.Provider value={value}>
    {children}
    <GroupCallOverlay call={value} />
  </GroupCallContext.Provider>;
}
