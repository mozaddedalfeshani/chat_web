import { api } from "@/lib/api";
import { loadDMKey } from "./conversation-key";
import { getIdentityPrivateKey } from "./identity-state";

// One pass per unlocked identity per page load.
const filled = new WeakSet<CryptoKey>();

/**
 * Hands every key version this account holds to members who lost theirs,
 * across all conversations.
 *
 * Backfill runs when a conversation's key is loaded, which only happens for a
 * chat somebody opens or whose preview is sealed. After a member started fresh,
 * a quiet conversation stayed "Unable to decrypt" for them until someone wrote
 * in it. The server names the conversations with a gap this account can fill;
 * loading each key runs the ordinary backfill.
 */
export async function fillConversationKeyGaps(userID: string) {
  const identity = getIdentityPrivateKey();
  if (!identity || !userID || filled.has(identity)) return;
  filled.add(identity);
  try {
    const { conversation_ids: ids } = await api.getChatE2EEFillableGaps();
    for (const id of ids ?? []) {
      if (getIdentityPrivateKey() !== identity) return;
      try {
        await loadDMKey(id, userID, true);
      } catch {
        // One conversation that will not load must not stop the rest.
      }
    }
  } catch {
    filled.delete(identity);
  }
}
