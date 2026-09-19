"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { friendlyError } from "@/lib/api/error-messages";
import { Button } from "@/components/ui/button";

/**
 * Locked DM composer. `lock_reason` from the sidebar decides the copy and
 * whether "Request to connect" is offered. Webhook feeds never reach here.
 */
export default function ComposerConnectionLock({
  lockReason,
  peerName,
  peerUserId,
}: {
  lockReason?: string;
  peerName: string;
  peerUserId?: string;
}) {
  const [busy, setBusy] = useState(false);
  const name = peerName.trim() || "this person";
  const showRequest = lockReason === "connection_removed";
  const body =
    lockReason === "connection_removed"
      ? `${name} removed the connection. You can't send messages.`
      : lockReason === "reconnect_requested"
        ? `Request sent. You can message ${name} once they accept.`
        : lockReason === "account_deleted"
          ? "This account was deleted."
          : lockReason === "local_only"
            ? "This history is kept in this browser. You're not in this conversation any more, so you can read it but not send."
            : "This user has left the team. You cannot send messages to them.";

  async function requestConnect() {
    if (!peerUserId || busy) return;
    setBusy(true);
    try {
      await api.sendChatConnectionRequest(peerUserId);
    } catch (error) {
      toast.error(friendlyError(error, "Could not send the request"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="shrink-0 border-t px-4 py-3"
      style={{
        borderColor: "var(--sig-border)",
        background: "var(--sig-bg)",
        color: "var(--sig-label-2)",
      }}
    >
      <div className="flex items-center justify-center gap-2 text-center text-xs">
        <Lock className="size-3.5 shrink-0" aria-hidden />
        <p>{body}</p>
      </div>
      {showRequest ? (
        <div className="mt-2.5 flex justify-center">
          <Button
            type="button"
            size="sm"
            disabled={busy || !peerUserId}
            onClick={() => void requestConnect()}
          >
            Request to connect
          </Button>
        </div>
      ) : null}
    </div>
  );
}
