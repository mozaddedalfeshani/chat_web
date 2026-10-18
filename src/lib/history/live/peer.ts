import { sendOnAppWs } from "@/lib/notifications/ws-bus";
import type { VoiceIceServer } from "@/lib/api/types/voice-call";
import { openSignal, sealSignal, type WireSignal } from "./signal-seal";

/**
 * The browser's half of the WebRTC link — protocol section 1. The phone is
 * the only offerer (flutter_webrtc has no SDP rollback, the Ghost Chat rule),
 * so every offer here replaces whatever connection came before it; this side
 * answers, trickles its candidates, and asks for a fresh offer with `wake`
 * (nothing running on the phone) or `restart` (a connection that died).
 */
export type PeerEvents = {
  onChannel: (channel: RTCDataChannel) => void;
  onClosed: () => void;
};

export class LivePeer {
  private pc: RTCPeerConnection | null = null;
  private pending: RTCIceCandidateInit[] = [];
  // Signals are handled one at a time, in arrival order: decrypting an offer
  // takes longer than a candidate, and a candidate that finished first was
  // queued and then wiped when the offer reset the queue.
  private chain: Promise<void> = Promise.resolve();

  constructor(
    private readonly linkId: string,
    private readonly key: CryptoKey,
    private readonly iceServers: VoiceIceServer[],
    private readonly events: PeerEvents,
  ) {}

  /** An offer has arrived and is being (or was) answered. */
  get offered() {
    return this.pc !== null;
  }

  wake() {
    sendOnAppWs({ type: "history.wake", link_id: this.linkId });
  }

  restart() {
    sendOnAppWs({ type: "history.signal", link_id: this.linkId, history_signal: { kind: "restart" } });
  }

  close(sayBye = true) {
    if (sayBye) sendOnAppWs({ type: "history.signal", link_id: this.linkId, history_signal: { kind: "bye" } });
    this.pc?.close();
    this.pc = null;
    this.pending = [];
  }

  /** A `history.signal` from the phone. Anything that fails to open is dropped. */
  signal(signal: WireSignal): Promise<void> {
    this.chain = this.chain.then(() => this.handle(signal));
    return this.chain;
  }

  private async handle(signal: WireSignal) {
    try {
      if (signal.kind === "offer") return await this.answer(signal);
      if (signal.kind === "ice") return await this.candidate(signal);
      if (signal.kind === "bye") {
        this.close(false);
        this.events.onClosed();
      }
    } catch (error) {
      console.warn("[history-live] signal dropped", signal.kind, error);
    }
  }

  private async answer(signal: WireSignal) {
    console.info("[history-live] offer from phone");
    const offer = await openSignal<RTCSessionDescriptionInit>(this.key, this.linkId, "source", signal);
    this.pc?.close();
    const pc = new RTCPeerConnection({ iceServers: this.iceServers });
    this.pc = pc;
    this.pending = [];
    const channel = pc.createDataChannel("history", { negotiated: true, id: 0, ordered: true });
    channel.binaryType = "arraybuffer";
    channel.onopen = () => this.pc === pc && this.events.onChannel(channel);
    pc.onicecandidate = (ev) => {
      if (!ev.candidate || this.pc !== pc) return;
      void this.send("ice", ev.candidate.toJSON());
    };
    pc.onconnectionstatechange = () => {
      if (this.pc !== pc) return;
      if (pc.connectionState === "failed" || pc.connectionState === "closed") this.events.onClosed();
    };
    await pc.setRemoteDescription(offer);
    for (const candidate of this.pending.splice(0)) await pc.addIceCandidate(candidate).catch(() => {});
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await this.send("answer", { type: answer.type, sdp: answer.sdp });
  }

  private async candidate(signal: WireSignal) {
    const candidate = await openSignal<RTCIceCandidateInit>(this.key, this.linkId, "source", signal);
    if (!this.pc || !this.pc.remoteDescription) {
      this.pending.push(candidate);
      return;
    }
    await this.pc.addIceCandidate(candidate).catch(() => {});
  }

  private async send(kind: string, value: unknown) {
    const sealed = await sealSignal(this.key, this.linkId, "destination", kind, value);
    sendOnAppWs({ type: "history.signal", link_id: this.linkId, history_signal: sealed });
  }
}
