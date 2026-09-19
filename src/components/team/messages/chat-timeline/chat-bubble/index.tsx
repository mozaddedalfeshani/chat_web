"use client";

import { useRef, useState } from "react";
import {
  Copy01Icon,
  Delete02Icon,
  Download01Icon,
  FavouriteIcon,
  Image01Icon,
  InformationCircleIcon,
  Link01Icon,
  LinkSquare01Icon,
  MessageMultiple01Icon,
  PencilEdit01Icon,
  ArrowTurnBackwardIcon,
  Share08Icon,
} from "hugeicons-react";
import type { ChatMessage } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ReactionChips } from "@/components/shared/reaction-bar";
import { CommentEditForm } from "@/components/team/board/comments/message/comment-edit-form";
import { extractUrls, isTiptapEmpty } from "@/components/team/board/tiptap/utils";
import { openExternal } from "@/lib/files/asset-actions";
import { cn } from "@/lib/utils";
import { chatInitials } from "../../chat-utils";
import { chatMediaBubbleWidth } from "../chat-media-size";
import { bubbleRadius, isMediaBubble } from "./bubble-shape";
import BubbleBody from "./bubble-body";
import BubbleToolbar from "./bubble-toolbar";
import {
  DeleteMessageDialog,
  type MessageDeleteScope,
} from "./delete-message-dialog";
import BubbleContextMenu, { type BubbleMenuItem } from "./bubble-context-menu";
import {
  copyImage,
  copyText,
  messagePlainText,
  saveAttachments,
  selectionInside,
} from "./bubble-actions";
import { isMediaAttachment } from "../chat-media-grid";
import MessageInfoDialog from "./message-info-dialog";

export default function ChatBubble({
  message,
  currentUserId,
  isGroupConversation,
  groupedAbove,
  groupedBelow,
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
  /** Previous row is the same sender within the grouping window. */
  groupedAbove: boolean;
  groupedBelow: boolean;
  onToggleReaction: (emoji: string) => void;
  onOpenThread?: () => void;
  onEditMessage?: (body: string) => Promise<void>;
  onDeleteMessage?: (scope: MessageDeleteScope) => Promise<void>;
  onForwardMessage?: () => void;
  onOpenProfile?: (userId: string) => void;
  /** Signal's quoted reply — stays in the main feed, unlike a thread. */
  onReply?: () => void;
  onJumpToMessage?: (messageId: string) => void;
}) {
  const [reactionOpen, setReactionOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(message.body);
  const [editBusy, setEditBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number; selected: string } | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const outgoing = message.user_id === currentUserId;
  const isForward = !!message.via_ababilx;
  // The avatar sits beside the LAST bubble of a group, as Signal does, so a
  // stack of five messages shows one face rather than five.
  const showAvatar = !outgoing && isGroupConversation && !groupedBelow;
  const showAuthor = !outgoing && isGroupConversation && !groupedAbove;
  const mediaBubble = isMediaBubble(message);

  async function saveEdit() {
    if (!onEditMessage || isTiptapEmpty(editDraft)) return;
    setEditBusy(true);
    try {
      await onEditMessage(editDraft);
      setEditing(false);
    } catch {
      // Keep the editor — and the draft — open. The caller has already put the
      // reason in front of the user; closing on top of that reads as an edit
      // that silently did nothing.
    } finally {
      setEditBusy(false);
    }
  }

  async function confirmDelete(scope: MessageDeleteScope) {
    if (!onDeleteMessage) return;
    setDeleteBusy(true);
    try {
      await onDeleteMessage(scope);
      setDeleteOpen(false);
    } finally {
      setDeleteBusy(false);
    }
  }

  /** Signal's order: download, reply, react, forward, edit, copy, info, delete. */
  function buildMenuItems(selected: string): BubbleMenuItem[] {
    const items: BubbleMenuItem[] = [];
    const attachments = message.attachments ?? [];
    const savable = attachments.filter((a) => !a.locked && a.file_url);
    const images = savable.filter((a) =>
      (a.content_type ?? "").toLowerCase().startsWith("image/"),
    );
    const media = savable.filter(isMediaAttachment);
    const text = selected || messagePlainText(message);
    // The link the author led with — the one the preview card is about.
    const link = extractUrls(message.body ?? "")[0];

    if (savable.length) {
      items.push({
        key: "save",
        label:
          savable.length > 1
            ? `Save ${savable.length} files`
            : media.length
              ? "Save media"
              : "Save file",
        icon: <Download01Icon size={18} />,
        onSelect: () => void saveAttachments(currentUserId, savable),
      });
    }
    if (onReply) {
      items.push({
        key: "reply",
        label: "Reply",
        icon: <ArrowTurnBackwardIcon size={18} />,
        onSelect: onReply,
      });
    }
    items.push({
      key: "react",
      label: "React",
      icon: <FavouriteIcon size={18} />,
      // The toolbar owns the picker; opening it here pins the toolbar visible.
      onSelect: () => setReactionOpen(true),
    });
    if (onOpenThread) {
      items.push({
        key: "thread",
        label: "Reply in thread",
        icon: <MessageMultiple01Icon size={18} />,
        onSelect: onOpenThread,
      });
    }
    if (onForwardMessage) {
      items.push({
        key: "forward",
        label: "Forward",
        icon: <Share08Icon size={17} />,
        onSelect: onForwardMessage,
      });
    }
    if (onEditMessage && outgoing && !isForward) {
      items.push({
        key: "edit",
        label: "Edit",
        icon: <PencilEdit01Icon size={17} />,
        onSelect: () => {
          setEditDraft(message.body);
          setEditing(true);
        },
      });
    }
    if (text) {
      items.push({
        key: "copy",
        label: selected ? "Copy selection" : "Copy text",
        icon: <Copy01Icon size={17} />,
        onSelect: () => void copyText(text),
      });
    }
    if (link) {
      items.push({
        key: "open-link",
        label: "Open link in browser",
        icon: <LinkSquare01Icon size={17} />,
        onSelect: () => void openExternal(link),
      });
      items.push({
        key: "copy-link",
        label: "Copy link",
        icon: <Link01Icon size={17} />,
        onSelect: () => void copyText(link),
      });
    }
    if (images.length === 1) {
      items.push({
        key: "copy-image",
        label: "Copy image",
        icon: <Image01Icon size={17} />,
        onSelect: () => void copyImage(currentUserId, images[0]),
      });
    }
    items.push({
      key: "info",
      label: "Info",
      icon: <InformationCircleIcon size={18} />,
      onSelect: () => setInfoOpen(true),
    });
    // Any message can be deleted for me; the dialog decides whether "for
    // everyone" is on offer.
    if (onDeleteMessage) {
      items.push({
        key: "delete",
        label: "Delete",
        icon: <Delete02Icon size={17} />,
        onSelect: () => setDeleteOpen(true),
      });
    }
    return items;
  }

  if (editing) {
    return (
      <div className={cn("px-3", groupedAbove ? "mt-px" : "mt-1.5")}>
        <CommentEditForm
          draft={editDraft}
          onDraftChange={setEditDraft}
          busy={editBusy}
          onSave={saveEdit}
          onCancel={() => {
            setEditDraft(message.body);
            setEditing(false);
          }}
        />
      </div>
    );
  }

  return (
    <div
      ref={bubbleRef}
      onContextMenu={(event) => {
        // Let the OS menu handle inputs; bubbles get Signal's own list.
        const target = event.target as HTMLElement;
        if (target.closest("input, textarea, [contenteditable='true']")) return;
        event.preventDefault();
        setMenu({
          x: event.clientX,
          y: event.clientY,
          selected: selectionInside(bubbleRef.current),
        });
      }}
      className={cn(
        "group/bubble flex items-end gap-2 px-3",
        outgoing ? "justify-end" : "justify-start",
        groupedAbove ? "mt-px" : "mt-1.5",
      )}
    >
      {!outgoing && isGroupConversation ? (
        showAvatar ? (
          <Avatar
            className={cn("h-7 w-7 shrink-0", onOpenProfile && "cursor-pointer")}
            role={onOpenProfile ? "button" : undefined}
            onClick={onOpenProfile ? () => onOpenProfile(message.user_id) : undefined}
          >
            <AvatarImage src={message.user_avatar_url} alt="" />
            <AvatarFallback className="text-[10px]">
              {chatInitials(message.user_name)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="h-7 w-7 shrink-0" aria-hidden />
        )
      ) : null}

      <BubbleToolbar
        outgoing={outgoing}
        reactionOpen={reactionOpen}
        onReactionOpenChange={setReactionOpen}
        onToggleReaction={onToggleReaction}
        onReply={onReply}
        onOpenThread={onOpenThread}
        onForward={onForwardMessage}
        onEdit={
          onEditMessage && outgoing && !isForward
            ? () => {
                setEditDraft(message.body);
                setEditing(true);
              }
            : undefined
        }
        onDelete={onDeleteMessage ? () => setDeleteOpen(true) : undefined}
      />

      <div
        className={cn(
          "flex min-w-0 flex-col",
          outgoing ? "items-end" : "items-start",
        )}
      >
        <div
          className={cn(
            "min-w-0 overflow-hidden",
            mediaBubble
              ? cn(chatMediaBubbleWidth, "p-0")
              : "max-w-[min(50vw,32rem)] px-3 py-2",
          )}
          style={{
            ...bubbleRadius({ outgoing, groupedAbove, groupedBelow }),
            // One fill for both sides. Which side the bubble is on, and which
            // corner it collapses, is what says who sent it — an accent block
            // for every outgoing message is loud and fights the theme.
            background: "var(--sig-bubble)",
            color: "var(--sig-label)",
          }}
        >
          <BubbleBody
            message={message}
            outgoing={outgoing}
            showAuthor={showAuthor}
            mediaBubble={mediaBubble}
            onJumpToMessage={onJumpToMessage}
          />
        </div>

        <ReactionChips
          reactions={message.reactions ?? []}
          onToggle={onToggleReaction}
          className="mt-1"
        />
      </div>

      {menu ? (
        <BubbleContextMenu
          x={menu.x}
          y={menu.y}
          items={buildMenuItems(menu.selected)}
          onClose={() => setMenu(null)}
        />
      ) : null}

      <MessageInfoDialog
        open={infoOpen}
        onOpenChange={setInfoOpen}
        message={message}
        outgoing={outgoing}
      />

      <DeleteMessageDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        busy={deleteBusy}
        canDeleteForEveryone={outgoing && !isForward}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
