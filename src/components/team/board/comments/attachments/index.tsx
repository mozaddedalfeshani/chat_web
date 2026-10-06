"use client";

import { useState } from "react";
import { Download01Icon, File01Icon } from "hugeicons-react";
import type { ThreadAttachment } from "../thread-types";
import ImagePreviewDialog from "../../dialogs/image-preview";
import PdfPreview from "@/components/shared/pdf-preview";
import LockedFileBadge, { isLockedFile } from "@/components/team/shared/locked-file-badge";
import {
  isImageAttachment,
  isSvgAttachment,
  isCsvAttachment,
} from "@/components/team/shared/attachment-media";
import CsvPreview from "@/components/shared/csv-preview";
import SealedAttachments from "./sealed-attachments";

function AttachmentDownloadOverlay({
  fileName,
  fileUrl,
}: {
  fileName: string;
  fileUrl: string;
}) {
  return (
    <a
      href={fileUrl}
      download={fileName}
      target="_blank"
      rel="noopener noreferrer"
      className="absolute inset-0 flex items-center justify-center gap-1.5 rounded-md bg-black/55 text-xs font-medium text-white opacity-0 transition-opacity duration-150 group-hover/att:opacity-100 group-focus-within/att:opacity-100"
      aria-label={`Download ${fileName}`}>
      <Download01Icon size={14} className="shrink-0" />
      Download
    </a>
  );
}

function isPdfAtt(a: ThreadAttachment) {
  return (
    a.content_type === "application/pdf" ||
    a.file_name.toLowerCase().endsWith(".pdf")
  );
}

export default function CommentAttachments({
  attachments,
}: {
  attachments: ThreadAttachment[];
}) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  if (!attachments.length) return null;

  // Locked files have no url — they render as a name + lock badge instead.
  const lockedFiles = attachments.filter(isLockedFile);
  // Encrypted chat files have their own renderer: every branch below draws
  // from `file_url`, which for those is ciphertext.
  const sealedFiles = attachments.filter((a) => !isLockedFile(a) && a.enc_meta);
  const openFiles = attachments.filter((a) => !isLockedFile(a) && !a.enc_meta);

  const images = openFiles.filter((a) =>
    isImageAttachment(a.content_type, a.file_name),
  );
  const videos = openFiles.filter((a) => a.content_type.startsWith("video/"));
  const audio = openFiles.filter((a) => a.content_type.startsWith("audio/"));
  const pdfs = openFiles.filter(
    (a) => !isImageAttachment(a.content_type, a.file_name) && isPdfAtt(a),
  );
  const csvs = openFiles.filter((a) =>
    isCsvAttachment(a.content_type, a.file_name),
  );
  const otherFiles = openFiles.filter(
    (a) =>
      !isImageAttachment(a.content_type, a.file_name) &&
      !a.content_type.startsWith("video/") &&
      !a.content_type.startsWith("audio/") &&
      !isPdfAtt(a) &&
      !isCsvAttachment(a.content_type, a.file_name),
  );

  const previewImages = images.map((img) => ({
    src: img.file_url,
    alt: img.file_name,
  }));

  return (
    <div className="mt-1.5 min-w-0 max-w-full space-y-1.5">
      {images.length > 0 ? (
        <div className="flex min-w-0 max-w-full flex-wrap items-start gap-1.5">
          {images.map((a) => {
            const svg = isSvgAttachment(a.content_type, a.file_name);
            // Slack-style: one image keeps a larger cap; 2+ share a row (~50% each) then wrap.
            const multi = images.length > 1;
            const maxH = svg ? 160 : 192;
            return (
              <div
                key={a.id}
                className={
                  multi
                    ? "group/att relative max-w-[min(20rem,calc(50%-0.1875rem))] overflow-hidden rounded-lg"
                    : "group/att relative inline-block max-w-full overflow-hidden rounded-lg"
                }
              >
                <button
                  type="button"
                  className="cursor-zoom-in border-0 bg-transparent p-0"
                  aria-label={`Preview ${a.file_name}`}
                  onClick={() => {
                    const idx = images.findIndex((img) => img.id === a.id);
                    setPreviewIndex(idx !== -1 ? idx : 0);
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={a.file_url}
                    alt={a.file_name}
                    className="block h-auto w-auto max-w-full"
                    style={{
                      maxWidth: multi ? "100%" : svg ? 240 : 320,
                      maxHeight: maxH,
                    }}
                  />
                </button>
                <a
                  href={a.file_url}
                  download={a.file_name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute top-1.5 right-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-md bg-black/70 text-white opacity-0 transition-opacity group-hover/att:opacity-100 group-focus-within/att:opacity-100"
                  aria-label={`Download ${a.file_name}`}
                  onClick={(event) => event.stopPropagation()}
                >
                  <Download01Icon size={14} className="shrink-0" />
                </a>
              </div>
            );
          })}
        </div>
      ) : null}

      {videos.length > 0 ? (
        <div className="flex min-w-0 max-w-full flex-col items-start gap-2">
          {videos.map((v) => (
            <video
              key={v.id}
              src={v.file_url}
              controls
              playsInline
              preload="metadata"
              className="block h-auto max-h-72 w-auto max-w-full rounded-lg border"
              style={{ borderColor: "var(--border)" }}
            />
          ))}
        </div>
      ) : null}

      {audio.length > 0 ? (
        <div className="flex min-w-0 max-w-full flex-col gap-2">
          {audio.map((a) => (
            <audio
              key={a.id}
              src={a.file_url}
              controls
              preload="metadata"
              className="h-9 w-full max-w-full"
            />
          ))}
        </div>
      ) : null}

      {pdfs.length > 0 ? (
        <div className="flex flex-col gap-2">
          {pdfs.map((pdf) => (
            <PdfPreview
              key={pdf.id}
              fileName={pdf.file_name}
              fileUrl={pdf.file_url}
            />
          ))}
        </div>
      ) : null}

      {csvs.length > 0 ? (
        <div className="flex flex-col gap-2">
          {csvs.map((csv) => (
            <CsvPreview
              key={csv.id}
              fileName={csv.file_name}
              fileUrl={csv.file_url}
            />
          ))}
        </div>
      ) : null}

      {otherFiles.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {otherFiles.map((a) => (
            <div
              key={a.id}
              className="group/att relative inline-flex max-w-full items-center gap-1.5 rounded-sm border px-2 py-1 text-xs text-muted-foreground"
              style={{ borderColor: "var(--border)" }}>
              <File01Icon size={14} className="shrink-0" />
              <span className="max-w-[200px] truncate">{a.file_name}</span>
              <AttachmentDownloadOverlay
                fileName={a.file_name}
                fileUrl={a.file_url}
              />
            </div>
          ))}
        </div>
      ) : null}

      <SealedAttachments attachments={sealedFiles} />

      {lockedFiles.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {lockedFiles.map((a) => (
            <div
              key={a.id}
              className="inline-flex max-w-full items-center gap-1.5 rounded-sm border px-2 py-1 text-xs text-muted-foreground"
              style={{ borderColor: "var(--border)" }}>
              <File01Icon size={14} className="shrink-0" />
              <span className="max-w-[200px] truncate">{a.file_name}</span>
              <LockedFileBadge />
            </div>
          ))}
        </div>
      ) : null}

      <ImagePreviewDialog
        open={previewIndex !== null}
        src={
          previewIndex !== null && previewImages[previewIndex]
            ? previewImages[previewIndex].src
            : null
        }
        alt={
          previewIndex !== null && previewImages[previewIndex]
            ? previewImages[previewIndex].alt
            : undefined
        }
        images={previewImages}
        currentIndex={previewIndex ?? 0}
        onIndexChange={(idx) => setPreviewIndex(idx)}
        onOpenChange={(open) => {
          if (!open) setPreviewIndex(null);
        }}
      />
    </div>
  );
}
