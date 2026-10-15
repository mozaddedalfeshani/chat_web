"use client";

import { useState } from "react";
import { Copy01Icon, Tick02Icon } from "hugeicons-react";

/** Copies the page as Markdown, for pasting into notes or an AI assistant. */
export default function CopyPageButton({ markdown }: { markdown: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="flex h-9 items-center gap-2 rounded-lg bg-[var(--surface2)] px-3 text-[14px] font-medium text-[var(--text)] transition-colors hover:bg-[var(--surface3)]"
    >
      {copied ? <Tick02Icon size={16} aria-hidden /> : <Copy01Icon size={16} aria-hidden />}
      {copied ? "Copied" : "Copy page"}
    </button>
  );
}
