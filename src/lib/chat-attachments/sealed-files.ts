// The keys of encrypted chat files this browser can open, by the file's URL.
//
// Memory only, on purpose. A key reaches here when the vault opens the sealed
// meta beside an attachment row (chat-e2ee/attachment-seal.ts) and leaves on
// sign-out; a reload opens them again from the rows the server sends. Nothing
// here is ever written to localStorage or IndexedDB — a message row goes back
// to disk in its sealed form, and the key is the one thing that row lacks.
export type SealedFile = {
  key: Uint8Array;
  /** The file's real length; the object is padded past it. */
  plainSize: number;
  /** The real type, as its sender stated it. Untrusted — see `safeBlobType`. */
  contentType: string;
};

const files = new Map<string, SealedFile>();

export function rememberSealedFile(fileUrl: string, file: SealedFile) {
  if (fileUrl) files.set(fileUrl, file);
}

export function sealedFileFor(fileUrl: string): SealedFile | undefined {
  return files.get(fileUrl);
}

export function forgetSealedFiles() {
  files.clear();
}

const RASTER_IMAGE = /^image\/(png|jpeg|gif|webp|avif|bmp)$/;
const AUDIO_VIDEO = /^(audio|video)\/[a-z0-9][a-z0-9.+-]*$/;

/**
 * The type a decrypted file may be handed to the browser as.
 *
 * The real type is whatever the sender wrote inside the sealed meta, and the
 * decrypted bytes live at a `blob:` URL of THIS origin. A blob typed
 * `text/html` or `image/svg+xml` and opened in a tab would run the sender's
 * script as this app, so only types a browser renders without executing
 * anything keep their name. Everything else becomes octet-stream, which a
 * browser can only download.
 */
export function safeBlobType(contentType: string): string {
  const type = contentType.toLowerCase().split(";")[0].trim();
  if (RASTER_IMAGE.test(type) || AUDIO_VIDEO.test(type) || type === "application/pdf") {
    return type;
  }
  return "application/octet-stream";
}
