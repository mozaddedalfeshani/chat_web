import type { ChatMessage, ChatPrivateOp } from "@/lib/api/types/chat";
import type { WallReactionGroup } from "@/lib/api/types/wall";

/**
 * Applying a `chat.private_op` to a message this browser has loaded. The
 * server could not check authorship once the target was purged, so this does,
 * exactly as the phone's `privateOpEffect` (private_op.dart): only the author
 * edits or deletes, anyone in the chat reacts, nothing crosses conversations,
 * and an older edit never replaces a newer one.
 */
export type PrivateOpEffect = "ignore" | "edit" | "delete" | "react";

export function privateOpEffect(op: ChatPrivateOp, target: ChatMessage): PrivateOpEffect {
  if (target.conversation_id !== op.conversation_id || target.deleted_at) return "ignore";
  switch (op.kind) {
    case "reaction":
      return op.emoji ? "react" : "ignore";
    case "edit":
      if (target.user_id !== op.sender_id || !op.encrypted_body) return "ignore";
      return olderThanShown(op.created_at, target.edited_at) ? "ignore" : "edit";
    case "delete":
      return target.user_id === op.sender_id ? "delete" : "ignore";
    default:
      return "ignore";
  }
}

function olderThanShown(opAt: string, editedAt?: string | null): boolean {
  const op = Date.parse(opAt);
  const shown = Date.parse(editedAt ?? "");
  return Number.isFinite(op) && Number.isFinite(shown) && op < shown;
}

/**
 * The target as the edit leaves it, still sealed: the body is opened by the
 * ordinary decrypt path, which binds the author's id into the AAD.
 */
export function editedStandIn(op: ChatPrivateOp, target: ChatMessage): ChatMessage {
  return {
    ...target,
    body: "",
    decryption_failed: undefined,
    encrypted_body: op.encrypted_body,
    encryption_nonce: op.encryption_nonce,
    encryption_version: 1,
    encryption_key_version: op.encryption_key_version,
    edited_at: op.created_at,
  };
}

/**
 * `reactions` with `userId`'s `emoji` set or cleared. Idempotent: the same op
 * arriving twice changes nothing.
 */
export function applyPrivateReaction(
  reactions: WallReactionGroup[],
  opts: {
    userId: string;
    currentUserId: string;
    emoji: string;
    reacted: boolean;
    userName?: string;
  },
): WallReactionGroup[] {
  const { userId, currentUserId, emoji, reacted, userName } = opts;
  const out: WallReactionGroup[] = [];
  let found = false;
  for (const group of reactions) {
    if (group.emoji !== emoji) {
      out.push(group);
      continue;
    }
    found = true;
    const users = group.users.filter((u) => u.user_id !== userId);
    if (reacted) users.push({ user_id: userId, user_name: userName });
    if (users.length === 0) continue;
    out.push({
      emoji,
      count: users.length,
      users,
      reacted_by_me: users.some((u) => u.user_id === currentUserId),
    });
  }
  if (!found && reacted) {
    out.push({
      emoji,
      count: 1,
      users: [{ user_id: userId, user_name: userName }],
      reacted_by_me: userId === currentUserId,
    });
  }
  return out;
}
