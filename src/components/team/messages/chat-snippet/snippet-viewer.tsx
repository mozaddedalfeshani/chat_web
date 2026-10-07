"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  MAX_RENDERED_MARKDOWN_BYTES,
  snippetKindOf,
} from "@/lib/chat-snippet/snippet-format";
import SnippetMarkdown from "./snippet-markdown";
import { useSnippetText } from "./use-snippet-text";

/** The whole snippet. Markdown is drawn formatted, with a switch to its
 *  source; plain text is drawn as written. */
export default function SnippetViewer({
  url,
  fileName,
  actions,
  onClose,
}: {
  url: string;
  fileName: string;
  actions?: ReactNode;
  onClose: () => void;
}) {
  const file = useSnippetText(url);
  const [source, setSource] = useState(false);
  const markdown = snippetKindOf(fileName) === "markdown";
  const canFormat = markdown && file.bytes <= MAX_RENDERED_MARKDOWN_BYTES;

  async function copy() {
    if (file.text === null) return;
    try {
      await navigator.clipboard.writeText(file.text);
      toast.success("Copied");
    } catch {
      toast.error("Could not copy");
    }
  }

  return (
    <Dialog open onOpenChange={(next) => (next ? undefined : onClose())}>
      <DialogContent className="flex h-[85vh] w-full max-w-3xl flex-col gap-3">
        <DialogHeader>
          <DialogTitle className="truncate pe-8">{fileName}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2">
          {canFormat ? (
            <Button variant="ghost" size="sm" onClick={() => setSource((value) => !value)}>
              {source ? "Show formatted" : "Show source"}
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" disabled={file.text === null} onClick={() => void copy()}>
            Copy
          </Button>
          {actions}
          {markdown && !canFormat && file.text !== null ? (
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              Too large to format. Showing the source.
            </span>
          ) : null}
        </div>

        <div
          className="min-h-0 flex-1 overflow-auto rounded-xl border p-4"
          style={{ borderColor: "var(--border)", color: "var(--text)" }}
        >
          {file.failed ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Could not read this file.
            </p>
          ) : file.text === null ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Loading…
            </p>
          ) : canFormat && !source ? (
            <SnippetMarkdown source={file.text} />
          ) : (
            <pre className="whitespace-pre-wrap break-words font-mono text-[13px] leading-5">
              {file.text}
            </pre>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
