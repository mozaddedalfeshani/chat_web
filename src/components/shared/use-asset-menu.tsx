"use client";

import { useState, type MouseEvent } from "react";
import { Copy, Download, ExternalLink, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import FloatingMenu, { type FloatingMenuItem } from "./floating-menu";
import {
  copyImageToClipboard,
  copyTextToClipboard,
  fileNameFromUrl,
  openExternal,
  saveAssetToDownloads,
} from "@/lib/files/asset-actions";

export type AssetMenuTarget = {
  /** The asset's own address: what is saved, copied and opened. */
  url?: string | null;
  fileName?: string;
  kind?: "image" | "video" | "audio" | "file";
  /** Rows for the thing carrying the asset — a link preview's page, say. */
  extra?: FloatingMenuItem[];
  /** Off where a parent already owns the right-click (a message bubble). */
  disabled?: boolean;
};

async function run(action: () => Promise<unknown>, done: string, failed: string) {
  try {
    const outcome = await action();
    // A save panel that was cancelled reports `saved: false`; nothing happened
    // and nothing should be claimed.
    if (outcome && typeof outcome === "object" && "saved" in outcome && !outcome.saved) return;
    toast.success(done);
  } catch (error) {
    console.warn(`[asset-menu] ${failed}`, error);
    toast.error(`${failed}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Right-click on anything the app drew from a file: Save it, copy it, or open
 * it in the real browser.
 *
 * The webview has no menu of its own — WKWebView's is suppressed, and Signal
 * Desktop gets Electron's for free — so without this a photo, a video or a
 * file had no actions at all except the ones printed beside it. Save and Copy
 * read the copy already on this machine, so neither costs a download.
 *
 * The menu stops the event: a picture inside a message bubble answers with
 * these rows rather than the bubble's, which is what Signal does too.
 */
export function useAssetMenu({
  url,
  fileName,
  kind = "image",
  extra,
  disabled,
}: AssetMenuTarget) {
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);

  const items: FloatingMenuItem[] = [...(extra ?? [])];
  if (url) {
    const name = fileName || fileNameFromUrl(url);
    const noun = kind === "image" ? "Image" : kind === "file" ? "File" : "Media";
    items.push({
      key: "save",
      label: "Save as…",
      icon: <Download size={17} />,
      onSelect: () => {
        void run(
          () => saveAssetToDownloads(url, name),
          `${noun} saved`,
          "Could not save this file",
        );
      },
    });
    if (kind === "image") {
      items.push({
        key: "copy-image",
        label: "Copy image",
        icon: <Copy size={17} />,
        onSelect: () => {
          void run(
            () => copyImageToClipboard(url),
            "Image copied",
            "Could not copy this image",
          );
        },
      });
    }
    // A `blob:` address is a decrypted file held by this tab: as a link it
    // opens nothing anywhere else, so it is not offered as one.
    if (!url.startsWith("blob:")) items.push({
      key: "copy-link",
      label: "Copy link",
      icon: <LinkIcon size={17} />,
      onSelect: () => {
        void run(() => copyTextToClipboard(url), "Link copied", "Could not copy the link");
      },
    });
    items.push({
      key: "open",
      label: "Open in browser",
      icon: <ExternalLink size={17} />,
      onSelect: () => {
        void openExternal(url);
      },
    });
  }

  const onContextMenu = (event: MouseEvent) => {
    if (disabled || items.length === 0) return;
    event.preventDefault();
    // The bubble listens for this too, and the asset under the cursor is the
    // more specific answer.
    event.stopPropagation();
    setAt({ x: event.clientX, y: event.clientY });
  };

  const menu = at ? (
    <FloatingMenu x={at.x} y={at.y} items={items} onClose={() => setAt(null)} />
  ) : null;

  return { onContextMenu, menu };
}
