import { API_BASE, jsonHeaders, persistStoredToken } from "./core";

/** A refusal the server explained: `code` to branch on, `message` to show. */
export class EmailAuthError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly retryAfter?: number,
  ) {
    super(message);
  }
}

export type EmailCodeSent = { maskedEmail: string; resendIn: number };

async function post(path: string, body: Record<string, string>) {
  const res = await fetch(`${API_BASE}/auth/email/${path}`, {
    method: "POST",
    headers: jsonHeaders,
    credentials: "include",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success) {
    throw new EmailAuthError(
      typeof data?.code === "string" ? data.code : "failed",
      data?.message || data?.error || "Something went wrong. Try again.",
      typeof data?.retry_after === "number" ? data.retry_after : undefined,
    );
  }
  return data;
}

async function requestCode(path: string, body: Record<string, string>) {
  const data = await post(path, body);
  return {
    maskedEmail: String(data.data?.email ?? body.email),
    resendIn: Number(data.data?.resend_in) || 60,
  } satisfies EmailCodeSent;
}

/**
 * The BFF turns the answer into httpOnly cookies and replies only
 * `{success: true}`; this marks the browser signed in, as a QR approval does.
 */
async function signInWith(path: string, body: Record<string, string>) {
  await post(path, { ...body, client: "web" });
  persistStoredToken();
}

export const emailSignUp = (name: string, email: string, password: string) =>
  requestCode("signup", { name, email, password });

export const emailVerifySignUp = (email: string, code: string) =>
  signInWith("verify", { email, code });

export const emailSignIn = (email: string, password: string) =>
  signInWith("login", { email, password });

export const emailRequestReset = (email: string) =>
  requestCode("reset", { email });

export const emailConfirmReset = (
  email: string,
  code: string,
  password: string,
) => signInWith("reset/confirm", { email, code, password });
