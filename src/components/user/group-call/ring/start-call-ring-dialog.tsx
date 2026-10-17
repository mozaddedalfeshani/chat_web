"use client";

import { useEffect, useMemo, useState } from "react";
import { Loading03Icon, Search01Icon, UserGroupIcon } from "hugeicons-react";
import { api } from "@/lib/api";
import type { ChatMember } from "@/lib/api/types/chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { chatInitials } from "@/components/team/messages/chat-utils";
import { normalizeRingPick, ringButtonLabel } from "./ring-pick";

/**
 * Who a NEW group call rings (server 0172), asked when Meet is pressed — the
 * web has no lobby, so this dialog is where desktop's "Ring · Everyone ›" and
 * mobile's ring sheet live. Everyone left out still sees the call in the chat
 * and can join; only the ringing is skipped. A roster that will not load
 * falls back to ringing everyone, as every call did before.
 */
export default function StartCallRingDialog({
  conversationId,
  currentUserId,
  onStart,
  onClose,
}: {
  conversationId: string;
  currentUserId: string;
  /** `undefined` = everyone (no list sent), `[]` = nobody. */
  onStart: (ring?: string[]) => void;
  onClose: () => void;
}) {
  const [members, setMembers] = useState<ChatMember[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");

  useEffect(() => {
    let alive = true;
    api
      .listChatChannelMembers(conversationId)
      .then((roster) => {
        if (!alive) return;
        const others = roster.filter((m) => m.user_id !== currentUserId);
        setMembers(others);
        setPicked(new Set(others.map((m) => m.user_id)));
      })
      .catch(() => alive && setMembers([]));
    return () => {
      alive = false;
    };
  }, [conversationId, currentUserId]);

  const ids = useMemo(() => (members ?? []).map((m) => m.user_id), [members]);
  const everyone = picked.size === ids.length;
  const next = normalizeRingPick(picked, ids);
  const q = query.trim().toLowerCase();
  const shown = (members ?? []).filter((m) => !q || m.name.toLowerCase().includes(q));

  const toggle = (id: string) =>
    setPicked((current) => {
      const copy = new Set(current);
      if (copy.has(id)) copy.delete(id);
      else copy.add(id);
      return copy;
    });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md gap-3">
        <DialogTitle>Start a call</DialogTitle>
        <DialogDescription>
          Choose who to ring. Everyone else can still see the call and join it.
        </DialogDescription>
        {members === null ? (
          <div className="flex justify-center py-8">
            <Loading03Icon className="h-5 w-5 animate-spin text-[var(--sig-label-2)]" />
          </div>
        ) : members.length > 0 ? (
          <>
            {members.length > 8 ? (
              <label className="flex items-center gap-2 rounded-md border border-[var(--sig-border)] px-3 py-2 text-sm">
                <Search01Icon size={16} className="text-[var(--sig-label-2)]" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search"
                  className="w-full bg-transparent outline-none"
                />
              </label>
            ) : null}
            <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-[var(--sig-fill)]">
              <span className="grid size-9 place-items-center rounded-full bg-[var(--sig-fill-strong)]">
                <UserGroupIcon size={18} />
              </span>
              <span className="flex-1 text-sm font-medium">Everyone</span>
              <input
                type="checkbox"
                checked={everyone}
                ref={(el) => {
                  if (el) el.indeterminate = !everyone && picked.size > 0;
                }}
                onChange={() => setPicked(everyone ? new Set() : new Set(ids))}
                className="size-4 accent-[var(--indigo)]"
              />
            </label>
            <div className="max-h-[50vh] overflow-y-auto border-t border-[var(--sig-border)] pt-1">
              {shown.map((m) => (
                <label
                  key={m.user_id}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-[var(--sig-fill)]"
                >
                  <Avatar className="size-9">
                    <AvatarImage src={m.avatar_url} alt={m.name} />
                    <AvatarFallback className="text-xs">{chatInitials(m.name)}</AvatarFallback>
                  </Avatar>
                  <span className="flex-1 truncate text-sm">{m.name}</span>
                  <input
                    type="checkbox"
                    checked={picked.has(m.user_id)}
                    onChange={() => toggle(m.user_id)}
                    className="size-4 accent-[var(--indigo)]"
                  />
                </label>
              ))}
            </div>
          </>
        ) : null}
        <button
          type="button"
          disabled={members === null}
          onClick={() => onStart(next === null ? undefined : next)}
          className="rounded-full bg-[var(--green)] px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {members && members.length > 0
            ? `Start call · ${ringButtonLabel(next, ids.length)}`
            : "Start call"}
        </button>
      </DialogContent>
    </Dialog>
  );
}
