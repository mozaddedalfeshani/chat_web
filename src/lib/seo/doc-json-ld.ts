import { DOC_PAGES, docGroupOf, docHref, type DocPage } from "@/lib/docs";
import { absoluteUrl, ORG_NAME, ORG_URL, SITE_NAME } from "@/lib/site";

/** TechArticle + breadcrumb for one docs page. */
export function docJsonLdSchemas(page: DocPage): Record<string, unknown>[] {
  const url = absoluteUrl(docHref(page.slug));
  const group = docGroupOf(page.slug);
  const crumbs =
    page.slug === DOC_PAGES[0].slug
      ? [{ name: "Docs", url }]
      : [{ name: "Docs", url: absoluteUrl("/docs") }, { name: page.title, url }];
  return [
    {
      "@context": "https://schema.org",
      "@type": "TechArticle",
      headline: page.title,
      description: page.description,
      url,
      mainEntityOfPage: url,
      inLanguage: "en",
      ...(page.updated ? { dateModified: page.updated } : {}),
      keywords: page.keywords?.join(", "),
      articleSection: group?.title,
      about: { "@type": "SoftwareApplication", name: SITE_NAME, applicationCategory: "CommunicationApplication" },
      author: { "@type": "Organization", name: ORG_NAME, url: ORG_URL },
      publisher: { "@type": "Organization", name: ORG_NAME, url: ORG_URL, logo: absoluteUrl("/logo-512.png") },
      image: absoluteUrl("/opengraph-image"),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.url })),
    },
  ];
}
