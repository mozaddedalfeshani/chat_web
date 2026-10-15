import { GETTING_STARTED } from "./pages/getting-started";
import { MESSAGING } from "./pages/messaging";
import { PRIVACY } from "./pages/privacy";
import { SECURITY } from "./pages/security";
import { YOUR_DATA } from "./pages/your-data";
import type { DocGroup, DocPage } from "./types";

export type { DocBlock, DocGroup, DocPage, DocSection } from "./types";

/** Sidebar order is reading order: prev/next walk this list. */
export const DOC_GROUPS: DocGroup[] = [
  GETTING_STARTED,
  SECURITY,
  PRIVACY,
  MESSAGING,
  YOUR_DATA,
];

export const DOC_PAGES: DocPage[] = DOC_GROUPS.flatMap((g) => g.pages);

/** The first page is the docs home. */
export const INDEX_SLUG = DOC_PAGES[0].slug;

export function docHref(slug: string): string {
  return slug === INDEX_SLUG ? "/docs" : `/docs/${slug}`;
}

export function getDoc(slug: string): DocPage | undefined {
  return DOC_PAGES.find((p) => p.slug === slug);
}

export function docNeighbours(slug: string) {
  const i = DOC_PAGES.findIndex((p) => p.slug === slug);
  return {
    prev: i > 0 ? DOC_PAGES[i - 1] : undefined,
    next: i >= 0 && i < DOC_PAGES.length - 1 ? DOC_PAGES[i + 1] : undefined,
  };
}
