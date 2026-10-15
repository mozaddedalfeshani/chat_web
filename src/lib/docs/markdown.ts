import type { DocBlock, DocPage } from "./types";

function blockToMarkdown(block: DocBlock): string {
  switch (block.type) {
    case "p":
      return block.text;
    case "steps":
      return block.items.map((s, i) => `${i + 1}. ${s}`).join("\n");
    case "list":
      return block.items.map((s) => `- ${s}`).join("\n");
    case "callout":
      return `> ${block.title ? `**${block.title}** ` : ""}${block.text}`;
    case "cards":
      return block.items.map((c) => `- **${c.title}**: ${c.text}`).join("\n");
  }
}

/** What "Copy page" puts on the clipboard. */
export function docToMarkdown(page: DocPage): string {
  const parts = [`# ${page.title}`, page.description];
  if (page.androidOnly) parts.push("_Android app only._");
  for (const b of page.intro ?? []) parts.push(blockToMarkdown(b));
  for (const s of page.sections) {
    parts.push(`## ${s.heading}`);
    for (const b of s.blocks) parts.push(blockToMarkdown(b));
  }
  return parts.join("\n\n") + "\n";
}
