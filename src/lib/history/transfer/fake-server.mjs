// An in-memory v2 relay plus a phone that fills it, for importer tests. The
// phone half seals exactly what the Dart exporter seals (same AAD, layout and
// framing), so the destination code under test cannot tell the difference.
import { aad, b64u, seal } from "./v2-crypto.ts";
import { Sha256 } from "../sha256.ts";

const PIECE = 4 * 1024 * 1024;
const enc = new TextEncoder();

async function gzip(text) {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export class FakeServer {
  constructor(id) {
    this.id = id;
    this.status = "pending";
    this.batches = [];
    this.objects = new Map();
    this.pages = new Map();
    this.acked = new Set();
    this.completed = false;
    this.inventory = "";
    this.destInventory = "";
    this.seal = "";
    this.envelope = "";
  }

  /** The phone scans `k`, seals a fresh transfer key to it and approves. */
  async approve(publicJwk) {
    this.key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
    const raw = new Uint8Array(await crypto.subtle.exportKey("raw", this.key));
    const eph = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
    const dest = await crypto.subtle.importKey("jwk", publicJwk, { name: "ECDH", namedCurve: "P-256" }, false, []);
    const shared = await crypto.subtle.deriveBits({ name: "ECDH", public: dest }, eph.privateKey, 256);
    const wrap = await crypto.subtle.importKey("raw", await crypto.subtle.digest("SHA-256", shared), "AES-GCM", false, ["encrypt"]);
    const nonce = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce, additionalData: enc.encode(aad.envelope(this.id)) }, wrap, raw));
    const ephJwk = await crypto.subtle.exportKey("jwk", eph.publicKey);
    this.envelope = b64u(enc.encode(JSON.stringify({ v: 2, ephemeral_public_key: ephJwk, nonce: b64u(nonce), ciphertext: b64u(ct) })));
    this.status = "approved";
  }

  async addBatch(kind, final, stream, descriptorExtra) {
    const batch = this.batches.length;
    const count = stream.length === 0 ? 0 : Math.ceil(stream.length / PIECE);
    for (let i = 0; i < count; i += 1) {
      this.objects.set(`${batch}/${i}`, await seal(this.key, aad.chunk(this.id, batch, kind, i), stream.subarray(i * PIECE, (i + 1) * PIECE)));
    }
    const descriptor = { v: 2, transfer_id: this.id, batch, kind, final, chunk_count: count, stream_bytes: stream.length,
      stream_sha256: kind === "messages" ? new Sha256().update(stream).hex() : "", messages: 0, conversations: 0,
      deletions: [], files: [], ...descriptorExtra };
    const sealed = b64u(await seal(this.key, aad.page(this.id, batch, 0, 1), enc.encode(JSON.stringify(descriptor))));
    this.pages.set(batch, [sealed]);
    this.batches.push({ batch, kind, final, status: "finalized", chunk_count: count, page_count: 1, chunks_uploaded: count, chunks_acked: 0 });
  }

  async addMessages(frames, final) {
    const text = frames.map((f) => JSON.stringify(f)).join("\n") + "\n";
    const counts = frames.filter((f) => f.t === "end")[0];
    await this.addBatch("messages", final, await gzip(text), { messages: counts.messages, conversations: counts.conversations });
  }

  async sealJob(lastBatch) {
    this.seal = b64u(await seal(this.key, aad.seal(this.id), enc.encode(JSON.stringify({ v: 2, transfer_id: this.id, last_batch: lastBatch, deletions: [] }))));
  }

  api() {
    return {
      job: async () => ({
        transfer: { id: this.id, status: this.completed ? "completed" : this.status, transfer_version: 2, source_device_name: "Pixel",
          transfer_envelope: this.envelope, manifest_ciphertext: this.seal, inventory_ciphertext: this.inventory,
          dest_inventory_ciphertext: this.destInventory, expires_at: new Date(Date.now() + 86400000).toISOString() },
        live: !this.completed, batches: this.batches, outstanding_bytes: 0,
      }),
      putDestInventory: async (_id, ct) => { this.destInventory = ct; },
      chunks: async (_id, batch, after) => ({
        chunks: [...this.objects.keys()].filter((k) => Number(k.split("/")[0]) === batch)
          .map((k) => Number(k.split("/")[1])).filter((i) => i > after).sort((a, b) => a - b)
          .map((i) => ({ index: i, size_bytes: this.objects.get(`${batch}/${i}`).length, acked: this.acked.has(`${batch}/${i}`), download_url: `mem://${batch}/${i}` })),
        expires_in: 900,
      }),
      ack: async (_id, batch, indexes) => { indexes.forEach((i) => this.acked.add(`${batch}/${i}`)); return { acked: indexes.length }; },
      pages: async (_id, batch, after) => ({ pages: after >= 0 ? [] : this.pages.get(batch).map((c, i) => ({ index: i, ciphertext: c })) }),
      commit: async (_id, batch) => {
        const row = this.batches[batch];
        for (let i = 0; i < row.chunk_count; i += 1) if (!this.acked.has(`${batch}/${i}`)) throw new Error("commit before every ack");
        row.status = "committed";
      },
      complete: async () => {
        if (!this.seal || this.batches.some((b) => b.status !== "committed")) throw new Error("incomplete");
        this.completed = true;
      },
      cancel: async () => { this.status = "cancelled"; },
      fetchRelay: async (url) => this.objects.get(url.slice("mem://".length)),
    };
  }
}
