/**
 * The Go API. Hardcoded, no env (user's call, 2026-10-18): there is one API,
 * and an unset `API_URL` on the host silently took realtime down.
 */
export const API_ORIGIN = "https://api.ababilx.com";

/**
 * The realtime socket goes STRAIGHT to the API. A rewrite on this app cannot
 * carry it — Vercel does not proxy WebSocket upgrades — so the old
 * `/backend/api/notifications/stream` failed on every page load, and with it
 * live history, calls and typing.
 */
export const API_WS_ORIGIN = API_ORIGIN.replace(/^http/, "ws");
