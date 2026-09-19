import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { aad, b64u, fromB64u, openEnvelope, openSealed, seal } from "./v2-crypto.ts";
import { linkVerificationCode } from "../../chat-e2ee/device-link.ts";
import fixture from "../fixtures/history-transfer-v2-crypto.json" with { type: "json" };

// The phone's Dart tests read the same file. Passing here and there is the
// proof that a chunk sealed on a phone opens in this browser.
const hex = (value) => Uint8Array.from(value.match(/../g).map((b) => parseInt(b, 16)));
const key = await crypto.subtle.importKey("raw", hex(fixture.transfer_key_hex), "AES-GCM", false, ["encrypt", "decrypt"]);

describe("history transfer v2 crypto (protocol section 3)", () => {
  it("AAD strings match the wire format", () => {
    assert.equal(aad.chunk(fixture.transfer_id, 4, "media", 17), fixture.seals[3].aad);
    assert.equal(aad.page(fixture.transfer_id, 2, 0, 3), fixture.seals[4].aad);
    assert.equal(aad.seal(fixture.transfer_id), fixture.seals[5].aad);
  });

  for (const item of fixture.seals) {
    it(`seals and opens ${item.purpose}: ${item.aad}`, async () => {
      const sealed = await seal(key, item.aad, new TextEncoder().encode(item.plaintext_utf8), hex(fixture.nonce_hex));
      assert.equal(b64u(sealed), item.sealed_b64u);
      const opened = await openSealed(key, item.aad, fromB64u(item.sealed_b64u));
      assert.equal(new TextDecoder().decode(opened), item.plaintext_utf8);
    });
  }

  it("a sealed chunk refuses another position", async () => {
    const sealed = fromB64u(fixture.seals[2].sealed_b64u);
    await assert.rejects(openSealed(key, aad.chunk(fixture.transfer_id, 0, "messages", 1), sealed));
  });

  it("opens the phone's envelope into the transfer key", async () => {
    const env = fixture.envelope;
    const privateKey = await crypto.subtle.importKey(
      "jwk", { ...env.destination_private_jwk, ext: true }, { name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"],
    );
    const transferKey = await openEnvelope(fixture.transfer_id, env.envelope_json, privateKey);
    const opened = await openSealed(transferKey, fixture.seals[0].aad, fromB64u(fixture.seals[0].sealed_b64u));
    assert.equal(new TextDecoder().decode(opened), fixture.seals[0].plaintext_utf8);
    const jwk = JSON.parse(new TextDecoder().decode(fromB64u(env.destination_public_param_k)));
    assert.equal(await linkVerificationCode(jwk), env.verification_code);
  });

  it("an envelope for another transfer does not open", async () => {
    const env = fixture.envelope;
    const privateKey = await crypto.subtle.importKey(
      "jwk", { ...env.destination_private_jwk, ext: true }, { name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"],
    );
    await assert.rejects(openEnvelope("another-transfer", env.envelope_json, privateKey));
  });
});
