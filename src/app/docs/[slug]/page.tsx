import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import DocsArticle from "@/components/docs/docs-article";
import { DOC_PAGES, getDoc, INDEX_SLUG } from "@/lib/docs";
import { docMetadata } from "../doc-metadata";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return DOC_PAGES.filter((p) => p.slug !== INDEX_SLUG).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = getDoc((await params).slug);
  return page ? docMetadata(page) : {};
}

export default async function DocPageRoute({ params }: Props) {
  const { slug } = await params;
  if (slug === INDEX_SLUG) permanentRedirect("/docs");
  const page = getDoc(slug);
  if (!page) notFound();
  return <DocsArticle page={page} />;
}
