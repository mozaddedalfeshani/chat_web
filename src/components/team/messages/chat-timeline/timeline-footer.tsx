"use client";

import type { Ref } from "react";
import type { ChatMessageQuote } from "@/lib/api/types/chat";
import type { TeamMember } from "@/lib/api/types/team";
import MessageComposer, {
  type MessageComposerHandle,
} from "./message-composer";
import MessageRequestBar from "./message-request-bar";
import ReplyPreviewBar from "./reply-preview-bar";

export type TimelineSend = (
  body: string,
  attachments: Parameters<
    NonNullable<Parameters<typeof MessageComposer>[0]["onSubmit"]>
  >[1],
  mentionedUserIds: string[],
  quotedMessageId: string | null,
) => void | boolean | Promise<void | boolean>;

export type TimelineMessageRequest = {
  peerName: string;
  onAccept: () => Promise<void> | void;
  onDelete: () => Promise<void> | void;
  onBlock: () => Promise<void> | void;
};

/**
 * Everything below the scroller, and only one of the three ever shows: a
 * closed-thread notice, an unanswered message request, or the composer.
 */
export default function TimelineFooter({
  showComposer,
  peerLeft,
  messageRequest,
  readOnlyLabel,
  composerRef,
  mentionMembers,
  currentUserId,
  replyTo,
  onClearReply,
  onSend,
  sending,
  onPresign,
  onDiscard,
  isFreeTier,
  placeholder,
  submitLabel,
  initialValue,
  isGroup,
  conversationId,
}: {
  showComposer: boolean;
  peerLeft: boolean;
  messageRequest?: TimelineMessageRequest;
  readOnlyLabel?: string;
  composerRef: Ref<MessageComposerHandle>;
  mentionMembers: TeamMember[];
  currentUserId: string;
  replyTo: ChatMessageQuote | null;
  onClearReply: () => void;
  onSend: TimelineSend;
  sending?: boolean;
  onPresign: Parameters<typeof MessageComposer>[0]["onPresign"];
  onDiscard: Parameters<typeof MessageComposer>[0]["onDiscard"];
  isFreeTier?: boolean;
  placeholder?: string;
  submitLabel?: string;
  initialValue?: string;
  isGroup: boolean;
  conversationId?: string | null;
}) {
  if (peerLeft) {
    return (
      <div
        className="shrink-0 border-t px-4 py-3 text-center text-xs"
        style={{
          borderColor: "var(--sig-border)",
          background: "var(--sig-bg)",
          color: "var(--sig-label-2)",
        }}
      >
        This user has left the team. You cannot send messages to them.
      </div>
    );
  }
  if (messageRequest) return <MessageRequestBar {...messageRequest} />;
  if (!showComposer && readOnlyLabel) {
    return (
      <div
        className="shrink-0 border-t px-4 py-3 text-center text-xs"
        style={{
          borderColor: "var(--sig-border)",
          background: "var(--sig-bg)",
          color: "var(--sig-label-2)",
        }}
      >
        {readOnlyLabel}
      </div>
    );
  }
  if (!showComposer) return null;

  return (
    <>
      {replyTo ? (
        <ReplyPreviewBar
          quote={replyTo}
          selfUserId={currentUserId}
          onCancel={onClearReply}
        />
      ) : null}
      <MessageComposer
        ref={composerRef}
        mentionMembers={mentionMembers}
        onSubmit={async (body, attachments, mentioned) => {
          const sent = await onSend(
            body,
            attachments,
            mentioned,
            replyTo?.message_id ?? null,
          );
          // The bar clears only on a send that actually went out — the draft
          // survives a failure, so its quote has to as well.
          if (sent !== false) onClearReply();
          return sent;
        }}
        busy={sending}
        onPresign={onPresign}
        onDiscard={onDiscard}
        isFreeTier={isFreeTier}
        placeholder={
          placeholder ??
          // A DM has nobody to mention, so the hint would name a control that
          // does nothing there.
          (mentionMembers.length > 0 ? undefined : "Message…")
        }
        submitLabel={submitLabel}
        initialValue={initialValue}
        allowMentionAll={isGroup}
        secureSend={!isGroup}
        typingConversationId={conversationId}
      />
    </>
  );
}
