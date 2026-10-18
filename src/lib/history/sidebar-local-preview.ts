import type { ChatConversation, ChatMessage } from "@/lib/api/types/chat";
import { decryptChatMessage } from "@/lib/chat-e2ee/crypto";
import {
  LINKED_LAST_MESSAGE_PREVIEW,
  PRIVATE_LAST_MESSAGE_PREVIEW,
} from "@/lib/delivery-only/private-preview";
import { historyEnabled } from "./flag";
import { readLocalFeed } from "./repo/messages-read";

/**
 * Sidebar previews from this browser's own history store — the phone's
 * `withLocalPreviews` (`chat_provider_local_preview.dart`), ported.
 *
 * Delivery-only: once every phone has a message the server deletes it, so a
 * row arrives with no preview at all ("No messages yet") or the
 * `last_message_private` label, while the phone's copy of that very message
 * sits in the store (live history or custody). A row takes the newest stored
 * message when it has no preview of its own, or when the stored one is at
 * least as new as what the server describes — never an older message under a
 * newer time, which is the one case where the label stays.
 */
const READ_AHEAD = 5;

const isLabel = (body?: string) =>
  body === PRIVATE_LAST_MESSAGE_PREVIEW || body === LINKED_LAST_MESSAGE_PREVIEW;

function hasPreview(row: ChatConversation): boolean {
  if (isLabel(row.last_message_body)) return false;
  return (
    !!row.last_message_body ||
    !!row.last_message_attachment_type ||
    !!row.last_message_attachments?.length
  );
}

async function newestStored(userId: string, conversationId: string): Promise<ChatMessage | null> {
  const page = await readLocalFeed(userId, { conversationId, limit: READ_AHEAD });
  return page.messages.find((m) => !m.deleted_at) ?? null;
}

async function withLocal(
  userId: string,
  row: ChatConversation,
): Promise<ChatConversation> {
  const local = await newestStored(userId, row.id).catch(() => null);
  if (!local) return row;
  const localAt = Date.parse(local.created_at);
  const serverAt = Date.parse(row.last_message_at ?? "");
  if (!Number.isFinite(localAt)) return row;
  if (Number.isFinite(serverAt) && localAt < serverAt) return row;
  if (hasPreview(row) && localAt === serverAt) return row;
  const opened = await decryptChatMessage(local, userId).catch(() => local);
  if (opened.decryption_failed) return row;
  const attachments = opened.attachments ?? [];
  return {
    ...row,
    last_message_at: Number.isFinite(serverAt) && serverAt > localAt ? row.last_message_at : local.created_at,
    last_message_body: opened.body,
    last_message_user_id: opened.user_id,
    last_message_attachment_type: attachments[0]?.content_type,
    last_message_attachment_name: attachments[0]?.file_name,
    last_message_attachments: attachments.map((a) => ({
      file_name: a.file_name,
      content_type: a.content_type,
    })),
  };
}

export async function withStoredPreviews(
  userId: string,
  rows: ChatConversation[],
): Promise<ChatConversation[]> {
  if (!userId || !historyEnabled()) return rows;
  return Promise.all(rows.map((row) => withLocal(userId, row)));
}
