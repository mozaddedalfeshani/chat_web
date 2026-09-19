/**
 * Rollout switch for the durable history and the phone import. Off by default:
 * with it off the chat reads server pages exactly as before, nothing is
 * written to the history database and no import is offered. Turn it on
 * (`NEXT_PUBLIC_HISTORY_IMPORT=1`) only once the server has migration 0151 and
 * the phone app with protocol v2 has passed real-device acceptance.
 */
export function historyEnabled(): boolean {
  return process.env.NEXT_PUBLIC_HISTORY_IMPORT === "1";
}
