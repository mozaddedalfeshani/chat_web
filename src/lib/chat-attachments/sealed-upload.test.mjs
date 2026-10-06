// The upload and download halves of an encrypted chat file, end to end
// against a stand-in bucket: what is PUT is ciphertext of the file, and what
// is drawn is the file again.
import { afterEach, describe, expect, test } from "bun:test";
import { cipherSize } from "./format.ts";
import { openBytes } from "./file-cipher.ts";
import {
  forgetUploadSecret,
  presignChatUpload,
  putPresignedUpload,
  shouldSealUpload,
  uploadSecretFor,
} from "./sealed-upload.ts";
import { forgetSealedAssets, loadSealedAsset, sealedAsset } from "./sealed-assets.ts";
import { rememberSealedFile, safeBlobType } from "./sealed-files.ts";

const originalFetch = globalThis.fetch;
const PUBLIC = "https://cdn.test/chat/c/1.bin";
const plain = Uint8Array.from({ length: 200000 }, (_, i) => (i * 13 + 5) & 0xff);

afterEach(() => {
  globalThis.fetch = originalFetch;
  forgetUploadSecret(PUBLIC);
  forgetSealedAssets();
});

/** A bucket that keeps what it is sent and serves it back. */
function bucket() {
  const state = { presigned: [], put: null, type: "", gets: 0 };
  globalThis.fetch = async (url, init) => {
    if (init?.method === "PUT") {
      state.put = new Uint8Array(await new Response(init.body).arrayBuffer());
      state.type = init.headers["Content-Type"];
      return new Response(null, { status: 200 });
    }
    state.gets += 1;
    return new Response(state.put, {
      headers: { "Content-Length": String(state.put.length) },
    });
  };
  const presign = async (...args) => {
    state.presigned.push(args);
    return { upload_url: "https://r2.test/put", public_url: PUBLIC };
  };
  return { state, presign };
}

describe("which uploads are encrypted", () => {
  const dm = { type: "dm", scope: "personal" };
  test("only with the server's switch on", () => {
    expect(shouldSealUpload(false, dm)).toBe(false);
    expect(shouldSealUpload(true, dm)).toBe(true);
  });
  test("only where messages are sealed", () => {
    expect(shouldSealUpload(true, { type: "group", scope: "personal" })).toBe(true);
    expect(shouldSealUpload(true, { type: "webhook", scope: "personal" })).toBe(false);
    expect(shouldSealUpload(true, { type: "channel", scope: "workspace" })).toBe(false);
    expect(shouldSealUpload(true, null)).toBe(false);
  });
  test("never in a group that may still fall back to plaintext", () => {
    const unkeyed = { type: "group", scope: "personal", plaintext_until_keyed: true };
    expect(shouldSealUpload(true, unkeyed)).toBe(false);
  });
});

describe("a plaintext upload is untouched", () => {
  test("presigned and PUT as the file it is", async () => {
    const { state, presign } = bucket();
    const slot = await presignChatUpload(presign, false, "image/png", "a.png", plain.length);
    expect(state.presigned).toEqual([["image/png", "a.png", plain.length]]);
    expect(slot.seal).toBeUndefined();
    expect(uploadSecretFor(PUBLIC)).toBeUndefined();
    await putPresignedUpload(slot, new Blob([plain]), "image/png");
    expect(state.type).toBe("image/png");
    expect(state.put).toEqual(plain);
  });
});

describe("an encrypted upload", () => {
  test("tells the server the kind and the ciphertext's length, nothing else", async () => {
    const { state, presign } = bucket();
    await presignChatUpload(presign, true, "image/jpeg", "passport.jpg", plain.length);
    expect(state.presigned).toEqual([
      ["image/x-ababilx-sealed", "file", cipherSize(plain.length), true],
    ]);
  });

  test("PUTs ciphertext that opens to the file, as octet-stream", async () => {
    const { state, presign } = bucket();
    const slot = await presignChatUpload(presign, true, "image/jpeg", "a.jpg", plain.length);
    await putPresignedUpload(slot, new Blob([plain]), "image/jpeg");
    expect(state.type).toBe("application/octet-stream");
    expect(state.put.length).toBe(cipherSize(plain.length));
    const secret = uploadSecretFor(PUBLIC);
    expect(await openBytes(state.put, secret.key, secret.plainSize)).toEqual(plain);
  });

  test("seals the size of the bytes uploaded, not the size it was told", async () => {
    const { presign } = bucket();
    const slot = await presignChatUpload(presign, true, "image/jpeg", "a.jpg", 123);
    expect(uploadSecretFor(PUBLIC).plainSize).toBe(123);
    await putPresignedUpload(slot, new Blob([plain]), "image/jpeg");
    expect(uploadSecretFor(PUBLIC).plainSize).toBe(plain.length);
  });

  test("keeps its key until told the send is confirmed", async () => {
    const { presign } = bucket();
    await presignChatUpload(presign, true, "image/jpeg", "a.jpg", 10);
    expect(uploadSecretFor(PUBLIC)).toBeDefined();
    expect(uploadSecretFor(PUBLIC)).toBeDefined();
    forgetUploadSecret(PUBLIC);
    expect(uploadSecretFor(PUBLIC)).toBeUndefined();
  });

  test("is drawn by its sender from the copy already here", async () => {
    const { state, presign } = bucket();
    const slot = await presignChatUpload(presign, true, "image/jpeg", "a.jpg", plain.length);
    await putPresignedUpload(slot, new Blob([plain]), "image/jpeg");
    expect(sealedAsset(PUBLIC).status).toBe("ready");
    await loadSealedAsset(PUBLIC);
    expect(state.gets).toBe(0);
  });
});

describe("a received file", () => {
  async function received(contentType = "image/jpeg") {
    const { state, presign } = bucket();
    const slot = await presignChatUpload(presign, true, contentType, "a", plain.length);
    await putPresignedUpload(slot, new Blob([plain]), contentType);
    const secret = uploadSecretFor(PUBLIC);
    forgetSealedAssets(); // another device: nothing adopted, no key yet
    return { state, secret, contentType };
  }

  test("is downloaded once, decrypted, and typed safely", async () => {
    const { state, secret, contentType } = await received();
    rememberSealedFile(PUBLIC, { ...secret, contentType });
    const [a, b] = await Promise.all([loadSealedAsset(PUBLIC), loadSealedAsset(PUBLIC)]);
    expect(a).toBe(b);
    expect(a.startsWith("blob:")).toBe(true);
    expect(state.gets).toBe(1);
    const blob = await (await originalFetch(a)).blob();
    expect(blob.type).toBe("image/jpeg");
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(plain);
  });

  test("with no key on this device is refused before any download", async () => {
    const { state } = await received();
    await expect(loadSealedAsset(PUBLIC)).rejects.toThrow();
    expect(state.gets).toBe(0);
    expect(sealedAsset(PUBLIC).status).toBe("failed");
  });

  test("with the wrong key fails and keeps nothing", async () => {
    const { secret } = await received();
    rememberSealedFile(PUBLIC, { ...secret, key: new Uint8Array(32).fill(9), contentType: "" });
    await expect(loadSealedAsset(PUBLIC)).rejects.toThrow();
    expect(sealedAsset(PUBLIC)).toEqual({ src: null, status: "failed" });
  });

  test("stating a size larger than the object is refused", async () => {
    const { secret } = await received();
    rememberSealedFile(PUBLIC, { ...secret, plainSize: 50_000_000, contentType: "" });
    await expect(loadSealedAsset(PUBLIC)).rejects.toThrow("stated size does not fit");
  });
});

// The decrypted bytes live at a blob: URL of this origin, and their type is
// the sender's word. Anything a browser would execute must lose its name.
test("only types a browser renders without running anything keep their name", () => {
  expect(safeBlobType("image/jpeg")).toBe("image/jpeg");
  expect(safeBlobType("IMAGE/PNG")).toBe("image/png");
  expect(safeBlobType("video/mp4")).toBe("video/mp4");
  expect(safeBlobType("audio/webm;codecs=opus")).toBe("audio/webm");
  expect(safeBlobType("application/pdf")).toBe("application/pdf");
  for (const type of [
    "text/html",
    "image/svg+xml",
    "application/xhtml+xml",
    "text/javascript",
    "application/xml",
    "image/heic",
    "",
  ]) {
    expect(safeBlobType(type)).toBe("application/octet-stream");
  }
});
