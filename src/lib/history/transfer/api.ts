import { apiFetch, jsonHeaders } from "@/lib/api/core";

/**
 * The destination's half of `/api/messaging/history-transfers` — creating the
 * handshake and every v2 route that reads, acknowledges and commits. The phone
 * is the only side that uploads, so nothing here writes a chunk.
 */
const BASE = "/api/messaging/history-transfers";

export type TransferCreated = {
  id: string;
  token: string;
  scheme: string;
  status: string;
  expires_at: string;
  poll_interval: number;
};

export type JobBatch = {
  batch: number;
  kind: "messages" | "media";
  final: boolean;
  status: "open" | "finalized" | "committed";
  chunk_count: number;
  page_count: number;
  chunks_uploaded: number;
  chunks_acked: number;
};

export type JobState = {
  transfer: {
    id: string;
    status: "pending" | "approved" | "completed" | "cancelled" | "denied" | "expired";
    transfer_version: number;
    source_device_name: string;
    transfer_envelope?: string;
    manifest_ciphertext?: string;
    inventory_ciphertext?: string;
    dest_inventory_ciphertext?: string;
    seal_last_batch?: number;
    expires_at: string;
  };
  live: boolean;
  batches: JobBatch[];
  outstanding_bytes: number;
};

export type RemoteChunk = {
  index: number;
  size_bytes: number;
  acked: boolean;
  download_url: string;
};

const post = <T>(path: string, body?: unknown) =>
  apiFetch<T>(path, { method: "POST", headers: jsonHeaders, body: body === undefined ? undefined : JSON.stringify(body) });

export const transferApi = {
  create: (deviceName: string, publicKeyParam: string) =>
    post<TransferCreated>(BASE, {
      device_name: deviceName,
      client: "web",
      public_key: publicKeyParam,
      transfer_version: 2,
    }),
  job: (id: string) => apiFetch<JobState>(`${BASE}/${id}/v2`),
  putDestInventory: (id: string, ciphertext: string) =>
    apiFetch<unknown>(`${BASE}/${id}/v2/dest-inventory`, {
      method: "PUT",
      headers: jsonHeaders,
      body: JSON.stringify({ ciphertext }),
    }),
  chunks: (id: string, batch: number, after: number) =>
    apiFetch<{ chunks: RemoteChunk[]; expires_in: number }>(
      `${BASE}/${id}/v2/batches/${batch}/chunks?after=${after}&limit=64`,
    ),
  ack: (id: string, batch: number, indexes: number[]) =>
    post<{ acked: number }>(`${BASE}/${id}/v2/batches/${batch}/chunks/ack`, { indexes }),
  pages: (id: string, batch: number, after: number) =>
    apiFetch<{ pages: { index: number; ciphertext: string }[] }>(
      `${BASE}/${id}/v2/batches/${batch}/pages?after=${after}`,
    ),
  commit: (id: string, batch: number) => post<unknown>(`${BASE}/${id}/v2/batches/${batch}/commit`),
  complete: (id: string) => post<unknown>(`${BASE}/${id}/complete`),
  cancel: (id: string) => post<unknown>(`${BASE}/${id}/cancel`),
  active: () =>
    apiFetch<{ active: boolean; role?: string; id?: string; status?: string }>(`${BASE}/active`),
};

/**
 * Relay objects are fetched straight from the private bucket with the signed
 * URL: no cookies, no Authorization header — the signature is the only
 * credential, and anything else would be sent to a third-party origin.
 */
export async function fetchRelayObject(url: string, signal?: AbortSignal): Promise<Uint8Array> {
  const res = await fetch(url, { credentials: "omit", cache: "no-store", signal });
  if (!res.ok) throw new RelayFetchError(res.status);
  return new Uint8Array(await res.arrayBuffer());
}

export class RelayFetchError extends Error {
  constructor(readonly status: number) {
    super(`relay object ${status}`);
  }
}
