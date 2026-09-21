"use client";

import { useMemo } from "react";
import { Loading03Icon } from "hugeicons-react";
import CommentMessage from "@/components/team/board/comments/message";
import ThreadReplySummary from "@/components/team/board/comments/reply-summary";
import { Button } from "@/components/ui/button";
import { chatToThreadMessage } from "../chat-message-utils";
import ChatDateDivider from "../chat-date-divider";
import { VoiceCallEventRow } from "./voice-call-event";
import { GroupCallEventRow } from "./group-call-event";
import { CallEventsCollapse } from "./call-events-collapse";
import GroupEventRow from "./group-event-row";
import WebhookMessageRow from "./webhook-message-row";
import MessageDeliveryStatus from "./message-delivery-status";
import type { TimelineContentProps } from "./timeline-content-types";
import { buildTimelineItems } from "./timeline-items";

export default function TimelineContent({
  messages,
  loading,
  loadingMore,
  hasMore,
  onLoadMore,
  currentUserId,
  activeThreadRootId,
  threadRepliesByRoot,
  onToggleReaction,
  onOpenThread,
  onEditMessage,
  onDeleteMessage,
  onForwardMessage,
  onOpenProfile,
  highlightMessageId,
  emptyLabel,
}: TimelineContentProps) {
  const items = useMemo(() => buildTimelineItems(messages), [messages]);
  return (
    <>
      {hasMore ? (
        <div className="flex justify-center pb-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={loadingMore}
            onClick={onLoadMore}
          >
            {loadingMore ? (
              <Loading03Icon className="h-4 w-4 animate-spin" />
            ) : (
              "Load older messages"
            )}
          </Button>
        </div>
      ) : null}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loading03Icon className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
        </div>
      ) : messages.length === 0 ? (
        <p className="py-12 text-center text-sm text-[var(--text-muted)]">
          {emptyLabel}
        </p>
      ) : (
        <ul className="space-y-0 border-t border-[var(--border)] pt-1">
          {items.map((item) => {
            if (item.kind === "divider")
              return (
                <li key={item.key}>
                  <ChatDateDivider label={item.label} />
                </li>
              );
            if (item.kind === "call-events")
              return (
                <li key={item.key}>
                  <CallEventsCollapse
                    messages={item.messages}
                    currentUserId={currentUserId}
                    highlightMessageId={highlightMessageId}
                  />
                </li>
              );
            const message = item.message;
            const thread = chatToThreadMessage(message);
            const replies = (threadRepliesByRoot[message.id] ?? []).map(
              chatToThreadMessage,
            );
            const threadOpen = activeThreadRootId === message.id;
            const showThread =
              !!onOpenThread && (message.thread_count > 0 || threadOpen);
            return (
              <li
                key={item.key}
                id={`chat-msg-${message.id}`}
                className={
                  highlightMessageId === message.id
                    ? "rounded-lg ring-2 ring-[var(--indigo)]"
                    : undefined
                }
              >
                {message.message_type === "webhook" ? (
                  <WebhookMessageRow message={message} />
                ) : message.message_type === "system" ? (
                  <GroupEventRow
                    message={message}
                    currentUserId={currentUserId}
                  />
                ) : message.message_type === "voice_call" ? (
                  <VoiceCallEventRow
                    message={message}
                    currentUserId={currentUserId}
                  />
                ) : message.message_type === "group_call" ? (
                  <GroupCallEventRow message={message} />
                ) : (
                  <div>
                    {message.deleted_at ? (
                      <div className="px-3 py-2 text-sm italic text-muted-foreground">
                        Message deleted
                      </div>
                    ) : (
                      <CommentMessage
                        markdown
                        message={thread}
                        currentUserId={currentUserId}
                        avatarClassName="rounded-md"
                        onAvatarClick={onOpenProfile}
                        onToggleReaction={(emoji) =>
                          onToggleReaction(message.id, emoji)
                        }
                        onOpenThread={
                          onOpenThread
                            ? () => onOpenThread(message.id)
                            : undefined
                        }
                        onEditSave={
                          onEditMessage && message.user_id === currentUserId
                            ? (body) => onEditMessage(message.id, body)
                            : undefined
                        }
                        onDelete={
                          onDeleteMessage && message.user_id === currentUserId
                            ? () => onDeleteMessage(message.id)
                            : undefined
                        }
                        onForward={
                          onForwardMessage
                            ? () => onForwardMessage(message)
                            : undefined
                        }
                      />
                    )}
                    {!message.deleted_at &&
                    message.user_id === currentUserId ? (
                      <div className="-mt-1 px-3 pb-1 text-right">
                        <MessageDeliveryStatus delivery={message.delivery} />
                      </div>
                    ) : null}
                    {showThread ? (
                      <ThreadReplySummary
                        root={thread}
                        replies={replies}
                        replyCount={message.thread_count}
                        avatarClassName="rounded-md"
                        onClick={() => onOpenThread!(message.id)}
                      />
                    ) : null}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
