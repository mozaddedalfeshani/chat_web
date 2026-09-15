export const SITE_NAME = "Chat";
export const PRODUCT_NAME = "AbabilX Chat";
export const DEFAULT_TITLE = PRODUCT_NAME;
export const DEFAULT_DESCRIPTION =
  "End-to-end encrypted messaging with personal and workspace chats.";

const DEFAULT_SITE_URL = "https://chat.ababilx.com";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || DEFAULT_SITE_URL;

export function absoluteUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return normalized === "/" ? SITE_URL : `${SITE_URL}${normalized}`;
}
