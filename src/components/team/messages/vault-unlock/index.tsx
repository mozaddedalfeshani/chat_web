"use client";

import { ShieldCheck } from "lucide-react";
import DeviceLinkPanel from "../device-link";
import RecoveryCodePanel from "../recovery-code";

/**
 * How this browser gets the account's message key: both ways side by side.
 *
 * Recovery code on the left, phone scan on the right — the common case here is
 * the web across several machines, often with no phone to hand, so the code
 * must not hide behind a second screen. Below `lg` the panes stack with the
 * code first: a phone cannot scan its own screen.
 *
 * Both paths end with the same identity in this browser. Neither involves the
 * server holding anything it can open.
 */
export default function VaultUnlockScreen() {
  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center overflow-y-auto bg-[var(--bg)] px-4 py-8 lg:min-h-dvh">
      <div className="w-full max-w-4xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        <header className="flex flex-col items-center border-b border-[var(--border)] px-6 py-6 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
            <ShieldCheck className="size-6" />
          </div>
          <h1 className="mt-3 text-lg font-semibold text-[var(--text)]">
            Link this device
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Unlock your messages with your recovery code, or scan from your phone.
          </p>
        </header>

        <div className="grid lg:grid-cols-[1fr_auto_1fr]">
          <div className="p-6 sm:p-8">
            <RecoveryCodePanel />
          </div>
          <div
            aria-hidden
            className="flex items-center gap-3 px-6 lg:flex-col lg:px-0 lg:py-8"
          >
            <span className="h-px flex-1 bg-[var(--border)] lg:h-auto lg:w-px" />
            <span className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
              or
            </span>
            <span className="h-px flex-1 bg-[var(--border)] lg:h-auto lg:w-px" />
          </div>
          <div className="p-6 sm:p-8">
            <DeviceLinkPanel />
          </div>
        </div>

        <p className="flex items-center justify-center gap-2 border-t border-[var(--border)] px-6 py-4 text-center text-xs leading-5 text-[var(--text-muted)]">
          <ShieldCheck className="size-3.5 shrink-0" />
          AbabilX never holds your message key or your recovery code, so it
          cannot read what you send.
        </p>
      </div>
    </div>
  );
}
