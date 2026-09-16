import type { ChatMessage } from "@/lib/api";

/** Signal groups consecutive messages from one sender inside this window. */
const GROUP_WINDOW_MS = 3 * 60 * 1000;

/** Signal's `.module-message__container`: 18px, collapsing to 4px on the
 * corner that touches the neighbouring bubble in a group. */
const FULL = "18px";
const COLLAPSED = "4px";

export function sameGroup(a: ChatMessage | null, b: ChatMessage | null) {
  if (!a || !b) return false;
  if (a.user_id !== b.user_id) return false;
  // A call/system row is never part of a text group.
  if (a.message_type !== b.message_type) return false;
  if (a.message_type && a.message_type !== "text") return false;
  const gap = Math.abs(
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  return Number.isFinite(gap) && gap <= GROUP_WINDOW_MS;
}

/** Corner radii for a bubble, given where it sits in its group.
 * Outgoing bubbles collapse on the right edge, incoming on the left. */
export function bubbleRadius({
  outgoing,
  groupedAbove,
  groupedBelow,
}: {
  outgoing: boolean;
  groupedAbove: boolean;
  groupedBelow: boolean;
}) {
  const side = outgoing
    ? { above: "borderTopRightRadius", below: "borderBottomRightRadius" }
    : { above: "borderTopLeftRadius", below: "borderBottomLeftRadius" };

  return {
    borderRadius: FULL,
    [side.above]: groupedAbove ? COLLAPSED : FULL,
    [side.below]: groupedBelow ? COLLAPSED : FULL,
  } as const;
}

function isImageOrVideo(message: ChatMessage) {
  const attachments = message.attachments ?? [];
  if (attachments.length === 0) return false;
  return attachments.every((a) => {
    const type = (a.content_type ?? "").toLowerCase();
    return type.startsWith("image/") || type.startsWith("video/");
  });
}

/** Picture/video bubble — caption or not. Time sits on the media. A quote
 *  needs the inset, so a quoted photo keeps the text-bubble path. */
export function isMediaBubble(message: ChatMessage) {
  if (message.quote) return false;
  return isImageOrVideo(message);
}

/** True when the message is nothing but images/video: Signal drops the bubble
 * padding so the media reaches the rounded edge. */
export function isMediaOnly(message: ChatMessage) {
  if (!isMediaBubble(message)) return false;
  if (message.body && message.body.replace(/<[^>]*>/g, "").trim()) return false;
  return true;
}
