"use client";

import { ArrowTurnForwardIcon } from "hugeicons-react";
import type { ChatMessage } from "@/lib/api";
import TiptapViewer from "@/components/team/board/tiptap/viewer";
import { extractUrls, isTiptapEmpty } from "@/components/team/board/tiptap/utils";
import { shouldPreviewUrl } from "@/lib/text/link-safety";
import { cn } from "@/lib/utils";
import ChatLinkPreview from "../../link-preview";
import ChatAttachment from "../chat-attachment";
import ChatMediaGrid, { isMediaAttachment } from "../chat-media-grid";
import { authorColorVar } from "./author-color";
import BubbleMeta from "./bubble-meta";
import BubbleQuote from "./bubble-quote";

/** Everything inside the coloured bubble: author line, forward note, body,
 * attachments and the timestamp footer. */
export default function BubbleBody({
  message,
  outgoing,
  showAuthor,
  mediaBubble = false,
  onJumpToMessage,
}: {
  message: ChatMessage;
  outgoing: boolean;
  showAuthor: boolean;
  /** Media fills the bubble; caption keeps the inset under it. Time sits on
   *  the photo. */
  mediaBubble?: boolean;
  onJumpToMessage?: (messageId: string) => void;
}) {
  const attachments = message.attachments ?? [];
  const media = attachments.filter(isMediaAttachment);
  const files = attachments.filter((a) => !isMediaAttachment(a));
  const hasText = !isTiptapEmpty(message.body);
  // Signal's rules, both of them. One preview per message — the first link
  // that is safe to unfurl, which is the one the author led with. And
  // attachments take precedence: a message carrying a photo shows the photo,
  // never a card about a link underneath it.
  const previewUrl =
    hasText && attachments.length === 0
      ? extractUrls(message.body).find(shouldPreviewUrl)
      : undefined;
  // The card bleeds to the bubble's edges, so it has to know whether anything
  // is already sitting above it to bleed into.
  const contentAbove =
    showAuthor ||
    Boolean(message.quote) ||
    Boolean(message.forwarded_from_name) ||
    Boolean(message.via_ababilx);

  const overlayOnMedia = mediaBubble && media.length > 0;
  const chrome = mediaBubble ? "px-3" : undefined;

  return (
    <>
      {showAuthor ? (
        <p
          className={cn(
            "mb-0.5 truncate text-[13px] font-semibold leading-tight",
            mediaBubble && "px-3 pt-2",
          )}
          style={{ color: authorColorVar(message.user_id) }}
        >
          {message.user_name ?? "Unknown"}
        </p>
      ) : null}

      {message.forwarded_from_name || message.via_ababilx ? (
        <div
          className={cn(
            "mb-0.5 flex items-center gap-1 text-[12px] italic",
            "text-[var(--sig-label-2)]",
            mediaBubble && "px-3 pt-1",
          )}
        >
          <ArrowTurnForwardIcon size={12} className="shrink-0" />
          <span className="truncate">
            {message.via_ababilx ? "via AbabilX" : "Forwarded"}
            {message.forwarded_from_name ? ` — ${message.forwarded_from_name}` : ""}
          </span>
        </div>
      ) : null}

      {message.quote ? (
        <div className={cn(mediaBubble && "px-1 pt-1")}>
          <BubbleQuote quote={message.quote} onJump={onJumpToMessage} />
        </div>
      ) : null}

      {media.length ? (
        <div className={cn("relative", !overlayOnMedia && (hasText || files.length) && "mb-1.5")}>
          <ChatMediaGrid
            attachments={media}
            flush={overlayOnMedia}
            senderName={message.user_name}
            senderAvatarUrl={message.user_avatar_url}
            sentAt={message.created_at}
          />
          {overlayOnMedia ? (
            <div className="pointer-events-none absolute right-2 bottom-1.5">
              <BubbleMeta message={message} outgoing={outgoing} onMedia />
            </div>
          ) : null}
        </div>
      ) : null}

      {files.length ? (
        <div className={cn("space-y-1.5", hasText && "mb-1.5", chrome)}>
          {files.map((attachment) => (
            <ChatAttachment key={attachment.id} attachment={attachment} />
          ))}
        </div>
      ) : null}

      {previewUrl ? (
        <ChatLinkPreview url={previewUrl} contentAbove={contentAbove} />
      ) : null}

      {hasText ? (
        <div className={cn(mediaBubble && "px-3 py-2")}>
          <TiptapViewer
            value={message.body}
            className="text-[14px] leading-[1.35]"
          />
        </div>
      ) : null}

      {overlayOnMedia ? null : (
        <BubbleMeta message={message} outgoing={outgoing} inset={mediaBubble} />
      )}
    </>
  );
}
