import type { ChatConversation, ChatMessage } from "@/lib/api/types/chat";
import { syncChatDeletions } from "@/lib/messages/deletions";
import { mergeMarkers } from "../markers";
import { storeConversations } from "../repo/conversations";
import { storeDeletionMarkers } from "../repo/deletions";
import { activateImport, dropUnactivated, stageImportedMessages } from "../repo/import-stage";
import { applyDeletionMarkers, mergeMessages } from "../repo/messages-write";
import { Sha256 } from "../sha256";
import type { Descriptor } from "./descriptor";
import { FrameError, gzipLines, parseFrame } from "./frames";
import { readStagedChunk } from "./staging";

/**
 * Activates one message batch: validate everything, then make it visible in
 * one write. Order matters and is the contract:
 *
 * ```
 * inflate + parse  every frame, header and end counts, stream hash and length
 * stage            new messages written invisible (activation key)
 * markers          refreshed from the server, plus the phone's — then applied
 * activate         one meta write; the whole batch appears
 * replace          newer copies of visible messages, through the merge contract
 * ```
 *
 * Anything wrong before activation drops what was staged: a batch is imported
 * whole or not at all.
 */
const GROUP = 400;

export async function processMessageBatch(
  userId: string,
  jobId: string,
  descriptor: Descriptor,
): Promise<{ messages: number; conversations: number }> {
  const activation = `${jobId}:${descriptor.batch}`;
  const hash = new Sha256();
  let streamBytes = 0;
  async function* pieces() {
    for (let i = 0; i < descriptor.chunk_count; i += 1) {
      const piece = await readStagedChunk(userId, jobId, descriptor.batch, i);
      if (!piece) throw new FrameError(`staged chunk ${i} is missing`);
      hash.update(piece);
      streamBytes += piece.length;
      yield piece;
    }
  }

  const markers = mergeMarkers(await syncChatDeletions(userId).catch(() => []), descriptor.deletions);
  const conversations = new Map<string, ChatConversation>();
  const replacements: ChatMessage[] = [];
  let group: ChatMessage[] = [];
  let header = false;
  let end: { messages: number; conversations: number } | null = null;
  let seen = 0;
  const flush = async () => {
    if (group.length === 0) return;
    replacements.push(...(await stageImportedMessages(userId, group, activation, markers)));
    group = [];
  };

  try {
    for await (const line of gzipLines(pieces())) {
      if (end) throw new FrameError("frames after the end frame");
      const frame = parseFrame(line);
      if (frame.t === "header") {
        const h = frame as unknown as { transfer_id: string; batch: number; v: number };
        if (h.v !== 2 || h.transfer_id !== jobId || h.batch !== descriptor.batch) throw new FrameError("wrong header");
        header = true;
      } else if (!header) {
        throw new FrameError("the stream does not start with its header");
      } else if (frame.t === "conv") {
        const c = (frame as unknown as { c: ChatConversation }).c;
        if (c?.id) conversations.set(c.id, c);
      } else if (frame.t === "msg") {
        const m = (frame as unknown as { m: ChatMessage }).m;
        if (!m?.id || !conversations.has(m.conversation_id)) throw new FrameError("a message names no conversation");
        seen += 1;
        group.push(m);
        if (group.length >= GROUP) await flush();
      } else if (frame.t === "end") {
        end = frame as unknown as { messages: number; conversations: number };
      }
    }
    await flush();
    if (!end || end.messages !== seen || end.conversations !== conversations.size) {
      throw new FrameError("the end frame does not match what arrived");
    }
    if (streamBytes !== descriptor.stream_bytes || hash.hex() !== descriptor.stream_sha256) {
      throw new FrameError("the batch stream does not match its descriptor");
    }
  } catch (error) {
    await dropUnactivated(userId, activation).catch(() => {});
    throw error;
  }

  await storeDeletionMarkers(userId, markers).catch(() => {});
  await applyDeletionMarkers(userId, markers);
  await activateImport(userId, activation);
  await storeConversations(userId, [...conversations.values()], "phone");
  for (let i = 0; i < replacements.length; i += GROUP) {
    await mergeMessages(userId, replacements.slice(i, i + GROUP), "phone", markers);
  }
  return { messages: seen, conversations: conversations.size };
}
