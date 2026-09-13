// Message text in and out of ciphertext. The key it uses is somebody else's
// job — conversation-key.ts owns fetching, minting and rotating it.
//
// "DM" in the names below is historical. Everything here is per-conversation:
// personal groups encrypt exactly the same way. Workspace channels are the only
// chat that is never encrypted, because server-side search cannot read
// ciphertext.
import { type ChatMessage } from "@/lib/api";
import {
  base64UrlToBytes,
  bytesToBase64Url,
  e2eeDecoder as decoder,
  e2eeEncoder as encoder,
  randomBytes,
} from "./primitives";
import { ensureDMKey, loadDMKey, rotateDMKey, ChatKeyNotReady } from "./conversation-key";
import { loadReadKey } from "./read-key";

export { rotateDMKey, ChatKeyNotReady };

export { isMessageVaultUnlocked, lockMessageVault } from "./identity-state";
export {
  ensureMessageIdentity,
  adoptLinkedIdentity,
  exportTrustedIdentity,
  unlockWithRecoveryCode,
  startFreshIdentity,
  takePendingRecoveryCode,
  type IdentityState,
} from "./vault";
export { regenerateRecoveryCode } from "./vault-rotate";

async function encryptWithDMKey(conversationID: string, text: string, senderID: string,
  entry: { version: number; key: CryptoKey }) {
  const nonce = randomBytes(12);
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: nonce,
      additionalData: encoder.encode(
        `ababilx-dm-v1:${conversationID}:${entry.version}:${senderID}`,
      ),
    },
    entry.key,
    encoder.encode(text),
  );
  return {
    body: "",
    encrypted_body: bytesToBase64Url(new Uint8Array(ciphertext)),
    encryption_nonce: bytesToBase64Url(nonce),
    encryption_version: 1,
    encryption_key_version: entry.version,
  };
}

export async function encryptNewDMText(conversationID: string, text: string,
  currentUserID: string) {
  return encryptWithDMKey(
    conversationID,
    text,
    currentUserID,
    await ensureDMKey(conversationID, currentUserID),
  );
}

export async function encryptExistingDMText(conversationID: string, text: string,
  currentUserID: string) {
  const entry = await loadDMKey(conversationID, currentUserID);
  if (!entry) throw new Error("Secure message key is unavailable");
  return encryptWithDMKey(conversationID, text, currentUserID, entry);
}

/**
 * A quote is sealed against the QUOTED message's sender and key version, not
 * the quoting message's — it is that row's ciphertext, handed over by join.
 * Decrypted separately because the two can disagree: an attachment-only reply
 * carries no ciphertext of its own while still quoting an encrypted message.
 */
async function decryptQuote(message: ChatMessage, currentUserID: string) {
  const quote = message.quote;
  if (!quote?.encrypted_body) return quote;
  try {
    const entry = await loadReadKey(
      message.conversation_id,
      currentUserID,
      quote.encryption_key_version,
    );
    if (!entry || entry.version !== quote.encryption_key_version) {
      throw new Error("key unavailable");
    }
    const plaintext = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: base64UrlToBytes(quote.encryption_nonce ?? ""),
        additionalData: encoder.encode(
          `ababilx-dm-v1:${message.conversation_id}:${entry.version}:${quote.user_id ?? ""}`,
        ),
      },
      entry.key,
      base64UrlToBytes(quote.encrypted_body),
    );
    // Clearing the ciphertext is what makes this idempotent: the websocket
    // path re-dispatches a decrypted event through the same handler, and a
    // quote that still looked encrypted would decrypt forever.
    return {
      ...quote,
      body: decoder.decode(plaintext),
      encrypted_body: "",
      sealed: true,
    };
  } catch {
    // Most often a message from before this account joined: the reply reads
    // fine, so the quote says "not available" rather than raising an alarm.
    return { ...quote, body: "", encrypted_body: "", decryption_failed: true };
  }
}

export async function decryptChatMessage(message: ChatMessage, currentUserID: string) {
  const quote = await decryptQuote(message, currentUserID);
  if (quote !== message.quote) message = { ...message, quote };
  if (message.encryption_version !== 1 || !message.encrypted_body) return message;
  try {
    // By the version the message names, not the newest: a group rotates on
    // every join, leave and reset, and older messages keep their own version.
    const entry = await loadReadKey(
      message.conversation_id,
      currentUserID,
      message.encryption_key_version,
    );
    if (!entry || entry.version !== message.encryption_key_version) throw new Error("key unavailable");
    const plaintext = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: base64UrlToBytes(message.encryption_nonce ?? ""),
        additionalData: encoder.encode(
          `ababilx-dm-v1:${message.conversation_id}:${entry.version}:${message.user_id}`,
        ),
      },
      entry.key,
      base64UrlToBytes(message.encrypted_body),
    );
    return { ...message, body: decoder.decode(plaintext), decryption_failed: false };
  } catch {
    return { ...message, body: "Unable to decrypt this message", decryption_failed: true };
  }
}

export function decryptChatMessages(messages: ChatMessage[], currentUserID: string) {
  return Promise.all(messages.map((message) => decryptChatMessage(message, currentUserID)));
}
