import { extractUrls, isTiptapEmpty, tiptapToPlainText } from "@/components/team/board/tiptap/utils";
import { isSealedWireName } from "@/lib/chat-attachments/seal-payload";

export type ChatPreviewAttachment = {
  file_name: string;
  content_type: string;
};

function looksLikeTiptapJson(value: string): boolean {
  const t = value.trim();
  return (t.startsWith("{") || t.startsWith("[")) && t.includes('"type"');
}

/** Recover readable preview when the API returns truncated / invalid TipTap JSON. */
export function extractFromBrokenTiptapJson(body: string): string {
  const texts: string[] = [];
  const textRe = /"text"\s*:\s*"((?:\\.|[^"\\])*)"/g;
  let match: RegExpExecArray | null;
  while ((match = textRe.exec(body)) !== null) {
    try {
      const decoded = JSON.parse(`"${match[1]}"`) as string;
      if (decoded) texts.push(decoded);
    } catch {
      if (match[1]) texts.push(match[1]);
    }
  }
  if (texts.length) return texts.join(" ").replace(/\s+/g, " ").trim();

  const hrefRe = /"href"\s*:\s*"([^"]+)"/;
  const hrefMatch = body.match(hrefRe);
  if (hrefMatch) {
    try {
      return new URL(hrefMatch[1]).hostname;
    } catch {
      return hrefMatch[1];
    }
  }

  const urlMatch = body.match(/https?:\/\/[^\s"\\]+/);
  if (urlMatch) {
    try {
      return new URL(urlMatch[0]).hostname;
    } catch {
      return urlMatch[0];
    }
  }

  if (/"type"\s*:\s*"link"/.test(body)) return "Link";

  const mentionLabel = body.match(/"label"\s*:\s*"((?:\\.|[^"\\])*)"/);
  if (mentionLabel) {
    try {
      return `@${JSON.parse(`"${mentionLabel[1]}"`)}`;
    } catch {
      return `@${mentionLabel[1]}`;
    }
  }
  if (/"type"\s*:\s*"mention"/.test(body)) return "Mention";

  return "";
}

function sanitizePreviewText(text: string, body: string): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) return "";
  if (looksLikeTiptapJson(trimmed)) {
    return extractFromBrokenTiptapJson(body) || "";
  }
  return trimmed;
}

export function attachmentPreviewLabel(
  contentType?: string,
  fileName?: string,
): string | null {
  if (!contentType && !fileName) return null;
  const type = contentType ?? "";
  // An encrypted file's stored name says nothing; its kind does (0168).
  if (isSealedWireName(fileName)) {
    if (type.startsWith("image/")) return "📷 Photo";
    if (type.startsWith("video/")) return "🎬 Video";
    if (type.startsWith("audio/")) return "🎤 Audio";
    return "📎 File";
  }
  const name = fileName ?? "file";
  if (type.startsWith("image/") || /\.svg$/i.test(name)) return `📷 ${name}`;
  if (type.startsWith("video/")) return `🎬 ${name}`;
  if (type === "application/pdf" || name.toLowerCase().endsWith(".pdf")) {
    return `📄 ${name}`;
  }
  return `📎 ${name}`;
}

export function resolvePreviewAttachments(opts: {
  attachments?: ChatPreviewAttachment[];
  attachmentType?: string;
  attachmentName?: string;
}): ChatPreviewAttachment[] {
  if (opts.attachments && opts.attachments.length > 0) {
    return opts.attachments.filter(
      (a) => (a.file_name?.trim() || a.content_type?.trim()),
    );
  }
  const type = opts.attachmentType?.trim() ?? "";
  const name = opts.attachmentName?.trim() ?? "";
  if (!type && !name) return [];
  return [{ file_name: name, content_type: type }];
}

export function fileBadgeLabel(file: ChatPreviewAttachment): string {
  const name = file.file_name?.trim() ?? "";
  // "file" / "voice-message" is all the server keeps of an encrypted file's
  // name, so the kind below is the honest label.
  if (name && !isSealedWireName(name)) return name;
  const type = file.content_type?.toLowerCase() ?? "";
  if (type.startsWith("image/")) return "Photo";
  if (type.startsWith("video/")) return "Video";
  if (type.startsWith("audio/")) return "Audio";
  if (type === "application/pdf" || type === "application/x-pdf") return "PDF";
  return "File";
}

export function fileBadgeKind(
  file: ChatPreviewAttachment,
): "image" | "video" | "audio" | "pdf" | "file" {
  const type = file.content_type?.toLowerCase() ?? "";
  const name = file.file_name?.toLowerCase() ?? "";
  if (type.startsWith("image/") || name.endsWith(".svg")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";
  if (type === "application/pdf" || type === "application/x-pdf" || name.endsWith(".pdf")) {
    return "pdf";
  }
  return "file";
}

/** Body text only — attachments rendered as separate badges. */
export function formatChatMessagePreview(opts: {
  body?: string;
  attachmentType?: string;
  attachmentName?: string;
  /** When true, skip embedding attachment label into the text string. */
  textOnly?: boolean;
}): string {
  const body = opts.body?.trim() ?? "";
  const hasBody = body && !isTiptapEmpty(body);
  const attachmentLabel = attachmentPreviewLabel(
    opts.attachmentType,
    opts.attachmentName,
  );

  if (hasBody) {
    const plain = sanitizePreviewText(tiptapToPlainText(body), body);
    if (plain) return plain;
    const urls = extractUrls(body);
    if (urls.length > 0) {
      try {
        return new URL(urls[0]).hostname;
      } catch {
        return urls[0];
      }
    }
  }

  if (opts.textOnly) {
    if (body && looksLikeTiptapJson(body)) {
      return extractFromBrokenTiptapJson(body);
    }
    return "";
  }

  if (attachmentLabel) return attachmentLabel;

  if (body && looksLikeTiptapJson(body)) {
    return extractFromBrokenTiptapJson(body) || "Message";
  }
  return "";
}
