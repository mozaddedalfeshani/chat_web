"use client";

import {
  UserIcon,
  Search01Icon,
  Notification01Icon,
  NotificationOff01Icon,
  Bookmark01Icon,
} from "hugeicons-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import PeerCallOrStatus from "@/components/shared/peer-call-or-status";
import { chatInitials } from "../chat-utils";

function ActionRow({
  icon,
  label,
  description,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-white/[0.05] disabled:opacity-50 [data-theme=light]:hover:bg-black/[0.04]">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--text)]" style={{ background: "var(--surface2)" }}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-[var(--text)]">{label}</span>
        {description ? (
          <span className="block text-xs text-[var(--text-muted)]">
            {description}
          </span>
        ) : null}
      </span>
    </button>
  );
}

export default function DmActionsSheet({
  open,
  onOpenChange,
  peerUserId,
  peerName,
  peerAvatar,
  muted,
  noteToSelf = false,
  accountDeleted = false,
  onViewProfile,
  onSearch,
  onToggleMute,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  peerUserId?: string;
  peerName: string;
  peerAvatar?: string;
  muted: boolean;
  /** Note to Self: the "peer" is the viewer, so profile and presence go. */
  noteToSelf?: boolean;
  /** Deleted peer: no profile, no presence, generic avatar. */
  accountDeleted?: boolean;
  onViewProfile: () => void;
  onSearch: () => void;
  onToggleMute: () => void;
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="pb-4">
        <DrawerHeader className="flex flex-col items-center gap-2 pb-2 text-center">
          {noteToSelf ? (
            <span
              className="flex h-14 w-14 items-center justify-center rounded-full text-[var(--indigo)]"
              style={{
                background: "color-mix(in srgb, var(--indigo) 15%, transparent)",
              }}>
              <Bookmark01Icon size={24} />
            </span>
          ) : accountDeleted ? (
            <span
              className="flex h-14 w-14 items-center justify-center rounded-full text-[var(--sig-label-2)]"
              style={{ background: "var(--sig-fill)" }}
            >
              <UserIcon size={24} />
            </span>
          ) : (
            <Avatar className="h-14 w-14">
              <AvatarImage src={peerAvatar} alt={peerName} />
              <AvatarFallback style={{ background: "var(--surface3)" }}>
                {chatInitials(peerName)}
              </AvatarFallback>
            </Avatar>
          )}
          <DrawerTitle>{peerName}</DrawerTitle>
          {noteToSelf ? (
            <span className="text-xs text-[var(--text-muted)]">
              Messages and files you send here stay between your own devices.
            </span>
          ) : accountDeleted ? null : (
            <PeerCallOrStatus userId={peerUserId} />
          )}
        </DrawerHeader>

        <div className="mt-1">
          {noteToSelf || accountDeleted ? null : (
            <ActionRow
              icon={<UserIcon size={18} />}
              label="View profile"
              onClick={onViewProfile}
            />
          )}
          <ActionRow
            icon={<Search01Icon size={18} />}
            label="Search in conversation"
            onClick={onSearch}
          />
          <ActionRow
            icon={
              muted ? (
                <Notification01Icon size={18} />
              ) : (
                <NotificationOff01Icon size={18} />
              )
            }
            label={muted ? "Unmute notifications" : "Mute notifications"}
            description={
              muted
                ? "You'll be notified about new messages again"
                : "Stop notifications from this chat"
            }
            onClick={onToggleMute}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
