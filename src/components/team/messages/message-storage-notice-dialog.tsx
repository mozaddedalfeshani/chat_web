"use client";

import { Clock3, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STORAGE_NOTICE_KEY = "ababilx_message_storage_notice_seen_v1";

function noticeKey(userId: string) {
  return `${STORAGE_NOTICE_KEY}:${userId}`;
}

export function hasSeenMessageStorageNotice(userId: string | null) {
  return (
    typeof window !== "undefined" &&
    !!userId &&
    localStorage.getItem(noticeKey(userId)) === "1"
  );
}

export default function MessageStorageNoticeDialog({
  open,
  userId,
  onDone,
}: {
  open: boolean;
  userId: string;
  onDone: () => void;
}) {
  function finish() {
    localStorage.setItem(noticeKey(userId), "1");
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && finish()}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader className="pr-8 text-left">
          <div
            className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--indigo) 15%, transparent)",
              color: "var(--indigo)",
            }}
          >
            <Clock3 className="h-5 w-5" aria-hidden="true" />
          </div>
          <DialogTitle>Message storage is changing</DialogTitle>
          <DialogDescription className="leading-6">
            Messages sent from today will stay available in AbabilX for up to
            120 days.
          </DialogDescription>
        </DialogHeader>

        <div
          className="rounded-xl border border-[var(--border)] p-4"
          style={{
            backgroundColor: "var(--bg)",
            borderColor: "color-mix(in srgb, var(--indigo) 25%, var(--border))",
          }}
        >
          <div className="flex gap-3">
            <Smartphone
              className="mt-0.5 h-5 w-5 shrink-0"
              aria-hidden="true"
              style={{ color: "var(--indigo)" }}
            />
            <div>
              <p className="text-sm font-medium text-[var(--text)]">
                Keep your history for longer
              </p>
              <p className="mt-1 text-sm leading-5 text-[var(--text-muted)]">
                Install the AbabilX mobile app to keep a local copy of your
                messages on your own device.
              </p>
            </div>
          </div>
        </div>

        <Button
          className="w-full bg-[var(--indigo)] shadow-[0_18px_45px_var(--indigo-glow)] hover:bg-[var(--indigo)] hover:opacity-90"
          onClick={finish}
          type="button"
        >
          I understand
        </Button>
      </DialogContent>
    </Dialog>
  );
}
