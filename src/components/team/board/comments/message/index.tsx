"use client";

import { useState, type ReactNode } from "react";
import { format, isToday, parseISO } from "date-fns";
import {
  ArrowTurnForwardIcon,
  Delete02Icon,
  MessageMultiple01Icon,
  PencilEdit01Icon,
  Share08Icon,
} from "hugeicons-react";
import type { KanbanReactionGroup } from "@/lib/api";
import type { ThreadMessage } from "../thread-types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import TiptapEditor from "../../tiptap/editor";
import TiptapViewer from "../../tiptap/viewer";
import { isTiptapEmpty } from "../../tiptap/utils";
import { AddReactionButton, ReactionChips } from "../../shared/reaction-bar";
import CommentAttachments from "../attachments";
import { cn } from "@/lib/utils";

function initials(name?: string) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatCommentTime(iso: string) {
  const when = parseISO(iso);
  if (isToday(when)) return format(when, "h:mm a");
  return format(when, "MMM d, h:mm a");
}

function HoverActionButton({
  label,
  onClick,
  destructive,
  children,
}: {
  label: string;
  onClick?: () => void;
  destructive?: boolean;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={label}
      className={cn(
        "h-7 gap-1.5 rounded-none px-2 text-xs text-muted-foreground first:rounded-l-md last:rounded-r-md hover:bg-white/10 hover:text-[var(--text)]",
        destructive && "hover:bg-destructive/20 hover:text-destructive",
      )}
      onClick={onClick}
    >
      {children}
      <span>{label}</span>
    </Button>
  );
}

export default function CommentMessage({
  message,
  currentUserId,
  onToggleReaction,
  reactionBusy,
  variant = "root",
  onOpenThread,
  onReply,
  onDelete,
  onEditSave,
  onForward,
  hideThread,
  avatarClassName,
  onAvatarClick,
  markdown = false,
}: {
  message: ThreadMessage;
  currentUserId: string;
  onToggleReaction: (emoji: string) => void;
  reactionBusy?: boolean;
  variant?: "root" | "reply";
  onOpenThread?: () => void;
  onReply?: () => void;
  onDelete?: () => void | Promise<void>;
  onEditSave?: (body: string) => void | Promise<void>;
  onForward?: () => void;
  hideThread?: boolean;
  avatarClassName?: string;
  onAvatarClick?: (userId: string) => void;
  /** Render a markdown body as markdown (chat only; boards keep their own). */
  markdown?: boolean;
}) {
  const reactions = (message.reactions ?? []) as KanbanReactionGroup[];
  const isReply = variant === "reply";
  const [reactionOpen, setReactionOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(message.body);
  const [editBusy, setEditBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const toolbarPinned = reactionOpen || editing;
  const isAuthor = message.user_id === currentUserId;
  const isSystemForward = !!message.via_ababilx;
  const showDelete = onDelete && isAuthor && !isSystemForward;
  const showEdit = onEditSave && isAuthor && !isSystemForward;
  const openThread = onOpenThread ?? onReply;
  const showThread = !hideThread && !!openThread;
  const showForward = !!onForward && !isSystemForward;
  const forwardedFromName = message.forwarded_from_name;
  const forwardedFromSource = message.forwarded_from_source;

  async function saveEdit() {
    if (!onEditSave || isTiptapEmpty(editDraft)) return;
    setEditBusy(true);
    try {
      await onEditSave(editDraft);
      setEditing(false);
    } catch {
      // Keep the editor — and the draft — open. The caller has already put the
      // reason in front of the user; closing on top of that reads as an edit
      // that silently did nothing.
    } finally {
      setEditBusy(false);
    }
  }

  function cancelEdit() {
    setEditDraft(message.body);
    setEditing(false);
  }

  async function confirmDelete() {
    if (!onDelete) return;
    setDeleteBusy(true);
    try {
      await onDelete();
      setDeleteOpen(false);
    } finally {
      setDeleteBusy(false);
    }
  }

  const showToolbar = !editing;

  return (
    <article
      id={`task-comment-${message.id}`}
      className={cn(
        "group relative min-w-0 max-w-full py-2 pr-2 hover:bg-white/[0.02]",
        isReply && "pl-3",
      )}
      style={isReply ? { borderLeft: "2px solid var(--border)" } : undefined}
    >
      {!editing && showToolbar ? (
        <div
          className={cn(
            "absolute right-2 top-1 z-10 flex items-center overflow-hidden rounded-md border shadow-sm transition-opacity duration-150",
            toolbarPinned
              ? "opacity-100"
              : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100",
          )}
          style={{
            borderColor: "var(--kanban-input-border)",
            background: "var(--surface)",
          }}
        >
          <AddReactionButton
            icon="smile"
            label="React"
            disabled={reactionBusy}
            open={reactionOpen}
            onOpenChange={setReactionOpen}
            onToggle={onToggleReaction}
            className="h-7 gap-1.5 rounded-none px-2 text-xs hover:bg-white/10"
          />
          {showThread ? (
            <HoverActionButton label="Thread" onClick={openThread}>
              <MessageMultiple01Icon size={16} />
            </HoverActionButton>
          ) : null}
          {showForward ? (
            <HoverActionButton label="Forward" onClick={onForward}>
              <Share08Icon size={14} />
            </HoverActionButton>
          ) : null}
          {showEdit ? (
            <HoverActionButton
              label="Edit"
              onClick={() => {
                setEditDraft(message.body);
                setEditing(true);
              }}
            >
              <PencilEdit01Icon size={14} />
            </HoverActionButton>
          ) : null}
          {showDelete ? (
            <HoverActionButton
              label="Delete"
              destructive
              onClick={() => setDeleteOpen(true)}
            >
              <Delete02Icon size={14} />
            </HoverActionButton>
          ) : null}
        </div>
      ) : null}

      <div className="flex min-w-0 gap-3">
        <Avatar
          className={cn(
            "mt-0.5 shrink-0",
            isReply ? "h-7 w-7" : "h-9 w-9",
            avatarClassName,
            onAvatarClick && "cursor-pointer",
          )}
          role={onAvatarClick ? "button" : undefined}
          tabIndex={onAvatarClick ? 0 : undefined}
          onClick={
            onAvatarClick
              ? () => onAvatarClick(message.user_id)
              : undefined
          }
          onKeyDown={
            onAvatarClick
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onAvatarClick(message.user_id);
                  }
                }
              : undefined
          }
        >
          <AvatarImage src={message.user_avatar_url} />
          <AvatarFallback className={cn("text-[10px]", avatarClassName)}>
            {initials(message.user_name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 overflow-hidden pr-16">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-sm font-semibold leading-tight text-[var(--text)]">
              {message.user_name ?? "Unknown"}
            </span>
            {message.via_ababilx ? (
              <span className="rounded bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-medium text-indigo-400">
                via AbabilX
              </span>
            ) : null}
            <time dateTime={message.created_at} className="text-xs text-muted-foreground">
              {formatCommentTime(message.created_at)}
            </time>
          </div>
          {editing ? (
            <div className="mt-1 space-y-2">
              <TiptapEditor value={editDraft} onChange={setEditDraft} variant="compact" />
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="h-7"
                  disabled={editBusy || isTiptapEmpty(editDraft)}
                  onClick={() => void saveEdit()}
                >
                  {editBusy ? "Saving..." : "Save"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7"
                  disabled={editBusy}
                  onClick={cancelEdit}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              {forwardedFromName ? (
                <div className="mt-0.5 flex items-center gap-1 text-xs italic text-muted-foreground">
                  <ArrowTurnForwardIcon size={12} className="shrink-0" />
                  <span className="truncate">
                    Forwarded
                    {forwardedFromName ? ` — from ${forwardedFromName}` : ""}
                    {forwardedFromSource ? ` in ${forwardedFromSource}` : ""}
                  </span>
                </div>
              ) : null}
              {!isTiptapEmpty(message.body) ? (
                <TiptapViewer value={message.body} markdown={markdown} className="mt-0.5 text-sm leading-relaxed" />
              ) : null}
              <CommentAttachments attachments={message.attachments ?? []} />
              <ReactionChips
                reactions={reactions}
                disabled={reactionBusy}
                onToggle={onToggleReaction}
                className="mt-1.5"
              />
            </>
          )}
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message?</AlertDialogTitle>
            <AlertDialogDescription>
              This message will be permanently removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteBusy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
            >
              {deleteBusy ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}
