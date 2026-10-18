import { DOC_PAGES, docHref, type DocBlock } from "./index";

/** One searchable unit: a page's intro, or one of its sections. */
export type DocSearchEntry = {
  href: string;
  page: string;
  heading: string;
  description: string;
  text: string;
  keywords: string;
};

export type DocSearchHit = DocSearchEntry & { snippet: string };

function blockText(b: DocBlock): string {
  switch (b.type) {
    case "p":
    case "callout":
      return `${"title" in b && b.title ? b.title : ""} ${b.text}`;
    case "list":
    case "steps":
      return b.items.join(" ");
    case "cards":
      return b.items.map((c) => `${c.title} ${c.text}`).join(" ");
    case "table":
      return [...b.head, ...b.rows.flat()].join(" ");
    case "code":
      return `${b.title ?? ""} ${b.code}`;
    case "flow":
      return JSON.stringify(b.steps).replace(/[{}"\[\],:]|title|text|where|branches|label|steps/g, " ");
  }
}

export const DOC_SEARCH_INDEX: DocSearchEntry[] = DOC_PAGES.flatMap((p) => {
  const base = { page: p.title, description: p.description, keywords: (p.keywords ?? []).join(" ") };
  return [
    { ...base, href: docHref(p.slug), heading: p.title, text: (p.intro ?? []).map(blockText).join(" ") },
    ...p.sections.map((s) => ({
      ...base,
      href: `${docHref(p.slug)}#${s.id}`,
      heading: s.heading,
      text: s.blocks.map(blockText).join(" "),
    })),
  ];
});

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ");

function snippet(text: string, term: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  const i = norm(flat).indexOf(term);
  if (i < 0) return flat.slice(0, 140);
  const start = Math.max(0, i - 50);
  return `${start > 0 ? "…" : ""}${flat.slice(start, i + 90)}${i + 90 < flat.length ? "…" : ""}`;
}

/** Every word must appear somewhere; titles and headings weigh most. */
export function searchDocs(query: string, limit = 12): DocSearchHit[] {
  const terms = norm(query).split(" ").filter(Boolean);
  if (!terms.length) return [];
  const hits: { hit: DocSearchHit; score: number }[] = [];
  for (const e of DOC_SEARCH_INDEX) {
    const fields = [norm(e.page), norm(e.heading), norm(e.description), norm(e.keywords), norm(e.text)];
    let score = 0;
    let all = true;
    for (const t of terms) {
      const w = [10, 8, 4, 4, 1].reduce((sum, weight, i) => sum + (fields[i].includes(t) ? weight : 0), 0);
      if (!w) { all = false; break; }
      score += w;
    }
    if (!all) continue;
    if (fields[1].startsWith(terms[0])) score += 5;
    hits.push({ hit: { ...e, snippet: snippet(e.text || e.description, terms[0]) }, score });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit).map((h) => h.hit);
}
