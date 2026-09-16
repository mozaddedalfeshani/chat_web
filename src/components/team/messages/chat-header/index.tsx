"use client";

import { useRef, useState } from "react";
import { Menu01Icon } from "hugeicons-react";
import { type ChatConversation } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useTeamContextOptional } from "@/components/team/shared/team-provider";
import { useChatStore } from "@/store/chat-store";
import { chatConvLabel } from "../chat-utils";
import { cn } from "@/lib/utils";
import GroupAvatarStack from "../chat-sidebar/group-avatar-stack";
import GroupTypingLine from "./group-typing-line";
import GroupDetailsDialog from "./group-details-dialog";
import DeleteGroupDialog from "./delete-group-dialog";
import DmHeader from "./dm-header";
import GroupCallAction from "./group-call-action";
import { useChatHeaderActions } from "./use-chat-header-actions";
import { t } from "@/lib/i18n";

export default function ChatHeader({
  activeConv,
  onOpenMobileNav,
  language,
  onOpenProfile,
  profileOpen = false,
}: {
  activeConv: ChatConversation | null;
  onOpenMobileNav: () => void;
  language?: string | null;
  onOpenProfile?: (userId: string) => void;
  /** Hide the capsule when the profile side-panel is showing. */
  profileOpen?: boolean;
}) {
  const teamCtx = useTeamContextOptional();
  const currentUserId = useChatStore((s) => s.currentUserId);
  const upsertChannel = useChatStore((s) => s.upsertChannel);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const actions = useChatHeaderActions(activeConv, language);

  // Dialog open-state lives on this persistent header, so it must be cleared
  // whenever the active conversation changes — otherwise a dialog left open on
  // one group (or one that unmounted mid-delete) resurrects on the next group.
  const prevConvId = useRef(activeConv?.id);
  if (prevConvId.current !== activeConv?.id) {
    prevConvId.current = activeConv?.id;
    if (detailsOpen) setDetailsOpen(false);
    if (deleteOpen) setDeleteOpen(false);
  }

  const isGroup = !!activeConv && activeConv.type !== "dm";
  const isDM = activeConv?.type === "dm";
  // Every group answers to its own ADMINS since migration 0145 — plural, and
  // decided by the server in `my_role`, never by created_by: a creator who has
  // been demoted is an ordinary member, and a converted workspace channel's
  // creator is admin only if the migration made them one.
  const isGroupAdmin = activeConv?.my_role === "admin";
  const canManage = isGroupAdmin;
  const canDeleteGroup = isGroupAdmin;
  // The group's own switches can widen these two past "admins only".
  const canEditInfo = isGroupAdmin || activeConv?.edit_info_role === "member";
  const canAddMembers = isGroupAdmin || activeConv?.add_members_role === "member";
  const teamMembers = teamCtx?.detail?.members ?? [];

  function openConversationSearch() {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 1023px)").matches
    ) {
      onOpenMobileNav();
    }
    requestAnimationFrame(() => {
      window.dispatchEvent(new CustomEvent("chat:focus-search"));
    });
  }

  if (!activeConv || profileOpen) return null;

  return (
    <header
      className="relative z-10 flex shrink-0 items-center gap-2 border-b px-3 py-2 pr-3 lg:px-4 lg:py-3 lg:pr-4"
      style={{ background: "var(--sig-bg)", borderColor: "var(--sig-border)" }}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 lg:hidden"
        onClick={onOpenMobileNav}
        aria-label="Open conversations"
      >
        <Menu01Icon className="h-4 w-4" />
      </Button>

      <div className="flex-1" />

      {isGroup && activeConv ? (
        <>
          <div className="flex shrink-0 items-center gap-0 rounded-full border border-[var(--border)] bg-[var(--surface2)] shadow-sm">
            <button
              type="button"
              onClick={() => setDetailsOpen(true)}
              className={cn(
                "flex items-center gap-1.5 truncate rounded-l-full py-1 pl-3 pr-2 text-sm font-semibold transition-colors",
                "hover:bg-white/[0.06] [data-theme=light]:hover:bg-black/[0.04]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--indigo)]",
              )}
              aria-label={t(language, "chat.groupDetails")}
            >
              <span className="flex min-w-0 flex-col items-start">
                <span className="truncate">{chatConvLabel(activeConv)}</span>
                {activeConv.type !== "webhook" ? (
                  <GroupTypingLine conversationId={activeConv.id} />
                ) : null}
              </span>
            </button>
            <div className="h-5 w-px bg-[var(--border)]" />
            <div className="flex items-center gap-1 pr-0.5 pl-1">
              <button
                type="button"
                onClick={() => setDetailsOpen(true)}
                className="shrink-0 rounded-md p-0.5 transition-colors hover:bg-white/[0.06] [data-theme=light]:hover:bg-black/[0.04]"
                aria-label={t(language, "chat.groupDetails")}
              >
                <GroupAvatarStack
                  variant="row"
                  avatars={activeConv.member_avatars}
                  avatarUrl={activeConv.avatar_url}
                  name={chatConvLabel(activeConv)}
                  count={activeConv.member_count}
                  compact
                />
              </button>
              <GroupCallAction conversation={activeConv} capsule />
            </div>
          </div>
          <GroupDetailsDialog
            open={detailsOpen}
            onOpenChange={setDetailsOpen}
            conv={activeConv}
            canManage={canManage}
            canEditInfo={canEditInfo}
            canAddMembers={canAddMembers}
            canDelete={canDeleteGroup}
            currentUserId={currentUserId}
            onRenamed={upsertChannel}
            onCopyLink={() => void actions.copyLink()}
            onArchive={() => void actions.archive()}
            onLeave={() => void actions.leave()}
            onRequestDelete={() => {
              setDetailsOpen(false);
              setDeleteOpen(true);
            }}
            language={language}
          />
          <DeleteGroupDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            groupName={chatConvLabel(activeConv)}
            onConfirm={actions.deleteGroup}
            language={language}
          />
        </>
      ) : isDM && activeConv ? (
        <DmHeader
          key={activeConv.id}
          conv={activeConv}
          teamMembers={teamMembers}
          onOpenProfile={onOpenProfile}
          onSearch={openConversationSearch}
          onToggleMute={() => void actions.toggleMute()}
        />
      ) : (
        <h2 className="flex min-w-0 items-center gap-1.5 truncate text-base font-semibold">
          <span className="truncate rounded-full border border-[var(--border)] bg-[var(--surface2)] px-4 py-1.5 shadow-sm">
            {activeConv ? chatConvLabel(activeConv) : t(language, "chat.chats")}
          </span>
        </h2>
      )}
    </header>
  );
}
