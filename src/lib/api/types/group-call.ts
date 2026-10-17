export type GroupCallStatus = "starting" | "live" | "ended";

export type GroupCall = {
  id: string;
  team_id: string;
  conversation_id: string;
  started_by: string;
  starter_name: string;
  starter_avatar_url?: string;
  conversation_name?: string;
  status: GroupCallStatus;
  max_participants: number;
  participant_count: number;
  peak_participant_count: number;
  screen_sharer_id?: string;
  screen_sharer_name?: string;
  started_at: string;
  provider_started_at?: string;
  ended_at?: string;
  end_reason?: string;
  /**
   * Whether this call rings the account reading it (server 0172): the starter
   * may ring only the people they picked. `false` = show it, stay quiet.
   * Absent = ring, as every call did before.
   */
  ring?: boolean;
  created_at: string;
  updated_at: string;
};

export type GroupCallStatusResponse = { call: GroupCall | null };

export type GroupCallCredentials = {
  server_url: string;
  participant_token: string;
};

export type GroupCallSession = {
  call: GroupCall;
  livekit: GroupCallCredentials;
};

export type GroupCallWsEvent = {
  type:
    | "group_call.started"
    | "group_call.updated"
    | "group_call.ended"
    | "group_call.screen_share_changed"
    // Sent only to the member who just joined, so their other signed-in
    // devices stop ringing an invite that has already been answered.
    | "group_call.self_joined";
  conversation_id?: string;
  group_call?: GroupCall;
};

