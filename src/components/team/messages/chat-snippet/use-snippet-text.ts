"use client";

import { useEffect, useState } from "react";

export type SnippetText = { text: string | null; bytes: number; failed: boolean };

const EMPTY: SnippetText = { text: null, bytes: 0, failed: false };

// The card's first lines, by URL. A row scrolled away and back draws at once
// instead of asking again; bounded so a long session cannot grow it forever.
const heads = new Map<string, string>();
const MAX_HEADS = 300;

async function read(url: string, headBytes?: number): Promise<{ text: string; bytes: number }> {
  // A local copy (`blob:`) is sliced in memory. A remote file is asked for its
  // first bytes only: a ten megabyte log must not be downloaded for a card.
  const ranged = headBytes !== undefined && !url.startsWith("blob:");
  let response: Response;
  try {
    response = await fetch(
      url,
      ranged ? { headers: { Range: `bytes=0-${headBytes - 1}` } } : undefined,
    );
  } catch (error) {
    // An older browser sends a preflight for Range, which a file host may
    // refuse. The plain request is the one every other attachment makes.
    if (!ranged) throw error;
    response = await fetch(url);
  }
  if (!response.ok) throw new Error("fetch failed");
  const blob = await response.blob();
  const part = headBytes !== undefined ? blob.slice(0, headBytes) : blob;
  return { text: await part.text(), bytes: blob.size };
}

/**
 * The text behind a snippet attachment, read from the copy this device
 * already draws from (`url` is what `useAttachmentAsset` answered). With
 * `headBytes` only the start of the file is read, for the card.
 */
export function useSnippetText(url: string | null, headBytes?: number): SnippetText {
  const key = `${url ?? ""}|${headBytes ?? ""}`;
  const [state, setState] = useState<{ key: string; value: SnippetText }>({ key: "", value: EMPTY });
  const known = headBytes !== undefined ? heads.get(key) : undefined;

  useEffect(() => {
    if (!url || known !== undefined) return;
    let live = true;
    read(url, headBytes)
      .then(({ text, bytes }) => {
        if (headBytes !== undefined) {
          if (heads.size >= MAX_HEADS) heads.clear();
          heads.set(key, text);
        }
        if (live) setState({ key, value: { text, bytes, failed: false } });
      })
      .catch(() => {
        if (live) setState({ key, value: { text: null, bytes: 0, failed: true } });
      });
    return () => {
      live = false;
    };
  }, [url, headBytes, key, known]);

  if (known !== undefined) return { text: known, bytes: 0, failed: false };
  return state.key === key ? state.value : EMPTY;
}
