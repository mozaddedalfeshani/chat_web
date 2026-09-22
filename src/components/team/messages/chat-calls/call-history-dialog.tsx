"use client";

import { useEffect, useState } from "react";
import { Phone, PhoneIncoming, PhoneOutgoing } from "lucide-react";
import { api, type CallLogEntry } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function callSubtitle(call: CallLogEntry) {
  const direction = call.direction === "incoming" ? "Incoming" : "Outgoing";
  const status = call.missed ? "missed" : call.status;
  const when = new Date(call.started_at).toLocaleString();
  return `${direction} · ${status} · ${when}`;
}

export default function CallHistoryDialog({
  open,
  onOpenChange,
  onOpenConversation,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenConversation: (conversationId: string) => void;
}) {
  const [result, setResult] = useState<{
    loaded: boolean;
    calls: CallLogEntry[];
  }>({ loaded: false, calls: [] });
  const calls = result.calls;
  const loading = open && !result.loaded;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    api
      .listChatCallLog({ limit: 50 })
      .then((page) => {
        if (!cancelled) setResult({ loaded: true, calls: page.calls ?? [] });
      })
      .catch(() => {
        if (!cancelled) setResult({ loaded: true, calls: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Calls</DialogTitle>
        </DialogHeader>
        <div className="max-h-[65vh] overflow-y-auto">
          {loading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Loading…
            </p>
          ) : calls.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No calls yet.
            </p>
          ) : (
            calls.map((call) => {
              const Icon =
                call.direction === "incoming" ? PhoneIncoming : PhoneOutgoing;
              return (
                <button
                  type="button"
                  key={`${call.kind}:${call.id}`}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-[var(--surface2)]"
                  onClick={() => {
                    onOpenConversation(call.conversation_id);
                    onOpenChange(false);
                  }}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface2)]">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {call.title || "Call"}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {callSubtitle(call)}
                    </span>
                  </span>
                  <Phone className="size-4 shrink-0 text-muted-foreground" />
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
