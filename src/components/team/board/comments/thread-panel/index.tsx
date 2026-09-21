"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Cancel01Icon } from "hugeicons-react";
import type { KanbanCommentAttachmentInput } from "@/lib/api";
import type { TeamMember } from "@/lib/api/types/team";
import { Button } from "@/components/ui/button";
import { memberMentionLabel, mentionToTiptapJson } from "../../tiptap/utils";
import CommentComposer from "../composer";
import CommentMessage from "../message";
import { buildCommentThreads } from "../comment-threads";
import type { ThreadMessage } from "../thread-types";

export default function CommentThreadPanel<T extends ThreadMessage>({
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
  reactionBusy,
  onPresign,
  onDiscard,
  autoMentionReply = false,
  replyPlaceholder = "Reply in thread...",
  acceptAllFileTypes = false,
  maxFileSizeBytes,
  isFreeTier = false,
  widthPct,
  widthPx,
  avatarClassName,
  deferUpload = false,
  showSendToDM = false,
  assigneeId = null,
  markdown = false,
}: {
  rootId: string;
  messages: T[];
  members: TeamMember[];
  currentUserId: string;
  busy?: boolean;
  onClose: () => void;
  onSubmitReply: (
    body: string,
    parentId: string,
    attachments: KanbanCommentAttachmentInput[],
    alsoSendDM?: boolean,
  ) => void | Promise<void>;
  onDeleteMessage: (messageId: string, rootId?: string) => void | Promise<void>;
  onEditMessage: (messageId: string, body: string) => void | Promise<void>;
  onToggleReaction: (emoji: string, messageId?: string) => void;
  reactionBusy?: boolean;
  onPresign: (
    contentType: string,
    fileName: string,
    sizeBytes: number,
  ) => Promise<{
    upload_url: string;
    public_url: string;
  }>;
  onDiscard: (fileUrl: string) => Promise<void>;
  autoMentionReply?: boolean;
  replyPlaceholder?: string;
  acceptAllFileTypes?: boolean;
  maxFileSizeBytes?: number;
  isFreeTier?: boolean;
  widthPct?: number;
  widthPx?: number;
  avatarClassName?: string;
  deferUpload?: boolean;
  showSendToDM?: boolean;
  assigneeId?: string | null;
  /** Draw markdown bodies as markdown — the chat thread, not a board. */
  markdown?: boolean;
}) {
  const { byId, repliesByParent } = useMemo(
    () => buildCommentThreads(messages),
    [messages],
  );

  const root = byId.get(rootId);
  const replies = repliesByParent.get(rootId) ?? [];

  const [replyDraft, setReplyDraft] = useState(() => {
    if (!root) return "";
    if (!autoMentionReply) return "";
    return mentionToTiptapJson(root.user_id, memberMentionLabel(root));
  });

  const mentionMembers = useMemo(
    () => members.filter((m) => m.user_id !== currentUserId),
    [members, currentUserId],
  );

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [rootId, replies.length]);

  if (!root) return null;

  function resetReplyDraft() {
    if (autoMentionReply) {
      setReplyDraft(mentionToTiptapJson(root!.user_id, memberMentionLabel(root!)));
    } else {
      setReplyDraft("");
    }
  }

  return (
    <aside
      className="flex min-h-0 min-w-0 shrink-0 flex-col overflow-hidden border-l"
      style={{
        borderColor: "var(--border)",
        width: widthPx ?? (widthPct ? `${widthPct}%` : "360px"),
      }}
    >
      <div
        className="flex shrink-0 items-center justify-between border-b px-4 py-3"
        style={{ borderColor: "var(--border)" }}
      >
        <h3 className="text-sm font-semibold">Thread</h3>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Close thread"
          onClick={onClose}
        >
          <Cancel01Icon size={16} />
        </Button>
      </div>

      <div
        ref={scrollContainerRef}
        className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-2"
      >
        <CommentMessage
          message={root}
          currentUserId={currentUserId}
          reactionBusy={reactionBusy}
          hideThread
          markdown={markdown}
          avatarClassName={avatarClassName}
          onToggleReaction={(emoji) => onToggleReaction(emoji, root.id)}
          onEditSave={(body) => onEditMessage(root.id, body)}
          onDelete={() => void onDeleteMessage(root.id, root.id)}
        />
        {replies.map((r) => (
          <CommentMessage
            key={r.id}
            message={r}
            variant="reply"
            currentUserId={currentUserId}
            reactionBusy={reactionBusy}
            hideThread
            markdown={markdown}
            avatarClassName={avatarClassName}
            onToggleReaction={(emoji) => onToggleReaction(emoji, r.id)}
            onEditSave={(body) => onEditMessage(r.id, body)}
            onDelete={() => void onDeleteMessage(r.id)}
          />
        ))}
      </div>

      <div
        className="shrink-0 border-t px-3 py-2"
        style={{ borderColor: "var(--border)" }}
      >
        <CommentComposer
          value={replyDraft}
          onChange={setReplyDraft}
          busy={busy}
          mentionMembers={mentionMembers}
          showSendToDM={showSendToDM}
          assigneeId={assigneeId}
          placeholder={replyPlaceholder}
          submitLabel="Reply"
          acceptAllFileTypes={acceptAllFileTypes}
          maxFileSizeBytes={maxFileSizeBytes}
          onPresign={onPresign}
          onDiscard={onDiscard}
          onSubmit={async (attachments, alsoSendDM) => {
            await onSubmitReply(replyDraft, rootId, attachments, alsoSendDM);
            resetReplyDraft();
          }}
          isFreeTier={isFreeTier}
          isThread={true}
          deferUpload={deferUpload}
        />
      </div>
    </aside>
  );
}
