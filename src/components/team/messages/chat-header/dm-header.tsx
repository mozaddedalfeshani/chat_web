"use client";

import { useState } from "react";
import { Bookmark01Icon, NotificationOff01Icon } from "hugeicons-react";
import { LockKeyhole } from "lucide-react";
import type { ChatConversation } from "@/lib/api";
import type { TeamMember } from "@/lib/api/types/team";
import PeerCallOrStatus from "@/components/shared/peer-call-or-status";
import { chatConvLabel, isAccountDeleted, isNoteToSelf } from "../chat-utils";
import { cn } from "@/lib/utils";
import DmActionsSheet from "./dm-actions-sheet";
import DmProfileDialog from "./dm-profile-dialog";
import DmCallActions from "./dm-call-actions";
import { useTypingLabel } from "@/lib/chat-typing/use-typing-label";

/**
 * The header capsule for a one-to-one thread.
 *
 * A note to self is the same thread shape with the viewer on both ends, so
 * everything that addresses a second person is dropped rather than pointed
 * back at them: no call buttons (the server has no callee to ring), no
 * presence line, no profile, no safety number. What is left — the name, the
 * lock, search and mute — is all that means anything alone.
 */
export default function DmHeader({
  conv,
  teamMembers,
  onOpenProfile,
  onSearch,
  onToggleMute,
}: {
  conv: ChatConversation;
  teamMembers: TeamMember[];
  onOpenProfile?: (userId: string) => void;
  onSearch: () => void;
  onToggleMute: () => void;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const selfNote = isNoteToSelf(conv);
  const accountDeleted = isAccountDeleted(conv);
  const hidePeerActions = selfNote || accountDeleted;
  const typingText = useTypingLabel(hidePeerActions ? null : conv.id, false);
  const label = chatConvLabel(conv);
  const peerMember =
    (conv.peer_user_id
      ? teamMembers.find((m) => m.user_id === conv.peer_user_id)
      : null) ?? null;

  const openProfile = () => {
    setSheetOpen(false);
    if (onOpenProfile && conv.peer_user_id) {
      onOpenProfile(conv.peer_user_id);
      return;
    }
    setProfileOpen(true);
  };

  return (
    <>
      <div className="flex shrink-0 items-center gap-0 rounded-full border border-[var(--border)] bg-[var(--surface2)] shadow-sm">
        <button
          type="button"
          onClick={() => (hidePeerActions ? setSheetOpen(true) : openProfile())}
          className={cn(
            "flex flex-col items-start justify-center gap-0.5 truncate rounded-l-full py-1 pl-3 pr-2 transition-colors",
            "hover:bg-white/[0.06] [data-theme=light]:hover:bg-black/[0.04]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--indigo)]",
            hidePeerActions && "rounded-r-full pr-3",
          )}
          aria-label="Conversation actions"
        >
          <span className="flex max-w-full items-center justify-center gap-1 text-sm font-semibold">
            {selfNote ? (
              <Bookmark01Icon
                size={14}
                className="shrink-0 text-[var(--indigo)]"
              />
            ) : (
              <LockKeyhole
                aria-label="End-to-end encrypted"
                className="size-3.5 shrink-0 text-emerald-600"
              />
            )}
            <span className="truncate">{label}</span>
            {conv.muted ? (
              <NotificationOff01Icon
                size={12}
                className="shrink-0 text-muted-foreground"
              />
            ) : null}
          </span>
          {hidePeerActions ? null : typingText ? (
            <span className="text-[11px] font-medium text-[var(--indigo)]">
              {typingText}
            </span>
          ) : (
            <PeerCallOrStatus userId={conv.peer_user_id} compact />
          )}
        </button>
        {hidePeerActions ? null : (
          <>
            <div className="h-5 w-px bg-[var(--border)]" />
            <DmCallActions conv={conv} capsule />
          </>
        )}
      </div>

      <DmActionsSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        peerUserId={conv.peer_user_id}
        peerName={label}
        peerAvatar={conv.peer_user_avatar}
        muted={!!conv.muted}
        noteToSelf={selfNote}
        accountDeleted={accountDeleted}
        onViewProfile={openProfile}
        onSearch={() => {
          setSheetOpen(false);
          onSearch();
        }}
        onToggleMute={() => {
          setSheetOpen(false);
          onToggleMute();
        }}
      />
      {hidePeerActions ? null : (
        <DmProfileDialog
          open={profileOpen}
          onOpenChange={setProfileOpen}
          peerUserId={conv.peer_user_id}
          peerName={label}
          peerAvatar={conv.peer_user_avatar}
          member={peerMember}
        />
      )}
    </>
  );
}
