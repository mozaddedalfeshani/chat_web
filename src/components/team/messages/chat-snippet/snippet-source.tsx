"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { snippetBlocks } from "@/lib/chat-snippet/snippet-blocks";

// A block enters the page only when the reader scrolls to it.
const FIRST_BLOCKS = 2;

/** A snippet's source, drawn as written. */
export default function SnippetSource({ text }: { text: string }) {
  const blocks = useMemo(() => snippetBlocks(text), [text]);
  const [shown, setShown] = useState({ text, count: FIRST_BLOCKS });
  const count = shown.text === text ? shown.count : FIRST_BLOCKS;
  const more = useRef<HTMLDivElement>(null);
  const pending = count < blocks.length;

  useEffect(() => {
    const mark = more.current;
    if (!pending || !mark) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setShown((held) => ({
          text,
          count: (held.text === text ? held.count : FIRST_BLOCKS) + FIRST_BLOCKS,
        }));
      }
    });
    observer.observe(mark);
    return () => observer.disconnect();
    // `count` re-arms the observer: a mark still on screen after two more
    // blocks must fire again.
  }, [pending, text, count]);

  return (
    <div className="font-mono text-[13px] leading-5">
      {blocks.slice(0, count).map((block, index) => (
        <pre
          key={index}
          className="whitespace-pre-wrap break-words font-[inherit]"
          // A block off screen keeps its place and skips layout and paint.
          style={{ contentVisibility: "auto", containIntrinsicSize: "auto 2000px" }}
        >
          {block}
        </pre>
      ))}
      {pending ? <div ref={more} className="h-px" /> : null}
    </div>
  );
}
