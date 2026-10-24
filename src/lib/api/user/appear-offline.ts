import { apiFetch, jsonHeaders } from "../core";

/**
 * Away (server `appear_offline`, 0186): on means nobody sees this account
 * online and it sees nobody online, WhatsApp's rule. Messages still arrive.
 */
export type AppearOfflineSetting = { enabled: boolean };

export function getAppearOffline() {
  return apiFetch<AppearOfflineSetting>("/api/me/appear-offline");
}

export function updateAppearOffline(enabled: boolean) {
  return apiFetch<AppearOfflineSetting>("/api/me/appear-offline", {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify({ enabled }),
  });
}
