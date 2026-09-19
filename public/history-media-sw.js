/*
 * Serves attachments imported from a phone out of this browser's history
 * database, with HTTP Range support, so a <video> can seek and an <audio> can
 * scrub without the whole file ever being one buffer in memory.
 *
 *   GET /__history-media/<userId>/<urlKey>   ->  200 / 206 from sealed pieces
 *
 * Pieces are AES-GCM under the account's non-extractable local key (the page
 * wrote them; see src/lib/history/repo/files.ts). The worker reads the key by
 * structured clone from the same database and decrypts one 1 MiB piece at a
 * time. It never creates a database: a URL for an account with no history
 * answers 404 instead of leaving an empty database behind.
 */
const PREFIX = "/__history-media/";
const PIECE = 1 << 20;
const encoder = new TextEncoder();

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(PREFIX)) return;
  if (event.request.method !== "GET") return;
  event.respondWith(serve(event.request, url).catch(() => new Response(null, { status: 404 })));
});

function openExisting(name) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name);
    request.onupgradeneeded = () => request.transaction.abort();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function read(db, store, key, method = "get", count) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = count ? tx.objectStore(store)[method](key, count) : tx.objectStore(store)[method](key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function parseRange(header, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header || "");
  if (!match) return null;
  let start = match[1] === "" ? size - Number(match[2]) : Number(match[1]);
  let end = match[1] === "" || match[2] === "" ? size - 1 : Number(match[2]);
  start = Math.max(0, start);
  end = Math.min(size - 1, end);
  return start <= end ? { start, end } : { invalid: true };
}

async function serve(request, url) {
  const [userId, urlKey] = url.pathname.slice(PREFIX.length).split("/").map(decodeURIComponent);
  if (!userId || !urlKey) return new Response(null, { status: 404 });
  const db = await openExisting(`ababilx-history:${userId}`);
  const file = await read(db, "files", urlKey).catch(() => undefined);
  const keyRow = await read(db, "keys", "local-v1").catch(() => undefined);
  if (!file || file.status !== "ready" || !keyRow) {
    db.close();
    return new Response(null, { status: 404 });
  }
  const size = file.size;
  const headers = {
    "Content-Type": file.content_type || "application/octet-stream",
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-store",
  };
  const range = request.headers.get("range") ? parseRange(request.headers.get("range"), size) : null;
  if (range && range.invalid) {
    db.close();
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  }
  const start = range ? range.start : 0;
  const stop = range ? range.end + 1 : size;
  headers["Content-Length"] = String(stop - start);
  if (range) headers["Content-Range"] = `bytes ${start}-${stop - 1}/${size}`;
  if (size === 0 || stop <= start) {
    db.close();
    return new Response(new Uint8Array(0), { status: 200, headers });
  }
  let at = start;
  const body = new ReadableStream({
    async pull(controller) {
      try {
        if (at >= stop) {
          controller.close();
          db.close();
          return;
        }
        const rows = await read(
          db,
          "file_chunks",
          IDBKeyRange.bound([urlKey, Math.max(0, at - PIECE + 1)], [urlKey, stop - 1]),
          "getAll",
          4,
        );
        const row = rows.find((r) => r.n <= at && r.n + r.length > at);
        if (!row) throw new Error("missing piece");
        const plain = new Uint8Array(
          await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: row.payload.iv, additionalData: encoder.encode(`history-file:${urlKey}:${row.n}`) },
            keyRow.key,
            row.payload.ct,
          ),
        );
        const to = Math.min(row.length, stop - row.n);
        controller.enqueue(plain.subarray(at - row.n, to));
        at = row.n + to;
      } catch (error) {
        db.close();
        controller.error(error);
      }
    },
    cancel() {
      db.close();
    },
  });
  return new Response(body, { status: range ? 206 : 200, headers });
}
