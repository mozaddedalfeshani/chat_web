import type { ChatConversation } from "@/lib/api/types/chat";
import type { Provenance } from "../merge";
import { localKey, openJson, sealJson, type Sealed } from "../idb/local-key";
import { S } from "../idb/schema";
import { openHistoryDb, readTx, req, writeTx } from "../idb/tx";

/**
 * Conversations this browser knows, from the server sidebar or a phone batch.
 *
 * A server row always replaces a phone row: the server is the authority on a
 * conversation's current name, members and permissions. A phone row never
 * overwrites a server row; it only fills in conversations the server no
 * longer lists — which is the whole point, since an import must work with an
 * empty server history and cannot depend on the sidebar to discover threads.
 */
type ConversationRow = {
  id: string;
  provenance: Provenance;
  payload: Sealed;
  stored_at: number;
};

const aad = (id: string) => `history-conversation:${id}`;

export async function storeConversations(
  userId: string,
  conversations: ChatConversation[],
  provenance: Provenance,
) {
  const valid = conversations.filter((c) => c?.id);
  if (valid.length === 0) return;
  const db = await openHistoryDb(userId);
  const key = await localKey(db);
  const rows: ConversationRow[] = await Promise.all(
    valid.map(async (c) => ({
      id: c.id,
      provenance,
      // The sidebar's decrypted preview is never written: it is plaintext of
      // an E2EE message, and the preview is recomputed from the server anyway.
      payload: await sealJson(key, { ...c, last_message_body: "" }, aad(c.id)),
      stored_at: Date.now(),
    })),
  );
  await writeTx(db, [S.conversations], async (tx) => {
    const store = tx.objectStore(S.conversations);
    for (const row of rows) {
      if (provenance === "phone") {
        const existing = await req<ConversationRow | undefined>(store.get(row.id));
        if (existing?.provenance === "server") continue;
      }
      store.put(row);
    }
  });
}

export async function readStoredConversations(userId: string): Promise<ChatConversation[]> {
  const db = await openHistoryDb(userId);
  const rows = await readTx(db, [S.conversations], (tx) =>
    req<ConversationRow[]>(tx.objectStore(S.conversations).getAll()),
  );
  const key = await localKey(db);
  const opened = await Promise.all(
    rows.map((row) => openJson<ChatConversation>(key, row.payload, aad(row.id)).catch(() => null)),
  );
  return opened.filter((c): c is ChatConversation => !!c);
}
