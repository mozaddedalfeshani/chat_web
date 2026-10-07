"use client";

import { useState, type MouseEvent, type ReactNode } from "react";
import { FileText } from "lucide-react";
import {
  formatSnippetSize,
  snippetPreview,
} from "@/lib/chat-snippet/snippet-format";
import SnippetViewer from "./snippet-viewer";
import { useSnippetText } from "./use-snippet-text";

const HEAD_BYTES = 2048;

/**
 * A `.md` / `.txt` attachment in a bubble: file name, size and the first
 * lines. Clicking opens the whole file. `url` is the local copy to read.
 */
export default function SnippetCard({
  url,
  fileName,
  sizeBytes,
  actions,
  noSave,
  onContextMenu,
}: {
  url: string;
  fileName: string;
  sizeBytes: number;
  /** Save / download controls for this file, shown in the viewer. */
  actions?: ReactNode;
  /** No Copy and no selection in the viewer; see `SnippetViewer`. */
  noSave?: boolean;
  onContextMenu?: (event: MouseEvent) => void;
}) {
  const [open, setOpen] = useState(false);
  const head = useSnippetText(url, HEAD_BYTES);
  const preview = head.text ? snippetPreview(head.text) : "";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        onContextMenu={onContextMenu}
        className="block w-[280px] max-w-full rounded-[12px] bg-[var(--sig-fill,rgba(150,150,150,0.12))] px-3 py-2.5 text-start"
      >
        <span className="flex items-center gap-2 text-[13px]">
          <FileText className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate font-semibold">{fileName}</span>
          <span className="shrink-0 text-[11px] text-[var(--sig-label-2,var(--text-muted))]">
            {formatSnippetSize(sizeBytes)}
          </span>
        </span>
        {/* Fixed height: a card that grew once its text arrived would move
            every message above it. */}
        <span className="mt-2 block h-[80px] overflow-hidden whitespace-pre font-mono text-[11.5px] leading-4 text-[var(--sig-label-2,var(--text-muted))]">
          {head.failed ? "Click to open" : preview}
        </span>
      </button>
      {open ? (
        <SnippetViewer
          url={url}
          fileName={fileName}
          actions={actions}
          noSave={noSave}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
