"use client";

import {
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from "react";
import Image from "next/image";
import { LockKeyhole } from "lucide-react";
import {
  Attachment01Icon,
  SentIcon,
  AtIcon,
  PlusSignIcon,
  TextFontIcon,
  File01Icon,
  Cancel01Icon,
  Mic01Icon,
} from "hugeicons-react";

import { toast } from "sonner";
import { formatKanbanUploadError } from "@/lib/api";
import type { KanbanCommentAttachmentInput } from "@/lib/api/types/kanban";
import type { TeamMember } from "@/lib/api/types/team";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import type { Editor } from "@tiptap/react";
import TiptapEditor from "../../tiptap/editor";
import { extractMentionUserIds, isTiptapEmpty } from "../../tiptap/utils";
import CommentQuickReplies from "../quick-replies";
import { formatAttachmentSizeLimit } from "../../notes/note-attachment-limits";
import { cn } from "@/lib/utils";
import { EmojiPopover } from "./emoji-popover";
import { ComposerAttachments } from "./attachments";
import { isImageAttachment } from "@/components/team/shared/attachment-media";
import { FileDropOverlay } from "@/components/team/shared/file-drop-zone/file-drop-overlay";
import { useFileDropZone } from "@/components/team/shared/file-drop-zone/use-file-drop-zone";
import {
  putPresignedUpload,
  type PresignedUpload,
} from "@/lib/chat-attachments/sealed-upload";

const DEFAULT_ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    ".docx",
};

const DEFAULT_ACCEPT = Object.keys(DEFAULT_ALLOWED_TYPES).join(",");

export type PendingCommentAttachment = KanbanCommentAttachmentInput & {
  previewUrl?: string;
  uploading?: boolean;
  error?: string;
  /** Local file held until send when deferUpload is enabled */
  file?: File;
};

function ComposerToolbarButton({
  label,
  onClick,
  disabled,
  active,
  children,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={disabled}
      aria-label={label}
      className={cn(
        "h-7 gap-1.5 rounded px-2 text-xs text-muted-foreground hover:bg-white/10 hover:text-(--text)",
        active && "bg-white/15 text-(--text)",
      )}
      onClick={onClick}>
      {children}
      <span className="@max-[420px]:sr-only">{label}</span>
    </Button>
  );
}

async function discardPending(
  onDiscard: (fileUrl: string) => Promise<void>,
  items: PendingCommentAttachment[],
) {
  await Promise.allSettled(
    items
      .filter(
        (a) =>
          !a.uploading && !a.error && !a.file_url.startsWith("__pending__"),
      )
      .map((a) => onDiscard(a.file_url)),
  );
}

export type CommentComposerHandle = {
  addFiles: (files: File[]) => void;
};

export default function CommentComposer({
  value,
  onChange,
  onSubmit,
  onCancel,
  onPresign,
  onDiscard,
  busy,
  mentionMembers,
  placeholder = "Add a comment... (@ to mention)",
  submitLabel = "Post",
  showQuickReplies = false,
  onQuickReplyPick,
  acceptAllFileTypes = true,
  maxFileSizeBytes,
  maxFiles,
  singleLine = false,
  showSendToDM = false,
  assigneeId = null,
  isThread = true,
  deferUpload = false,
  allowMentionAll = false,
  enableVoice = false,
  onVoiceStart,
  onSnippetStart,
  secureSend = false,
  enableFileDrop = true,
  iconOnlySend = false,
  containerClassName,
  containerStyle,
  ref,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (
    attachments: KanbanCommentAttachmentInput[],
    alsoSendDM?: boolean,
  ) => void | Promise<void>;
  onCancel?: () => void;
  onPresign: (
    contentType: string,
    fileName: string,
    sizeBytes: number,
  ) => Promise<PresignedUpload>;
  onDiscard: (fileUrl: string) => Promise<void>;
  busy?: boolean;
  mentionMembers: TeamMember[];
  placeholder?: string;
  submitLabel?: string;
  showQuickReplies?: boolean;
  onQuickReplyPick?: (text: string) => void;
  acceptAllFileTypes?: boolean;
  maxFileSizeBytes?: number;
  maxFiles?: number;
  isFreeTier?: boolean;
  singleLine?: boolean;
  showSendToDM?: boolean;
  assigneeId?: string | null;
  isThread?: boolean;
  /** Keep files in local state; presign + upload only on submit */
  deferUpload?: boolean;
  /** Offer @all / @everyone in the mention list (group conversations). */
  allowMentionAll?: boolean;
  /** Chat: show mic to start a voice note. */
  enableVoice?: boolean;
  onVoiceStart?: () => void;
  /** Chat only: opens the "Create snippet" dialog. */
  onSnippetStart?: () => void;
  /** Replace the normal send glyph when chat text is encrypted on-device. */
  secureSend?: boolean;
  /** When false, parent owns paste/drop (e.g. full chat pane). */
  enableFileDrop?: boolean;
  /** Chat: Signal's bare send arrow without the lock glyph or label. */
  iconOnlySend?: boolean;
  containerClassName?: string;
  containerStyle?: CSSProperties;
  ref?: Ref<CommentComposerHandle>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState<PendingCommentAttachment[]>([]);
  const pendingRef = useRef(pending);
  const [uploadError, setUploadError] = useState("");
  const [alsoSendDM, setAlsoSendDM] = useState(false);
  const [showFormattingToolbar, setShowFormattingToolbar] = useState(false);
  const [showEmojiPopover, setShowEmojiPopover] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const alsoSendDmId = useId();

  const canSendDM = useMemo(() => {
    if (!showSendToDM) return false;
    const hasMentions = extractMentionUserIds(value).length > 0;
    const hasAssignee = !!assigneeId?.trim();
    return hasMentions || hasAssignee;
  }, [showSendToDM, value, assigneeId]);

  const sendDmWithComment = canSendDM && alsoSendDM;

  const readyAttachments = deferUpload
    ? pending.filter((p) => !p.error)
    : pending.filter(
        (p) =>
          !p.uploading && !p.error && !p.file_url.startsWith("__pending__"),
      );
  const canPost =
    !busy &&
    !uploading &&
    (!isTiptapEmpty(value) || readyAttachments.length > 0);

  const attachDisabled =
    busy || uploading || (maxFiles != null && pending.length >= maxFiles);

  const handleFilesRef = useRef<(files: File[]) => void>(() => {});

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  useImperativeHandle(ref, () => ({
    addFiles: (files: File[]) => {
      handleFilesRef.current(files);
    },
  }));

  const { dragActive, handlers: fileDropHandlers } = useFileDropZone({
    disabled: attachDisabled || !enableFileDrop,
    onFiles: (files) => {
      handleFilesRef.current(files);
    },
  });

  async function handleFiles(files: File[]) {
    if (maxFiles != null && pendingRef.current.length + files.length > maxFiles) {
      setUploadError(`Maximum ${maxFiles} files allowed`);
      return;
    }
    if (!acceptAllFileTypes) {
      const invalidType = files.find((f) => !DEFAULT_ALLOWED_TYPES[f.type]);
      if (invalidType) {
        setUploadError(`Unsupported file type: ${invalidType.name}`);
        return;
      }
    }
    if (maxFileSizeBytes != null) {
      const invalidSize = files.find((f) => f.size > maxFileSizeBytes);
      if (invalidSize) {
        setUploadError(
          `File ${invalidSize.name} must be ${formatAttachmentSizeLimit(maxFileSizeBytes)} or smaller`,
        );
        return;
      }
    }
    const emptyFile = files.find((f) => f.size <= 0);
    if (emptyFile) {
      setUploadError(`File ${emptyFile.name} is empty`);
      return;
    }
    setUploadError("");

    if (deferUpload) {
      for (const file of files) {
        const contentType = file.type || "application/octet-stream";
        const placeholderId = `__pending__${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const previewUrl =
          isImageAttachment(contentType, file.name) ||
          contentType.startsWith("video/")
            ? URL.createObjectURL(file)
            : undefined;

        setPending((prev) => [
          ...prev,
          {
            file_url: placeholderId,
            file_name: file.name,
            content_type: contentType,
            size_bytes: file.size,
            previewUrl,
            file,
          },
        ]);
      }
      return;
    }

    setUploading(true);

    await Promise.allSettled(
      files.map(async (file) => {
        const contentType = file.type || "application/octet-stream";
        const placeholderId = `__pending__${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const previewUrl =
          isImageAttachment(contentType, file.name) ||
          contentType.startsWith("video/")
            ? URL.createObjectURL(file)
            : undefined;

        const placeholder: PendingCommentAttachment = {
          file_url: placeholderId,
          file_name: file.name,
          content_type: contentType,
          size_bytes: file.size,
          previewUrl,
          uploading: true,
        };
        setPending((prev) => [...prev, placeholder]);

        try {
          const presign = await onPresign(contentType, file.name, file.size);
          const put = await putPresignedUpload(presign, file, contentType);
          if (!put.ok) throw new Error(`Upload failed for ${file.name}`);
          setPending((prev) =>
            prev.map((p) =>
              p.file_url === placeholderId
                ? {
                    ...p,
                    file_url: presign.public_url,
                    uploading: false,
                  }
                : p,
            ),
          );
        } catch (e) {
          const message = formatKanbanUploadError(e);
          setPending((prev) =>
            prev.map((p) =>
              p.file_url === placeholderId
                ? { ...p, uploading: false, error: message }
                : p,
            ),
          );
          toast.error(`"${file.name}": ${message}`);
        }
      }),
    );

    setUploading(false);
  }

  useEffect(() => {
    handleFilesRef.current = (files) => {
      void handleFiles(files);
    };
  });

  async function removePending(index: number) {
    const item = pending[index];
    if (!item) return;
    if (
      !deferUpload &&
      !item.file &&
      !item.uploading &&
      !item.error &&
      !item.file_url.startsWith("__pending__")
    ) {
      try {
        await onDiscard(item.file_url);
      } catch {
        toast.error("Could not remove file from storage");
      }
    }
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    setPending((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCancel() {
    if (pending.length > 0) {
      if (!deferUpload) {
        await discardPending(onDiscard, pending);
      }
      pending.forEach((p) => {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
      });
      setPending([]);
    }
    onCancel?.();
  }

  async function uploadPendingFile(
    item: PendingCommentAttachment,
  ): Promise<KanbanCommentAttachmentInput> {
    const file = item.file;
    if (!file) {
      return {
        file_url: item.file_url,
        file_name: item.file_name,
        content_type: item.content_type,
        size_bytes: item.size_bytes,
      };
    }
    const contentType =
      file.type || item.content_type || "application/octet-stream";
    const presign = await onPresign(contentType, file.name, file.size);
    const put = await putPresignedUpload(presign, file, contentType);
    if (!put.ok) throw new Error(`Upload failed for ${file.name}`);
    return {
      file_url: presign.public_url,
      file_name: file.name,
      content_type: contentType,
      size_bytes: file.size,
    };
  }

  async function uploadDeferredAttachments(): Promise<
    KanbanCommentAttachmentInput[]
  > {
    const uploaded: KanbanCommentAttachmentInput[] = [];
    for (const item of readyAttachments) {
      try {
        uploaded.push(await uploadPendingFile(item));
      } catch (e) {
        await Promise.allSettled(uploaded.map((a) => onDiscard(a.file_url)));
        throw e;
      }
    }
    return uploaded;
  }

  async function handleSubmit() {
    if (!canPost) return;
    setUploading(true);
    let submittedAttachments: KanbanCommentAttachmentInput[] = [];
    try {
      submittedAttachments = deferUpload
        ? await uploadDeferredAttachments()
        : readyAttachments.map(
            ({ file_url, file_name, content_type, size_bytes }) => ({
              file_url,
              file_name,
              content_type,
              size_bytes,
            }),
          );
      await onSubmit(submittedAttachments, sendDmWithComment);
      setAlsoSendDM(false);
      pending.forEach((p) => {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
      });
      setPending([]);
      setUploadError("");
    } catch (e) {
      const message = formatKanbanUploadError(e);
      if (submittedAttachments.length > 0) {
        await Promise.allSettled(
          submittedAttachments.map((a) => onDiscard(a.file_url)),
        );
      }
      setUploadError(message);
      toast.error(message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      className="min-w-0 space-y-1.5"
      {...(enableFileDrop ? fileDropHandlers : {})}>
      {showQuickReplies && onQuickReplyPick ? (
        <CommentQuickReplies disabled={busy} onPick={onQuickReplyPick} />
      ) : null}

      <div
        className={cn(
          "relative overflow-hidden rounded-lg border border-[var(--kanban-input-border)] transition-colors",
          singleLine ? "flex items-end gap-1.5 px-2 py-1" : "flex max-h-72 flex-col",
          dragActive && "ring-2 ring-inset ring-indigo-500/70",
          containerClassName,
        )}
        style={{
          borderColor: dragActive
            ? "var(--indigo)"
            : "color-mix(in srgb, var(--kanban-input-border) 55%, transparent)",
          ...containerStyle,
        }}>
        {dragActive ? <FileDropOverlay className="rounded-lg" compact /> : null}
        {singleLine && (
          <div className="flex shrink-0 items-center h-8">
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={acceptAllFileTypes ? undefined : DEFAULT_ACCEPT}
              className="hidden"
              onChange={(e) => {
                const files = e.target.files;
                if (files && files.length > 0) {
                  void handleFiles(Array.from(files));
                }
                e.target.value = "";
              }}
            />
            <ComposerToolbarButton
              label="Attach"
              disabled={
                busy ||
                uploading ||
                (maxFiles != null && pending.length >= maxFiles)
              }
              onClick={() => inputRef.current?.click()}>
              <Attachment01Icon
                size={18}
                className={cn(uploading && "animate-pulse")}
              />
            </ComposerToolbarButton>
          </div>
        )}

        <div
          className={cn(
            "min-w-0 flex-1 bg-transparent",
            !singleLine && "min-h-0 overflow-y-auto",
          )}>
          <TiptapEditor
            value={value}
            onChange={onChange}
            variant={showFormattingToolbar ? "default" : "compact"}
            borderless
            placeholder={placeholder}
            mentionMembers={mentionMembers}
            allowMentionAll={allowMentionAll}
            className={cn(
              singleLine &&
                "[&_.ProseMirror]:min-h-[24px] [&_.ProseMirror]:py-0.5",
            )}
            onSubmit={canPost ? handleSubmit : undefined}
            onEditorReady={setEditor}
          />

          {canSendDM && (
            <div
              className="flex items-center gap-2 px-3 pb-2 pt-1 border-t border-dashed"
              style={{ borderColor: "var(--border)" }}>
              <input
                type="checkbox"
                id={alsoSendDmId}
                checked={alsoSendDM}
                onChange={(e) => setAlsoSendDM(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 bg-transparent animate-fade-in"
              />
              <label
                htmlFor={alsoSendDmId}
                className="text-xs text-muted-foreground select-none cursor-pointer">
                Also send in Messages
              </label>
            </div>
          )}

          <ComposerAttachments
            items={pending}
            busy={busy}
            onRemove={removePending}
          />
        </div>

        {singleLine ? (
          <div className="flex shrink-0 items-center h-8 gap-1">
            {onCancel ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs px-2"
                disabled={busy}
                onClick={() => void handleCancel()}>
                Cancel
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              className="h-8 shrink-0 gap-1.5 rounded-md px-2.5"
              disabled={!canPost}
              aria-label={submitLabel}
              onClick={() => void handleSubmit()}>
              {secureSend ? (
                <LockKeyhole size={15} className={cn(busy && "animate-pulse")} />
              ) : (
                <SentIcon size={16} className={cn(busy && "animate-pulse")} />
              )}
              <span>{submitLabel}</span>
            </Button>
          </div>
        ) : (
          <div
            className="@container flex min-w-0 shrink-0 items-center justify-between gap-2 bg-transparent px-2 py-1.5">
            <div className="flex min-w-0 items-center gap-1">
              <input
                ref={inputRef}
                type="file"
                multiple
                accept={acceptAllFileTypes ? undefined : DEFAULT_ACCEPT}
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) {
                    void handleFiles(Array.from(files));
                  }
                  e.target.value = "";
                }}
              />
              {isThread ? (
                <>
                  <Tooltip
                    content={
                      maxFiles != null && pending.length >= maxFiles
                        ? `Maximum ${maxFiles} files`
                        : "Attach file"
                    }
                    side="top">
                    <ComposerToolbarButton
                      label="Attach"
                      disabled={
                        busy ||
                        uploading ||
                        (maxFiles != null && pending.length >= maxFiles)
                      }
                      onClick={() => inputRef.current?.click()}>
                      <PlusSignIcon size={16} />
                    </ComposerToolbarButton>
                  </Tooltip>

                  <ComposerToolbarButton
                    label="Format"
                    active={showFormattingToolbar}
                    onClick={() => setShowFormattingToolbar((prev) => !prev)}>
                    <TextFontIcon size={16} />
                  </ComposerToolbarButton>

                  <EmojiPopover
                    editor={editor}
                    isOpen={showEmojiPopover}
                    onToggle={() => setShowEmojiPopover((prev) => !prev)}
                    onClose={() => setShowEmojiPopover(false)}
                    showLabel
                  />

                  <ComposerToolbarButton
                    label="Mention"
                    onClick={() => {
                      editor?.chain().focus().insertContent("@").run();
                    }}>
                    <AtIcon size={16} />
                  </ComposerToolbarButton>

                  {enableVoice && onVoiceStart ? (
                    <Tooltip content="Voice message" side="top">
                      <ComposerToolbarButton
                        label="Voice"
                        disabled={busy || uploading}
                        onClick={onVoiceStart}>
                        <Mic01Icon size={16} />
                      </ComposerToolbarButton>
                    </Tooltip>
                  ) : null}
                  {onSnippetStart ? (
                    <Tooltip content="Create snippet" side="top">
                      <ComposerToolbarButton
                        label="Snippet"
                        disabled={busy || uploading}
                        onClick={onSnippetStart}>
                        <File01Icon size={16} />
                      </ComposerToolbarButton>
                    </Tooltip>
                  ) : null}
                </>
              ) : (
                <>
                  <ComposerToolbarButton
                    label="Attach"
                    disabled={
                      busy ||
                      uploading ||
                      (maxFiles != null && pending.length >= maxFiles)
                    }
                    onClick={() => inputRef.current?.click()}>
                    <span className="text-lg font-light leading-none">+</span>
                  </ComposerToolbarButton>

                  <ComposerToolbarButton label="Format">
                    <span className="text-sm font-semibold">Aa</span>
                  </ComposerToolbarButton>

                  <ComposerToolbarButton label="Emoji">
                    <span className="text-lg">☺</span>
                  </ComposerToolbarButton>

                  <ComposerToolbarButton label="Mention">
                    <span className="text-sm">@</span>
                  </ComposerToolbarButton>
                </>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {onCancel ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7"
                  disabled={busy}
                  onClick={() => void handleCancel()}>
                  Cancel
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                className={cn(
                  "h-7 shrink-0 gap-1.5 rounded-md px-2.5",
                  iconOnlySend && "h-8 w-8 rounded-full px-0",
                )}
                disabled={!canPost}
                aria-label={submitLabel}
                title={iconOnlySend ? submitLabel : undefined}
                onClick={() => void handleSubmit()}>
                {secureSend && !iconOnlySend ? (
                  <LockKeyhole size={15} className={cn(busy && "animate-pulse")} />
                ) : (
                  <SentIcon size={16} className={cn(busy && "animate-pulse")} />
                )}
                {iconOnlySend ? null : <span>{submitLabel}</span>}
              </Button>
            </div>
          </div>
        )}
      </div>

      {singleLine && pending.length > 0 ? (
        <div className="flex flex-wrap gap-2 pt-1.5">
          {pending.map((a, i) => (
            <div
              key={a.file_url}
              className="group relative flex items-center gap-2 rounded-sm border px-2 py-1 text-xs"
              style={{
                borderColor: "var(--border)",
                background: "var(--surface)",
              }}>
              {a.previewUrl ? (
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-sm">
                  <Image
                    src={a.previewUrl}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <File01Icon
                  size={16}
                  className="shrink-0 text-muted-foreground"
                />
              )}
              <span className="max-w-[120px] truncate text-muted-foreground">
                {a.file_name}
              </span>
              <button
                type="button"
                className="rounded-sm p-0.5 text-muted-foreground hover:bg-white/10 hover:text-(--text)"
                aria-label="Remove attachment"
                disabled={busy}
                onClick={() => void removePending(i)}>
                <Cancel01Icon size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {uploadError ? (
        <p className="text-xs text-red-400">{uploadError}</p>
      ) : null}
    </div>
  );
}
