import { apiFetch, jsonHeaders } from "../core";
import type { ChatWebhookCreated } from "../types/chat-webhook";

export function createChatWebhookChannel(body: {
  name: string;
  slug?: string;
  is_private?: boolean;
}) {
  return apiFetch<ChatWebhookCreated>("/api/chat/webhook-channels", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(body),
  });
}

export function regenerateChatWebhook(conversationId: string) {
  return apiFetch<Pick<ChatWebhookCreated, "webhook" | "url" | "token">>(
    `/api/chat/conversations/${conversationId}/webhook/regenerate`,
    { method: "POST" },
  );
}

export async function uploadChatWebhookAvatar(conversationId: string, file: File) {
  const draft = await apiFetch<{ upload_url: string; public_url: string }>(
    `/api/chat/conversations/${conversationId}/webhook/avatar/presign`,
    {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ content_type: file.type, size_bytes: file.size }),
    },
  );
  const uploaded = await fetch(draft.upload_url, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!uploaded.ok) throw new Error("Avatar upload to storage failed");
  return apiFetch<{ avatar_url: string }>(
    `/api/chat/conversations/${conversationId}/webhook/avatar`,
    {
      method: "PATCH",
      headers: jsonHeaders,
      body: JSON.stringify({ avatar_url: draft.public_url }),
    },
  );
}
