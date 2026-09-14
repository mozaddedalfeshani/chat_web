"use client";

import { useState } from "react";
import { format, isToday, parseISO } from "date-fns";
import { Link01Icon, MessageMultiple01Icon } from "hugeicons-react";
import type { ChatMessage } from "@/lib/api";
import CommentAttachments from "@/components/team/board/comments/attachments";
import { AddReactionButton, ReactionChips } from "@/components/shared/reaction-bar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { webhookSourceName } from "../chat-message-utils";

function messageTime(iso: string) {
  const value = parseISO(iso);
  return format(value, isToday(value) ? "h:mm a" : "MMM d, h:mm a");
}

/**
 * A delivered webhook message. The feed's top level is read-only, but each
 * message opens its own thread: members discuss the item (an order, an alert)
 * under it instead of in the feed. React + "Reply in thread" fade in on hover.
 */
export default function WebhookMessageRow({
  message,
  onToggleReaction,
  onOpenThread,
}: {
  message: ChatMessage;
  onToggleReaction?: (emoji: string) => void;
  onOpenThread?: () => void;
}) {
  const [reactionOpen, setReactionOpen] = useState(false);
  const source = webhookSourceName(message);
  const avatarURL = message.user_avatar_url?.trim();
  const hasActions = !!onToggleReaction || !!onOpenThread;

  return (
    <article className="group/webhook relative flex min-w-0 gap-3 py-2 pr-2 hover:bg-white/[0.02]">
      <Avatar className="mt-0.5 h-9 w-9 rounded-md">
        {avatarURL ? <AvatarImage src={avatarURL} alt={`${source} avatar`} /> : null}
        <AvatarFallback className="rounded-md bg-[color-mix(in_srgb,var(--indigo)_15%,transparent)] text-[var(--indigo)]">
          <Link01Icon size={17} />
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-sm font-semibold text-[var(--text)]">
            {source}
          </span>
          <span className="rounded bg-[color-mix(in_srgb,var(--indigo)_15%,transparent)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--indigo)]">
            webhook
          </span>
          <time
            className="text-xs text-muted-foreground"
            dateTime={message.created_at}
          >
            {messageTime(message.created_at)}
          </time>
        </div>
        {message.body ? (
          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--text)]">
            {message.body}
          </p>
        ) : null}
        <CommentAttachments attachments={message.attachments ?? []} />
        {onToggleReaction ? (
          <ReactionChips
            reactions={message.reactions ?? []}
            onToggle={onToggleReaction}
            className="mt-1"
          />
        ) : null}
      </div>
      {hasActions ? (
        <div
          className={cn(
            "absolute right-2 top-1 flex items-center gap-0.5 rounded-full border border-[var(--border)] bg-[var(--sig-surface,var(--background))] px-1 py-0.5 shadow-sm transition-opacity duration-100",
            // Pinned open while the emoji picker is up, or it closes under itself.
            reactionOpen
              ? "opacity-100"
              : "pointer-events-none opacity-0 group-hover/webhook:pointer-events-auto group-hover/webhook:opacity-100 group-focus-within/webhook:pointer-events-auto group-focus-within/webhook:opacity-100",
          )}
        >
          {onToggleReaction ? (
            <AddReactionButton
              icon="smile"
              ariaLabel="React"
              open={reactionOpen}
              onOpenChange={setReactionOpen}
              onToggle={onToggleReaction}
              className="h-7 w-7 rounded-full p-0 text-[var(--sig-label-2)] hover:bg-[var(--sig-fill-strong)] hover:text-[var(--sig-label)]"
            />
          ) : null}
          {onOpenThread ? (
            <button
              type="button"
              aria-label="Reply in thread"
              title="Reply in thread"
              onClick={onOpenThread}
              className="flex h-7 items-center gap-1 rounded-full px-2 text-xs text-[var(--sig-label-2)] transition-colors hover:bg-[var(--sig-fill-strong)] hover:text-[var(--sig-label)]"
            >
              <MessageMultiple01Icon size={15} />
              <span>Thread</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
