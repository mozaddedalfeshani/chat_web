"use client";

import { IncognitoIcon, SmartPhone01Icon } from "hugeicons-react";

/**
 * What a private DM (0160 quiet mode) shows in place of its timeline and
 * composer. Its messages leave the server once both phones have them and the
 * browser keeps no archive, so a timeline here would be a few seconds of the
 * newest messages and then holes — worse than saying plainly where they are.
 */
export function PrivateChatNotice({ peerName }: { peerName?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--indigo)_12%,transparent)] text-[var(--indigo)]">
        <IncognitoIcon size={30} />
      </div>
      <h3 className="mt-5 text-lg font-semibold tracking-tight text-[var(--sig-label)]">
        Private chat is on
      </h3>
      <p className="mt-2 max-w-sm text-center text-sm leading-6 text-[var(--sig-label-2)]">
        {peerName ? `Messages with ${peerName}` : "Messages in this chat"} are kept
        only on your phones, not on our servers, so they can&apos;t be shown here.
      </p>
      <OpenTheAppPill />
    </div>
  );
}

/**
 * Where a held chat's history ends in this browser (delivery-only, 0173).
 * `empty`: nothing is left on the server at all, which would otherwise read
 * "No messages yet" over a conversation with months of history on the phone.
 */
export function HeldHistoryNotice({ empty = false }: { empty?: boolean }) {
  if (empty) {
    return (
      <div className="flex flex-col items-center px-6 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--indigo)_12%,transparent)] text-[var(--indigo)]">
          <SmartPhone01Icon size={24} />
        </div>
        <p className="mt-4 text-sm font-semibold text-[var(--sig-label)]">
          This chat&apos;s messages are on your phone
        </p>
        <p className="mt-1 max-w-sm text-[13px] leading-5 text-[var(--sig-label-2)]">
          Our servers delete each message once your phones have it, and this
          browser keeps no copy. New messages still show up here as they arrive.
        </p>
        <OpenTheAppPill />
      </div>
    );
  }
  return (
    <div className="flex justify-center px-4 pt-2 pb-3">
      <div className="inline-flex max-w-md items-start gap-2 rounded-xl bg-[var(--sig-fill-strong)] px-3 py-2 text-[12px] leading-5 text-[var(--sig-label-2)]">
        <SmartPhone01Icon size={14} className="mt-0.5 shrink-0 text-[var(--indigo)]" />
        <span>
          Older messages are kept only on your phone. Open the AbabilX app to
          read them.
        </span>
      </div>
    </div>
  );
}

function OpenTheAppPill() {
  return (
    <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[var(--sig-border)] bg-[var(--sig-surface-2)] px-4 py-2 text-sm font-medium text-[var(--sig-label)] shadow-sm">
      <SmartPhone01Icon size={16} className="text-[var(--indigo)]" />
      Open the AbabilX app to see the latest
    </div>
  );
}

/** The DM header's status line and the chat list's preview, in a private chat. */
export function PrivateChatLabel({ className = "text-[11px]" }: { className?: string }) {
  return (
    <span
      className={`inline-flex min-w-0 items-center gap-1 whitespace-nowrap font-medium text-[var(--sig-label-2)] ${className}`}
    >
      <IncognitoIcon size={12} className="shrink-0" />
      <span className="truncate">Private chat</span>
    </span>
  );
}
