import { S } from "./schema";
import { req, writeTx } from "./tx";

/**
 * The account's local storage key: AES-256-GCM, generated in this browser,
 * **non-extractable**. IndexedDB can hold a CryptoKey by structured clone, so
 * the key survives reloads without its bytes ever being readable by script —
 * the same arrangement the message identity already uses.
 *
 * It protects history at rest against somebody reading the profile directory.
 * It does not protect against script running on this origin, and nothing in a
 * browser could; the message identity has the same boundary.
 */
export type Sealed = { iv: Uint8Array; ct: ArrayBuffer };

const LOCAL_KEY_ID = "local-v1";
const keyCache = new WeakMap<IDBDatabase, Promise<CryptoKey>>();
const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function loadOrCreate(db: IDBDatabase): Promise<CryptoKey> {
  const read = async () => {
    const tx = db.transaction(S.keys, "readonly");
    const row = await req<{ id: string; key: CryptoKey } | undefined>(
      tx.objectStore(S.keys).get(LOCAL_KEY_ID),
    );
    return row?.key;
  };
  const existing = await read();
  if (existing) return existing;
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, [
    "encrypt",
    "decrypt",
  ]);
  try {
    // add, not put: two tabs racing here must not each keep a different key
    // and seal rows the other can never open. The loser reads the winner.
    await writeTx(db, [S.keys], (tx) => {
      tx.objectStore(S.keys).add({ id: LOCAL_KEY_ID, key });
    });
    return key;
  } catch {
    const winner = await read();
    if (!winner) throw new Error("local history key unavailable");
    return winner;
  }
}

export function localKey(db: IDBDatabase): Promise<CryptoKey> {
  let key = keyCache.get(db);
  if (!key) {
    key = loadOrCreate(db).catch((error) => {
      keyCache.delete(db);
      throw error;
    });
    keyCache.set(db, key);
  }
  return key;
}

/**
 * `aad` binds a payload to the row it belongs to, so a payload copied from
 * one record into another fails to open instead of showing the wrong message.
 */
export async function sealBytes(key: CryptoKey, bytes: BufferSource, aad: string): Promise<Sealed> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: encoder.encode(aad) },
    key,
    bytes,
  );
  return { iv, ct };
}

export async function openBytes(key: CryptoKey, sealed: Sealed, aad: string): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt(
    { name: "AES-GCM", iv: sealed.iv as BufferSource, additionalData: encoder.encode(aad) },
    key,
    sealed.ct,
  );
}

export function sealJson(key: CryptoKey, value: unknown, aad: string) {
  return sealBytes(key, encoder.encode(JSON.stringify(value)), aad);
}

export async function openJson<T>(key: CryptoKey, sealed: Sealed, aad: string): Promise<T> {
  return JSON.parse(decoder.decode(await openBytes(key, sealed, aad))) as T;
}
