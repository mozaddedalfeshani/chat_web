export type ChatE2EEWrappedValue = {
  ciphertext: string;
  nonce: string;
};

export type ChatE2EEKeyEnvelope = ChatE2EEWrappedValue & {
  ephemeral_public_key: JsonWebKey;
};

/**
 * A user's message identity as the server knows it.
 *
 * `public_key` is all the server holds for an identity created on a device.
 * The wrapping fields describe the retired PIN vault and are present only for
 * accounts that have not yet moved their key onto a device.
 */
export type ChatE2EEVault = {
  public_key: JsonWebKey;
  recovery?: ChatE2EERecoveryVault;
  wrapped_private_key?: ChatE2EEWrappedValue;
  kdf_salt?: string;
  kdf_iterations?: number;
  version: number;
};

/** One identity key sealed for a single new device during linking. */
export type ChatE2EEIdentityEnvelope = ChatE2EEKeyEnvelope;

export type ChatE2EELinkOffer = {
  token: string;
  scheme: string;
  expires_at: string;
  poll_interval: number;
};

export type ChatE2EELinkPoll =
  | { status: "pending" | "denied" | "expired" }
  | { status: "approved"; identity_envelope: ChatE2EEIdentityEnvelope };

/**
 * The private identity key wrapped by the owner's 256-bit recovery code.
 *
 * Safe to serve to any signed-in session: the code is generated on the user's
 * device and never sent to AbabilX, so this is ciphertext the server cannot
 * open. Do not confuse it with `wrapped_private_key` on the same vault, which
 * is the retired PIN scheme and had a keyspace of 10^6.
 */
export type ChatE2EERecoveryVault = {
  wrapped_key: ChatE2EEWrappedValue;
  salt: string;
  version: number;
};

export type ChatE2EEVaultStatus =
  | { exists: false }
  | { exists: true; vault: ChatE2EEVault; has_recovery?: boolean };

/**
 * One key version this device can read that somebody else in the conversation
 * cannot, with this device's own envelope for it.
 *
 * Re-wrapping that envelope for the listed members hands them the ORIGINAL key,
 * so their history decrypts again — where minting a new version would only fix
 * messages sent from now on.
 */
export type ChatE2EEKeyGap = {
  key_version: number;
  envelope: ChatE2EEKeyEnvelope;
  user_ids: string[];
};

export type ChatE2EEBackfillItem = {
  user_id: string;
  key_version: number;
  envelope: ChatE2EEKeyEnvelope;
};

/**
 * This account's own envelopes at the key versions it asked for. A version it
 * holds none for is absent. `ChatE2EEConversationKeyStatus` carries the newest
 * version only; this is where an older one comes back.
 */
export type ChatE2EEKeyVersions = {
  envelopes: Array<{ key_version: number; envelope: ChatE2EEKeyEnvelope }>;
};

export type ChatE2EEConversationKeyStatus =
  | { exists: false }
  | {
      exists: true;
      key: { key_version: number; envelope: ChatE2EEKeyEnvelope };
      // Members with no envelope at the current version: they joined after it
      // was made, or started a fresh identity.
      missing_member_ids?: string[];
      gaps?: ChatE2EEKeyGap[];
      /**
       * Whether this version must not be sealed to again. It covers more than
       * `missing_member_ids`: a key retired because somebody was REMOVED leaves
       * every remaining member holding a good envelope, so the roster reads as
       * complete while the key is spent. Absent on a server that predates it.
       */
      rekey_required?: boolean;
    };

/**
 * The roster a conversation key must be wrapped for.
 *
 * `unready_member_ids` are members with no message identity at all. A key
 * cannot be sealed to them, and skipping them would lock them out of their own
 * group, so a group with any of them stays plaintext until they open the app.
 */
export type ChatE2EEConversationMembers = {
  members: Array<{ user_id: string; public_key: JsonWebKey }>;
  unready_member_ids?: string[];
};
