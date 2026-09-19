/**
 * The attachment identity every platform shares — mobile's
 * `attachmentUrlKey`, pinned by `fixtures/history-transfer-v2-url-key.json`.
 *
 * SHA-256 of the normalised URL, first 40 hex characters. Normalised means
 * lowercase scheme and host, the path verbatim (R2 keys are case-sensitive),
 * no query and no fragment. Parsed by hand rather than with `URL`, which would
 * drop a default port and re-encode the path, and so disagree with the phone.
 */
export function normaliseAttachmentUrl(remoteUrl: string): string {
  const raw = remoteUrl.trim();
  if (!raw) return "";
  const match = /^([a-zA-Z][a-zA-Z0-9+.-]*):\/\/([^/?#]*)([^?#]*)/.exec(raw);
  if (!match) return raw;
  return `${match[1].toLowerCase()}://${match[2].toLowerCase()}${match[3]}`;
}

const cache = new Map<string, Promise<string>>();

export function attachmentUrlKey(remoteUrl: string): Promise<string> {
  const normalised = normaliseAttachmentUrl(remoteUrl);
  if (!normalised) return Promise.resolve("");
  let key = cache.get(normalised);
  if (!key) {
    key = crypto.subtle
      .digest("SHA-256", new TextEncoder().encode(normalised))
      .then((d) => Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, "0")).join("").slice(0, 40));
    cache.set(normalised, key);
  }
  return key;
}
