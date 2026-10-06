export type MeSession = {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar_url: string;
  github_username: string;
  app_language: "en" | "bn";
  is_super_admin: boolean;
  accept_policy: boolean;
  policy_version: string;
  /**
   * Capability flag from the server: when false, messaging stays inside the
   * workspace and every personal-connection surface stays hidden.
   */
  independent_chat?: boolean;
  /**
   * Rollout switch for encrypted chat files (server 0168). A client READS an
   * encrypted file regardless and encrypts its own uploads only while this is
   * on — until then, somebody on an older app would get a file they cannot
   * open. Absent on a server that predates it, which means off.
   */
  encrypted_attachments?: boolean;
};

export type MeProfile = {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar_url: string;
  cover_url: string;
  provider: string;
  github_id: string;
  github_username: string;
  google_id: string;
  desktop_code?: string;
  github_privacy_mode: boolean;
  email_notifications_enabled: boolean;
  desktop_notifications_enabled: boolean;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
};

export type MePlan = {
  plan: "free" | "premium";
  is_premium: boolean;
  premium_until: string | null;
  premium_source: "solo" | "team" | "admin" | "";
  effective_plan: "free" | "premium";
  plan_expired: boolean;
  show_plan_expired_dialog: boolean;
};

export type MeConnections = {
  github_connected: boolean;
  slack_connected: boolean;
  slack_user_connected?: boolean;
  discord_connected: boolean;
  slack_workspace_id: string;
  slack_team_name: string;
};

/** Legacy combined user — use split endpoints when possible. */
export type AppUser = MeSession &
  MeProfile &
  MePlan &
  MeConnections;

export function mergeMeUser(
  session: MeSession,
  profile: MeProfile,
  plan: MePlan,
  connections: MeConnections,
): AppUser {
  return { ...session, ...profile, ...plan, ...connections };
}

const emptyConnections = (): MeConnections => ({
  github_connected: false,
  slack_connected: false,
  slack_user_connected: false,
  discord_connected: false,
  slack_workspace_id: "",
  slack_team_name: "",
});

export function profileFromSession(session: MeSession): MeProfile {
  const t = new Date(0).toISOString();
  return {
    id: session.id,
    name: session.name,
    username: session.username,
    email: session.email,
    avatar_url: session.avatar_url,
    cover_url: "",
    provider: "",
    github_id: "",
    github_username: session.github_username,
    google_id: "",
    desktop_code: "",
    github_privacy_mode: false,
    email_notifications_enabled: true,
    desktop_notifications_enabled: true,
    is_active: true,
    is_verified: true,
    created_at: t,
    updated_at: t,
  };
}

/** Shell / plan dialog — session + plan only. */
export function sessionPlanUser(session: MeSession, plan: MePlan): AppUser {
  return mergeMeUser(session, profileFromSession(session), plan, emptyConnections());
}

/** Rules / repos gate — session + connections. */
export function sessionConnectionsUser(
  session: MeSession,
  connections: MeConnections,
): AppUser {
  const freePlan: MePlan = {
    plan: "free",
    is_premium: false,
    premium_until: null,
    premium_source: "",
    effective_plan: "free",
    plan_expired: false,
    show_plan_expired_dialog: false,
  };
  return mergeMeUser(session, profileFromSession(session), freePlan, connections);
}
