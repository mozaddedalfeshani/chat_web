"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { friendlyError } from "@/lib/api/error-messages";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  useUserStatusStore,
  type UserStatus,
} from "@/store/user-status-store";

const PRESETS = [
  { emoji: "📅", label: "In a meeting" },
  { emoji: "🚗", label: "Commuting" },
  { emoji: "🤒", label: "Out sick" },
  { emoji: "🌴", label: "Vacationing" },
  { emoji: "🏡", label: "Working remotely" },
] as const;

const DURATIONS = [
  { hours: 1, label: "1 hour" },
  { hours: 4, label: "4 hours" },
  { hours: 8, label: "8 hours" },
  { hours: 24, label: "24 hours" },
] as const;

const DEFAULT_EMOJI = "💬";

export default function SetStatusDialog({
  open,
  onOpenChange,
  currentUserId,
  initial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
  initial?: UserStatus | null;
}) {
  const setLocal = useUserStatusStore((s) => s.setStatus);
  const [emoji, setEmoji] = useState(DEFAULT_EMOJI);
  const [text, setText] = useState("");
  const [durationHours, setDurationHours] = useState(4);
  const [saving, setSaving] = useState(false);

  // Adjust form state when dialog opens / initial status changes (React render pattern).
  const initialEmoji = initial?.emoji?.trim() || DEFAULT_EMOJI;
  const initialText = initial?.text ?? "";
  const formSnapshot = `${open}|${initialEmoji}|${initialText}`;
  const [prevFormSnapshot, setPrevFormSnapshot] = useState(formSnapshot);
  if (formSnapshot !== prevFormSnapshot) {
    setPrevFormSnapshot(formSnapshot);
    if (open) {
      setEmoji(initialEmoji);
      setText(initialText);
      setDurationHours(4);
    }
  }

  async function save() {
    const trimmed = text.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      const saved = await api.setUserStatus({
        emoji,
        text: trimmed,
        duration_hours: durationHours,
      });
      setLocal(currentUserId, {
        emoji: saved.emoji,
        text: saved.text,
        expiresAt: saved.expires_at,
      });
      onOpenChange(false);
    } catch (e) {
      toast.error(friendlyError(e, "Could not update status"));
    } finally {
      setSaving(false);
    }
  }

  async function clear() {
    if (saving) return;
    setSaving(true);
    try {
      await api.clearUserStatus();
      setLocal(currentUserId, null);
      onOpenChange(false);
    } catch (e) {
      toast.error(friendlyError(e, "Could not clear status"));
    } finally {
      setSaving(false);
    }
  }

  const hasCurrent = !!initial?.text?.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Set a status</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl"
            style={{ background: "var(--surface2)" }}
            aria-hidden
          >
            {emoji}
          </span>
          <Input
            value={text}
            maxLength={40}
            placeholder="What's your status?"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void save();
            }}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                setEmoji(p.emoji);
                setText(p.label);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--text)] transition-colors hover:bg-white/[0.04] [data-theme=light]:hover:bg-black/[0.04]"
            >
              <span>{p.emoji}</span>
              {p.label}
            </button>
          ))}
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-[var(--text-muted)]">
            Clear after
          </p>
          <div className="flex flex-wrap gap-2">
            {DURATIONS.map((d) => (
              <button
                key={d.hours}
                type="button"
                onClick={() => setDurationHours(d.hours)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs transition-colors",
                  durationHours === d.hours
                    ? "border-indigo-500/50 bg-indigo-500/15 font-semibold text-indigo-300"
                    : "border-[var(--border)] text-[var(--text-muted)] hover:bg-white/[0.04]",
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {hasCurrent ? (
            <Button
              type="button"
              variant="ghost"
              disabled={saving}
              onClick={() => void clear()}
            >
              Clear status
            </Button>
          ) : null}
          <Button
            type="button"
            disabled={saving || !text.trim()}
            onClick={() => void save()}
          >
            {saving ? "Saving…" : "Save status"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
