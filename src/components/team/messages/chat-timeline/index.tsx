"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loading03Icon } from "hugeicons-react";
import { toast } from "sonner";
import type { ChatMessage } from "@/lib/api";
import type { TeamMember } from "@/lib/api/types/team";
import { Button } from "@/components/ui/button";
import { FileDropZone } from "@/components/team/shared/file-drop-zone";
import { selectActiveConversation, useChatStore } from "@/store/chat-store";
import SafetyNumberAlert from "../safety-number/safety-number-alert";
import TimelineFooter, {
  type TimelineMessageRequest,
  type TimelineSend,
} from "./timeline-footer";
import { quoteFromMessage } from "../chat-quote-utils";
import type { ChatMessageQuote } from "@/lib/api/types/chat";
import type { MessageComposerHandle } from "./message-composer";
import type { MessageDeleteScope } from "./chat-bubble/delete-message-dialog";
import { buildTimelineItems } from "./timeline-items";
import { TimelineMessageList } from "./timeline-message-list";
import { useTimelineScroll } from "./use-timeline-scroll";
import "./timeline-feed.css";

export default function ChatTimeline({
  conversationId = null,
  messages,
  loading,
  loadingMore,
  hasMore,
  onLoadMore,
  currentUserId = "",
  mentionMembers,
  onSend,
  onToggleReaction,
  onOpenThread,
  onEditMessage,
  onDeleteMessage,
  onForwardMessage,
  onPresign,
  onDiscard,
  sending,
  isFreeTier,
  activeThreadRootId,
  threadRepliesByRoot = {},
  showComposer = true,
  peerLeft = false,
  messageRequest,
  composerPlaceholder,
  composerSubmitLabel,
  composerInitialValue,
  highlightMessageId,
  emptyLabel = "No messages yet. Say hello!",
  readOnlyLabel,
  isGroup = false,
  onOpenProfile,
}: {
  conversationId?: string | null;
  messages: ChatMessage[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  currentUserId?: string;
  mentionMembers: TeamMember[];
  onSend: TimelineSend;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onOpenThread?: (messageId: string) => void;
  onEditMessage?: (messageId: string, body: string) => Promise<void>;
  onDeleteMessage?: (
    messageId: string,
    scope: MessageDeleteScope,
  ) => Promise<void>;
  onForwardMessage?: (message: ChatMessage) => void;
  onPresign: Parameters<typeof TimelineFooter>[0]["onPresign"];
  onDiscard: Parameters<typeof TimelineFooter>[0]["onDiscard"];
  sending?: boolean;
  isFreeTier?: boolean;
  activeThreadRootId?: string | null;
  threadRepliesByRoot?: Record<string, ChatMessage[]>;
  showComposer?: boolean;
  peerLeft?: boolean;
  messageRequest?: TimelineMessageRequest;
  composerPlaceholder?: string;
  composerSubmitLabel?: string;
  composerInitialValue?: string;
  highlightMessageId?: string | null;
  emptyLabel?: string;
  readOnlyLabel?: string;
  isGroup?: boolean;
  onOpenProfile?: (userId: string) => void;
}) {
  const webhookOnly =
    useChatStore(selectActiveConversation)?.type === "webhook";
  const composerVisible = showComposer && !webhookOnly;
  const readOnlyText = webhookOnly
    ? "Messages arrive through this group's webhook. Open a message's thread to discuss it."
    : readOnlyLabel;

  const timelineItems = useMemo(() => buildTimelineItems(messages), [messages]);
  const composerRef = useRef<MessageComposerHandle>(null);
  const [replyTo, setReplyTo] = useState<ChatMessageQuote | null>(null);

  useEffect(() => setReplyTo(null), [conversationId]);

  const jumpToMessage = useCallback((messageId: string) => {
    document
      .getElementById(`chat-msg-${messageId}`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, []);

  const composerReady = composerVisible && !peerLeft && !messageRequest;
  const lastMessage = messages.length ? messages[messages.length - 1] : null;
  const { containerRef, contentRef, bottomDetectorRef, anchorBeforePrepend } =
    useTimelineScroll({
      conversationId,
      lastMessageId: lastMessage?.id ?? null,
      messageCount: messages.length,
      lastMessageFromSelf: !!lastMessage && lastMessage.user_id === currentUserId,
      loading,
    });

  const loadOlder = useCallback(() => {
    anchorBeforePrepend();
    onLoadMore();
  }, [anchorBeforePrepend, onLoadMore]);

  const addIncomingFiles = useCallback((files: File[]) => {
    if (!composerRef.current) {
      toast.error("Finish or cancel the voice recording first");
      return;
    }
    composerRef.current.addFiles(files);
  }, []);

  return (
    <FileDropZone
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
      disabled={!composerReady || sending}
      onFiles={addIncomingFiles}
    >
      <div ref={containerRef} className="chat-timeline-scroller px-1">
        <div
          ref={contentRef}
          className={[
            "chat-timeline-feed chat-timeline-feed--have-newest",
            hasMore ? "" : "chat-timeline-feed--have-oldest",
          ].join(" ")}
        >
          {hasMore ? (
            <div className="flex justify-center pb-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={loadingMore}
                onClick={loadOlder}
              >
                {loadingMore ? (
                  <Loading03Icon className="h-4 w-4 animate-spin" />
                ) : (
                  "Load older messages"
                )}
              </Button>
            </div>
          ) : null}
          <TimelineMessageList
            items={timelineItems}
            loading={loading && messages.length === 0}
            emptyLabel={emptyLabel}
            rowProps={{
              currentUserId,
              isGroupConversation: isGroup,
              activeThreadRootId,
              threadRepliesByRoot,
              highlightMessageId,
              onToggleReaction,
              onOpenThread,
              onEditMessage,
              onDeleteMessage,
              onForwardMessage,
              onOpenProfile,
              onReply: (message) => setReplyTo(quoteFromMessage(message)),
              onJumpToMessage: jumpToMessage,
            }}
          />
          <div
            ref={bottomDetectorRef}
            className="chat-timeline-bottom-detector"
            aria-hidden
          />
        </div>
      </div>
      <SafetyNumberAlert />
      <TimelineFooter
        showComposer={composerVisible}
        peerLeft={peerLeft}
        messageRequest={messageRequest}
        readOnlyLabel={readOnlyText}
        composerRef={composerRef}
        mentionMembers={mentionMembers}
        currentUserId={currentUserId}
        replyTo={replyTo}
        onClearReply={() => setReplyTo(null)}
        onSend={onSend}
        sending={sending}
        onPresign={onPresign}
        onDiscard={onDiscard}
        isFreeTier={isFreeTier}
        placeholder={composerPlaceholder}
        submitLabel={composerSubmitLabel}
        initialValue={composerInitialValue}
        isGroup={isGroup}
      />
    </FileDropZone>
  );
}
