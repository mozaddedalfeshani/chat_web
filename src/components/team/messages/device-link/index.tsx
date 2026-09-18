"use client";

import { useCallback } from "react";
import Image from "next/image";
import { Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMessageVaultStore } from "@/store/message-vault-store";
import { useDeviceLink } from "./use-device-link";
import LinkStatusNote from "./link-status-note";

/**
 * Scan from a phone that already holds the message key.
 *
 * Nothing has to be typed: the key is sealed against a public key read off
 * this screen with a camera, so the server only ever relays ciphertext it
 * cannot open. Rendered as one pane of `VaultUnlockScreen`, beside the
 * recovery code.
 */
export default function DeviceLinkPanel() {
  const check = useMessageVaultStore((s) => s.check);
  const storeError = useMessageVaultStore((s) => s.error);
  const onLinked = useCallback(() => void check(), [check]);
  const link = useDeviceLink(true, onLinked);
  const dead =
    link.status === "expired" ||
    link.status === "denied" ||
    link.status === "error";

  return (
    <section aria-labelledby="link-heading" className="flex flex-col items-center text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
        <Smartphone className="size-5" />
      </div>
      <h2 id="link-heading" className="mt-3 text-base font-semibold text-[var(--text)]">
        Scan from your phone
      </h2>
      <p className="mt-1.5 max-w-xs text-sm leading-6 text-[var(--text-muted)]">
        On a phone where your messages already work, open{" "}
        <span className="text-[var(--text)]">
          Settings → Link a device to your messages
        </span>{" "}
        and scan this code.
      </p>

      <div className="mt-5 flex size-[232px] items-center justify-center rounded-xl bg-white p-3">
        {link.imageUrl && !dead ? (
          <Image
            alt="Device linking code"
            className="size-52"
            height={208}
            src={link.imageUrl}
            unoptimized
            width={208}
          />
        ) : null}
      </div>

      {link.verificationCode && !dead ? (
        <div className="mt-4">
          <p className="text-xs text-[var(--text-muted)]">
            Check this matches on both screens
          </p>
          <p className="mt-1 font-mono text-2xl tracking-[0.3em] text-[var(--text)]">
            {link.verificationCode}
          </p>
        </div>
      ) : null}

      <LinkStatusNote error={link.error || storeError} status={link.status} />

      {dead || storeError ? (
        <Button
          className="mt-4 h-10 w-full max-w-xs"
          type="button"
          onClick={() => {
            if (storeError) void check();
            else link.restart();
          }}
        >
          {storeError ? "Try again" : "Show a new code"}
        </Button>
      ) : null}
    </section>
  );
}
