/**
 * The longest text one chat message may carry: 6000 words.
 *
 * Words are what a person can count. The server cannot — a sealed body is
 * ciphertext to it — and bounds bytes instead (`MaxChatBodyLen`, 256 KiB of
 * TipTap JSON). MAX_MESSAGE_BODY_BYTES sits under that, so a body accepted
 * here is never refused there. The phone applies the same two numbers
 * (`message_length_limit.dart`); keep them in step.
 */
export const MAX_MESSAGE_WORDS = 6000;
export const MAX_MESSAGE_BODY_BYTES = 250 * 1024;

export const MESSAGE_TOO_LONG =
  "This message is too long. The limit is 6000 words. Use a snippet for long text.";

type Node = { type?: string; text?: string; attrs?: { label?: string }; content?: Node[] };

function collect(node: Node, out: string[]): void {
  if (typeof node.text === "string") out.push(node.text);
  else if (node.type === "mention") out.push(`@${node.attrs?.label ?? ""}`);
  else if (node.type === "hardBreak") out.push("\n");
  if (!Array.isArray(node.content)) return;
  for (const child of node.content) collect(child, out);
  // A block ends a word: two paragraphs are never one run of letters.
  if (node.type !== "text") out.push("\n");
}

/** The words a person would read in `body`, which is TipTap JSON or plain text. */
export function messagePlainText(body: string): string {
  const trimmed = body.trim();
  if (!trimmed.startsWith("{")) return trimmed;
  try {
    const out: string[] = [];
    collect(JSON.parse(trimmed) as Node, out);
    return out.join("");
  } catch {
    return trimmed;
  }
}

export function countMessageWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function isMessageTooLong(body: string): boolean {
  if (new TextEncoder().encode(body).length > MAX_MESSAGE_BODY_BYTES) return true;
  return countMessageWords(messagePlainText(body)) > MAX_MESSAGE_WORDS;
}

/** Throws the sentence the composer shows; call before anything is sent. */
export function assertMessageLength(body: string): void {
  if (isMessageTooLong(body)) throw new Error(MESSAGE_TOO_LONG);
}
