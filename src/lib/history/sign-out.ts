import { logout } from "@/lib/api/core";
import { deleteAccountHistory } from "./repo/wipe";

/**
 * The user pressed "Log out". This is the one path that deletes the account's
 * local history — messages, imported media, transfer staging and the local
 * key — because the user asked to leave this browser.
 *
 * `logout()` alone is also what a forced 401 calls; that must NOT reach here,
 * or an expired session would silently throw away an archive imported from a
 * phone the user may no longer have.
 */
export async function logOutAndForgetHistory(userId: string | undefined) {
  if (userId) {
    try {
      await deleteAccountHistory(userId);
    } catch {
      // A delete blocked by another tab finishes when that tab lets go; the
      // sign-out itself must never wait on it.
    }
  }
  logout();
}
