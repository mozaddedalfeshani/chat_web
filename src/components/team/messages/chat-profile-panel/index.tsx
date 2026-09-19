"use client";

import { useMemo, useState } from "react";
import { Cancel01Icon, Mail01Icon, Message01Icon, UserGroupIcon } from "hugeicons-react";
import { Button } from "@/components/ui/button";
import type { TeamMember } from "@/lib/api/types/team";
import type { ChatConversation } from "@/lib/api";
import ImagePreviewDialog from "@/components/team/board/dialogs/image-preview";
import PeerCallOrStatus from "@/components/shared/peer-call-or-status";
import { chatConvLabel, chatInitials } from "../chat-utils";
import GroupAvatarStack from "../chat-sidebar/group-avatar-stack";
import ProfileHero from "./profile-hero";
import ProfileContact from "./profile-contact";
import WallpaperRow from "../wallpaper/wallpaper-row";

export default function ChatProfilePanel({
  userId,
  member,
  fallbackName,
  fallbackAvatar,
  conversationId,
  onClose,
  channels,
  currentUserId,
  onOpenConversation,
  onStartDM,
}: {
  userId: string;
  member: TeamMember | null;
  fallbackName: string;
  fallbackAvatar?: string;
  /** When set (usually the open DM), offers a wallpaper row for this chat. */
  conversationId?: string | null;
  onClose: () => void;
  channels: ChatConversation[];
  currentUserId: string;
  onOpenConversation: (id: string) => void;
  onStartDM: (userId: string) => void;
}) {
  const [photoOpen, setPhotoOpen] = useState(false);
  const name = member?.name || fallbackName;
  const avatar = member?.avatar_url || fallbackAvatar;
  const role = member?.role
    ? member.role.charAt(0).toUpperCase() + member.role.slice(1)
    : null;
  const title = member?.tags?.filter(Boolean)[0] ?? role;
  const username = member?.username || member?.github_username;
  const isSelf = userId === currentUserId;

  const commonGroups = useMemo(
    () =>
      channels.filter(
        (c) =>
          c.type !== "dm" &&
          c.member_avatars !== undefined &&
          c.member_count !== undefined &&
          c.member_count > 0,
      ),
    [channels],
  );

  return (
    <aside
      className="relative flex min-h-0 min-w-0 shrink-0 flex-col overflow-hidden border-l"
      style={{ borderColor: "var(--border)", width: "360px" }}
    >
      <Button
        type="button"
        variant="secondary"
        size="icon"
        className="absolute right-3 top-3 z-30 h-7 w-7 rounded-full bg-black/50 text-white shadow-lg backdrop-blur-sm hover:bg-black/70"
        aria-label="Close profile"
        onClick={onClose}
      >
        <Cancel01Icon size={14} />
      </Button>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <ProfileHero
          name={name}
          avatarUrl={avatar}
          initials={chatInitials(name)}
          onOpenPhoto={avatar ? () => setPhotoOpen(true) : undefined}
        />

        <div className="space-y-3 px-4 pb-6 pt-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-[var(--text)]">
              {name}
            </h2>
            {title ? (
              <p className="mt-0.5 text-sm text-muted-foreground">{title}</p>
            ) : null}
            {username ? (
              <p className="mt-0.5 text-sm text-muted-foreground">@{username}</p>
            ) : null}
          </div>

          <PeerCallOrStatus userId={userId} />

          {conversationId ? (
            <WallpaperRow conversationId={conversationId} />
          ) : null}

          {!isSelf ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-full gap-2"
              onClick={() => {
                onStartDM(userId);
                onClose();
              }}
            >
              <Message01Icon size={16} />
              Message
            </Button>
          ) : null}

          {member?.email ? (
            <div>
              <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Contact
              </h4>
              <ProfileContact
                icon={<Mail01Icon size={18} />}
                value={member.email}
                label="Work"
                href={`mailto:${member.email}`}
              />
            </div>
          ) : null}

          {commonGroups.length > 0 ? (
            <div>
              <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Channels
              </h4>
              <div className="space-y-0.5">
                {commonGroups.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      onOpenConversation(g.id);
                      onClose();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/[0.05] [data-theme=light]:hover:bg-black/[0.04]"
                  >
                    <GroupAvatarStack
                      avatars={g.member_avatars}
                      avatarUrl={g.avatar_url}
                      name={chatConvLabel(g)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--text)]">
                        {chatConvLabel(g)}
                      </p>
                      {g.member_count ? (
                        <p className="text-xs text-muted-foreground">
                          {g.member_count} {g.member_count === 1 ? "member" : "members"}
                        </p>
                      ) : null}
                    </div>
                    <UserGroupIcon size={14} className="shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <ImagePreviewDialog
        open={photoOpen}
        src={avatar ?? null}
        alt={name}
        onOpenChange={setPhotoOpen}
      />
    </aside>
  );
}
