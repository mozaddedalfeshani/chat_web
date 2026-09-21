/**
 * The markdown a chat body was written in, or null when it should keep the
 * TipTap renderer.
 *
 * Bots, webhook feeds and people pasting from an AI assistant send markdown
 * as literal text: `**bold**`, `- item`, fenced code. TipTap stores that as
 * plain paragraphs, so without this the bubble showed the asterisks. Only a
 * body whose TipTap is *plain* (paragraphs of unmarked text and line breaks)
 * qualifies — a body with real marks, lists or mentions already carries its
 * formatting, and a mention has to stay a mention chip.
 *
 * The syntax check keeps ordinary messages on the existing renderer, so a
 * sentence that happens to contain one `*` is not reinterpreted.
 *
 * Mobile twin: `ababilx-mobile/lib/features/messages/markdown/
 * message_markdown_source.dart`. Same rule, same regexes — change both, or a
 * message renders formatted on one device and raw on the other.
 */
export function markdownSourceOf(body: string | null | undefined): string | null {
  const trimmed = body?.trim() ?? "";
  if (!trimmed) return null;
  const text = plainTextOf(trimmed);
  if (text == null || !looksLikeMarkdown(text)) return null;
  return text;
}

/** True when `text` carries markdown syntax worth rendering. */
export function looksLikeMarkdown(text: string): boolean {
  return BLOCK_SYNTAX.test(text) || INLINE_SYNTAX.test(text);
}

const BLOCK_SYNTAX =
  /^[ \t]{0,3}(?:#{1,6}[ \t]+\S|[-*+][ \t]+\S|\d{1,3}[.)][ \t]+\S|>[ \t]?\S|```|~~~|(?:[-*_][ \t]*){3,}$|\|.*\|[ \t]*$|- \[[ xX]\] )/m;

const INLINE_SYNTAX =
  /\*\*[^*\s](?:[^*]*[^*\s])?\*\*|__[^_\s](?:[^_]*[^_\s])?__|~~[^~\s](?:[^~]*[^~\s])?~~|`[^`\n]+`|\[[^\]\n]+\]\([^)\s]+\)/;

type Node = {
  type?: string;
  text?: string;
  marks?: unknown[];
  content?: Node[];
};

/** Plain text as it is; a plain TipTap doc as its paragraphs joined by
 *  newlines; null for rich TipTap (and for the webhook markdown marker, which
 *  the TipTap pipeline already upgrades on its own). */
function plainTextOf(body: string): string | null {
  if (!body.startsWith("{") || !body.includes('"type"')) {
    return body.startsWith("{") ? null : body;
  }
  let doc: Node;
  try {
    doc = JSON.parse(body) as Node;
  } catch {
    return null;
  }
  if (doc?.type !== "doc" || !Array.isArray(doc.content)) return null;
  const lines: string[] = [];
  for (const block of doc.content) {
    if (block?.type !== "paragraph") return null;
    let line = "";
    for (const node of block.content ?? []) {
      if (node?.marks?.length) return null;
      if (node?.type === "text") line += node.text ?? "";
      else if (node?.type === "hardBreak") line += "\n";
      else return null;
    }
    lines.push(line);
  }
  return lines.join("\n").trim();
}

/**
 * A chat line break is a line break. Markdown folds a single newline into a
 * space, so "**Done**\nnext step" would read as one line on the web while the
 * phone (gpt_markdown) keeps two. A trailing double space is markdown's own
 * hard break; fenced code is left exactly as written.
 */
export function keepLineBreaks(source: string): string {
  let fenced = false;
  return source
    .split("\n")
    .map((line) => {
      if (/^[ \t]{0,3}(```|~~~)/.test(line)) {
        fenced = !fenced;
        return line;
      }
      if (fenced || !line.trim()) return line;
      return `${line.replace(/[ \t]+$/, "")}  `;
    })
    .join("\n");
}
