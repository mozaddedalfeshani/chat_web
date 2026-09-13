import { api, type ChatE2EEBackfillItem, type ChatE2EEKeyGap } from "@/lib/api";
import { unwrapDMKey, wrapDMKey } from "./dm-key-envelope";
import { getIdentityPrivateKey } from "./identity-state";
import { reportUnreadableEnvelope } from "./key-repair";

// One attempt per conversation per session. A gap that survives a failed
// attempt is retried on the next page load, not on every message.
const attempted = new Set<string>();

/**
 * Gives an existing conversation key back to members who lost it.
 *
 * Someone who starts a fresh identity keeps their messages but loses every key
 * envelope, because each was sealed to the identity they no longer have. The
 * keys themselves are untouched — they live on the other members' devices. This
 * opens the ones this device holds and re-seals them to the missing members'
 * current public identities, which is what makes their history readable again.
 * Minting a new key version, the other repair, only fixes messages from this
 * moment on.
 *
 * Best-effort by design: it runs beside a key load, so a failure must degrade
 * to "their history stays sealed", never to a broken conversation.
 */
export async function backfillConversationKeys(
  conversationID: string,
  currentUserID: string,
  gaps: ChatE2EEKeyGap[],
): Promise<boolean> {
  if (!gaps.length || attempted.has(conversationID)) return false;
  attempted.add(conversationID);
  const identity = getIdentityPrivateKey();
  try {
    const envelopes: ChatE2EEBackfillItem[] = [];
    for (const gap of gaps) {
      let key: CryptoKey;
      try {
        key = await unwrapDMKey(gap.envelope, currentUserID);
      } catch {
        // Our own copy of this version is the broken one. Nothing to hand on
        // from it; reporting it lets somebody else hand it to us, and the other
        // versions in this list are still worth filling.
        await reportUnreadableEnvelope(conversationID, gap.key_version, identity);
        continue;
      }
      for (const userID of gap.user_ids) {
        const { public_key: publicKey } = await api.getChatE2EEPublicKey(userID);
        envelopes.push({
          user_id: userID,
          key_version: gap.key_version,
          envelope: await wrapDMKey(key, userID, publicKey),
        });
      }
    }
    if (!envelopes.length) return false;
    const { inserted } = await api.backfillChatE2EEConversationKey(
      conversationID,
      envelopes,
    );
    return inserted > 0;
  } catch {
    // A member who never set up secure messages, an offline moment, a key the
    // server would not hand out — none of these should break the conversation
    // this ran beside. Clearing the mark lets the next load try again.
    attempted.delete(conversationID);
    return false;
  }
}
