import type { Metadata } from "next";
import { docHref, type DocPage } from "@/lib/docs";

export function docMetadata(page: DocPage): Metadata {
  const url = docHref(page.slug);
  return {
    title: `${page.title} — Docs`,
    description: page.description,
    alternates: { canonical: url },
    openGraph: { title: page.title, description: page.description, url },
  };
}
