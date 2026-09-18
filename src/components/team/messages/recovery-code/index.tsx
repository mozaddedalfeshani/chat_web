"use client";

import { FormEvent, useState } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMessageVaultStore } from "@/store/message-vault-store";
import VaultResetDialog from "../vault-reset";

/**
 * Unlocks this browser with the recovery code the owner saved.
 *
 * The code is turned into a key in this tab and never sent anywhere. What the
 * server stored is ciphertext it cannot open, so a correct code here restores
 * the same identity — and with it every message the account has ever received.
 * Rendered as one pane of `VaultUnlockScreen`, beside the phone scan.
 */
export default function RecoveryCodePanel() {
  const busy = useMessageVaultStore((s) => s.busy);
  const storeError = useMessageVaultStore((s) => s.error);
  const unlockWithCode = useMessageVaultStore((s) => s.unlockWithCode);
  const [code, setCode] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    try {
      await unlockWithCode(code);
      setCode("");
    } catch {
      // The store surfaces a safe user-facing error below.
    }
  }

  return (
    <section aria-labelledby="code-heading" className="flex flex-col">
      <div className="flex size-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
        <KeyRound className="size-5" />
      </div>
      <h2 id="code-heading" className="mt-3 text-base font-semibold text-[var(--text)]">
        Use your recovery code
      </h2>
      <p className="mt-1.5 text-sm leading-6 text-[var(--text-muted)]">
        The code you saved when you set up messages. It unlocks everything here,
        history included. Spacing and case do not matter.
      </p>

      <form className="mt-5 space-y-3" onSubmit={submit}>
        <textarea
          aria-label="Recovery code"
          className="h-28 w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 font-mono text-sm tracking-wider text-[var(--text)] outline-none focus:border-[var(--indigo)]"
          placeholder="A1B2-C3D4-…"
          spellCheck={false}
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
        {/* Only this form's own failure: the store error is shared with the
            QR pane, and a link failure must not read as a wrong code. */}
        {submitted && storeError ? (
          <p className="text-sm text-red-600">{storeError}</p>
        ) : null}
        <Button
          className="h-11 w-full"
          disabled={busy || !code.trim()}
          type="submit"
        >
          {busy ? "Unlocking…" : "Unlock messages"}
        </Button>
      </form>

      <div className="mt-6 border-t border-[var(--border)] pt-4">
        <p className="text-xs text-[var(--text-muted)]">
          Lost the code and have no other device?
        </p>
        <button
          className="mt-1 text-sm font-medium text-[var(--indigo)] hover:underline"
          type="button"
          onClick={() => setResetOpen(true)}
        >
          Start fresh on this device
        </button>
        <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
          Messaging works again after an emailed code. Messages you already have
          stay unreadable — nobody, including us, holds that key.
        </p>
      </div>
      {resetOpen ? <VaultResetDialog onOpenChange={setResetOpen} /> : null}
    </section>
  );
}
