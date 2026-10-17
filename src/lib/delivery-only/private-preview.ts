import type { ChatConversation } from "@/lib/api/types/chat";

/**
 * Sidebar preview for a row whose newest message the server already let go
 * (`last_message_private`, 0160 / 0173). The server blanks the last-message
 * fields — what it still holds is an older message — and keeps only the time.
 * The phone draws its own copy; this browser has one only if the message
 * arrived live, in which case the row already on screen carries it.
 */
export const PRIVATE_LAST_MESSAGE_PREVIEW = "New message · on your phone";
/** The same row in a linked browser (0174), which holds the message itself. */
export const LINKED_LAST_MESSAGE_PREVIEW = "New message";

const isLabel = (body?: string | null) =>
  body === PRIVATE_LAST_MESSAGE_PREVIEW || body === LINKED_LAST_MESSAGE_PREVIEW;

type Preview = Pick<
  ChatConversation,
  | "last_message_body"
  | "last_message_user_id"
  | "last_message_attachment_type"
  | "last_message_attachment_name"
  | "last_message_attachments"
>;

function previewOf(row: ChatConversation): Preview {
  return {
    last_message_body: row.last_message_body,
    last_message_user_id: row.last_message_user_id,
    last_message_attachment_type: row.last_message_attachment_type,
    last_message_attachment_name: row.last_message_attachment_name,
    last_message_attachments: row.last_message_attachments,
  };
}

function hasPreview(row: ChatConversation): boolean {
  return (
    !!row.last_message_body ||
    !!row.last_message_attachment_type ||
    !!row.last_message_attachments?.length
  );
}

/**
 * `next` with every private-last row's preview filled: the previous row's own
 * preview when it describes the same instant or a newer one, else the label.
 */
export function keepPrivatePreviews(
  next: ChatConversation[],
  previous: ChatConversation[],
  linked = false,
): ChatConversation[] {
  const before = new Map(previous.map((row) => [row.id, row]));
  return next.map((row) => {
    if (!row.last_message_private) return row;
    const old = before.get(row.id);
    const oldAt = Date.parse(old?.last_message_at ?? "");
    const newAt = Date.parse(row.last_message_at ?? "");
    if (old && hasPreview(old) && !isLabel(old.last_message_body)
      && Number.isFinite(oldAt) && (!Number.isFinite(newAt) || oldAt >= newAt)) {
      return { ...row, ...previewOf(old) };
    }
    return {
      ...row,
      last_message_body: linked ? LINKED_LAST_MESSAGE_PREVIEW : PRIVATE_LAST_MESSAGE_PREVIEW,
      last_message_user_id: undefined,
      last_message_attachment_type: undefined,
      last_message_attachment_name: undefined,
      last_message_attachments: undefined,
    };
  });
}
