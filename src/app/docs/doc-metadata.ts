import type { Metadata } from "next";
import { docGroupOf, docHref, docMarkdownHref, type DocPage } from "@/lib/docs";
import { absoluteUrl, OG_IMAGE, SITE_NAME } from "@/lib/site";

export function docMetadata(page: DocPage): Metadata {
  const url = absoluteUrl(docHref(page.slug));
  const title = `${page.title} — Docs`;
  const section = docGroupOf(page.slug)?.title;
  return {
    title,
    description: page.description,
    keywords: page.keywords,
    alternates: {
      canonical: url,
      types: { "text/markdown": absoluteUrl(docMarkdownHref(page.slug)) },
    },
    openGraph: {
      type: "article",
      siteName: SITE_NAME,
      title,
      description: page.description,
      url,
      images: [OG_IMAGE],
      ...(page.updated ? { modifiedTime: page.updated } : {}),
      ...(section ? { section } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: page.description,
      images: [OG_IMAGE.url],
    },
  };
}
