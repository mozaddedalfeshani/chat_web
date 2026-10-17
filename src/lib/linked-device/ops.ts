import type { ChatMessage, ChatPrivateOp } from "@/lib/api/types/chat";
import {
  applyPrivateReaction,
  editedStandIn,
  privateOpEffect,
} from "@/lib/delivery-only/private-op";
import { readLocalMessage } from "@/lib/history/repo/messages-read";
import { forgetMessage } from "@/lib/history/repo/messages-write";
import { persistRawMessages } from "@/store/chat-feed-history";

/**
 * One edit, reaction or delete (`chat.private_op`) applied to this browser's
 * stored copy, by the phone's authorship rule (`privateOpEffect`). The server
 * could not check it once the target was purged, so this does.
 *
 * Resolves true when the op is settled here — applied, refused by the rule,
 * or its target is not in this browser at all (history older than the 90
 * days the phone sent, or a chat deleted here): nothing will ever change for
 * it, and holding it would make every member wait out the 30-day cap.
 * `allSeen` says every pending message is already stored; without it a
 * missing target may still be on its way, and the op waits.
 */
export async function applyStoredOp(
  userId: string,
  op: ChatPrivateOp,
  allSeen: boolean,
): Promise<boolean> {
  const target = await readLocalMessage(userId, op.target_message_id);
  if (!target) return allSeen;
  const effect = privateOpEffect(op, target);
  if (effect === "ignore") return true;
  if (effect === "delete") {
    await forgetMessage(userId, target.id);
    return true;
  }
  const next: ChatMessage =
    effect === "edit"
      ? editedStandIn(op, target)
      : {
          ...target,
          reactions: applyPrivateReaction(target.reactions ?? [], {
            userId: op.sender_id,
            currentUserId: userId,
            emoji: op.emoji ?? "",
            reacted: op.reacted !== false,
          }),
        };
  // A stored row with a revision only gives way to a higher one.
  if (typeof target.revision === "number") next.revision = target.revision + 1;
  return persistRawMessages(userId, [next]);
}
