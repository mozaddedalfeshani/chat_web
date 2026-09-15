/**
 * Public SEO surface for chat.ababilx.com.
 * Private /user and /auth routes stay noindex — only this landing is the gate.
 */

export const SITE_NAME = "AbabilX Chat";
export const PRODUCT_NAME = "AbabilX Chat";
export const ORG_NAME = "AbabilX";
export const ORG_URL = "https://ababilx.com";
export const ORG_EMAIL = "info@ababilx.com";

/** Brand-first title — owns "ababilx chat" / "chat ababilx" queries. */
export const DEFAULT_TITLE =
  "AbabilX Chat | End-to-End Encrypted Messaging";

export const DEFAULT_DESCRIPTION =
  "AbabilX Chat is secure end-to-end encrypted messaging for personal DMs and workspace groups. Open chat.ababilx.com, scan with your phone, and keep conversations private.";

/** Longer variant for JSON-LD and social cards. */
export const EXTENDED_DESCRIPTION =
  "AbabilX Chat (chat.ababilx.com) is AbabilX's encrypted messaging web app: personal chats, workspace groups, Note to Self, voice and video calls, and phone QR sign-in. Messages are end-to-end encrypted so AbabilX cannot read your private text.";

export const OG_LOCALE = "en_US";
export const OG_LOCALE_ALTERNATES = ["bn_BD"];
export const CONTENT_LANGUAGES = ["en", "bn"];

export const OG_IMAGE_ALT =
  "AbabilX Chat — end-to-end encrypted personal and workspace messaging";

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
  "secure team chat",
  "encrypted workspace chat",
  "personal encrypted DM",
  "QR login chat",
  "AbabilX phone to web chat",
  "AbabilX Note to Self",
  "AbabilX voice call",
  "AbabilX video call",
  "encrypted group chat",
  "developer secure chat",
  "AbabilX Bangladesh chat",
] as const;

const DEFAULT_SITE_URL = "https://chat.ababilx.com";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || DEFAULT_SITE_URL;

export function absoluteUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return normalized === "/" ? SITE_URL : `${SITE_URL}${normalized}`;
}
