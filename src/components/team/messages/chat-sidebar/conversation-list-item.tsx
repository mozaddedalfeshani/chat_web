"use client";

import type { ChatConversation } from "@/lib/api";
import ConversationRow from "../conversation-row";
import { chatConvLabel, chatInitials, isAccountDeleted, isNoteToSelf } from "../chat-utils";
import GroupAvatarStack from "./group-avatar-stack";
import { Bookmark01Icon, Link01Icon, UserIcon } from "hugeicons-react";
import { useTypingLabel } from "@/lib/chat-typing/use-typing-label";

/** One row in the unified list — a group (stacked avatars) or a DM (peer avatar). */
export default function ConversationListItem({
  conv,
  active,
  currentUserId,
  onSelect,
  searchSnippet,
  searchMessageId,
  onOpenProfile,
}: {
  conv: ChatConversation;
  active: boolean;
  currentUserId: string;
  onSelect: (id: string, messageId?: string) => void;
  searchSnippet?: string | null;
  searchMessageId?: string | null;
  onOpenProfile?: (userId: string) => void;
}) {
  const typingText = useTypingLabel(searchSnippet ? null : conv.id, conv.type !== "dm");
  const shared = {
    typingText,
    title: chatConvLabel(conv),
    lastMessageAt: conv.last_message_at,
    lastMessageBody: searchSnippet ?? conv.last_message_body,
    lastMessageUserId: searchSnippet ? undefined : conv.last_message_user_id,
    lastMessageAttachmentType: conv.last_message_attachment_type,
    lastMessageAttachmentName: conv.last_message_attachment_name,
    lastMessageAttachments: conv.last_message_attachments,
    currentUserId,
    unreadCount: conv.unread_count,
    active,
    onClick: () => onSelect(conv.id, searchMessageId ?? undefined),
  };

  if (conv.type !== "dm") {
    return (
      <ConversationRow
        {...shared}
        avatarNode={
          conv.type === "webhook" ? (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--indigo)_15%,transparent)] text-[var(--indigo)]">
              <Link01Icon size={22} />
            </div>
          ) : (
            <GroupAvatarStack
              avatars={conv.member_avatars}
              avatarUrl={conv.avatar_url}
              name={chatConvLabel(conv)}
            />
          )
        }
      />
    );
  }

  // A note to self has the viewer on both ends, so the peer avatar would be
  // their own picture with their own presence dot on it. Signal draws a
  // bookmark instead, and so do we.
  if (isNoteToSelf(conv)) {
    return (
      <ConversationRow
        {...shared}
        avatarNode={
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--indigo)_15%,transparent)] text-[var(--indigo)]">
            <Bookmark01Icon size={22} />
          </div>
        }
      />
    );
  }

  if (isAccountDeleted(conv)) {
    return (
      <ConversationRow
        {...shared}
        avatarNode={
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--sig-fill)] text-[var(--sig-label-2)]">
            <UserIcon size={22} />
          </div>
        }
      />
    );
  }

  return (
    <ConversationRow
      {...shared}
      avatarUrl={conv.peer_user_avatar}
      avatarFallback={chatInitials(conv.peer_user_name)}
      peerUserId={conv.peer_user_id}
      onAvatarClick={
        conv.peer_user_id && onOpenProfile
          ? () => onOpenProfile(conv.peer_user_id!)
          : undefined
      }
    />
  );
}
