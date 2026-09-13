// The key a message ALREADY WRITTEN was sealed with, by exact version.
//
// conversation-key.ts answers "what do I seal with?", which is the newest
// version and nothing else — GET .../e2ee-key never returns an older one. A
// group rotates whenever somebody joins, leaves or resets, and every message
// keeps the version it was sealed under. Keys live in memory here, so after a
// reload every message written before the last rotation read "Unable to
// decrypt" while this account's own envelopes for those versions sat on the
// server, never asked for.
import { api } from "@/lib/api";
import { loadDMKey } from "./conversation-key";
import { unwrapDMKey } from "./dm-key-envelope";
import { getIdentityPrivateKey, readKeyMisses, readKeys } from "./identity-state";
import { reportUnreadableEnvelope } from "./key-repair";

// Long enough that messages under a version this account never held cost one
// request, short enough that a backfill another member runs a minute later —
// the repair after an identity reset — is picked up without a reload.
const MISS_RETRY_MS = 60_000;

// One request per version however many messages on screen name it. Tagged
// with the identity that started it, so the next identity after a lock or an
// account switch never joins a request whose answer it would have to discard.
const versionLoads = new Map<
  string,
  { identity: CryptoKey | null; load: Promise<CryptoKey | null> }
>();

async function openVersion(conversationID: string, userID: string, version: number) {
  const id = `${conversationID}:${version}`;
  const identity = getIdentityPrivateKey();
  if (!identity) return null;
  const { envelopes } = await api.getChatE2EEConversationKeyVersions(conversationID, [version]);
  // Locked or switched identity while the request was out: this envelope
  // belongs to a vault state that no longer exists.
  if (getIdentityPrivateKey() !== identity) return null;
  const match = envelopes.find((item) => item.key_version === version);
  let key: CryptoKey | null = null;
  if (match) {
    try {
      key = await unwrapDMKey(match.envelope, userID);
    } catch {
      // Sealed to an identity this account does not hold. Pure computation,
      // so asking again in a second would answer the same — but reporting it
      // lets a member who still holds the key re-wrap it, and the miss runs
      // out in time to pick that up.
      await reportUnreadableEnvelope(conversationID, version, identity);
    }
  }
  if (getIdentityPrivateKey() !== identity) return null;
  if (!key) {
    // A version from before this account joined, or one lost to an identity
    // reset that nobody has backfilled yet.
    readKeyMisses.set(id, Date.now());
    return null;
  }
  readKeys.set(id, key);
  return key;
}

function fetchVersion(conversationID: string, userID: string, version: number) {
  const id = `${conversationID}:${version}`;
  const missed = readKeyMisses.get(id);
  if (missed !== undefined && Date.now() - missed < MISS_RETRY_MS) {
    return Promise.resolve(null);
  }
  const identity = getIdentityPrivateKey();
  const pending = versionLoads.get(id);
  if (pending?.identity === identity) return pending.load;
  const entry = {
    identity,
    load: openVersion(conversationID, userID, version).finally(() => {
      if (versionLoads.get(id) === entry) versionLoads.delete(id);
    }),
  };
  versionLoads.set(id, entry);
  return entry.load;
}

/**
 * The key for exactly `version`: memory, then the newest key (refetched once
 * when the message names a newer one — the other side rotated), then the
 * server's copy of this account's envelope for that version.
 */
export async function loadReadKey(
  conversationID: string,
  userID: string,
  version: number | undefined,
): Promise<{ version: number; key: CryptoKey } | null> {
  if (!version) return null;
  const held = readKeys.get(`${conversationID}:${version}`);
  if (held) return { version, key: held };
  const identity = getIdentityPrivateKey();
  let current = await loadDMKey(conversationID, userID);
  if (current && version > current.version) {
    current = await loadDMKey(conversationID, userID, true);
  }
  // Kept by version, so a rotation later in this session does not take the
  // key for everything already on screen with it.
  if (current && getIdentityPrivateKey() === identity) {
    readKeys.set(`${conversationID}:${current.version}`, current.key);
  }
  if (current?.version === version) return current;
  // Newer than the newest after a refresh is a version the server has never
  // heard of; asking for it by number would not change that.
  if (current && version > current.version) return null;
  const key = await fetchVersion(conversationID, userID, version);
  return key ? { version, key } : null;
}
