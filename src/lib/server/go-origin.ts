import { API_ORIGIN } from "@/lib/api-origin";

/** Origin of the Go API, for the server-side proxy (`/backend`). */
export function goApiOrigin(): string {
  return API_ORIGIN;
}
