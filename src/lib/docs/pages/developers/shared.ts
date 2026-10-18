/** Shared bits of the webhook pages, so every sample names the URL the same way. */

/** Where samples read the URL from. Keeping it in an env var is the advice. */
export const URL_VAR = "ABABILX_WEBHOOK_URL";

/** Shape of a real URL, for prose and the spec. */
export const URL_SHAPE = "https://<host>/hooks/chat/<flock-id>/<secret>";

export const WEBHOOK_KEYWORDS = [
  "AbabilX webhook",
  "AbabilX flock",
  "AbabilX feed",
  "incoming webhook",
  "webhook to chat",
  "send message to chat API",
  "chat notification webhook",
  "deploy notifications chat",
];

export const WEBHOOK_UPDATED = "2026-10-19";
