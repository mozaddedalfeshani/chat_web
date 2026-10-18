import type { MetadataRoute } from "next";
import { DOC_PAGES, docHref } from "@/lib/docs";
import { absoluteUrl } from "@/lib/site";

/**
 * Chat history is private. Search Console only gets the signed-out landing
 * page and the public docs.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: absoluteUrl("/"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...DOC_PAGES.map((page) => ({
      url: absoluteUrl(docHref(page.slug)),
      lastModified: page.updated ? new Date(page.updated) : now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
