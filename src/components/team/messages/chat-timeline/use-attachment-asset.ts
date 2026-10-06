"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { ChatMessageAttachment } from "@/lib/api";
import {
  loadSealedAsset,
  sealedAsset,
  subscribeSealedAssets,
  type SealedAsset,
} from "@/lib/chat-attachments/sealed-assets";
import { useLocalAssetState } from "./use-local-asset";

/**
 * Larger than this, an encrypted video or document waits for a click: the
 * whole object has to come down before any of it can be shown, and a chat
 * full of videos must not download them all for being scrolled past. Photos
 * are always fetched — a chat drew those unasked before they were encrypted.
 * The phone's auto-download ceiling is the same figure.
 */
const AUTO_LOAD_BYTES = 5 * 1024 * 1024;

export type AttachmentAsset = {
  /** What to draw or save: never the address of ciphertext. */
  src: string | null;
  /** A final answer — this file cannot be shown on this device. */
  unavailable: boolean;
  /**
   * Set when the file is waiting for the user: too large to fetch unasked,
   * or a download that failed. Calling it starts (or retries) the download.
   */
  fetch?: () => void;
};

type Row = Pick<
  ChatMessageAttachment,
  "file_url" | "content_type" | "size_bytes" | "enc_meta" | "sealed_as" | "seal_failed"
>;

const NOTHING: SealedAsset = { src: null, status: "idle" };

function start(fileUrl: string) {
  // The outcome is the store's to report; a rejection here is already a
  // "failed" state on screen.
  loadSealedAsset(fileUrl).catch(() => {});
}

/**
 * Where an attachment is drawn from.
 *
 * An ordinary file keeps the answer it always had (`useLocalAssetState`: an
 * imported copy, or its CDN URL). An encrypted one (server 0168) is fetched
 * and decrypted here first and drawn from that — its URL serves ciphertext,
 * so it is never handed to an `<img>`. Until its key has been opened it has
 * nothing to show; if the key cannot be opened at all, it says so.
 */
export function useAttachmentAsset(attachment: Row | null | undefined): AttachmentAsset {
  const url = attachment?.file_url ?? "";
  const encrypted = !!attachment?.enc_meta;
  const local = useLocalAssetState(url);
  // History imported from the phone holds the file itself, already
  // decrypted there, and for anything older than the server keeps it is the
  // only copy left. Its address is this browser's, never the CDN's.
  const imported = encrypted && !!local.src && local.src !== url;
  const opened = encrypted && !imported && !!attachment?.sealed_as;
  const asset = useSyncExternalStore(
    subscribeSealedAssets,
    () => (opened ? sealedAsset(url) : NOTHING),
    () => NOTHING,
  );
  const automatic =
    opened &&
    ((attachment?.content_type ?? "").toLowerCase().startsWith("image/") ||
      (attachment?.size_bytes ?? 0) <= AUTO_LOAD_BYTES);

  useEffect(() => {
    if (opened && automatic && asset.status === "idle") start(url);
  }, [opened, automatic, asset.status, url]);

  if (!encrypted || imported) return local;
  if (!opened) return { src: null, unavailable: attachment?.seal_failed === true };
  if (asset.src) return { src: asset.src, unavailable: false };
  const waiting = asset.status === "failed" || (asset.status === "idle" && !automatic);
  return {
    src: null,
    unavailable: false,
    fetch: waiting ? () => start(url) : undefined,
  };
}
