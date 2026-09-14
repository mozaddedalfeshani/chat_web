import { apiFetch, jsonHeaders } from "../core";
import type { ForwardTarget } from "@/lib/chat-e2ee/forward-targets";
import type {
  ChatAttachmentInput,
  ChatConversation,
  ChatMember,
  ChatMessage,
  ChatMessagesPage,
  ChatSidebar,
} from "../types/chat";
import type { WallReactionGroup } from "../types/wall";

export function listChatConversations() {
  return apiFetch<ChatSidebar>("/api/teams/chat/conversations");
}

export function createChatChannel(body: {
  name: string;
  slug?: string;
  is_private?: boolean;
}) {
  return apiFetch<ChatConversation>("/api/teams/chat/channels", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(body),
  });
}

export function patchChatChannel(
  id: string,
  body: { name?: string; archive?: boolean },
) {
  return apiFetch<ChatConversation>(`/api/teams/chat/channels/${id}`, {
    method: "PATCH",
    headers: jsonHeaders,
    body: JSON.stringify(body),
  });
}

export function addChatChannelMember(channelId: string, userId: string) {
  return apiFetch<void>(`/api/teams/chat/channels/${channelId}/members`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ user_id: userId }),
  });
}

export function listChatChannelMembers(channelId: string) {
  return apiFetch<ChatMember[]>(
    `/api/teams/chat/channels/${channelId}/members`,
  );
}

export function leaveChatChannel(channelId: string) {
  return apiFetch<void>(`/api/teams/chat/channels/${channelId}/leave`, {
    method: "POST",
  });
}

export function deleteChatChannel(channelId: string) {
  return apiFetch<void>(`/api/teams/chat/channels/${channelId}`, {
    method: "DELETE",
  });
}

export function forwardChatMessage(body: {
  message_id: string;
  conversation_ids?: string[];
  user_ids?: string[];
  caption?: string;
  /** Client-prepared destinations — required for E2EE sources or DM targets. */
  targets?: ForwardTarget[];
}) {
  return apiFetch<{ forwarded_to: number }>("/api/teams/chat/forward", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(body),
  });
}

export function startChatDM(userId: string) {
  return apiFetch<ChatConversation>("/api/teams/chat/dm", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ user_id: userId }),
  });
}

export function listChatMessages(
  conversationId: string,
  opts?: { cursor?: string; limit?: number; thread?: string },
) {
  const params = new URLSearchParams();
  if (opts?.cursor) params.set("cursor", opts.cursor);
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.thread) params.set("thread", opts.thread);
  const qs = params.toString();
  return apiFetch<ChatMessagesPage>(
    `/api/teams/chat/conversations/${conversationId}/messages${qs ? `?${qs}` : ""}`,
  );
}

export function sendChatMessage(
  conversationId: string,
  body: {
    client_message_id?: string;
    body: string;
    encrypted_body?: string;
    encryption_nonce?: string;
    encryption_version?: number;
    encryption_key_version?: number;
    parent_id?: string | null;
    quoted_message_id?: string | null;
    attachments?: ChatAttachmentInput[];
    mentioned_user_ids?: string[];
  },
) {
  return apiFetch<ChatMessage>(
    `/api/teams/chat/conversations/${conversationId}/messages`,
    {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(body),
    },
  );
}

export function patchChatMessage(
  messageId: string,
  body:
    | string
    | {
        body: string;
        encrypted_body: string;
        encryption_nonce: string;
        encryption_version: number;
        encryption_key_version: number;
      },
) {
  return apiFetch<ChatMessage>(`/api/teams/chat/messages/${messageId}`, {
    method: "PATCH",
    headers: jsonHeaders,
    body: JSON.stringify(typeof body === "string" ? { body } : body),
  });
}

export function deleteChatMessage(messageId: string) {
  return apiFetch<void>(`/api/teams/chat/messages/${messageId}`, {
    method: "DELETE",
  });
}

/** "Delete for me" — hidden for this account only, on every device. */
export function hideChatMessage(messageId: string) {
  return apiFetch<void>(`/api/teams/chat/messages/${messageId}/hide`, {
    method: "POST",
  });
}

export function toggleChatReaction(messageId: string, emoji: string) {
  return apiFetch<WallReactionGroup[]>(
    `/api/teams/chat/messages/${messageId}/reactions`,
    {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ emoji }),
    },
  );
}

export function markChatConversationRead(conversationId: string) {
  return apiFetch<void>(
    `/api/teams/chat/conversations/${conversationId}/read`,
    { method: "POST" },
  );
}

export function muteChatConversation(conversationId: string, muted: boolean) {
  return apiFetch<{ muted: boolean }>(
    `/api/teams/chat/conversations/${conversationId}/mute`,
    {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ muted }),
    },
  );
}

export function searchChatMessages(q: string, limit = 20) {
  const params = new URLSearchParams();
  params.set("q", q);
  params.set("limit", String(limit));
  return apiFetch<ChatMessage[]>(`/api/teams/chat/search?${params.toString()}`);
}

export function presignChatAttachment(
  conversationId: string,
  contentType: string,
  fileName: string,
  sizeBytes: number,
) {
  return apiFetch<{
    upload_url: string;
    public_url: string;
    object_key: string;
  }>(`/api/teams/chat/conversations/${conversationId}/attachments/presign`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({
      content_type: contentType,
      file_name: fileName,
      size_bytes: sizeBytes,
    }),
  });
}

export function discardChatUpload(conversationId: string, fileUrl: string) {
  return apiFetch<void>(
    `/api/teams/chat/conversations/${conversationId}/attachments/discard`,
    {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ file_url: fileUrl }),
    },
  );
}
