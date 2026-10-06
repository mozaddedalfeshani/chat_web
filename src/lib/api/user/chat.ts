import { apiFetch, jsonHeaders } from "../core";
import type { ForwardTarget } from "@/lib/chat-e2ee/forward-targets";
import type {
  ChatAttachmentInput,
  ChatConversation,
  ChatGroupsInCommon,
  ChatMediaPage,
  ChatMember,
  ChatMessage,
  ChatMessagesPage,
  ChatSidebar,
} from "../types/chat";
import type { CallLogPage } from "../types/voice-call";
import type { WallReactionGroup } from "../types/wall";

export function listChatConversations() {
  return apiFetch<ChatSidebar>("/api/chat/conversations");
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
  return apiFetch<ChatConversation>(`/api/chat/conversations/${id}`, {
    method: "PATCH",
    headers: jsonHeaders,
    body: JSON.stringify(body),
  });
}

export function addChatChannelMember(channelId: string, userId: string) {
  return apiFetch<void>(`/api/chat/conversations/${channelId}/members`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ user_id: userId }),
  });
}

export function listChatChannelMembers(channelId: string) {
  return apiFetch<ChatMember[]>(
    `/api/chat/conversations/${channelId}/members`,
  );
}

export function leaveChatChannel(channelId: string) {
  return apiFetch<void>(`/api/chat/conversations/${channelId}/leave`, {
    method: "POST",
  });
}

export function deleteChatChannel(channelId: string) {
  return apiFetch<void>(`/api/chat/conversations/${channelId}`, {
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
  return apiFetch<{ forwarded_to: number }>("/api/chat/forward", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(body),
  });
}

export function startChatDM(userId: string) {
  return apiFetch<ChatConversation>("/api/chat/dm", {
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
    `/api/chat/conversations/${conversationId}/messages${qs ? `?${qs}` : ""}`,
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
    `/api/chat/conversations/${conversationId}/messages`,
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
  return apiFetch<ChatMessage>(`/api/chat/messages/${messageId}`, {
    method: "PATCH",
    headers: jsonHeaders,
    body: JSON.stringify(typeof body === "string" ? { body } : body),
  });
}

export function deleteChatMessage(messageId: string) {
  return apiFetch<void>(`/api/chat/messages/${messageId}`, {
    method: "DELETE",
  });
}

/** "Delete for me" — hidden for this account only, on every device. */
export function hideChatMessage(messageId: string) {
  return apiFetch<void>(`/api/chat/messages/${messageId}/hide`, {
    method: "POST",
  });
}

export function toggleChatReaction(messageId: string, emoji: string) {
  return apiFetch<WallReactionGroup[]>(
    `/api/chat/messages/${messageId}/reactions`,
    {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ emoji }),
    },
  );
}

export function markChatConversationRead(conversationId: string) {
  return apiFetch<void>(
    `/api/chat/conversations/${conversationId}/read`,
    { method: "POST" },
  );
}

export function searchChatMessages(q: string, limit = 20) {
  const params = new URLSearchParams();
  params.set("q", q);
  params.set("limit", String(limit));
  return apiFetch<ChatMessage[]>(`/api/chat/search?${params.toString()}`);
}

export function presignChatAttachment(
  conversationId: string,
  contentType: string,
  fileName: string,
  sizeBytes: number,
  /**
   * The file was encrypted on this device first. `contentType` is then only
   * its kind, `fileName` a generic name and `sizeBytes` the ciphertext's
   * length; the object is stored as `<uuid>.bin`, served as octet-stream.
   */
  encrypted = false,
) {
  return apiFetch<{
    upload_url: string;
    public_url: string;
    object_key: string;
  }>(`/api/chat/conversations/${conversationId}/attachments/presign`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({
      content_type: contentType,
      file_name: fileName,
      size_bytes: sizeBytes,
      ...(encrypted ? { encrypted: true } : {}),
    }),
  });
}

export function discardChatUpload(conversationId: string, fileUrl: string) {
  return apiFetch<void>(
    `/api/chat/conversations/${conversationId}/attachments/discard`,
    {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ file_url: fileUrl }),
    },
  );
}

export function pinChatConversation(conversationId: string, pinned: boolean) {
  return apiFetch<{ pinned: boolean }>(
    `/api/chat/conversations/${conversationId}/pin`,
    {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ pinned }),
    },
  );
}

export function listChatConversationMedia(
  conversationId: string,
  opts?: { kind?: "media" | "files" | "all"; cursor?: string; limit?: number },
) {
  const params = new URLSearchParams();
  params.set("kind", opts?.kind ?? "media");
  params.set("limit", String(opts?.limit ?? 30));
  if (opts?.cursor) params.set("cursor", opts.cursor);
  return apiFetch<ChatMediaPage>(
    `/api/chat/conversations/${conversationId}/media?${params.toString()}`,
  );
}

export function reportChatConversation(
  conversationId: string,
  opts?: { reason?: string; block?: boolean },
) {
  return apiFetch<{ reported: boolean; blocked: boolean; block_error?: string }>(
    `/api/chat/conversations/${conversationId}/report`,
    {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({
      reason: opts?.reason ?? "spam",
      block: opts?.block ?? false,
    }),
    },
  );
}

export function listChatGroupsInCommon(userId: string) {
  return apiFetch<ChatGroupsInCommon>(
    `/api/chat/users/${encodeURIComponent(userId)}/groups-in-common`,
  );
}

export function listChatCallLog(opts?: { before?: string; limit?: number }) {
  const params = new URLSearchParams();
  if (opts?.before) params.set("before", opts.before);
  if (opts?.limit) params.set("limit", String(opts.limit));
  const query = params.toString();
  return apiFetch<CallLogPage>(`/api/chat/calls${query ? `?${query}` : ""}`);
}
