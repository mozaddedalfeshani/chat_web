import { DOC_PAGES, getDoc } from "@/lib/docs";
import { docMarkdownWithSource } from "@/lib/docs/ai";
import { textResponse } from "@/lib/docs/text-response";

/** Served at /docs/<slug>.md and /docs.md through rewrites in next.config.ts. */
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return DOC_PAGES.map((p) => ({ slug: p.slug }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const page = getDoc((await params).slug);
  if (!page) return new Response("Not found", { status: 404 });
  return textResponse(docMarkdownWithSource(page), "text/markdown");
}
