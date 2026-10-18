import type { StoredLink } from "./connect";

/**
 * The live link this tab is using. Its own module, free of store imports, so
 * the feed composer (which the chat store imports) can ask for it.
 */
let active: { userId: string; link: StoredLink } | null = null;

export function currentLink(userId: string): StoredLink | null {
  return active?.userId === userId ? active.link : null;
}

export function setCurrentLink(userId: string, link: StoredLink | null) {
  active = link ? { userId, link } : null;
}

export function activeSession() {
  return active;
}
