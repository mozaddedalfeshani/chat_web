import { textToTiptapJson } from "@/components/team/board/tiptap/utils";
import type { ChatAttachmentInput } from "@/lib/api/types/chat";
import { putPresignedUpload, type PresignedUpload } from "@/lib/chat-attachments/sealed-upload";
import {
  SNIPPET_KINDS,
  SNIPPET_TOO_LARGE,
  isSnippetTooLarge,
  snippetFileName,
  type SnippetKind,
} from "@/lib/chat-snippet/snippet-format";

export type SnippetDraft = {
  title: string;
  kind: SnippetKind;
  content: string;
  message: string;
};

export type SnippetTransport = {
  onPresign: (contentType: string, fileName: string, sizeBytes?: number) => Promise<PresignedUpload>;
  onDiscard: (fileUrl: string) => Promise<void>;
  onSubmit: (
    body: string,
    attachments: ChatAttachmentInput[],
    mentionedUserIds: string[],
  ) => void | boolean | Promise<void | boolean>;
};

/**
 * Uploads the draft as a `.md` / `.txt` file and posts it with the message
 * beside it. The same three steps a voice note takes, so the file is
 * encrypted wherever any other chat file is. Throws on failure, after
 * discarding the reserved object.
 */
export async function sendSnippet(transport: SnippetTransport, draft: SnippetDraft) {
  if (!draft.content.trim()) throw new Error("Add some content first.");
  if (isSnippetTooLarge(draft.content)) throw new Error(SNIPPET_TOO_LARGE);
  const { contentType } = SNIPPET_KINDS[draft.kind];
  const fileName = snippetFileName(draft.title, draft.kind);
  const blob = new Blob([draft.content], { type: contentType });
  const presign = await transport.onPresign(contentType, fileName, blob.size);
  try {
    const put = await putPresignedUpload(presign, blob, contentType);
    if (!put.ok) throw new Error("Upload failed");
    const sent = await transport.onSubmit(
      textToTiptapJson(draft.message.trim()),
      [
        {
          file_url: presign.public_url,
          file_name: fileName,
          content_type: contentType,
          size_bytes: blob.size,
        },
      ],
      [],
    );
    // The chat's own handler reports a refused send with a toast and `false`.
    if (sent === false) throw new SnippetNotSent();
  } catch (error) {
    await transport.onDiscard(presign.public_url).catch(() => {});
    throw error;
  }
}

/** The send was refused and already reported; the dialog stays open. */
export class SnippetNotSent extends Error {
  constructor() {
    super("Could not send the snippet.");
  }
}
