import { apiFetch, jsonHeaders } from "../core";
import type {
  GroupCallSession,
  GroupCallStatusResponse,
} from "../types/group-call";

export function getActiveGroupCall(conversationId: string) {
  return apiFetch<GroupCallStatusResponse>(
    `/api/chat/conversations/${conversationId}/group-call`,
  );
}

/**
 * `ring` is who a NEW call rings (server 0172): undefined = every member (the
 * old body), `[]` = nobody. Ignored when the call is already running.
 */
export function joinGroupCall(conversationId: string, ring?: string[]) {
  return apiFetch<GroupCallSession>(
    `/api/chat/conversations/${conversationId}/group-call/join`,
    ring === undefined
      ? { method: "POST" }
      : { method: "POST", headers: jsonHeaders, body: JSON.stringify({ ring }) },
  );
}

export function leaveGroupCall(callId: string) {
  return apiFetch<GroupCallStatusResponse>(
    `/api/chat/group-calls/${callId}/leave`,
    { method: "POST" },
  );
}

export function setGroupCallScreenShare(
  callId: string,
  action: "claim" | "release",
) {
  return apiFetch<GroupCallStatusResponse>(
    `/api/chat/group-calls/${callId}/screen-share`,
    {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ action }),
    },
  );
}
