"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SNIPPET_KINDS, snippetFileName, type SnippetKind } from "@/lib/chat-snippet/snippet-format";
import { SnippetNotSent, sendSnippet, type SnippetTransport } from "./send-snippet";

const FIELD =
  "w-full rounded-xl border bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--indigo)]";
const FIELD_STYLE = { borderColor: "var(--border)", color: "var(--text)" };

/** Long text sent as a `.md` or `.txt` file: title, type, content and an
 *  optional message. The phone's "Create snippet" page, as a dialog. */
export default function SnippetDialog({
  open,
  onOpenChange,
  transport,
  initialContent = "",
  onSent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transport: SnippetTransport;
  /** Fills the content box: a draft too long to send as a message. Read once,
   *  so the owner remounts the dialog (a new `key`) to pass another. */
  initialContent?: string;
  onSent?: () => void;
}) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<SnippetKind>("markdown");
  const [content, setContent] = useState(initialContent);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    if (sending) return;
    setSending(true);
    try {
      await sendSnippet(transport, { title, kind, content, message });
      setTitle("");
      setContent("");
      setMessage("");
      onOpenChange(false);
      onSent?.();
    } catch (error) {
      if (!(error instanceof SnippetNotSent)) {
        toast.error(error instanceof Error ? error.message : "Could not send the snippet.");
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (sending ? undefined : onOpenChange(next))}>
      <DialogContent className="flex max-h-[90vh] w-full max-w-2xl flex-col gap-3">
        <DialogHeader>
          <DialogTitle>Create snippet</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
            Title (optional)
            <input
              value={title}
              maxLength={80}
              disabled={sending}
              placeholder={snippetFileName("", kind)}
              onChange={(event) => setTitle(event.target.value)}
              className={FIELD}
              style={FIELD_STYLE}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
            Type
            <select
              value={kind}
              disabled={sending}
              onChange={(event) => setKind(event.target.value as SnippetKind)}
              className={FIELD}
              style={FIELD_STYLE}
            >
              {(Object.keys(SNIPPET_KINDS) as SnippetKind[]).map((key) => (
                <option key={key} value={key}>
                  {SNIPPET_KINDS[key].label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <textarea
          value={content}
          disabled={sending}
          autoFocus
          spellCheck={false}
          placeholder="Paste or type the content"
          onChange={(event) => setContent(event.target.value)}
          className={`${FIELD} min-h-[240px] flex-1 resize-none font-mono text-[13px] leading-5`}
          style={FIELD_STYLE}
        />

        <textarea
          value={message}
          disabled={sending}
          rows={2}
          placeholder="Add a message if you like"
          onChange={(event) => setMessage(event.target.value)}
          className={`${FIELD} resize-none`}
          style={FIELD_STYLE}
        />

        <div className="flex justify-end gap-2">
          <Button variant="ghost" disabled={sending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={sending || !content.trim()} onClick={() => void send()}>
            {sending ? "Sending…" : "Send"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
