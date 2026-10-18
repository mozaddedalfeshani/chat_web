/**
 * Whether this browser keeps the durable history (IndexedDB) and offers the
 * phone import. Always: every server since 0173 is delivery-only, so a browser
 * that kept no copy would lose its chats on reload, and a linked browser
 * (server 0174) reads its timeline from here. Hardcoded, no env switch
 * (user's call, 2026-10-18).
 */
export function historyEnabled(): boolean {
  return true;
}

/** historyEnabled for render. */
export function useHistoryEnabled(): boolean {
  return true;
}
