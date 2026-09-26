"use client";

import { useState } from "react";
import {
  UserIcon,
  Search01Icon,
  NotificationOff01Icon,
  Bookmark01Icon,
  PaintBoardIcon,
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
import WallpaperDialog from "../wallpaper/wallpaper-dialog";
import { Flag, Images, Pin, PinOff } from "lucide-react";
import SharedMediaDialog from "../chat-details/shared-media-dialog";
import ReportConversationDialog from "../chat-details/report-conversation-dialog";

function ActionRow({
  icon,
  label,
  description,
  onClick,
  disabled,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-white/[0.05] disabled:opacity-50 [data-theme=light]:hover:bg-black/[0.04] ${danger ? "text-red-500" : ""}`}>
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
  conversationId,
  peerUserId,
  peerName,
  peerAvatar,
  muteLabel,
  pinned,
  noteToSelf = false,
  accountDeleted = false,
  onViewProfile,
  onSearch,
  onTogglePin,
  onReport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  peerUserId?: string;
  peerName: string;
  peerAvatar?: string;
  /** What the mute is ("Muted until 5:30 PM"), null when not muted. */
  muteLabel: string | null;
  pinned: boolean;
  /** Note to Self: the "peer" is the viewer, so profile and presence go. */
  noteToSelf?: boolean;
  /** Deleted peer: no profile, no presence, generic avatar. */
  accountDeleted?: boolean;
  onViewProfile: () => void;
  onSearch: () => void;
  onTogglePin: () => void;
  onReport: (block: boolean) => void;
}) {
  const [wallpaperOpen, setWallpaperOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <>
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
            icon={<PaintBoardIcon size={18} />}
            label="Chat color & wallpaper"
            onClick={() => {
              onOpenChange(false);
              setWallpaperOpen(true);
            }}
          />
          <ActionRow
            icon={<Search01Icon size={18} />}
            label="Search in conversation"
            onClick={onSearch}
          />
          {muteLabel ? (
            // Read-only: muting is set on the phone, the web only shows it.
            <div className="flex w-full items-center gap-3 px-5 py-3 text-left">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--text)]" style={{ background: "var(--surface2)" }}>
                <NotificationOff01Icon size={18} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-[var(--text)]">{muteLabel}</span>
                <span className="block text-xs text-[var(--text-muted)]">
                  Change notifications in the AbabilX app
                </span>
              </span>
            </div>
          ) : null}
          <ActionRow
            icon={pinned ? <PinOff size={18} /> : <Pin size={18} />}
            label={pinned ? "Unpin conversation" : "Pin conversation"}
            onClick={onTogglePin}
          />
          <ActionRow
            icon={<Images size={18} />}
            label="Shared media and files"
            onClick={() => {
              onOpenChange(false);
              setMediaOpen(true);
            }}
          />
          {noteToSelf || accountDeleted ? null : (
            <ActionRow
              icon={<Flag size={18} />}
              label="Report spam"
              description="Report this conversation, with an option to block"
              danger
              onClick={() => {
                onOpenChange(false);
                setReportOpen(true);
              }}
            />
          )}
        </div>
      </DrawerContent>
    </Drawer>
    <WallpaperDialog
      conversationId={conversationId}
      open={wallpaperOpen}
      onOpenChange={setWallpaperOpen}
    />
    <SharedMediaDialog
      conversationId={conversationId}
      open={mediaOpen}
      onOpenChange={setMediaOpen}
    />
    <ReportConversationDialog
      open={reportOpen}
      onOpenChange={setReportOpen}
      canBlock
      onReport={onReport}
    />
    </>
  );
}
