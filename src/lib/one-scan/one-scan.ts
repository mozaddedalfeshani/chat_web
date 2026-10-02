import { getMeSession } from "@/lib/api/user/me";
import type { ChatE2EEIdentityEnvelope } from "@/lib/api/types/chat-e2ee";
import { createLinkOffer, type LinkOffer } from "@/lib/chat-e2ee/device-link";
import { adoptLinkedIdentity } from "@/lib/chat-e2ee/vault-link";
import { historyEnabled } from "@/lib/history/flag";
import { startImport, type DestinationKeys } from "@/lib/history/transfer/importer-start";
import { newDestinationKeys } from "@/lib/history/transfer/v2-crypto";

/**
 * One scan does what three QR codes used to: sign in, hand over the message
 * key, start the history transfer.
 *
 * The sign-in QR also carries this tab's ephemeral public keys — `k` for the
 * message identity (the device-link key) and `h` for history (the transfer
 * key). The phone reads both off the CAMERA, exactly as it read them from the
 * separate codes, so the server still relays ciphertext for keys it never
 * supplied. The private halves stay in this tab; the history one is stored
 * with the import job, as it always was.
 */
export type OneScanOffer = {
  link: LinkOffer;
  history: DestinationKeys | null;
};

export async function createOneScanOffer(): Promise<OneScanOffer> {
  const [link, history] = await Promise.all([
    createLinkOffer(),
    historyEnabled() ? newDestinationKeys() : Promise.resolve(null),
  ]);
  return { link, history };
}

/** The sign-in payload with both keys appended. */
export function oneScanPayload(signInPayload: string, offer: OneScanOffer) {
  const history = offer.history ? `&h=${offer.history.param}&hv=2` : "";
  return `${signInPayload}&k=${offer.link.publicKeyParam}${history}`;
}

/**
 * Runs once the session cookie exists, before leaving the login page (the
 * link key lives only in this tab's memory). Neither half may block the
 * sign-in: a failed adoption falls back to the ordinary unlock screen, a
 * failed history start to the ordinary import prompt.
 */
export async function finishOneScan(
  offer: OneScanOffer,
  loginToken: string,
  envelope: ChatE2EEIdentityEnvelope | undefined,
) {
  if (envelope) {
    await adoptLinkedIdentity(envelope, offer.link.privateKey).catch((error) =>
      console.warn("[one-scan] message key not adopted", error),
    );
  }
  if (!offer.history) return;
  try {
    const me = await getMeSession();
    await startImport(me.id, { keys: offer.history, loginToken });
  } catch (error) {
    console.warn("[one-scan] history transfer not started", error);
  }
}
