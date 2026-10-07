"use client";

import { MarkdownBody } from "@/components/team/board/tiptap/viewer";

/**
 * A snippet's markdown, drawn by the renderer a chat body uses.
 *
 * `MarkdownBody` and not the default viewer on purpose: that one also looks
 * up a preview card for the first links in the text, and opening somebody's
 * file must not hand its links to a preview service.
 */
export default function SnippetMarkdown({ source }: { source: string }) {
  return <MarkdownBody source={source} />;
}
