/**
 * The words under a chat name while somebody is typing. A DM already names
 * its one peer in the header, so it says only "typing…"; a group has to say
 * who.
 */
export function typingLabel(names: string[], isGroup: boolean): string {
  if (names.length === 0) return "";
  if (!isGroup) return "typing…";
  const shown = names.map((n) => n.trim() || "Someone");
  if (shown.length === 1) return `${shown[0]} is typing…`;
  if (shown.length === 2) return `${shown[0]} and ${shown[1]} are typing…`;
  return `${shown.length} people are typing…`;
}
