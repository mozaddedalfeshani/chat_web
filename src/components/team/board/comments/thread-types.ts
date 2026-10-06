import type { KanbanReactionGroup } from "@/lib/api";

export type ThreadAttachment = {
  id: string;
  file_name: string;
  file_url: string;
  content_type: string;
  size_bytes: number;
  /** Server withheld the url: the workspace's files are locked pending upgrade. */
  locked?: boolean;
  /**
   * Chat only: a file its sender encrypted (server 0168). `file_url` is then
   * ciphertext and must never be drawn directly — see `SealedAttachments`.
   */
  enc_meta?: string;
  sealed_as?: Pick<ThreadAttachment, "file_name" | "content_type" | "size_bytes">;
  seal_failed?: boolean;
};

export type ThreadMessage = {
  id: string;
  user_id: string;
  parent_id?: string | null;
  body: string;
  created_at: string;
  user_name?: string;
  user_avatar_url?: string;
  attachments?: ThreadAttachment[];
  reactions?: KanbanReactionGroup[];
  via_ababilx?: boolean;
  forwarded_from_name?: string;
  forwarded_from_source?: string;
};
