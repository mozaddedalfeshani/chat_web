/**
 * Protocol v2 cryptography, destination side —
 * `ababilx-server/docs/history-transfer-v2-protocol.md` section 3, pinned by
 * `../fixtures/history-transfer-v2-crypto.json`, the vectors the phone's Dart
 * tests read too.
 *
 * Every key here is a non-extractable CryptoKey: the destination's ephemeral
 * private key and the transfer key both live in IndexedDB by structured clone
 * so a reload can resume, and neither can be read out by script.
 */
const PREFIX = "ababilx-history-transfer-v2";
const NONCE = 12;
const TAG = 16;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const aad = {
  envelope: (id: string) => `${PREFIX}|envelope|${id}`,
  inventory: (id: string) => `${PREFIX}|inventory|${id}`,
  destInventory: (id: string) => `${PREFIX}|dest-inventory|${id}`,
  chunk: (id: string, batch: number, kind: string, index: number) =>
    `${PREFIX}|chunk|${id}|${batch}|${kind}|${index}`,
  page: (id: string, batch: number, index: number, count: number) =>
    `${PREFIX}|page|${id}|${batch}|${index}|${count}`,
  seal: (id: string) => `${PREFIX}|seal|${id}`,
};

export function b64u(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export function fromB64u(value: string) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

/** `nonce || ct || tag`, the layout both sides split on. */
export async function openSealed(key: CryptoKey, label: string, sealed: Uint8Array) {
  if (sealed.length < NONCE + TAG) throw new Error("sealed value is too short");
  const clear = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: sealed.subarray(0, NONCE) as BufferSource, additionalData: encoder.encode(label) },
    key,
    sealed.subarray(NONCE) as BufferSource,
  );
  return new Uint8Array(clear);
}

export async function seal(key: CryptoKey, label: string, plain: Uint8Array, nonce?: Uint8Array) {
  const iv = nonce ?? crypto.getRandomValues(new Uint8Array(NONCE));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv as BufferSource, additionalData: encoder.encode(label) },
      key,
      plain as BufferSource,
    ),
  );
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv);
  out.set(ct, iv.length);
  return out;
}

export async function openJson<T>(key: CryptoKey, label: string, value: string): Promise<T> {
  return JSON.parse(decoder.decode(await openSealed(key, label, fromB64u(value)))) as T;
}

export async function sealJson(key: CryptoKey, label: string, value: unknown) {
  return b64u(await seal(key, label, encoder.encode(JSON.stringify(value))));
}

/** The destination's ephemeral pair. Only the public half ever leaves. */
export async function newDestinationKeys() {
  const pair = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, false, [
    "deriveBits",
  ])) as CryptoKeyPair;
  const publicJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  return {
    privateKey: pair.privateKey,
    publicJwk,
    // `k` in the QR, byte for byte what the server stores and the phone echoes.
    param: b64u(encoder.encode(JSON.stringify(publicJwk))),
  };
}

export type TransferEnvelope = {
  v: number;
  ephemeral_public_key: JsonWebKey;
  nonce: string;
  ciphertext: string;
};

/** Opens the phone's envelope into a non-extractable AES-GCM transfer key. */
export async function openEnvelope(
  transferId: string,
  envelope: TransferEnvelope,
  privateKey: CryptoKey,
): Promise<CryptoKey> {
  const phone = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", x: envelope.ephemeral_public_key.x, y: envelope.ephemeral_public_key.y, ext: true },
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  const shared = await crypto.subtle.deriveBits({ name: "ECDH", public: phone }, privateKey, 256);
  const wrapping = await crypto.subtle.importKey(
    "raw",
    await crypto.subtle.digest("SHA-256", shared),
    "AES-GCM",
    false,
    ["decrypt"],
  );
  const raw = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64u(envelope.nonce), additionalData: encoder.encode(aad.envelope(transferId)) },
    wrapping,
    fromB64u(envelope.ciphertext),
  );
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

/** The server stores the envelope as base64url of its JSON. */
export function decodeEnvelope(value: string): TransferEnvelope {
  return JSON.parse(decoder.decode(fromB64u(value))) as TransferEnvelope;
}
