import type { DocPage } from "@/lib/docs";
import { docJsonLdSchemas } from "@/lib/seo/doc-json-ld";

/** Server-only, like HomeJsonLd. `<` is escaped so page text cannot close the tag. */
export default function DocJsonLd({ page }: { page: DocPage }) {
  return (
    <>
      {docJsonLdSchemas(page).map((schema) => (
        <script
          key={String(schema["@type"])}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }}
        />
      ))}
    </>
  );
}
