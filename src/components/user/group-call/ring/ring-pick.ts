/**
 * Who a new group call rings (server 0172). `null` = everyone, which is what
 * the server does when no list is sent; a list = exactly those people
 * (empty = nobody). Pure, so the wording matches mobile's `ringSummary`.
 */
export type RingSelection = string[] | null;

/** A pick that covers every member is "everyone": send no list at all. */
export function normalizeRingPick(picked: Iterable<string>, memberIds: string[]): RingSelection {
  const set = new Set(picked);
  const kept = memberIds.filter((id) => set.has(id));
  return kept.length === memberIds.length ? null : kept;
}

export function ringSummary(selected: RingSelection, memberCount: number): string {
  if (selected === null || selected.length >= memberCount) return "Everyone";
  if (selected.length === 0) return "Nobody";
  return selected.length === 1 ? "1 person" : `${selected.length} people`;
}

export function ringButtonLabel(selected: RingSelection, memberCount: number): string {
  const summary = ringSummary(selected, memberCount);
  if (summary === "Everyone") return "Ring everyone";
  if (summary === "Nobody") return "Ring nobody";
  return `Ring ${summary}`;
}
