import { apiFetch, jsonHeaders } from "../core";
import type { VoiceCallMode, VoiceCallSession } from "../types/voice-call";

export function startVoiceCall(conversationId: string, mode: VoiceCallMode = "audio") {
  return apiFetch<VoiceCallSession>(
    `/api/teams/chat/conversations/${conversationId}/calls`,
    { method: "POST", headers: jsonHeaders, body: JSON.stringify({ mode }) },
  );
}

export function getVoiceCall(callId: string) {
  return apiFetch<VoiceCallSession>(`/api/teams/chat/calls/${callId}`);
}

export function actOnVoiceCall(
  callId: string,
  action: "accept" | "decline" | "cancel" | "end" | "fail" | "heartbeat" | "ringing",
  reason?: string,
) {
  return apiFetch<VoiceCallSession>(`/api/teams/chat/calls/${callId}/actions`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ action, ...(reason ? { reason } : {}) }),
  });
}
