import { api } from "@/lib/api";
import { getIdentityPrivateKey, getIdentityPublicKey } from "./identity-state";

// Per identity, so a lock or an account switch starts from nothing.
const reportedByIdentity = new WeakMap<CryptoKey, Set<string>>();

/**
 * Reports an envelope the server handed this browser that would not open.
 *
 * The server checks an envelope's shape, never that it opens, so one can be
 * sealed to an identity its owner no longer holds — a member who read our public
 * key a moment before we started fresh seals the next version to the old one.
 * Nothing else notices: the row exists, so the version is never rotated, and
 * backfill will not overwrite it. Reporting drops the row, which makes the
 * version stale (the next send rotates) and a gap (a member who still holds the
 * key re-wraps it for us). The server refuses unless the public key sent is the
 * account's published identity, so a browser holding a replaced identity
 * cannot delete envelopes that are fine.
 *
 * `identity` is the key the unwrap was attempted with; if it is no longer the
 * one held, the failure says nothing about the row.
 */
export async function reportUnreadableEnvelope(
  conversationID: string,
  version: number,
  identity: CryptoKey | null,
) {
  const publicKey = getIdentityPublicKey();
  if (!identity || identity !== getIdentityPrivateKey() || !publicKey) return;
  let reported = reportedByIdentity.get(identity);
  if (!reported) {
    reported = new Set();
    reportedByIdentity.set(identity, reported);
  }
  const id = `${conversationID}:${version}`;
  if (reported.has(id)) return;
  reported.add(id);
  try {
    await api.reportUnreadableChatE2EEEnvelope(conversationID, version, publicKey);
  } catch {
    // Offline, or an older server: one attempt per session only once it lands.
    reported.delete(id);
  }
}
