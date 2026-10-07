import type { ChatAttachmentInput } from "@/lib/api/types/chat";

export type ChatOutboxPayload = {
  client_message_id: string;
  body: string;
  encrypted_body?: string;
  encryption_nonce?: string;
  encryption_version?: number;
  encryption_key_version?: number;
  parent_id?: string | null;
  quoted_message_id?: string | null;
  attachments?: ChatAttachmentInput[];
  mentioned_user_ids?: string[];
  /** Marks the message as a task card. DMs only. */
  task?: { priority: string };
};

/** The body half of a send: plaintext, or the ciphertext fields that replace it. */
export type ChatSendBody = Pick<
  ChatOutboxPayload,
  | "body"
  | "encrypted_body"
  | "encryption_nonce"
  | "encryption_version"
  | "encryption_key_version"
>;

export type ChatOutboxEntry = {
  clientMessageId: string;
  userId: string;
  conversationId: string;
  payload: ChatOutboxPayload;
  createdAt: number;
};

export type EncryptedChatOutboxRecord = {
  clientMessageId: string;
  userId: string;
  conversationId: string;
  ciphertext: ArrayBuffer;
  nonce: Uint8Array<ArrayBuffer>;
  createdAt: number;
};
