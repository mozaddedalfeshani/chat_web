import type { WallReactionGroup } from "./wall";

export type ChatScope = "personal" | "workspace";

export type ChatConversation = {
  id: string;
  /** Empty for personal conversations, which belong to no workspace. */
  team_id: string;
  scope?: ChatScope;
  type: "channel" | "dm" | "group" | "webhook";
  name?: string;
  slug?: string;
  is_private: boolean;
  created_by?: string;
  created_at: string;
  archived_at?: string | null;
  unread_count: number;
  last_message_at?: string | null;
  last_message_body?: string;
  last_message_user_id?: string;
  last_message_encrypted_body?: string;
  last_message_encryption_nonce?: string;
  last_message_encryption_version?: number;
  last_message_encryption_key_version?: number;
  last_message_attachment_type?: string;
  last_message_attachment_name?: string;
  last_message_attachments?: Array<{
    file_name: string;
    content_type: string;
  }>;
  peer_user_id?: string;
  peer_user_name?: string;
  peer_user_avatar?: string;
  /** Peer's profile cover. Same job as `banner_url` on a group. */
  peer_user_cover?: string;
  peer_left?: boolean;
  /**
   * Note to Self: a personal DM whose two participants are the same account.
   * The peer fields describe the viewer, so everything that needs a second
   * person — calls, safety numbers, the request bar, block and report — is
   * hidden rather than pointed back at them.
   */
  is_self?: boolean;
  /**
   * Whether the viewer may post here. A block, a removed connection, a pending
   * reconnect, or a deleted peer all close a DM; `lock_reason` says which.
   */
  can_message?: boolean;
  /**
   * Why the composer is closed. Omitted/empty when the viewer may send.
   * `blocked` | `connection_removed` | `reconnect_requested` | `account_deleted`.
   */
  lock_reason?: string;
  /**
   * Signal-style message request on a personal DM, from this viewer's side.
   * "incoming" means the peer wrote first and the viewer has not answered, so
   * the thread shows Accept / Delete / Block in place of the composer.
   * Absent on workspace DMs and on any server that predates the field.
   */
  request_state?: "none" | "incoming" | "outgoing";
  // Whether the current member has muted this conversation (suppresses its notifications).
  muted?: boolean;
  // Group roster preview (channels only) for the stacked avatar in the sidebar.
  member_avatars?: string[];
  member_count?: number;
  /**
   * Personal-group identity. The photo is a plain URL on our own storage
   * rather than an attachment row: it has no sender and no retention clock.
   */
  avatar_url?: string;
  /**
   * The wide image behind the group header. Separate from `avatar_url` because
   * a circle and a cover photo are never the same crop of the same picture.
   */
  banner_url?: string;
  description?: string;
  /**
   * Permission switches — "admin" (admins only) or "member" (anyone in the
   * group). Who may change the name/description/photo, and who may add people.
   * Absent on a server that predates them, which reads as the strict "admin".
   */
  edit_info_role?: "admin" | "member";
  add_members_role?: "admin" | "member";
  /**
   * The viewer's own role, decided by the server so the client never has to
   * re-derive a permission it would then have to keep in sync.
   */
  my_role?: "admin" | "member";
  /**
   * True only for a group converted from a workspace channel (migration
   * `0145`) that has never had an E2EE key. The server, never the client,
   * decides when plaintext is still acceptable here — mirrors
   * `chatPlaintextUntilKeyedSQL` on the server and `plaintextUntilKeyed` on
   * mobile. A DM, a group created as one, or a group that has ever been
   * keyed is always false.
   */
  plaintext_until_keyed?: boolean;
};

export type ChatMember = {
  user_id: string;
  name: string;
  avatar_url?: string;
  joined_at: string;
  /**
   * Role in this conversation. Personal groups read it; workspace channels
   * leave it at "member" and take management from the team role instead.
   */
  role?: "admin" | "member";
};

export type ChatMessageAttachment = {
  id: string;
  message_id: string;
  file_name: string;
  file_url: string;
  content_type: string;
  size_bytes: number;
  uploaded_by: string;
  created_at: string;
  /** True when the workspace's files are locked: file_url is withheld until upgrade. */
  locked?: boolean;
};

export type ChatMessage = {
  id: string;
  client_message_id?: string;
  conversation_id: string;
  user_id: string;
  body: string;
  encrypted_body?: string;
  encryption_nonce?: string;
  encryption_version?: number;
  encryption_key_version?: number;
  /** Client-only display state; never persisted by the API. */
  decryption_failed?: boolean;
  parent_id?: string | null;
  /** Signal-style quoted reply — stays in the main feed. */
  quote?: ChatMessageQuote;
  created_at: string;
  /** Main-timeline sort key: created_at, or latest thread reply time. */
  last_activity_at?: string;
  edited_at?: string | null;
  deleted_at?: string | null;
  user_name?: string;
  user_avatar_url?: string;
  attachments?: ChatMessageAttachment[];
  reactions?: WallReactionGroup[];
  thread_count: number;
  via_ababilx?: boolean;
  message_type?: "text" | "system" | "voice_call" | "group_call" | "webhook";
  meta?: {
    call_id?: string;
    /** "screen" = share-only session, no microphone leg; "video" = camera call. */
    mode?: "audio" | "screen" | "video";
    status?: string;
    caller_id?: string;
    source_name?: string;
    callee_id?: string;
    duration_seconds?: number;
    end_reason?: string;
    started_by?: string;
    participant_count?: number;
    /**
     * Group update messages ("X added Y"). Names are denormalised on purpose:
     * a member removed a year ago must still render as their name, and
     * re-resolving a user who has since left is a lookup that can only fail.
     */
    event?:
      | "group_created"
      | "name_changed"
      | "description_changed"
      | "avatar_changed"
      | "member_added"
      | "member_removed"
      | "member_left"
      | "role_changed"
      | "permissions_changed";
    actor_id?: string;
    actor_name?: string;
    target_id?: string;
    target_name?: string;
    value?: string;
  } | null;
  forwarded_from_name?: string;
  forwarded_from_source?: string;
  delivery?: {
    targeted_devices: number;
    delivered_devices: number;
    read_devices: number;
  };
};

export type ChatMessageQuote = {
  message_id: string;
  user_id?: string;
  user_name?: string;
  body?: string;
  encrypted_body?: string;
  encryption_nonce?: string;
  encryption_key_version?: number;
  attachment_type?: string;
  deleted?: boolean;  /** Opened on this device; its body is plaintext and never goes to storage. */
  sealed?: boolean;
  /** Sealed under a key this account was never given, e.g. written before it joined. */
  decryption_failed?: boolean;
};

// The end-to-end encryption types live next door; re-exported so every
// existing `from "../types/chat"` import keeps working.
export type * from "./chat-e2ee";

export type ChatMessagesPage = {
  messages: ChatMessage[];
  next_cursor: string;
  has_more: boolean;
};

export type ChatSidebar = {
  channels: ChatConversation[];
  dms: ChatConversation[];
};

export type ChatAttachmentInput = {
  file_url: string;
  file_name: string;
  content_type: string;
  size_bytes: number;
};

export type ChatMessageCreatedEvent = {
  type: "chat.message.created";
  conversation_id: string;
  message: ChatMessage;
};

export type ChatMessageUpdatedEvent = {
  type: "chat.message.updated";
  conversation_id: string;
  message: ChatMessage;
};

export type ChatMessageDeletedEvent = {
  type: "chat.message.deleted";
  conversation_id: string;
  id: string;
};

export type ChatReactionUpdatedEvent = {
  type: "chat.reaction.updated";
  conversation_id: string;
  id: string;
  reactions: WallReactionGroup[];
};

export type ChatConversationUpdatedEvent = {
  type: "chat.conversation.updated";
  conversation_id: string;
};

export type ChatConversationDeletedEvent = {
  type: "chat.conversation.deleted";
  conversation_id: string;
};

export type ChatReceiptUpdate = {
  message_id: string;
  delivery: NonNullable<ChatMessage["delivery"]>;
};

export type ChatReceiptsUpdatedEvent = {
  type: "chat.receipts.updated";
  conversation_id: string;
  receipts: ChatReceiptUpdate[];
};

/** Relayed draft state of another member. Never stored, expires client-side. */
export type ChatTypingEvent = {
  type: "chat.typing";
  conversation_id: string;
  from_user_id: string;
  typing_user_name?: string;
  typing?: boolean;
};

export type ChatWsEvent =
  | ChatMessageCreatedEvent
  | ChatMessageUpdatedEvent
  | ChatMessageDeletedEvent
  | ChatReactionUpdatedEvent
  | ChatReceiptsUpdatedEvent
  | ChatConversationUpdatedEvent
  | ChatConversationDeletedEvent;

export type ChatConnectionState =
  | "none"
  | "pending_out"
  | "pending_in"
  | "accepted"
  | "rejected"
  | "blocked_by_me"
  | "blocked_by_them";

/** A person as discovery returns them — never their email or phone. */
export type ChatUserSummary = {
  user_id: string;
  name: string;
  username?: string;
  avatar_url?: string;
  connection: ChatConnectionState;
  shared_workspace: boolean;
  can_message: boolean;
};

export type ChatConnection = {
  id: string;
  user: ChatUserSummary;
  status: "pending" | "accepted" | "rejected" | "blocked";
  direction: "outgoing" | "incoming";
  created_at: string;
  responded_at?: string | null;
};

export type ChatUserSearchResult = {
  matched_by: "username" | "email" | "phone";
  users: ChatUserSummary[];
};

/** The caller's own discovery identity and opt-outs. */
export type ChatDiscoverySettings = {
  phone_number?: string;
  discoverable_by_username: boolean;
  discoverable_by_email: boolean;
  discoverable_by_phone: boolean;
};
