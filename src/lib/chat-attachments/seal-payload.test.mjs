// What crosses the API beside an encrypted chat file. These strings are wire
// format, shared with the phone — the Dart twin is
// `ababilx-mobile/test/features/messages/attachment_seal_wire_test.dart`.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  attachmentSealAad,
  decodeSealPayload,
  encodeSealPayload,
  isSealedWireName,
  sealedWireName,
  sealedWireType,
} from "./seal-payload.ts";

const key = Uint8Array.from({ length: 32 }, (_, i) => i);

describe("the sealed payload", () => {
  it("is this exact JSON", () => {
    const text = encodeSealPayload({
      key,
      fileName: "IMG_0012.jpg",
      contentType: "image/jpeg",
      plainSize: 123456,
    });
    assert.equal(
      text,
      '{"v":1,"k":"AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8",' +
        '"n":"IMG_0012.jpg","t":"image/jpeg","s":123456}',
    );
    const back = decodeSealPayload(text);
    assert.deepEqual(back.key, key);
    assert.equal(back.fileName, "IMG_0012.jpg");
    assert.equal(back.contentType, "image/jpeg");
    assert.equal(back.plainSize, 123456);
  });

  it("keeps a name that is not ASCII", () => {
    const text = encodeSealPayload({
      key,
      fileName: "ছবি 01.jpg",
      contentType: "image/jpeg",
      plainSize: 1,
    });
    assert.ok(text.includes('"n":"ছবি 01.jpg"'));
    assert.equal(decodeSealPayload(text).fileName, "ছবি 01.jpg");
  });

  it("of another version, a short key or a bad size is refused", () => {
    const k = "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8";
    assert.throws(() => decodeSealPayload(JSON.stringify({ v: 2, k, s: 1 })));
    assert.throws(() => decodeSealPayload(JSON.stringify({ v: 1, k: "AAAA", s: 1 })));
    assert.throws(() => decodeSealPayload(JSON.stringify({ v: 1, k, s: -1 })));
    assert.throws(() => decodeSealPayload(JSON.stringify({ v: 1, k, s: 1.5 })));
    assert.throws(() => decodeSealPayload(JSON.stringify({ v: 1, k })));
    assert.throws(() => decodeSealPayload("null"));
    assert.throws(() => decodeSealPayload("not json"));
  });

  it("missing name and type read as empty, not as an error", () => {
    const k = "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8";
    const back = decodeSealPayload(JSON.stringify({ v: 1, k, s: 0 }));
    assert.equal(back.fileName, "");
    assert.equal(back.contentType, "");
    assert.equal(back.plainSize, 0);
  });
});

it("the AAD names conversation, key version and sealer", () => {
  assert.equal(
    attachmentSealAad("conv-1", 3, "user-9"),
    "ababilx-att-meta-v1:conv-1:3:user-9",
  );
});

describe("the server is told the kind of file and nothing else", () => {
  it("type", () => {
    assert.equal(sealedWireType("image/heic", "IMG.HEIC"), "image/x-ababilx-sealed");
    // Pickers hand over octet-stream for plenty of photos.
    assert.equal(sealedWireType("application/octet-stream", "a.JPG"), "image/x-ababilx-sealed");
    assert.equal(sealedWireType("", "clip.MOV"), "video/x-ababilx-sealed");
    assert.equal(sealedWireType("audio/webm;codecs=opus", "x"), "audio/x-ababilx-sealed");
    assert.equal(sealedWireType("application/pdf", "tax.pdf"), "application/octet-stream");
  });

  it("name", () => {
    assert.equal(sealedWireName("audio/mp4", "voice-message-12s.m4a"), "voice-message");
    assert.equal(sealedWireName("audio/mpeg", "song.mp3"), "file");
    assert.equal(sealedWireName("image/jpeg", "passport.jpg"), "file");
    // A document cannot pass as a voice note by borrowing the prefix.
    assert.equal(sealedWireName("application/pdf", "voice-notes.pdf"), "file");
  });

  it("the stored names are recognised as naming nothing", () => {
    assert.ok(isSealedWireName("file"));
    assert.ok(isSealedWireName("voice-message"));
    assert.ok(!isSealedWireName("file.pdf"));
    assert.ok(!isSealedWireName(undefined));
  });
});
