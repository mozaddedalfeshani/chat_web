"use client";

import { AtIcon, NotificationOff01Icon } from "hugeicons-react";
import { isMentionsOnlyMute, muteStatusLabel, type MuteFields } from "./mute-status";

/**
 * The small glyph beside a chat's name while it is muted: a bell with a line
 * through it, or an @ for "only mentions". Display only — the web never
 * changes a mute; that is done on the phone.
 */
export default function MuteBadge({ conv, size = 12 }: { conv: MuteFields; size?: number }) {
  const label = muteStatusLabel(conv);
  if (!label) return null;
  const Icon = isMentionsOnlyMute(conv) ? AtIcon : NotificationOff01Icon;
  return (
    <span title={label} aria-label={label} className="inline-flex shrink-0">
      <Icon size={size} className="text-muted-foreground" />
    </span>
  );
}
