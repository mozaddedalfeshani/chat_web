"use client";

import type { ChatMessage } from "@/lib/api";
import type { TeamMember } from "@/lib/api/types/team";
import type { ChatAttachmentInput } from "@/lib/api/types/chat";
import CommentThreadPanel from "@/components/team/board/comments/thread-panel";
import { MAX_WALL_ATTACHMENT_BYTES } from "@/components/team/wall/wall-attachment-limits";
import { chatToThreadMessage } from "../chat-message-utils";

export default function ChatThreadPanel({
  rootId,
  messages,
  members,
  currentUserId,
  busy,
  onClose,
  onSubmitReply,
  onDeleteMessage,
  onEditMessage,
  onToggleReaction,
  onPresign,
  onDiscard,
  isFreeTier,
}: {
  rootId: string;
  messages: ChatMessage[];
  members: TeamMember[];
  currentUserId: string;
  busy?: boolean;
  onClose: () => void;
  onSubmitReply: (
    body: string,
    parentId: string,
    attachments: ChatAttachmentInput[],
  ) => void | Promise<void>;
  onDeleteMessage: (messageId: string) => void | Promise<void>;
  onEditMessage: (messageId: string, body: string) => void | Promise<void>;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onPresign: (
    contentType: string,
    fileName: string,
    sizeBytes?: number,
  ) => Promise<{ upload_url: string; public_url: string }>;
  onDiscard: (fileUrl: string) => Promise<void>;
  isFreeTier?: boolean;
}) {
  const threadMessages = messages.map(chatToThreadMessage);

  return (
    <CommentThreadPanel
      markdown
      rootId={rootId}
      messages={threadMessages}
      members={members}
      currentUserId={currentUserId}
      busy={busy}
      onClose={onClose}
      onSubmitReply={onSubmitReply}
      onDeleteMessage={onDeleteMessage}
      onEditMessage={onEditMessage}
      onToggleReaction={(emoji, messageId) => {
        if (messageId) onToggleReaction(messageId, emoji);
      }}
      onPresign={onPresign}
      onDiscard={onDiscard}
      acceptAllFileTypes
      maxFileSizeBytes={MAX_WALL_ATTACHMENT_BYTES}
      autoMentionReply={false}
      replyPlaceholder="Reply in thread..."
      isFreeTier={isFreeTier}
      avatarClassName="rounded-md"
      deferUpload
    />
  );
}
