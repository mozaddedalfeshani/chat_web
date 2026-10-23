/**
 * Public SEO surface for chat.ababilx.com.
 * Private /user and /auth routes stay noindex — only this landing is the gate.
 */

export const SITE_NAME = "AbabilX Chat";
export const PRODUCT_NAME = "AbabilX Chat";
export const ORG_NAME = "AbabilX";
export const ORG_URL = "https://ababilx.com";
export const ORG_EMAIL = "info@ababilx.com";
export const GITHUB_REPO_URL = "https://github.com/AbabilX/chat_web";
export const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.ababilx.app";

/** Brand-first title — owns "ababilx chat" / "chat ababilx" queries. */
export const DEFAULT_TITLE =
  "AbabilX Chat | Private, End-to-End Encrypted Messaging";

export const DEFAULT_DESCRIPTION =
  "AbabilX Chat is private messaging: end-to-end encrypted chats, calls and files, deleted from our servers once delivered. No email or phone number needed, no ads, no trackers, no AI. Scan with your phone to chat on the web.";

/** Longer variant for JSON-LD and social cards. */
export const EXTENDED_DESCRIPTION =
  "AbabilX Chat (chat.ababilx.com) is a private messenger. Messages, photos, voice notes and files are end-to-end encrypted, and our servers delete each message once your devices have it. Start without an email or phone number. Privacy mode hides when you are online, typing or reading and removes you from search. Ghost Chat goes phone to phone and is never stored. No ads, no trackers, no AI, and we never share your data.";

export const OG_LOCALE = "en_US";
export const OG_LOCALE_ALTERNATES = ["bn_BD"];
export const CONTENT_LANGUAGES = ["en", "bn"];

export const OG_IMAGE_ALT =
  "AbabilX Chat — private, end-to-end encrypted messaging";

export const OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: OG_IMAGE_ALT,
} as const;

/**
 * Intent clusters for "AbabilX", "AbabilX Chat", "chat AbabilX", and
 * related secure-messaging queries. Kept on the public landing only.
 */
export const DEFAULT_KEYWORDS = [
  "AbabilX",
  "AbabilX Chat",
  "chat AbabilX",
  "AbabilX messaging",
  "AbabilX web chat",
  "AbabilX DM",
  "chat.ababilx.com",
  "ababilx.com chat",
  "AbabilX encrypted chat",
  "AbabilX secure messaging",
  "end-to-end encrypted chat",
  "E2EE messaging",
  "private messaging app",
  "private messenger",
  "messaging without phone number",
  "chat app without email",
  "no tracking messenger",
  "Signal alternative",
  "WhatsApp alternative",
  "Telegram alternative",
  "privacy mode chat",
  "disappearing photos",
  "Ghost Chat",
  "personal encrypted DM",
  "QR login chat",
  "AbabilX phone to web chat",
  "AbabilX Note to Self",
  "AbabilX voice call",
  "AbabilX video call",
  "encrypted group chat",
  "encrypted messenger Bangladesh",
  "AbabilX Bangladesh chat",
] as const;

const DEFAULT_SITE_URL = "https://chat.ababilx.com";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || DEFAULT_SITE_URL;

export function absoluteUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return normalized === "/" ? SITE_URL : `${SITE_URL}${normalized}`;
}
