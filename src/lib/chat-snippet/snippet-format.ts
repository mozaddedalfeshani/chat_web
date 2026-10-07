// A snippet is long text sent as a file, so it is not bound by the message
// word limit. Same rules as the phone (`snippet_format.dart`): a `.md` or
// `.txt` attachment of at most 10 MB is drawn as a snippet card.

export type SnippetKind = "markdown" | "text";

export const SNIPPET_KINDS: Record<
  SnippetKind,
  { extension: string; contentType: string; label: string }
> = {
  markdown: { extension: "md", contentType: "text/markdown", label: "Markdown (.md)" },
  text: { extension: "txt", contentType: "text/plain", label: "Plain text (.txt)" },
};

export const MAX_SNIPPET_BYTES = 10 * 1024 * 1024;

/** Past this a markdown file is shown as source: formatting megabytes in one
 *  pass freezes the page. */
export const MAX_RENDERED_MARKDOWN_BYTES = 400 * 1024;

export const SNIPPET_TOO_LARGE = "This snippet is too large. The limit is 10 MB.";

const MAX_NAME_CHARS = 80;
const DEFAULT_NAME = "snippet";

/** The file name a snippet is sent under: the title with anything a file
 *  system or a path would trip on removed, plus the kind's extension. */
export function snippetFileName(title: string, kind: SnippetKind): string {
  let name = title
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\.(md|markdown|txt)$/i, "")
    .replace(/^[. ]+|[. ]+$/g, "");
  const chars = Array.from(name);
  if (chars.length > MAX_NAME_CHARS) name = chars.slice(0, MAX_NAME_CHARS).join("").trim();
  if (!name) name = DEFAULT_NAME;
  return `${name}.${SNIPPET_KINDS[kind].extension}`;
}

/** The kind a file name says it is, or null when it is not a snippet. */
export function snippetKindOf(fileName: string): SnippetKind | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) return "markdown";
  if (lower.endsWith(".txt")) return "text";
  return null;
}

export function isSnippetFile(fileName: string, sizeBytes: number): boolean {
  return snippetKindOf(fileName) !== null && sizeBytes <= MAX_SNIPPET_BYTES;
}

export function snippetByteLength(content: string): number {
  return new TextEncoder().encode(content).length;
}

export function isSnippetTooLarge(content: string): boolean {
  // Three bytes is the most one UTF-16 unit can cost, so a short text is
  // answered without encoding it.
  if (content.length * 3 <= MAX_SNIPPET_BYTES) return false;
  return snippetByteLength(content) > MAX_SNIPPET_BYTES;
}

/** The first non-empty lines of the start of a file, for the card. */
export function snippetPreview(head: string, maxLines = 5, maxLineChars = 120): string {
  const lines: string[] = [];
  for (const raw of head.split(/\r\n|\r|\n/)) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;
    const chars = Array.from(line);
    lines.push(chars.length > maxLineChars ? chars.slice(0, maxLineChars).join("") : line);
    if (lines.length === maxLines) break;
  }
  return lines.join("\n");
}

export function formatSnippetSize(bytes: number): string {
  if (bytes < 1024) return `${Math.max(bytes, 0)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
