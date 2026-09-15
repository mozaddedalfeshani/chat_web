import { homeJsonLdSchemas } from "@/lib/seo/json-ld";

/** Server-only: JSON-LD must not render inside client components. */
export default function HomeJsonLd() {
  const schemas = homeJsonLdSchemas();

  return (
    <>
      {schemas.map((schema) => (
        <script
          key={String(schema["@type"])}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}
