"use client";

import type { ChatMessage } from "@/lib/api";
import ThreadReplySummary from "@/components/team/board/comments/reply-summary";
import { chatToThreadMessage } from "../chat-message-utils";
import { VoiceCallEventRow } from "./voice-call-event";
import { GroupCallEventRow } from "./group-call-event";
import GroupEventRow from "./group-event-row";
import WebhookMessageRow from "./webhook-message-row";
import ChatBubble from "./chat-bubble";

export function ChatTimelineItemRow({
  message,
  currentUserId,
  isGroupConversation,
  groupedAbove,
  groupedBelow,
  activeThreadRootId,
  threadRepliesByRoot,
  highlightMessageId,
  onToggleReaction,
  onOpenThread,
  onEditMessage,
  onDeleteMessage,
  onForwardMessage,
  onOpenProfile,
  onReply,
  onJumpToMessage,
}: {
  message: ChatMessage;
  currentUserId: string;
  isGroupConversation: boolean;
  groupedAbove: boolean;
  groupedBelow: boolean;
  activeThreadRootId?: string | null;
  threadRepliesByRoot: Record<string, ChatMessage[]>;
  highlightMessageId?: string | null;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onOpenThread?: (messageId: string) => void;
  onEditMessage?: (messageId: string, body: string) => Promise<void>;
  onDeleteMessage?: (messageId: string) => Promise<void>;
  onForwardMessage?: (message: ChatMessage) => void;
  onOpenProfile?: (userId: string) => void;
  onReply?: (message: ChatMessage) => void;
  onJumpToMessage?: (messageId: string) => void;
}) {
  const m = message;
  const threadOpen = activeThreadRootId === m.id;
  const showThreadSummary = !!onOpenThread && (m.thread_count > 0 || threadOpen);

  return (
    <li
      id={`chat-msg-${m.id}`}
      className={
        highlightMessageId === m.id
          ? "rounded-lg ring-2 ring-[var(--sig-accent)] transition-shadow duration-700"
          : undefined
      }
    >
      {m.message_type === "webhook" ? (
        <>
          <WebhookMessageRow
            message={m}
            onToggleReaction={(emoji) => onToggleReaction(m.id, emoji)}
            onOpenThread={onOpenThread ? () => onOpenThread(m.id) : undefined}
          />
          {showThreadSummary ? (
            <div className="pl-12 pr-2">
              <ThreadReplySummary
                root={chatToThreadMessage(m)}
                replies={(threadRepliesByRoot[m.id] ?? []).map(chatToThreadMessage)}
                replyCount={m.thread_count}
                onClick={() => onOpenThread!(m.id)}
              />
            </div>
          ) : null}
        </>
      ) : m.message_type === "system" ? (
        <GroupEventRow message={m} currentUserId={currentUserId} />
      ) : m.message_type === "voice_call" ? (
        <VoiceCallEventRow message={m} currentUserId={currentUserId} />
      ) : m.message_type === "group_call" ? (
        <GroupCallEventRow message={m} />
      ) : m.deleted_at ? (
        <div className="px-3 py-1.5 text-[13px] italic text-[var(--sig-label-2)]">
          This message was deleted
        </div>
      ) : (
        <>
          <ChatBubble
            message={m}
            currentUserId={currentUserId}
            isGroupConversation={isGroupConversation}
            groupedAbove={groupedAbove}
            groupedBelow={groupedBelow}
            onToggleReaction={(emoji) => onToggleReaction(m.id, emoji)}
            onOpenThread={onOpenThread ? () => onOpenThread(m.id) : undefined}
            onEditMessage={
              onEditMessage ? (body) => onEditMessage(m.id, body) : undefined
            }
            onDeleteMessage={
              onDeleteMessage ? () => onDeleteMessage(m.id) : undefined
            }
            onForwardMessage={onForwardMessage ? () => onForwardMessage(m) : undefined}
            onOpenProfile={onOpenProfile}
            onReply={onReply ? () => onReply(m) : undefined}
            onJumpToMessage={onJumpToMessage}
          />
          {showThreadSummary ? (
            <div className="px-3">
              <ThreadReplySummary
                root={chatToThreadMessage(m)}
                replies={(threadRepliesByRoot[m.id] ?? []).map(chatToThreadMessage)}
                replyCount={m.thread_count}
                onClick={() => onOpenThread!(m.id)}
              />
            </div>
          ) : null}
        </>
      )}
    </li>
  );
}
