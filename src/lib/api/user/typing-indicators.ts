import { apiFetch, jsonHeaders } from "../core";

/** Off means this account neither sends nor sees typing indicators. */
export type TypingIndicatorsSetting = { enabled: boolean };

export function getTypingIndicators() {
  return apiFetch<TypingIndicatorsSetting>("/api/me/typing-indicators");
}

export function updateTypingIndicators(enabled: boolean) {
  return apiFetch<TypingIndicatorsSetting>("/api/me/typing-indicators", {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify({ enabled }),
  });
}
