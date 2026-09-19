// Maps backend error codes to user-facing copy. Backend returns short codes
// (e.g. "storage_limit_exceeded") which surface as ApiError.message via apiFetch.

import { ApiError } from "./core";

const ERROR_MESSAGES: Record<string, string> = {
  member_limit_exceeded: "This team has reached the 30-member limit.",
  recipient_left_team:
    "This user has left the team. You cannot send messages to them.",
  trx_exists: "This transaction ID has already been used.",
  request_pending:
    "You already have a payment under review. Please wait for the result.",
  resubmit_required:
    "Your payment is on hold — edit and resubmit it instead of starting a new one.",
  not_on_hold: "This request can't be edited right now.",
  "not in a team": "Join or create a team first.",
  crm_payment_incomplete:
    "Collect the full payment before marking this lead as won.",
  crm_lost_has_payments:
    "Refund the collected payment before marking this lead as lost.",
  crm_payment_exceeds_balance:
    "The payment amount cannot be greater than the outstanding balance.",
  crm_refund_exceeds_paid:
    "The refund amount cannot be greater than the amount collected.",
  crm_closed_lead_payment_locked:
    "Reopen this lead before changing its payment records.",
  phone_needs_country_code:
    "Add the country code to search by phone, e.g. +8801712345678. Numbers are stored with their country code, so a local number matches nobody.",
  member_needs_secure_messages:
    "This chat is encrypted, and that person has not set up secure messages yet. Ask them to open AbabilX once, then add them.",
  request_rejected_cooldown: "Try again later",
  request_already_pending: "Request already sent",
  secure_message_required:
    "This chat is end-to-end encrypted. Update AbabilX to send here.",
  files_locked:
    "Uploads are paused — this workspace passed the Free plan file limit, so its files are locked. Upgrade to unlock them and start uploading again.",
};

/** Formats a byte count as a human GB/MB string, e.g. 2684354560 -> "2.5 GB". */
function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${Number(gb.toFixed(1))} GB`;
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

/**
 * Builds copy for errors whose message needs a value from the response body
 * (board_limit_exceeded carries `limit`, storage_limit_exceeded carries
 * `limit_bytes`) so this text never drifts from the backend's plan constants.
 */
function dynamicMessage(e: unknown): string | undefined {
  if (!(e instanceof ApiError)) return undefined;
  if (e.message === "board_limit_exceeded") {
    const limit = e.data.limit;
    return typeof limit === "number"
      ? `Board limit reached. Your team's plan allows up to ${limit} board${limit === 1 ? "" : "s"}. Upgrade to Premium for a higher limit or delete an existing board first.`
      : "Board limit reached. Delete an existing board or upgrade to Premium for a higher limit.";
  }
  if (e.message === "storage_limit_exceeded") {
    const limitBytes = e.data.limit_bytes;
    return typeof limitBytes === "number"
      ? `Storage limit reached (${formatBytes(limitBytes)} on your team's plan). Upgrade to Premium for more team storage.`
      : "Storage limit reached. Upgrade to Premium for more team storage.";
  }
  return undefined;
}

/** Returns friendly copy for a known backend error, else the fallback. */
export function friendlyError(e: unknown, fallback: string): string {
  const dynamic = dynamicMessage(e);
  if (dynamic) return dynamic;
  const code = e instanceof Error ? e.message : "";
  return ERROR_MESSAGES[code] ?? (code || fallback);
}
