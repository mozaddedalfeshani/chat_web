"use client";

import { useEffect } from "react";
import { Headphones, LoaderCircle, Users } from "lucide-react";
import type { ChatConversation } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGroupCall } from "@/components/user/group-call/group-call-context";
import { callQuotaExhaustedMessage } from "@/components/user/group-call/group-call-state";
import { useTeamContextOptional } from "@/components/team/shared/team-provider";
import { subscribeAppWs } from "@/lib/notifications/ws-bus";

export default function GroupCallAction({
  conversation,
  capsule = false,
}: {
  conversation: ChatConversation;
  /** Render inline inside a shared capsule — no own border/bg wrapper. */
  capsule?: boolean;
}) {
  const groupCall = useGroupCall();
  const refresh = groupCall.refresh;
  const active = groupCall.activeCalls[conversation.id];
  const joiningThis =
    groupCall.view.phase === "joining" &&
    (!groupCall.view.call ||
      groupCall.view.call.conversation_id === conversation.id);
  const inThisCall =
    groupCall.view.phase === "connected" &&
    groupCall.view.call?.conversation_id === conversation.id;
  const busyElsewhere =
    groupCall.view.phase !== "idle" &&
    groupCall.view.phase !== "failed" &&
    !joiningThis &&
    !inThisCall;

  // A free workspace out of monthly minutes cannot START a call — but joining one
  // that is already running stays open, exactly like the backend's gate.
  const quota = useTeamContextOptional()?.detail?.call_quota;
  const outOfMinutes = !!quota?.exhausted && !active && !inThisCall;
  const blockedReason = outOfMinutes
    ? callQuotaExhaustedMessage(quota)
    : undefined;

  // One pull on mount, then the WS carries it: `useGroupCallEvents` already
  // pushes every `group_call.*` into the same store, so the old 10s interval
  // was 360 requests an hour per open conversation asking what it had just
  // been told. Reconnects re-sync there too.
  useEffect(() => {
    if (conversation.type === "webhook") return;
    void refresh(conversation.id);
    // A dropped socket is the one gap the push cannot cover: a call could have
    // started or ended while this tab was disconnected.
    return subscribeAppWs({
      onEvent: () => {},
      onReconnect: () => void refresh(conversation.id),
    });
  }, [conversation.id, conversation.type, refresh]);

  if (conversation.type === "webhook") return null;

  return (
    <Button
      type="button"
      size="sm"
      variant={
        active || inThisCall ? "default" : capsule ? "ghost" : "secondary"
      }
      className={cn(
        "h-7 shrink-0 gap-1.5 px-2.5 text-xs",
        capsule ? "rounded-r-full" : "ml-auto rounded-full",
      )}
      disabled={busyElsewhere || joiningThis || outOfMinutes}
      onClick={() => void groupCall.join(conversation.id)}
      title={blockedReason}
      aria-label={active ? "Join meet" : "Start a meet"}
    >
      {joiningThis ? (
        <LoaderCircle className="h-4 w-4 animate-spin" />
      ) : (
        <Headphones className="h-4 w-4" />
      )}
      <span className="hidden sm:inline">
        {inThisCall
          ? "In call"
          : active
            ? "Join"
            : outOfMinutes
              ? "No minutes"
              : "Meet"}
      </span>
      {active ? (
        <span className="flex items-center gap-0.5 text-xs opacity-80">
          <Users className="h-3 w-3" /> {active.participant_count}
        </span>
      ) : null}
    </Button>
  );
}
