"use client";

import { useState } from "react";
import { Copy01Icon, Tick02Icon } from "hugeicons-react";
import type { DocBlock } from "@/lib/docs";

export function DocCode({ block }: { block: Extract<DocBlock, { type: "code" }> }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(block.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked: the text is still selectable */
    }
  }

  return (
    <div className="overflow-hidden rounded-xl bg-[var(--surface2)] ring-1 ring-[var(--border-hover)]/40">
      <div className="flex items-center justify-between gap-3 px-4 py-2 text-[12px] text-[var(--text-muted)]">
        <span>{block.title ?? block.lang ?? ""}</span>
        <button
          type="button"
          onClick={() => void copy()}
          aria-label="Copy code"
          className="flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors hover:bg-[var(--surface3)] hover:text-[var(--text)]"
        >
          {copied ? <Tick02Icon size={14} /> : <Copy01Icon size={14} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 pb-4 font-mono text-[13px] leading-6 text-[var(--text)]">
        <code>{block.code}</code>
      </pre>
    </div>
  );
}
