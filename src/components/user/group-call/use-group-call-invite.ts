"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GroupCall, GroupCallWsEvent } from "@/lib/api";
import { useCallRingtone } from "@/lib/calls/use-call-ringtone";

/** A group call rings for one minute, then declines itself. */
export const GROUP_CALL_RING_MS = 60_000;

/**
 * How much of the ring window a call has left. The server replays live calls
 * when a tab connects, so an event can arrive long after the call began — that
 * one should not ring, it should just sit in the channel header as "Join".
 */
function ringTimeLeft(call: GroupCall) {
  const startedAt = new Date(call.started_at).getTime();
  if (!Number.isFinite(startedAt)) return GROUP_CALL_RING_MS;
  const left = GROUP_CALL_RING_MS - (Date.now() - startedAt);
  // Clamped because the browser clock is not the server's.
  return Math.min(GROUP_CALL_RING_MS, left);
}

type UseGroupCallInviteOptions = {
  currentUserId?: string;
};

/**
 * Turns `group_call.started` into a ringing invite with the same shape as an
 * incoming DM call. Declining is local only: the server keeps no per-member
 * invite state for group calls, so a decline silences this tab and nothing
 * else. The call keeps running and the channel header still offers "Join".
 */
export function useGroupCallInvite({ currentUserId }: UseGroupCallInviteOptions) {
  const [invite, setInvite] = useState<GroupCall | null>(null);
  const answeredRef = useRef(new Set<string>());

  /**
   * Answering — join, deny, or joining some other call from the channel header
   * — stops this call ringing here again for the rest of the session.
   */
  const dismiss = useCallback(() => {
    setInvite((current) => {
      if (current) answeredRef.current.add(current.id);
      return null;
    });
  }, []);

  const markAnswered = useCallback((callId: string) => {
    answeredRef.current.add(callId);
    setInvite((current) => (current?.id === callId ? null : current));
  }, []);

  const handleEvent = useCallback(
    (event: GroupCallWsEvent) => {
      const call = event.group_call;
      if (!call) return;
      // Only a genuine end stops the ring. The server emits `updated` every
      // time somebody joins, so clearing on any non-`started` event silenced
      // the ring the moment a second person picked up.
      // `self_joined` reaches only this user's own devices: one of them
      // answered, so a ring still going here is stale even though the call
      // itself is very much live.
      if (event.type === "group_call.ended" || event.type === "group_call.self_joined") {
        answeredRef.current.add(call.id);
        setInvite((current) => (current?.id === call.id ? null : current));
        return;
      }
      if (event.type !== "group_call.started") return;
      // Until `/api/me` resolves there is no way to tell the user's own call
      // from somebody else's, and ringing at yourself is the worse mistake.
      if (!currentUserId || call.started_by === currentUserId) return;
      // Left out of the starter's ring list: the call still shows as "Join".
      if (call.ring === false) return;
      if (answeredRef.current.has(call.id)) return;
      if (ringTimeLeft(call) <= 0) return;
      setInvite(call);
    },
    [currentUserId],
  );

  useCallRingtone(
    !!invite,
    invite
      ? {
          title: `${invite.starter_name} started a call`,
          body: invite.conversation_name
            ? `#${invite.conversation_name}`
            : undefined,
        }
      : undefined,
  );

  useEffect(() => {
    if (!invite) return;
    const timer = window.setTimeout(dismiss, Math.max(0, ringTimeLeft(invite)));
    return () => window.clearTimeout(timer);
  }, [dismiss, invite]);

  return { invite, dismiss, markAnswered, handleEvent };
}
