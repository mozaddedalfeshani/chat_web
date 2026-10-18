import { absoluteUrl, SITE_NAME } from "@/lib/site";
import { DOC_GROUPS, DOC_PAGES, docHref, docMarkdownHref, type DocPage } from "./index";
import { docToMarkdown } from "./markdown";

/**
 * Plain-text entry points for AI assistants and crawlers, following the
 * llms.txt proposal (https://llmstxt.org): a short index that links to a
 * Markdown copy of every page, and one file with all of them.
 */

const SUMMARY =
  "AbabilX Chat is an end-to-end encrypted messenger (Android, web at chat.ababilx.com, desktop). These docs cover sign-in, encryption, privacy features, messaging, your data, and the developer webhook API for flocks (read-only chats that apps post into).";

export const OPENAPI_PATH = "/openapi/flock-webhook.json";

/** Markdown copy of a page, headed by where it lives on the web. */
export function docMarkdownWithSource(page: DocPage): string {
  const meta = [
    `Source: ${absoluteUrl(docHref(page.slug))}`,
    page.updated ? `Last updated: ${page.updated}` : "",
  ].filter(Boolean);
  return `${docToMarkdown(page).trimEnd()}\n\n---\n${meta.join("\n")}\n`;
}

export function llmsTxt(): string {
  const lines = [`# ${SITE_NAME} docs`, "", `> ${SUMMARY}`, ""];
  lines.push(
    "Every page below is Markdown. Webhook behaviour (requests, every status code, limits) is also in an OpenAPI 3.1 file.",
    "",
  );
  for (const group of DOC_GROUPS) {
    lines.push(`## ${group.title}`, "");
    for (const p of group.pages) {
      lines.push(`- [${p.title}](${absoluteUrl(docMarkdownHref(p.slug))}): ${p.description}`);
    }
    lines.push("");
  }
  lines.push(
    "## Machine-readable",
    "",
    `- [Flock webhook OpenAPI spec](${absoluteUrl(OPENAPI_PATH)}): POST /hooks/chat/{flockId}/{secret}, every response.`,
    `- [All docs in one file](${absoluteUrl("/llms-full.txt")})`,
    "",
  );
  return lines.join("\n");
}

export function llmsFullTxt(): string {
  const head = `# ${SITE_NAME} docs (full text)\n\n> ${SUMMARY}\n`;
  return [head, ...DOC_PAGES.map(docMarkdownWithSource)].join("\n\n");
}
