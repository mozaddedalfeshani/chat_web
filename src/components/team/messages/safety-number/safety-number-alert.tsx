"use client";

import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { useChatStore } from "@/store/chat-store";
import { formatSafetyNumber } from "@/lib/chat-e2ee/safety-number";
import { chatConvLabel, isAccountDeleted } from "../chat-utils";
import { useSafetyNumber } from "./use-safety-number";
import SafetyNumberDigits from "./safety-number-digits";

/**
 * The half of safety numbers that actually protects anyone.
 *
 * Nobody compares digits twice, so a server that swapped a key after the first
 * conversation would never be caught by the profile panel alone. This watches
 * the peer's key on every DM open and says so, in the conversation, when it
 * changes. It renders nothing at all otherwise.
 *
 * It reads the active conversation from the store rather than taking props, so
 * it can be dropped into the timeline without threading peer identity through
 * three components that have no other use for it.
 */
export default function SafetyNumberAlert() {
  const activeId = useChatStore((s) => s.activeConversationId);
  const dms = useChatStore((s) => s.dms);
  const [expanded, setExpanded] = useState(false);

  const conv = dms.find((item) => item.id === activeId) ?? null;
  // A safety number is a comparison with somebody else. In a note to self the
  // peer is the viewer, so there is nothing to compare and no substitution to
  // catch — the key on both ends is the same key.
  const isDM =
    conv?.type === "dm" && !conv.is_self && !isAccountDeleted(conv);
  const safety = useSafetyNumber(isDM ? conv?.peer_user_id : undefined, !!isDM);

  if (!conv || !isDM || safety.trust !== "changed") return null;
  const peerName = chatConvLabel(conv);

  return (
    <div className="shrink-0 border-t border-amber-500/40 bg-amber-500/10 px-4 py-3">
      <div className="flex items-start gap-2.5">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-500" />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Your safety number with {peerName} has changed. They may have
            reinstalled AbabilX or switched devices — or someone may be
            intercepting this conversation.
          </p>
          {expanded ? (
            <>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Read these to {peerName} over a call or in person. If they match
                what they see, the conversation is private again.
              </p>
              <SafetyNumberDigits digits={formatSafetyNumber(safety.digits)} />
            </>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-md border border-amber-500/50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400"
              onClick={() => setExpanded((prev) => !prev)}>
              {expanded ? "Hide safety number" : "Show safety number"}
            </button>
            <button
              type="button"
              className="rounded-md px-2.5 py-1 text-xs font-medium text-white"
              style={{ background: "var(--indigo)" }}
              onClick={safety.acknowledge}>
              I verified it — dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
