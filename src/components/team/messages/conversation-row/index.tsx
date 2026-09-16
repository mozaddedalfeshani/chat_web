"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import PresenceAvatar from "@/components/shared/presence-avatar";
import PeerCallOrStatus from "@/components/shared/peer-call-or-status";
import ChatMessagePreview from "../chat-message-preview";
import type { ChatPreviewAttachment } from "../chat-preview-utils";
import { chatInitials, chatListTime } from "../chat-utils";
import { cn } from "@/lib/utils";

export default function ConversationRow({
  title,
  avatarUrl,
  avatarFallback,
  peerUserId,
  lastMessageAt,
  lastMessageBody,
  lastMessageUserId,
  lastMessageAttachmentType,
  lastMessageAttachmentName,
  lastMessageAttachments,
  currentUserId,
  unreadCount = 0,
  active,
  onClick,
  prefix,
  showAvatar = true,
  avatarNode,
  onAvatarClick,
  typingText,
}: {
  title: string;
  avatarUrl?: string;
  avatarFallback?: string;
  peerUserId?: string;
  lastMessageAt?: string | null;
  lastMessageBody?: string;
  lastMessageUserId?: string;
  lastMessageAttachmentType?: string;
  lastMessageAttachmentName?: string;
  lastMessageAttachments?: ChatPreviewAttachment[];
  currentUserId?: string;
  unreadCount?: number;
  active?: boolean;
  onClick: () => void;
  prefix?: React.ReactNode;
  showAvatar?: boolean;
  avatarNode?: React.ReactNode;
  onAvatarClick?: () => void;
  /** While somebody is typing, this replaces the last-message preview. */
  typingText?: string;
}) {
  const isYou =
    !!currentUserId &&
    !!lastMessageUserId &&
    lastMessageUserId === currentUserId;
  const previewPrefix = isYou ? "You: " : "";
  const hasUnread = unreadCount > 0 && !active;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex h-[72px] w-full items-center gap-3 overflow-hidden rounded-[10px] px-3.5 py-2 text-left transition-colors",
        active ? "bg-[var(--sig-fill-pressed)]" : "hover:bg-[var(--sig-fill)]",
      )}
    >
      {avatarNode ? (
        <div className="shrink-0">{avatarNode}</div>
      ) : showAvatar ? (
        <PresenceAvatar userId={peerUserId}>
          <Avatar
            className={cn(
              "h-12 w-12 shrink-0 rounded-full",
              onAvatarClick && "cursor-pointer",
            )}
            onClick={
              onAvatarClick
                ? (e) => {
                    e.stopPropagation();
                    onAvatarClick();
                  }
                : undefined
            }
          >
            <AvatarImage src={avatarUrl} alt="" />
            <AvatarFallback className="text-sm">
              {avatarFallback ?? chatInitials(title)}
            </AvatarFallback>
          </Avatar>
        </PresenceAvatar>
      ) : (
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-semibold"
          style={{
            background: "var(--sig-surface-3)",
            color: "var(--sig-label-2)",
          }}
        >
          {prefix ?? "#"}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "min-w-0 truncate text-[14px] text-[var(--sig-label)]",
              hasUnread ? "font-semibold" : "font-normal",
            )}
          >
            {title}
          </span>
          {peerUserId ? (
            <PeerCallOrStatus userId={peerUserId} compact />
          ) : null}
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            {lastMessageAt ? (
              <span
                className={cn(
                  "text-[12px] text-[var(--sig-label-2)]",
                  hasUnread && "font-medium",
                )}
              >
                {chatListTime(lastMessageAt)}
              </span>
            ) : null}
            {hasUnread ? (
              <span
                className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] font-medium text-white"
                style={{ background: "var(--sig-accent)" }}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </div>
        </div>
        <div className="mt-0.5 flex min-w-0 items-center gap-1.5 overflow-hidden">
          {typingText ? (
            <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-[var(--sig-accent)]">
              {typingText}
            </span>
          ) : (
          <ChatMessagePreview
            body={lastMessageBody}
            attachmentType={lastMessageAttachmentType}
            attachmentName={lastMessageAttachmentName}
            attachments={lastMessageAttachments}
            prefix={previewPrefix}
            className={cn(
              "min-w-0 flex-1 text-[14px] text-[var(--sig-label-2)]",
              hasUnread && "font-medium text-[var(--sig-label)]",
            )}
          />
          )}
        </div>
      </div>
    </button>
  );
}
