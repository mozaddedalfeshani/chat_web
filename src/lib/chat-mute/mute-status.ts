/**
 * A conversation's mute as the web SHOWS it (server migration 0162). The web
 * never sets a mute — muting is done on the phone — so this is read-only.
 * Wording matches mobile `chat-mute/mute_choice.dart` word for word.
 */
export type MuteFields = {
  muted?: boolean;
  /** When a timed mute ends; absent/null = until unmuted. */
  muted_until?: string | null;
  mute_mode?: "all" | "mentions" | string;
};

/** A timed mute lapses by itself and nothing tells the page, so ask here. */
export function isMutedNow(conv: MuteFields | null | undefined, now = new Date()): boolean {
  if (!conv?.muted) return false;
  if (!conv.muted_until) return true;
  const end = new Date(conv.muted_until);
  return Number.isNaN(end.getTime()) || end.getTime() > now.getTime();
}

export function isMentionsOnlyMute(conv: MuteFields | null | undefined, now = new Date()): boolean {
  return isMutedNow(conv, now) && conv?.mute_mode === "mentions";
}

/** One line saying what the mute is, or null when not muted. */
export function muteStatusLabel(conv: MuteFields | null | undefined, now = new Date()): string | null {
  if (!isMutedNow(conv, now)) return null;
  if (conv?.mute_mode === "mentions") return "Only mentions";
  if (!conv?.muted_until) return "Muted";
  const end = new Date(conv.muted_until);
  if (Number.isNaN(end.getTime())) return "Muted";
  return `Muted until ${formatMuteEnd(end, now)}`;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function clock(d: Date): string {
  const h = d.getHours() % 12 || 12;
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m} ${d.getHours() < 12 ? "AM" : "PM"}`;
}

/** "5:30 PM" today, "tomorrow 9:00 AM", "Wed 9:00 AM" this week, else a date. */
export function formatMuteEnd(end: Date, now = new Date()): string {
  const day = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((day.getTime() - start.getTime()) / 86_400_000);
  const time = clock(end);
  if (days <= 0) return time;
  if (days === 1) return `tomorrow ${time}`;
  if (days < 7) return `${WEEKDAYS[end.getDay()]} ${time}`;
  const date = `${end.getDate()} ${MONTHS[end.getMonth()]}`;
  if (end.getFullYear() === now.getFullYear()) return `${date}, ${time}`;
  return `${date} ${end.getFullYear()}, ${time}`;
}
