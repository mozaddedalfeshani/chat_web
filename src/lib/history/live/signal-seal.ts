import { b64u, fromB64u, openSealed, seal } from "../transfer/v2-crypto";

/**
 * Signals are sealed under the transfer key the phone sealed to this
 * browser's camera-read history key — protocol section 1. The DTLS
 * fingerprint rides inside the sealed SDP, so a relay that rewrote it would
 * produce a signal that does not open, never a man in the middle.
 */
export type Role = "source" | "destination";
export type WireSignal = { kind: string; sealed?: string; nonce?: string };

const NONCE = 12;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const signalAad = (linkId: string, from: Role, kind: string) =>
  `ababilx-history-live-v1|signal|${linkId}|${from}|${kind}`;

export async function sealSignal(key: CryptoKey, linkId: string, from: Role, kind: string, value: unknown): Promise<WireSignal> {
  const sealed = await seal(key, signalAad(linkId, from, kind), encoder.encode(JSON.stringify(value)));
  return { kind, nonce: b64u(sealed.subarray(0, NONCE)), sealed: b64u(sealed.subarray(NONCE)) };
}

export async function openSignal<T>(key: CryptoKey, linkId: string, from: Role, signal: WireSignal): Promise<T> {
  if (!signal.sealed || !signal.nonce) throw new Error("signal carries no payload");
  const nonce = fromB64u(signal.nonce);
  const body = fromB64u(signal.sealed);
  const joined = new Uint8Array(nonce.length + body.length);
  joined.set(nonce);
  joined.set(body, nonce.length);
  const clear = await openSealed(key, signalAad(linkId, from, signal.kind), joined);
  return JSON.parse(decoder.decode(clear)) as T;
}
