import type { ChatMessage } from "@/lib/api/types/chat";
import { timestampMicros } from "../markers";
import type { MergeSide, Provenance } from "../merge";
import { openJson, sealJson, type Sealed } from "../idb/local-key";

/**
 * One stored message. Everything needed to decide a merge or order a page is
 * in the clear — the same metadata the server already holds — and the message
 * itself is sealed.
 */
export type MessageRow = {
  id: string;
  conversation_id: string;
  /** "" on the main timeline; the thread root's id on a reply. */
  parent_id: string;
  /** Microseconds. Main timeline: last activity (the server's order). Thread: creation. */
  sort_at: number;
  created_at: string;
  provenance: Provenance;
  revision: number;
  state: "live" | "deleted" | "purged";
  payload: Sealed;
  stored_at: number;
  /**
   * Set on a row an import batch staged; the row stays invisible until that
   * batch is activated (`import-stage.ts`). Absent on every other row.
   */
  activation?: string;
};

export function messageAad(id: string) {
  return `history-message:${id}`;
}

/**
 * What may be written to disk. A decrypted body is dropped where the message
 * carries its ciphertext — history is stored sealed the way it arrived, and
 * decrypted on read with the conversation key, exactly as mobile stores it. A
 * quote opened on this device lost its ciphertext when it was opened, so its
 * plaintext is dropped too; the raw copy from the server or the phone is the
 * one written in practice (see `persistRawMessages`).
 */
export function sealableMessage(message: ChatMessage): ChatMessage {
  const encrypted = message.encryption_version === 1 && !!message.encrypted_body;
  const quote = message.quote?.sealed
    ? { ...message.quote, body: "", sealed: undefined }
    : message.quote;
  const copy: ChatMessage = { ...message, body: encrypted ? "" : message.body, quote };
  delete copy.decryption_failed;
  return copy;
}

export function sortMicros(message: ChatMessage) {
  const when = message.parent_id ? message.created_at : message.last_activity_at || message.created_at;
  return timestampMicros(when || message.created_at);
}

function stateOf(message: ChatMessage): MessageRow["state"] {
  if (message.content_purged) return "purged";
  return message.deleted_at ? "deleted" : "live";
}

export async function buildMessageRow(
  key: CryptoKey,
  message: ChatMessage,
  provenance: Provenance,
): Promise<MessageRow> {
  return {
    id: message.id,
    conversation_id: message.conversation_id,
    parent_id: message.parent_id ?? "",
    sort_at: sortMicros(message),
    created_at: message.created_at,
    provenance,
    revision: Number(message.revision ?? 0) || 0,
    state: stateOf(message),
    payload: await sealJson(key, sealableMessage(message), messageAad(message.id)),
    stored_at: Date.now(),
  };
}

/** The merge contract only needs the clear-text half of a row. */
export function rowSide(row: MessageRow): MergeSide {
  return {
    provenance: row.provenance,
    message: {
      id: row.id,
      conversation_id: row.conversation_id,
      created_at: row.created_at,
      deleted_at: row.state === "live" ? null : "stored",
      revision: row.revision,
      content_purged: row.state === "purged",
    },
  };
}

export async function openMessageRow(key: CryptoKey, row: MessageRow): Promise<ChatMessage | null> {
  try {
    return await openJson<ChatMessage>(key, row.payload, messageAad(row.id));
  } catch {
    // A row this key cannot open was written under a key that no longer
    // exists (a wiped key store). It is unreadable, not corrupt history to
    // show; the next sync or import writes a fresh copy over it.
    return null;
  }
}
