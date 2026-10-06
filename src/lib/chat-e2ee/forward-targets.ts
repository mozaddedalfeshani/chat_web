import { api } from "@/lib/api";
import type { ChatConversation } from "@/lib/api/types/chat";
import type { ChatMessageAttachment } from "@/lib/api/types/chat";
import { encryptNewDMText, ChatKeyNotReady } from "./crypto";
import { isEncryptedConversation } from "./eligible";
import {
  forwardableFiles,
  needsNoFileKeys,
  sealForwardFiles,
  type ForwardFile,
} from "./forward-files";

/** One destination, as much of it as choosing a payload needs. */
export type ForwardConversation = Pick<
  ChatConversation,
  "id" | "type" | "scope" | "plaintext_until_keyed"
>;

/** Text prepared for one destination: plaintext for a channel, ciphertext otherwise. */
export type ForwardPayload = {
  body?: string;
  encrypted_body?: string;
  encryption_nonce?: string;
  encryption_key_version?: number;
};

/** One encrypted file's key, sealed again for a destination (server 0168). */
export type ForwardAttachmentSeal = {
  file_url: string;
  enc_meta: string;
  enc_nonce: string;
};

export type ForwardTarget = {
  conversation_id: string;
  message: ForwardPayload;
  caption?: ForwardPayload;
  attachments?: ForwardAttachmentSeal[];
};

type BuildForwardTargetsInput = {
  /** Plaintext of the thing being forwarded — already decrypted if it came from a DM. */
  text: string;
  caption?: string;
  /**
   * Conversations picked from the sidebar. Not ids: a personal group is
   * encrypted and a workspace channel is not, and only the conversation itself
   * says which — forwarding plaintext into an encrypted group is a 409, and
   * ciphertext into a channel is a 400.
   */
  conversations: ForwardConversation[];
  /** Team members to reach by DM; the DM is created here if it does not exist. */
  userIds: string[];
  currentUserId: string;
  /**
   * The forwarded message's files. The server copies their rows and points
   * them at the same objects, but an encrypted file's key is sealed under its
   * own conversation's key, so each destination gets that key sealed again
   * under ITS key.
   */
  attachments?: ChatMessageAttachment[];
};

/**
 * Builds the per-destination payloads a forward needs.
 *
 * The server cannot do this itself: it never holds the plaintext of an encrypted
 * message, and every conversation has its own key, so each destination needs its
 * own ciphertext. Workspace channels stay plaintext — the server copies its own
 * stored body there, so the text below only matters when the source or the
 * destination is encrypted.
 */
export async function buildForwardTargets({
  text,
  caption,
  conversations,
  userIds,
  currentUserId,
  attachments = [],
}: BuildForwardTargetsInput): Promise<ForwardTarget[]> {
  const trimmedCaption = caption?.trim() ?? "";
  const files = forwardableFiles(attachments);

  const plainTarget = (conversation: ForwardConversation): ForwardTarget => ({
    conversation_id: conversation.id,
    message: { body: text },
    caption: trimmedCaption ? { body: trimmedCaption } : undefined,
  });

  const conversationTargets = await Promise.all(
    conversations.map(async (conversation) => {
      if (!isEncryptedConversation(conversation)) {
        return plainTarget(needsNoFileKeys(files, conversation));
      }
      try {
        return await buildEncryptedTarget(
          conversation.id, text, trimmedCaption, currentUserId, files,
        );
      } catch (error) {
        // Same rule as an ordinary send: only a group the server marks
        // plaintext_until_keyed may take the text as it is. A DM or a group
        // created as one rethrows.
        if (error instanceof ChatKeyNotReady && conversation.plaintext_until_keyed) {
          return plainTarget(needsNoFileKeys(files, conversation));
        }
        throw error;
      }
    }),
  );

  const dmTargets = await Promise.all(
    userIds.map(async (userId) =>
      // The conversation has to exist before anything can be encrypted for it —
      // the key envelopes are stored per conversation.
      buildEncryptedTarget(
        (await api.startChatDM(userId)).id,
        text,
        trimmedCaption,
        currentUserId,
        files,
      ),
    ),
  );

  return [...conversationTargets, ...dmTargets];
}

async function buildEncryptedTarget(
  conversationId: string,
  text: string,
  caption: string,
  currentUserId: string,
  files: ForwardFile[],
): Promise<ForwardTarget> {
  const encrypt = (value: string) =>
    encryptNewDMText(conversationId, value, currentUserId);

  // An attachment-only forward has nothing to encrypt, and the server accepts
  // an empty payload when plaintext attachments travel with it. Encrypted
  // files are different: their keys are sealed under the body's key version,
  // so the message is sealed even when its text is empty.
  const message = text.trim() || files.length ? await encrypt(text) : undefined;
  return {
    conversation_id: conversationId,
    message: message ?? {},
    attachments:
      message && files.length
        ? await sealForwardFiles(conversationId, currentUserId, message.encryption_key_version, files)
        : undefined,
    caption: caption ? await encrypt(caption) : undefined,
  };
}
