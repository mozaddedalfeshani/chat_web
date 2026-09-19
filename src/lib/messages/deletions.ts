import { apiFetch } from "@/lib/api/core";
import type { ChatMessage } from "@/lib/api/types/chat";
import { readChatOutbox, removeChatOutboxEntry } from "./outbox/db";

import {
  markerMatches,
  mergeMarkers,
  timestampMicros,
  type ChatDeletion,
} from "@/lib/history/markers";

export type { ChatDeletion };
export { timestampMicros };

const snapshots = new Map<string, ChatDeletion[]>();
export function deletionSnapshot(userId: string): ChatDeletion[] {
  if (!snapshots.has(userId)) {
    try { snapshots.set(userId, JSON.parse(localStorage.getItem(`chat-deletions:${userId}`) ?? "[]")); }
    catch { snapshots.set(userId, []); }
  }
  return snapshots.get(userId) ?? [];
}

export function rememberDeletedMessage(userId: string, conversationId: string, messageId: string) {
  const now = new Date().toISOString();
  const markers = [...deletionSnapshot(userId), {conversation_id: conversationId, message_id: messageId, through_at: now, deleted_at: now, entire_conversation: false}];
  snapshots.set(userId, markers);
  localStorage.setItem(`chat-deletions:${userId}`, JSON.stringify(markers));
}

export function messageSurvives(message: ChatMessage, markers: ChatDeletion[]): boolean {
  return !message.deleted_at && !markerMatches(message, markers);
}

export function conversationSurvives(conversation: {id: string; last_message_at?: string | null}, markers: ChatDeletion[]): boolean {
  return !markers.some((item) => !item.message_id && item.conversation_id === conversation.id &&
    (item.entire_conversation || !conversation.last_message_at ||
      timestampMicros(conversation.last_message_at) <= timestampMicros(item.through_at)));
}

export async function syncChatDeletions(userId: string): Promise<ChatDeletion[]> {
  if (!userId) return [];
  const next = await apiFetch<ChatDeletion[]>("/api/me/chat-deletions");
  const markers = mergeMarkers(deletionSnapshot(userId), next);
  snapshots.set(userId, markers);
  localStorage.setItem(`chat-deletions:${userId}`, JSON.stringify(markers));
  for (const entry of await readChatOutbox()) {
    if (entry.userId === userId && markers.some((item) => !item.message_id &&
      item.conversation_id === entry.conversationId &&
      (item.entire_conversation || entry.createdAt <= Date.parse(item.deleted_at)))) {
      await removeChatOutboxEntry(entry.clientMessageId);
    }
  }
  return markers;
}
