"use client";

import { useState } from "react";
import { Cancel01Icon, LaptopPhoneSyncIcon } from "hugeicons-react";
import { linkThisDevice, useLinkedDeviceStore } from "@/lib/linked-device/link";
import { useChatStore } from "@/store/chat-store";

/**
 * Shown when the server refused to link this browser (409
 * `linked_device_limit`, server 0174): the account already has its four
 * linked devices. Until one is signed out this browser keeps nothing, so
 * chats here show only what the server still holds — the user must know why.
 * Signing a device out happens on the phone, as WhatsApp does it.
 */
export function LinkedLimitBanner() {
  const status = useLinkedDeviceStore((s) => s.status);
  const limit = useLinkedDeviceStore((s) => s.limit);
  const devices = useLinkedDeviceStore((s) => s.devices);
  const userId = useChatStore((s) => s.currentUserId);
  const [hidden, setHidden] = useState(false);
  const [retrying, setRetrying] = useState(false);
  if (status !== "limit" || hidden) return null;

  const retry = async () => {
    if (!userId) return;
    setRetrying(true);
    await linkThisDevice(userId).catch(() => {});
    setRetrying(false);
  };

  return (
    <div className="fixed inset-x-4 top-4 z-50 mx-auto max-w-md rounded-2xl border border-[var(--sig-border)] bg-[var(--sig-surface-2)] p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--indigo)_12%,transparent)] text-[var(--indigo)]">
          <LaptopPhoneSyncIcon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--sig-label)]">
            This browser can&apos;t keep your chats
          </p>
          <p className="mt-1 text-[13px] leading-5 text-[var(--sig-label-2)]">
            You already have {limit || 4} linked devices. On your phone, open
            Settings → Linked devices, sign one out, then try again.
          </p>
          {devices.length > 0 ? (
            <ul className="mt-2 space-y-0.5 text-[12px] text-[var(--sig-label-2)]">
              {devices.map((d) => (
                <li key={d.device_id} className="truncate">
                  · {d.label}
                </li>
              ))}
            </ul>
          ) : null}
          <button
            type="button"
            onClick={retry}
            disabled={retrying}
            className="mt-3 rounded-full bg-[var(--indigo)] px-4 py-1.5 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {retrying ? "Trying…" : "Try again"}
          </button>
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => setHidden(true)}
          className="rounded-full p-1 text-[var(--sig-label-2)] hover:bg-[var(--sig-fill)]"
        >
          <Cancel01Icon size={16} />
        </button>
      </div>
    </div>
  );
}
