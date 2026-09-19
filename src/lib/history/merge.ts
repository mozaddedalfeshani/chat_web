import { markerMatches, type ChatDeletion } from "./markers";

/**
 * The merge contract: `ababilx-server/docs/history-transfer-v2-protocol.md`
 * section 7, pinned row by row by `fixtures/history-transfer-v2-merge.json`.
 *
 * One function decides every write into the durable history — an HTTP page, a
 * WebSocket event, a background sync page and a phone batch alike — so two
 * copies of one message can never settle differently depending on which path
 * delivered them.
 */
export type Provenance = "server" | "phone";
export type MergeDecision = "insert" | "replace" | "keep" | "suppress";

export type MergeableMessage = {
  id: string;
  conversation_id: string;
  created_at: string;
  deleted_at?: string | null;
  revision?: number;
  content_purged?: boolean;
};

export type MergeSide<M extends MergeableMessage = MergeableMessage> = {
  provenance: Provenance;
  message: M;
};

/** Retention let the content go. Not a deletion: a phone copy may restore it. */
export function isRetentionPlaceholder(message: MergeableMessage) {
  return message.content_purged === true;
}

/** Somebody pressed delete. Nothing imported may bring it back. */
export function isIntentionalDeletion(message: MergeableMessage) {
  return !!message.deleted_at && message.content_purged !== true;
}

export function isUsable(message: MergeableMessage) {
  return !message.deleted_at && message.content_purged !== true;
}

function knownRevision(message: MergeableMessage) {
  const value = Number(message.revision ?? 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function decideMerge(
  existing: MergeSide | null | undefined,
  incoming: MergeSide,
  markers: ChatDeletion[],
): MergeDecision {
  const next = incoming.message;
  // Row 1: an explicit deletion outranks every revision comparison.
  if (markerMatches(next, markers)) return "suppress";
  // Row 2.
  if (!existing) return "insert";
  const current = existing.message;
  // Rows 3 and 4: a deletion wins from either side.
  if (isIntentionalDeletion(next)) return "replace";
  if (isIntentionalDeletion(current)) return "keep";
  // Rows 5 and 6: a retention placeholder never beats content.
  if (isRetentionPlaceholder(next) && isUsable(current)) return "keep";
  if (isRetentionPlaceholder(current) && isUsable(next)) return "replace";
  const a = knownRevision(current);
  const b = knownRevision(next);
  if (a > 0 && b > 0) {
    // Row 7.
    if (a !== b) return b > a ? "replace" : "keep";
    // Row 8: provenance, not arrival order, settles a tie.
    if (existing.provenance === incoming.provenance) return "keep";
    return incoming.provenance === "server" ? "replace" : "keep";
  }
  // Row 9: with no ordering, backfill never displaces a usable record and an
  // ordinary server read stays authoritative.
  if (incoming.provenance === "phone") return isUsable(current) ? "keep" : "replace";
  return "replace";
}
