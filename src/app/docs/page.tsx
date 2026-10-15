import DocsArticle from "@/components/docs/docs-article";
import { getDoc, INDEX_SLUG } from "@/lib/docs";
import { docMetadata } from "./doc-metadata";

const page = getDoc(INDEX_SLUG)!;

export const metadata = docMetadata(page);

export default function DocsIndexPage() {
  return <DocsArticle page={page} />;
}
