import { Assembler, decodeFrame, encodeFrame, gunzipLines, pieces, type FrameHeader } from "./wire";

/**
 * Requests and answers over the open data channel — protocol section 3. The
 * browser asks, the phone answers; nothing here is kept between connections,
 * because what this browser holds (IndexedDB) is the only state that matters
 * and every request can simply be asked again.
 */
export type Hello = {
  v: number;
  as_of_ms: number;
  window_start_ms: number;
  device: string;
  convs: { c: Record<string, unknown> & { id: string }; newest_ms: number }[];
  deletions: unknown[];
};
export type Page = { rows: unknown[]; more: boolean };
export type FileHead = { size: number; sha256: string; name: string; content_type: string; missing?: boolean };
export type FileSink = {
  head: (head: FileHead) => Promise<void>;
  data: (offset: number, bytes: Uint8Array) => Promise<void>;
};

type Waiter = { resolve: (value: unknown) => void; reject: (error: Error) => void; sink?: FileSink; chain: Promise<void> };

const HIGH_WATER = 1 << 20;
const PING_MS = 2000;
const LOST_MS = 8000;

export class LiveClient {
  private assembler = new Assembler();
  private waiters = new Map<number, Waiter>();
  private nextReq = 1;
  private nextFrame = 1;
  private lastHeard = Date.now();
  private timer: ReturnType<typeof setInterval>;
  private closed = false;

  constructor(
    private readonly channel: RTCDataChannel,
    private readonly onHello: (hello: Hello) => void,
    private readonly onLost: () => void,
  ) {
    channel.bufferedAmountLowThreshold = HIGH_WATER / 2;
    channel.onmessage = (ev) => this.receive(new Uint8Array(ev.data as ArrayBuffer));
    channel.onclose = () => this.lose();
    this.timer = setInterval(() => {
      if (Date.now() - this.lastHeard > LOST_MS) return this.lose();
      void this.send({ t: "ping" }).catch(() => {});
    }, PING_MS);
  }

  get open() {
    return !this.closed && this.channel.readyState === "open";
  }

  getPage(conv: string, limit: number, before?: { ms: number; id: string }): Promise<Page> {
    return this.ask({ t: "get", conv, limit, before_ms: before?.ms, before_id: before?.id || undefined }) as Promise<Page>;
  }

  /** Streams one file into `sink`; resolves false when the phone has no copy. */
  getFile(url: string, sink: FileSink): Promise<boolean> {
    return this.ask({ t: "file", url }, sink) as Promise<boolean>;
  }

  close() {
    if (this.closed) return;
    void this.send({ t: "bye" }).catch(() => {});
    this.lose();
  }

  private ask(header: FrameHeader, sink?: FileSink): Promise<unknown> {
    if (!this.open) return Promise.reject(new Error("phone not connected"));
    const req = this.nextReq++;
    return new Promise((resolve, reject) => {
      this.waiters.set(req, { resolve, reject, sink, chain: Promise.resolve() });
      this.send({ ...header, req }).catch((error) => {
        this.waiters.delete(req);
        reject(error);
      });
    });
  }

  private async send(header: FrameHeader, body?: Uint8Array) {
    const frame = encodeFrame(header, body);
    const id = this.nextFrame++;
    for (const piece of pieces(id, frame)) {
      if (this.channel.bufferedAmount > HIGH_WATER) await this.drained();
      if (this.channel.readyState !== "open") throw new Error("channel closed");
      this.channel.send(piece as Uint8Array<ArrayBuffer>);
    }
  }

  private drained() {
    return new Promise<void>((resolve) => {
      this.channel.addEventListener("bufferedamountlow", () => resolve(), { once: true });
    });
  }

  private receive(piece: Uint8Array) {
    this.lastHeard = Date.now();
    let bytes: Uint8Array | null;
    try {
      bytes = this.assembler.push(piece);
    } catch {
      return this.lose();
    }
    if (!bytes) return;
    const { header, body } = decodeFrame(bytes);
    const req = Number(header.req ?? 0);
    const waiter = this.waiters.get(req);
    switch (header.t) {
      case "hello":
        return this.onHello(header as unknown as Hello);
      case "ping":
        return void this.send({ t: "pong" }).catch(() => {});
      case "bye":
        return this.lose();
      case "page":
        if (!waiter) return;
        this.waiters.delete(req);
        return void gunzipLines(body)
          .then((lines) => waiter.resolve({ rows: lines.map((l) => JSON.parse(l)), more: header.more === true }))
          .catch((e) => waiter.reject(e));
      case "file_head":
        if (!waiter?.sink) return;
        if (header.missing) {
          this.waiters.delete(req);
          return waiter.resolve(false);
        }
        waiter.chain = waiter.chain.then(() => waiter.sink!.head(header as unknown as FileHead));
        return;
      case "file_data":
        if (!waiter?.sink) return;
        waiter.chain = waiter.chain.then(() => waiter.sink!.data(Number(header.offset), body.slice()));
        return;
      case "file_end":
        if (!waiter) return;
        this.waiters.delete(req);
        return void waiter.chain.then(() => waiter.resolve(true), (e) => waiter.reject(e));
      case "error":
        if (!waiter) return;
        this.waiters.delete(req);
        return waiter.reject(new Error(String(header.code ?? "phone_error")));
    }
  }

  private lose() {
    if (this.closed) return;
    this.closed = true;
    clearInterval(this.timer);
    this.assembler.clear();
    for (const waiter of this.waiters.values()) waiter.reject(new Error("phone disconnected"));
    this.waiters.clear();
    this.onLost();
  }
}
