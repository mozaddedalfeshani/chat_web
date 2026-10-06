// The conversation-key half of an encrypted chat file: what goes on the wire
// beside the attachment row, and what comes back out of it. The key store is
// primed directly, so nothing here touches the network.
import { afterEach, describe, expect, test } from "bun:test";
import { openAttachment, openMessageAttachments, sealAttachments } from "./attachment-seal.ts";
import { needsOpening } from "./crypto.ts";
import { readKeys } from "./identity-state.ts";
import { sealedFileFor, forgetSealedFiles } from "../chat-attachments/sealed-files.ts";
import { cipherSize } from "../chat-attachments/format.ts";
import { sealedFormAttachments } from "../chat-attachments/sealed-form.ts";

const CONV = "conv-1";
const ME = "user-9";
const URL_A = "https://cdn.test/chat/conv-1/a.bin";
const fileKey = Uint8Array.from({ length: 32 }, (_, i) => i);

async function primeKey(version, conversation = CONV) {
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, [
    "encrypt",
    "decrypt",
  ]);
  readKeys.set(`${conversation}:${version}`, key);
}

const upload = () => ({
  file_url: URL_A,
  file_name: "IMG_0012.jpg",
  content_type: "image/jpeg",
  size_bytes: 123456,
});
const secretFor = (url) => (url === URL_A ? { key: fileKey, plainSize: 123456 } : undefined);

async function sentRow(version = 3) {
  const [wire] = await sealAttachments(CONV, ME, version, [upload()], secretFor);
  return {
    id: "att-1",
    message_id: "m-1",
    uploaded_by: ME,
    created_at: "2026-10-06T00:00:00Z",
    ...wire,
    enc_key_version: version,
  };
}

afterEach(() => {
  readKeys.clear();
  forgetSealedFiles();
});

describe("sealing an upload", () => {
  test("never sends the real name, type or size", async () => {
    await primeKey(3);
    const [wire] = await sealAttachments(CONV, ME, 3, [upload()], secretFor);
    expect(wire.file_url).toBe(URL_A);
    expect(wire.file_name).toBe("file");
    expect(wire.content_type).toBe("image/x-ababilx-sealed");
    expect(wire.size_bytes).toBe(cipherSize(123456));
    expect(wire.enc_meta).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(wire.enc_nonce).toMatch(/^[A-Za-z0-9_-]{16}$/);
    expect(JSON.stringify(wire)).not.toContain("IMG_0012");
  });

  test("leaves an ordinary file untouched", async () => {
    await primeKey(3);
    const plain = { ...upload(), file_url: "https://cdn.test/chat/conv-1/b.pdf" };
    const out = await sealAttachments(CONV, ME, 3, [plain, upload()], secretFor);
    expect(out[0]).toEqual(plain);
    expect(out[1].enc_meta).toBeTruthy();
  });

  test("refuses rather than send a key nobody can open", async () => {
    // No key at version 0: the plaintext fallback of an unkeyed group.
    await expect(sealAttachments(CONV, ME, 0, [upload()], secretFor)).rejects.toThrow();
  });
});

describe("opening a row", () => {
  test("gives back the real file and files its key", async () => {
    await primeKey(3);
    const opened = await openAttachment(CONV, "reader", await sentRow());
    expect(opened.file_name).toBe("IMG_0012.jpg");
    expect(opened.content_type).toBe("image/jpeg");
    expect(opened.size_bytes).toBe(123456);
    expect(opened.seal_failed).toBeUndefined();
    expect(opened.sealed_as).toEqual({
      file_name: "file",
      content_type: "image/x-ababilx-sealed",
      size_bytes: cipherSize(123456),
    });
    const filed = sealedFileFor(URL_A);
    expect([...filed.key]).toEqual([...fileKey]);
    expect(filed.plainSize).toBe(123456);
    // The key is never put on the row itself.
    expect(JSON.stringify(opened)).not.toContain("AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8");
  });

  test("moved to another conversation, sender or key version does not open", async () => {
    await primeKey(3);
    await primeKey(3, "conv-2");
    await primeKey(4);
    const row = await sentRow();
    expect((await openAttachment("conv-2", ME, row)).seal_failed).toBe(true);
    expect((await openAttachment(CONV, ME, row, "someone-else")).seal_failed).toBe(true);
    expect((await openAttachment(CONV, ME, { ...row, enc_key_version: 4 })).seal_failed).toBe(true);
    expect(sealedFileFor(URL_A)).toBeUndefined();
  });

  test("a tampered seal is refused, not half-read", async () => {
    await primeKey(3);
    const row = await sentRow();
    const flipped = row.enc_meta.slice(0, -2) + (row.enc_meta.endsWith("AA") ? "BB" : "AA");
    const out = await openAttachment(CONV, ME, { ...row, enc_meta: flipped });
    expect(out.seal_failed).toBe(true);
    expect(out.file_name).toBe("file");
  });

  test("a plaintext row and an already opened one pass through", async () => {
    await primeKey(3);
    const plain = { id: "p", file_url: "https://cdn.test/x.png", file_name: "x.png" };
    expect(await openAttachment(CONV, ME, plain)).toBe(plain);
    const opened = await openAttachment(CONV, ME, await sentRow());
    expect(await openAttachment(CONV, ME, opened)).toBe(opened);
  });

  test("an SVG is offered as a file, never as an image to draw", async () => {
    await primeKey(3);
    const svg = { ...upload(), file_name: "logo.svg", content_type: "image/svg+xml" };
    const [wire] = await sealAttachments(CONV, ME, 3, [svg], secretFor);
    const opened = await openAttachment(CONV, ME, {
      id: "s",
      uploaded_by: ME,
      ...wire,
      enc_key_version: 3,
    });
    expect(opened.file_name).toBe("logo.svg");
    expect(opened.content_type).toBe("application/octet-stream");
    // Forwarding still seals what the sender wrote.
    expect(sealedFileFor(URL_A).contentType).toBe("image/svg+xml");
  });

  test("the sealer defaults to the message's sender", async () => {
    await primeKey(3);
    const message = {
      id: "m-1",
      conversation_id: CONV,
      user_id: ME,
      body: "",
      attachments: [{ ...(await sentRow()), uploaded_by: "" }],
    };
    const out = await openMessageAttachments(message, "reader");
    expect(out.attachments[0].file_name).toBe("IMG_0012.jpg");
  });
});

test("an opened row goes back to storage exactly as it arrived", async () => {
  await primeKey(3);
  const row = await sentRow();
  const message = { id: "m-1", attachments: [await openAttachment(CONV, ME, row)] };
  expect(sealedFormAttachments(message).attachments[0]).toEqual(row);
  const failed = { id: "m-2", attachments: [{ ...row, seal_failed: true }] };
  expect(sealedFormAttachments(failed).attachments[0]).toEqual(row);
  const untouched = { id: "m-3", attachments: [row] };
  expect(sealedFormAttachments(untouched)).toBe(untouched);
});

describe("a message is opened once", () => {
  const sealed = { encryption_version: 1, encrypted_body: "abc", body: "" };

  test("sealed and not tried yet", () => {
    expect(needsOpening(sealed)).toBe(true);
  });

  // A message of encrypted files only seals an EMPTY text. Reading an empty
  // body as "still sealed" decrypted the same websocket event forever.
  test("opened with an empty text is done", () => {
    expect(needsOpening({ ...sealed, decryption_failed: false })).toBe(false);
  });

  test("a failed open is not retried in a loop", () => {
    expect(needsOpening({ ...sealed, decryption_failed: true })).toBe(false);
  });

  test("plaintext is left alone, a sealed quote is not", () => {
    expect(needsOpening({ body: "hi" })).toBe(false);
    expect(needsOpening({ body: "hi", quote: { encrypted_body: "x" } })).toBe(true);
  });
});
