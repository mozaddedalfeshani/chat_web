"use client";

import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChatConversation } from "@/lib/api";
import { useVoiceCall } from "@/components/user/voice-call/voice-call-context";
import { chatConvLabel } from "../chat-utils";

/**
 * One Call button, and it starts with audio — the phone's rule. Camera and
 * screen sharing are both turned on from the controls once connected.
 */
export default function DmCallActions({
  conv,
  capsule = false,
}: {
  conv: ChatConversation;
  /** Render inline inside a shared capsule — no wrapper div or own border/bg. */
  capsule?: boolean;
}) {
  const voiceCall = useVoiceCall();
  const name = chatConvLabel(conv);
  const unavailable = !!conv.peer_left;
  const disabled = voiceCall.active || unavailable;

  const btn = (
    <Button
      type="button"
      variant={capsule ? "ghost" : "secondary"}
      size="sm"
      className={cn(
        "h-7 shrink-0 gap-1.5 px-2.5 text-xs",
        capsule ? "rounded-r-full" : "rounded-full",
      )}
      disabled={disabled}
      onClick={() => void voiceCall.start(conv)}
      aria-label={`Call ${name}`}
      title={
        unavailable
          ? "This teammate is unavailable"
          : "Start call (camera and screen sharing are available after connecting)"
      }
    >
      <Phone className="size-4" />
      <span className="hidden sm:inline">Call</span>
    </Button>
  );

  if (capsule) return btn;

  return <div className="ml-auto flex shrink-0 items-center gap-1">{btn}</div>;
}
