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

export function joinGroupCall(conversationId: string) {
  return apiFetch<GroupCallSession>(
    `/api/chat/conversations/${conversationId}/group-call/join`,
    { method: "POST" },
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
