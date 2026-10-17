"use client";

import { useEffect } from "react";
import { useDeliveryOnlyStore } from "@/lib/delivery-only/delivery-only-store";
import { subscribeAppWs } from "@/lib/notifications/ws-bus";
import { useMessageVaultStore } from "@/store/message-vault-store";
import { pullCustody, stopCustody } from "./custody";
import { linkThisDevice, resetLinkedDevice, useLinkedDeviceStore } from "./link";

/** New messages arriving live are taken in one pull a moment later. */
const EVENT_DEBOUNCE_MS = 2_000;
/** Backstop for anything no event announced. */
const INTERVAL_MS = 5 * 60_000;
/** A link that failed for a network reason is tried again. */
const RETRY_MS = 60_000;

const PULL_EVENTS = new Set([
  "chat.message.created",
  "chat.message.updated",
  "chat.private_op",
]);

/**
 * Mount once beside the chat realtime subscription. Once `/api/me` says the
 * server is delivery-only, links this browser (lib/linked-device/link.ts)
 * and, while linked, pulls custody: right away, when the message vault
 * opens, on every socket reconnect, when the tab is shown again, when the
 * network returns, after live messages, and every five minutes.
 */
export function useLinkedDevice(currentUserId: string | null | undefined) {
  const deliveryOnly = useDeliveryOnlyStore((s) => s.deliveryOnly);
  const status = useLinkedDeviceStore((s) => s.status);
  const deviceId = useLinkedDeviceStore((s) => s.deviceId);
  // Encrypted files need the message key: a pull before the vault opens
  // stores the texts and leaves those files pending, and this re-runs it.
  const unlocked = useMessageVaultStore((s) => s.state === "unlocked");

  useEffect(() => {
    if (!currentUserId || !deliveryOnly) return;
    let cancelled = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const attempt = () => {
      void linkThisDevice(currentUserId).catch(() => {
        if (!cancelled) retry = setTimeout(attempt, RETRY_MS);
      });
    };
    attempt();
    return () => {
      cancelled = true;
      if (retry) clearTimeout(retry);
      stopCustody();
      resetLinkedDevice();
    };
  }, [currentUserId, deliveryOnly]);

  useEffect(() => {
    if (!currentUserId || status !== "linked" || !deviceId) return;
    const run = { userId: currentUserId, deviceId };
    const pull = () => void pullCustody(run).catch(() => {});
    let debounce: ReturnType<typeof setTimeout> | undefined;
    const soon = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(pull, EVENT_DEBOUNCE_MS);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") pull();
    };
    pull();
    const unsubscribe = subscribeAppWs({
      onEvent: (raw) => {
        if (PULL_EVENTS.has((raw as { type?: string }).type ?? "")) soon();
      },
      onReconnect: pull,
    });
    const interval = setInterval(pull, INTERVAL_MS);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", pull);
    return () => {
      unsubscribe();
      clearInterval(interval);
      if (debounce) clearTimeout(debounce);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", pull);
    };
  }, [currentUserId, status, deviceId, unlocked]);
}
