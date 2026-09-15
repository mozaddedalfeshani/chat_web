import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

/**
 * Chat history is private. Search Console only gets the signed-out landing
 * page — the one URL a crawler is allowed to fetch.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: absoluteUrl("/"),
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
