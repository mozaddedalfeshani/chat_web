"use client";

import { useEffect, useRef, useState, type Ref } from "react";
import { toast } from "sonner";
import CommentComposer, {
  type CommentComposerHandle,
} from "@/components/team/board/comments/composer";
import { extractMentionUserIds, isTiptapEmpty, textToTiptapJson } from "@/components/team/board/tiptap/utils";
import { isMentionAllId } from "@/components/team/board/tiptap/mention-list";
import { MAX_WALL_ATTACHMENT_BYTES } from "@/components/team/wall/wall-attachment-limits";
import type { ChatAttachmentInput } from "@/lib/api/types/chat";
import type { TeamMember } from "@/lib/api/types/team";
import VoiceRecordingBar from "../voice-recording-bar";
import { VoiceMessageRecorder } from "../voice-recorder";
import { useTypingSender } from "@/lib/chat-typing/use-typing-sender";

const MAX_CHAT_FILES = 10;
const MAX_VOICE_MS = 60_000;

export type MessageComposerHandle = CommentComposerHandle;

export default function MessageComposer({
  mentionMembers,
  onSubmit,
  busy,
  onPresign,
  onDiscard,
  placeholder = "Message… (@ to mention)",
  submitLabel = "Send",
  isFreeTier = false,
  initialValue,
  allowMentionAll = false,
  secureSend = false,
  typingConversationId,
  ref,
}: {
  mentionMembers: TeamMember[];
  onSubmit: (
    body: string,
    attachments: ChatAttachmentInput[],
    mentionedUserIds: string[],
  ) => void | boolean | Promise<void | boolean>;
  busy?: boolean;
  onPresign: (
    contentType: string,
    fileName: string,
    sizeBytes?: number,
  ) => Promise<{ upload_url: string; public_url: string }>;
  onDiscard: (fileUrl: string) => Promise<void>;
  placeholder?: string;
  submitLabel?: string;
  isFreeTier?: boolean;
  /** Prefill (e.g. AI reply draft) — user edits and sends manually. */
  initialValue?: string;
  /** Group chat — offer @all / @everyone which expand to all members on send. */
  allowMentionAll?: boolean;
  /** DM text is encrypted before it leaves this device. */
  secureSend?: boolean;
  /** Report "typing…" to the other members of this conversation. */
  typingConversationId?: string | null;
  ref?: Ref<MessageComposerHandle>;
}) {
  const [value, setValue] = useState(initialValue ?? "");
  const [recording, setRecording] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const recorderRef = useRef<VoiceMessageRecorder | null>(null);
  const typing = useTypingSender(typingConversationId);

  useEffect(() => {
    if (!recording || preparing || uploading || paused) return;
    const id = window.setInterval(() => {
      const rec = recorderRef.current;
      if (!rec) return;
      const ms = rec.elapsedMs();
      setElapsedMs(ms);
      if (ms >= MAX_VOICE_MS) {
        void finishVoice();
      }
    }, 200);
    return () => window.clearInterval(id);
    // finishVoice is stable enough via refs; intentional omit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording, preparing, uploading, paused]);

  useEffect(() => {
    return () => {
      recorderRef.current?.cancel();
      recorderRef.current = null;
    };
  }, []);

  async function startVoice() {
    if (busy || recording || preparing || uploading) return;
    setPreparing(true);
    setPaused(false);
    setElapsedMs(0);
    setRecording(true);
    const recorder = new VoiceMessageRecorder();
    recorderRef.current = recorder;
    try {
      await recorder.start();
      setPreparing(false);
    } catch (e) {
      recorder.cancel();
      recorderRef.current = null;
      setRecording(false);
      setPreparing(false);
      toast.error(
        e instanceof Error
          ? e.message
          : "Microphone permission is required to record",
      );
    }
  }

  function cancelVoice() {
    recorderRef.current?.cancel();
    recorderRef.current = null;
    setRecording(false);
    setPreparing(false);
    setUploading(false);
    setPaused(false);
    setElapsedMs(0);
  }

  function togglePause() {
    const rec = recorderRef.current;
    if (!rec || preparing || uploading) return;
    if (paused) {
      rec.resume();
      setPaused(false);
    } else {
      rec.pause();
      setPaused(true);
    }
  }

  async function finishVoice() {
    const rec = recorderRef.current;
    if (!rec || uploading) return;
    setUploading(true);
    setPaused(false);
    let publicUrl: string | null = null;
    try {
      const voice = await rec.stop();
      recorderRef.current = null;
      if (!voice) {
        toast.error("Recording was too short");
        cancelVoice();
        return;
      }
      const presign = await onPresign(
        voice.contentType,
        voice.fileName,
        voice.sizeBytes,
      );
      publicUrl = presign.public_url;
      const put = await fetch(presign.upload_url, {
        method: "PUT",
        headers: { "Content-Type": voice.contentType },
        body: voice.blob,
      });
      if (!put.ok) throw new Error("Upload failed");
      await onSubmit(
        textToTiptapJson(""),
        [
          {
            file_url: presign.public_url,
            file_name: voice.fileName,
            content_type: voice.contentType,
            size_bytes: voice.sizeBytes,
          },
        ],
        [],
      );
      setRecording(false);
      setPreparing(false);
      setUploading(false);
      setElapsedMs(0);
    } catch (e) {
      if (publicUrl) {
        try {
          await onDiscard(publicUrl);
        } catch {
          // ignore
        }
      }
      toast.error(
        e instanceof Error ? e.message : "Could not send the voice message",
      );
      cancelVoice();
    }
  }

  if (recording) {
    return (
      <div className="shrink-0 bg-[var(--sig-bg)] px-3 pb-3 pt-1">
        <VoiceRecordingBar
          elapsedMs={elapsedMs}
          preparing={preparing}
          uploading={uploading}
          paused={paused}
          onDelete={cancelVoice}
          onPauseToggle={togglePause}
          onSend={() => void finishVoice()}
        />
      </div>
    );
  }

  return (
    <div className="shrink-0 bg-[var(--sig-bg)] px-3 pb-3 pt-1">
      <CommentComposer
        ref={ref}
        value={value}
        onChange={(next) => {
          setValue(next);
          typing.onDraftChange(isTiptapEmpty(next));
        }}
        busy={busy}
        mentionMembers={mentionMembers}
        allowMentionAll={allowMentionAll}
        placeholder={placeholder}
        submitLabel={submitLabel}
        acceptAllFileTypes
        maxFileSizeBytes={MAX_WALL_ATTACHMENT_BYTES}
        maxFiles={MAX_CHAT_FILES}
        onPresign={onPresign}
        onDiscard={onDiscard}
        isFreeTier={isFreeTier}
        isThread
        deferUpload
        enableVoice
        enableFileDrop={false}
        secureSend={secureSend}
        iconOnlySend
        containerClassName="rounded-[18px] border-transparent"
        containerStyle={{
          background: "var(--sig-bubble)",
          borderColor: "transparent",
        }}
        onVoiceStart={() => void startVoice()}
        onSubmit={async (attachments) => {
          const raw = extractMentionUserIds(value);
          const mentioned = raw.some(isMentionAllId)
            ? Array.from(
                new Set([
                  ...raw.filter((id) => !isMentionAllId(id)),
                  ...mentionMembers.map((m) => m.user_id),
                ]),
              )
            : raw;
          typing.stop();
          const sent = await onSubmit(value, attachments, mentioned);
          if (sent !== false) setValue("");
        }}
      />
    </div>
  );
}
