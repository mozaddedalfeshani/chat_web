"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { useEffect, Fragment, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  buildTiptapExtensions,
  isPlainCommentBody,
  parseTiptapContent,
  TIPTAP_PROSE_CLASSES,
  extractUrls,
  unescapeLiteralEscapes,
  markdownToTiptapJson,
} from "../utils";
import { keepLineBreaks, markdownSourceOf } from "../markdown-source";

interface MicrolinkResponse {
  status: string;
  data: {
    title?: string;
    description?: string;
    image?: { url: string } | null;
    logo?: { url: string } | null;
    publisher?: string;
  };
}

export function LinkPreview({ url }: { url: string }) {
  const [prevUrl, setPrevUrl] = useState(url);
  const [preview, setPreview] = useState<{
    title?: string;
    description?: string;
    image?: string;
    logo?: string;
    siteName?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  if (url !== prevUrl) {
    setPrevUrl(url);
    setLoading(true);
    setPreview(null);
  }

  useEffect(() => {
    let active = true;
    fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Fetch failed");
        return res.json() as Promise<MicrolinkResponse>;
      })
      .then((body) => {
        if (!active) return;
        if (body.status === "success" && body.data) {
          const { title, description, image, logo, publisher } = body.data;
          if (title) {
            setPreview({
              title,
              description,
              image: image?.url,
              logo: logo?.url,
              siteName: publisher,
            });
          }
        }
      })
      .catch(() => {
        // Fail silently
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [url]);

  if (loading) {
    return (
      <div className="flex animate-pulse items-center gap-3 rounded-xl border p-3 bg-white/[0.01] border-white/[0.04] h-20 max-w-lg mt-2">
        <div className="h-14 w-14 rounded-lg bg-white/5" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/3 rounded bg-white/5" />
          <div className="h-3 w-3/4 rounded bg-white/5" />
        </div>
      </div>
    );
  }

  if (!preview) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group/preview mt-2.5 flex max-w-lg overflow-hidden rounded-xl border transition-all duration-300 hover:scale-[1.01] hover:shadow-md hover:border-indigo-500/30"
      style={{
        borderColor: "var(--border)",
        background:
          "linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.005) 100%)",
        boxShadow: "0 4px 24px rgba(0, 0, 0, 0.1)",
      }}>
      <div className="flex flex-1 flex-col justify-between p-3 min-w-0">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
            {preview.logo ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={preview.logo}
                alt=""
                className="h-3.5 w-3.5 rounded-sm object-contain"
              />
            ) : null}
            <span className="truncate">
              {preview.siteName || new URL(url).hostname}
            </span>
          </div>
          <h4 className="text-xs font-semibold text-[var(--text)] line-clamp-1 group-hover/preview:text-indigo-400 transition-colors">
            {preview.title}
          </h4>
          {preview.description ? (
            <p className="text-[11px] leading-normal text-muted-foreground line-clamp-2">
              {preview.description}
            </p>
          ) : null}
        </div>
        <div className="mt-2 text-[10px] text-blue-500 dark:text-blue-400 truncate font-medium">
          {url}
        </div>
      </div>
      {preview.image ? (
        <div
          className="w-24 sm:w-32 shrink-0 border-l relative overflow-hidden bg-black/20"
          style={{ borderColor: "var(--border)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview.image}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover/preview:scale-105"
          />
        </div>
      ) : null}
    </a>
  );
}

export function linkifyText(text: string) {
  if (!text) return "";
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const parts = text.split(urlRegex);
  return parts.map((part, index) => {
    if (part.startsWith("http://") || part.startsWith("https://")) {
      let url = part;
      let trailing = "";
      const match = part.match(/([.,;!?)]+)$/);
      if (match) {
        url = part.slice(0, -match[0].length);
        trailing = match[0];
      }
      return (
        <Fragment key={index}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 dark:text-blue-400 hover:underline cursor-pointer font-medium">
            {url}
          </a>
          {trailing}
        </Fragment>
      );
    }
    return part;
  });
}

export default function TiptapViewer({
  value,
  className,
  markdown = false,
}: {
  value: string;
  className?: string;
  /** Draw a body written as markdown (a bot, a feed, a paste from an AI
   *  assistant) as markdown. Chat only; see `markdownSourceOf`. */
  markdown?: boolean;
}) {
  if (!value?.trim()) return null;

  const source = markdown ? markdownSourceOf(value) : null;
  const urls = extractUrls(value).slice(0, 3);

  return (
    <div className="flex flex-col gap-1 w-full">
      {source != null ? (
        <MarkdownBody source={source} className={className} />
      ) : isPlainCommentBody(value) ? (
        <p
          className={cn(
            "whitespace-pre-wrap break-words text-foreground/90",
            className,
          )}>
          {linkifyText(unescapeLiteralEscapes(value))}
        </p>
      ) : (
        <TiptapViewerInner value={value} className={className} />
      )}
      {urls.length > 0 ? (
        <div className="flex flex-col gap-1 mt-1">
          {urls.map((url) => (
            <LinkPreview key={url} url={url} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Markdown source through the same GFM pipeline the editor already carries
 *  (`@tiptap/markdown`), so tables, code, quotes and lists look exactly like
 *  a body typed with the toolbar. Converting builds a headless editor, so it
 *  runs once per source, not per render. */
export function MarkdownBody({
  source,
  className,
}: {
  source: string;
  className?: string;
}) {
  const doc = useMemo(
    () => markdownToTiptapJson(keepLineBreaks(source)),
    [source],
  );
  return <TiptapViewerInner value={doc} className={className} />;
}

function TiptapViewerInner({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const editor = useEditor({
    extensions: buildTiptapExtensions(undefined, undefined, true),
    content: parseTiptapContent(value),
    editable: false,
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor) return;
    editor.commands.setContent(parseTiptapContent(value));
  }, [value, editor]);

  if (!editor) return null;

  return (
    <EditorContent
      editor={editor}
      className={cn(TIPTAP_PROSE_CLASSES, "text-foreground/90", className)}
    />
  );
}
