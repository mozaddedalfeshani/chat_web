"use client";

import { Mail01Icon, GithubIcon, UserIcon } from "hugeicons-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { TeamMember } from "@/lib/api/types/team";
import PeerCallOrStatus from "@/components/shared/peer-call-or-status";
import { chatInitials } from "../chat-utils";
import SafetyNumberSection from "../safety-number";
import WallpaperRow from "../wallpaper/wallpaper-row";

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg px-3 py-2.5" style={{ background: "var(--surface2)" }}>
      <span className="shrink-0 text-[var(--text-muted)]">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
          {label}
        </p>
        <p className="truncate text-sm text-[var(--text)]">{value}</p>
      </div>
    </div>
  );
}

export default function DmProfileDialog({
  open,
  onOpenChange,
  conversationId,
  peerUserId,
  peerName,
  peerAvatar,
  member,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  peerUserId?: string;
  peerName: string;
  peerAvatar?: string;
  member: TeamMember | null;
}) {
  const username = member?.username || member?.github_username;
  const email = member?.email;
  const roleLabel = member?.role
    ? member.role.charAt(0).toUpperCase() + member.role.slice(1)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="sr-only">Profile</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3 pb-2">
          <Avatar className="h-20 w-20">
            <AvatarImage src={peerAvatar} alt={peerName} />
            <AvatarFallback className="text-xl" style={{ background: "var(--surface3)" }}>
              {chatInitials(peerName)}
            </AvatarFallback>
          </Avatar>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-[var(--text)]">{peerName}</h3>
            <div className="mt-2 flex justify-center">
              <PeerCallOrStatus userId={peerUserId} />
            </div>
            {roleLabel ? (
              <span
                className="mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium text-[var(--indigo-light)]"
                style={{ background: "var(--indigo-glow)" }}>
                {roleLabel}
              </span>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          {username ? (
            <InfoRow
              icon={<GithubIcon size={16} />}
              label="Username"
              value={`@${username}`}
            />
          ) : null}
          {email ? (
            <InfoRow
              icon={<Mail01Icon size={16} />}
              label="Email"
              value={email}
            />
          ) : null}
          {!username && !email ? (
            <InfoRow
              icon={<UserIcon size={16} />}
              label="Member"
              value={peerName}
            />
          ) : null}
          <WallpaperRow conversationId={conversationId} />
          <SafetyNumberSection peerUserId={peerUserId} peerName={peerName} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
