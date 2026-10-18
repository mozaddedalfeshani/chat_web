import type { DocBlock, DocPage, FlowNode, FlowStep } from "./types";

const WHERE = {
  you: "your device",
  server: "our server",
  them: "their device",
  new: "new device",
} as const;

function nodeToMarkdown(node: FlowNode, n: number, indent: string) {
  const where = node.where ? ` (${WHERE[node.where]})` : "";
  return `${indent}${n}. **${node.title}**${where}${node.text ? `: ${node.text}` : ""}`;
}

function flowToMarkdown(steps: FlowStep[], indent = ""): string {
  return steps
    .map((step, i) => {
      if (!("branches" in step)) return nodeToMarkdown(step, i + 1, indent);
      return step.branches
        .map((b) => {
          const inner = b.steps.map((n, j) => nodeToMarkdown(n, j + 1, `${indent}   `));
          return [`${indent}- _${b.label}_`, ...inner].join("\n");
        })
        .join("\n");
    })
    .join("\n");
}

function tableToMarkdown(head: string[], rows: string[][]) {
  const line = (cells: string[]) => `| ${cells.join(" | ")} |`;
  return [line(head), line(head.map(() => "---")), ...rows.map(line)].join("\n");
}

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
    case "flow":
      return flowToMarkdown(block.steps) + (block.caption ? `\n\n_${block.caption}_` : "");
    case "table":
      return tableToMarkdown(block.head, block.rows);
    case "code":
      return "```" + (block.lang ?? "") + "\n" + block.code + "\n```";
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
