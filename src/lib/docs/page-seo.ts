import type { DocPage } from "./types";

/**
 * Search terms and last content change for pages that do not set their own.
 * A page's own `keywords` / `updated` win. Bump `updated` when a page's facts change.
 */
const SEO: Record<string, { keywords: string[]; updated: string }> = {
  introduction: { keywords: ["AbabilX Chat", "encrypted messenger", "secure chat app", "AbabilX docs"], updated: "2026-10-19" },
  "sign-in": { keywords: ["AbabilX web login", "QR code sign in", "chat.ababilx.com login", "scan to sign in"], updated: "2026-10-18" },
  "get-the-app": { keywords: ["AbabilX Android app", "download AbabilX", "AbabilX Google Play", "AbabilX iPhone"], updated: "2026-10-19" },
  encryption: { keywords: ["end-to-end encryption", "E2EE chat", "encrypted files", "what server can see"], updated: "2026-10-19" },
  "how-encryption-works": { keywords: ["P-256", "AES-256-GCM", "HKDF", "group key rotation", "encryption flow"], updated: "2026-10-19" },
  "recovery-code": { keywords: ["AbabilX recovery code", "restore messages new phone", "move chats to new phone", "local backup restore"], updated: "2026-10-19" },
  "safety-numbers": { keywords: ["safety number", "verify contact key", "man in the middle", "key change warning"], updated: "2026-09-05" },
  "message-requests": { keywords: ["message requests", "block strangers", "who can find me", "discovery settings"], updated: "2026-09-12" },
  "privacy-mode": { keywords: ["privacy mode", "hide online status", "hide read receipts", "hide typing"], updated: "2026-09-23" },
  "private-chat": { keywords: ["private chat", "disappearing server copy", "no screenshots", "hidden notifications"], updated: "2026-10-19" },
  "ghost-chat": { keywords: ["Ghost Chat", "peer to peer chat", "never stored chat", "burn messages"], updated: "2026-09-26" },
  "view-once": { keywords: ["view once photo", "disappearing photo", "timed photo"], updated: "2026-09-25" },
  groups: { keywords: ["encrypted group chat", "group admin permissions", "group privacy"], updated: "2026-09-25" },
  calls: { keywords: ["encrypted voice call", "video call", "free group calls", "screen sharing"], updated: "2026-10-16" },
  "send-later": { keywords: ["schedule message", "send later", "scheduled message encrypted"], updated: "2026-10-11" },
  "task-cards": { keywords: ["task card chat", "tasks in DM", "task status priority"], updated: "2026-10-07" },
  "note-to-self": { keywords: ["Note to Self", "message yourself", "private notes chat"], updated: "2026-09-09" },
  history: { keywords: ["message retention", "delivery-only chat", "server deletes messages", "chat history phone"], updated: "2026-10-19" },
  "local-backup": { keywords: ["AbabilX backup", "chat backup Android", "restore chats"], updated: "2026-10-19" },
  "open-source": { keywords: ["open source messenger", "open source encrypted chat app", "AbabilX GitHub", "ababilx-mobile", "AGPL messenger"], updated: "2026-10-25" },
};

export function withSeo(page: DocPage): DocPage {
  const seo = SEO[page.slug];
  if (!seo) return page;
  return { ...page, keywords: page.keywords ?? seo.keywords, updated: page.updated ?? seo.updated };
}
