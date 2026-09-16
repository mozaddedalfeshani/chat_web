export type VoiceCallStatus =
  | "ringing"
  | "accepted"
  | "declined"
  | "cancelled"
  | "missed"
  | "ended"
  | "failed";

/**
 * "screen" is a share-only session — neither side opens a microphone.
 * "video" is the voice call with the camera opened before the first offer.
 */
export type VoiceCallMode = "audio" | "screen" | "video";

export type VoiceCall = {
  id: string;
  team_id: string;
  conversation_id: string;
  caller_id: string;
  callee_id: string;
  mode?: VoiceCallMode;
  status: VoiceCallStatus;
  caller_name: string;
  caller_avatar_url?: string;
  callee_name: string;
  callee_avatar_url?: string;
  expires_at: string;
  accepted_at?: string;
  ended_at?: string;
  /** First moment a callee device reported it is ringing. */
  callee_ringing_at?: string;
  ended_by?: string;
  end_reason?: string;
  created_at: string;
  updated_at: string;
};

export type VoiceIceServer = {
  urls: string[];
  username?: string;
  credential?: string;
};

export type VoiceCallSession = {
  call: VoiceCall;
  ice_servers?: VoiceIceServer[];
};

/**
 * `media` names the sender's MediaStream ids so the receiver can tell a camera
 * track from a shared screen — two video tracks are identical on the wire.
 * Empty string = that source is off. Sent ahead of any offer/answer that
 * touches video and on every camera on/off (which is a replaceTrack, not a
 * renegotiation).
 */
export type VoiceCallSignal = {
  kind: "offer" | "answer" | "ice" | "media" | "renegotiate" | "screen_takeover";
  sdp?: string;
  candidate?: string;
  sdp_mid?: string;
  sdp_mline_index?: number | null;
  camera_stream?: string;
  screen_stream?: string;
};

export type VoiceCallWsEvent = {
  type:
    | "call.incoming"
    | "call.accepted"
    | "call.declined"
    | "call.cancelled"
    | "call.ended"
    | "call.failed"
    | "call.missed"
    | "call.ringing"
    | "call.signal";
  call?: VoiceCall;
  call_id?: string;
  from_user_id?: string;
  signal?: VoiceCallSignal;
};
