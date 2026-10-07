import { plainTextToTiptapJson } from "@/components/team/board/tiptap/utils";
import type { ChatAttachmentInput } from "@/lib/api/types/chat";
import { putPresignedUpload, type PresignedUpload } from "@/lib/chat-attachments/sealed-upload";
import {
  taskBodyText,
  type ChatSendExtra,
  type TaskPriority,
} from "@/lib/chat-task/task-format";

export const MAX_TASK_FILES = 10;

export type TaskDraft = {
  title: string;
  description: string;
  priority: TaskPriority;
  files: File[];
};

export type TaskTransport = {
  onPresign: (contentType: string, fileName: string, sizeBytes?: number) => Promise<PresignedUpload>;
  onDiscard: (fileUrl: string) => Promise<void>;
  onSubmit: (
    body: string,
    attachments: ChatAttachmentInput[],
    mentionedUserIds: string[],
    extra?: ChatSendExtra,
  ) => void | boolean | Promise<void | boolean>;
};

/**
 * Uploads the draft's files and posts the task as an ordinary message with
 * `task` beside it — sealed, and its files encrypted, exactly as any other
 * message in this chat. Throws on failure, after discarding what it uploaded.
 */
export async function sendTask(transport: TaskTransport, draft: TaskDraft) {
  const title = draft.title.trim();
  if (!title) throw new Error("Give the task a title.");
  const uploaded: ChatAttachmentInput[] = [];
  try {
    for (const file of draft.files) {
      const contentType = file.type || "application/octet-stream";
      const presign = await transport.onPresign(contentType, file.name, file.size);
      // Listed before the PUT, so a failed transfer is discarded too.
      uploaded.push({
        file_url: presign.public_url,
        file_name: file.name,
        content_type: contentType,
        size_bytes: file.size,
      });
      const put = await putPresignedUpload(presign, file, contentType);
      if (!put.ok) throw new Error(`Could not upload ${file.name}.`);
    }
    const sent = await transport.onSubmit(
      plainTextToTiptapJson(taskBodyText(title, draft.description)),
      uploaded,
      [],
      { task: { priority: draft.priority } },
    );
    // The chat's own handler reports a refused send with a toast and `false`.
    if (sent === false) throw new TaskNotSent();
  } catch (error) {
    await Promise.all(
      uploaded.map((file) => transport.onDiscard(file.file_url).catch(() => {})),
    );
    throw error;
  }
}

/** The send was refused and already reported; the dialog stays open. */
export class TaskNotSent extends Error {
  constructor() {
    super("Could not send the task.");
  }
}
