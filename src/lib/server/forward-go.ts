import { applyAppKey, isEmailAuthPath } from "./email-auth-forward";
import { goApiOrigin } from "./go-origin";
import {
  clearSessionCookies,
  readAccessToken,
  readRefreshToken,
  refreshTokenFromGoSetCookie,
  writeSessionCookies,
} from "./session-cookies";

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
  "cookie",
  "content-length",
]);

type GoJson = {
  success?: boolean;
  status?: string;
  code?: string;
  access_token?: string;
  token?: string;
  refresh_token?: string;
  error?: string;
  [key: string]: unknown;
};

function goSetCookies(res: Response): string[] {
  const headers = res.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof headers.getSetCookie === "function") return headers.getSetCookie();
  const single = res.headers.get("set-cookie");
  return single ? [single] : [];
}

async function goFetch(
  pathWithQuery: string,
  init: RequestInit,
): Promise<Response> {
  return fetch(`${goApiOrigin()}/${pathWithQuery.replace(/^\//, "")}`, {
    ...init,
    redirect: "manual",
    cache: "no-store",
  });
}

async function applyGoSession(res: Response, json: GoJson | null) {
  const access = (json?.access_token || json?.token) as string | undefined;
  const refresh =
    (json?.refresh_token as string | undefined) ||
    refreshTokenFromGoSetCookie(goSetCookies(res)) ||
    undefined;
  if (access) await writeSessionCookies(access, refresh);
}

export async function refreshGoSession(): Promise<boolean> {
  const refresh = await readRefreshToken();
  if (!refresh) return false;
  const res = await goFetch("auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client: "web", refresh_token: refresh }),
  });
  const json = (await res.json().catch(() => null)) as GoJson | null;
  if (!res.ok || !json?.success) {
    await clearSessionCookies();
    return false;
  }
  await applyGoSession(res, json);
  return true;
}

async function exchangeGoCode(code: string): Promise<boolean> {
  const res = await goFetch("auth/exchange", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const json = (await res.json().catch(() => null)) as GoJson | null;
  if (!res.ok || !json?.success) return false;
  await applyGoSession(res, json);
  return true;
}

function outboundHeaders(
  req: Request,
  access: string | null,
  path: string,
): Headers {
  const headers = new Headers();
  req.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP.has(lower) || lower === "accept-encoding") return;
    headers.set(key, value);
  });
  headers.set("Accept", "application/json");
  if (access) headers.set("Authorization", `Bearer ${access}`);
  else headers.delete("Authorization");
  applyAppKey(headers, path);
  return headers;
}

function clientResponseHeaders(res: Response): Headers {
  const headers = new Headers();
  res.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP.has(lower) || lower === "set-cookie") return;
    headers.set(key, value);
  });
  return headers;
}

export async function forwardToGo(
  req: Request,
  path: string,
): Promise<Response> {
  const url = new URL(req.url);
  const pathWithQuery = `${path}${url.search}`;
  const access = await readAccessToken();
  const method = req.method.toUpperCase();
  const body =
    method === "GET" || method === "HEAD" ? undefined : await req.arrayBuffer();

  const send = (token: string | null) =>
    goFetch(pathWithQuery, {
      method,
      headers: outboundHeaders(req, token, path),
      body: body && body.byteLength > 0 ? body : undefined,
    });

  let res = await send(access);
  // A wrong email password is a 401 about the form, not the session.
  const retryable = path !== "auth/refresh" && path !== "auth/logout";
  if (res.status === 401 && retryable && !isEmailAuthPath(path)) {
    if (await refreshGoSession()) {
      res = await send(await readAccessToken());
    }
  }

  if (path === "auth/logout") {
    await clearSessionCookies();
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return new Response(res.body, {
      status: res.status,
      headers: clientResponseHeaders(res),
    });
  }

  const json = (await res.json().catch(() => null)) as GoJson | null;

  if (path === "auth/qr/poll" && json?.status === "approved" && json.code) {
    const ok = await exchangeGoCode(json.code);
    if (!ok) {
      return Response.json(
        { success: false, error: "QR login failed" },
        { status: 401 },
      );
    }
    return Response.json({ success: true, status: "approved" });
  }

  if (path === "auth/exchange" && json?.success) {
    await applyGoSession(res, json);
    return Response.json({ success: true });
  }

  // Email sign-in ends like a QR approval: tokens become httpOnly cookies.
  if (
    isEmailAuthPath(path) &&
    json?.success &&
    (json.access_token || json.token)
  ) {
    await applyGoSession(res, json);
    return Response.json({ success: true });
  }

  if (path === "auth/refresh" && json?.success) {
    await applyGoSession(res, json);
    return Response.json({ success: true });
  }

  // Do not copy Go's headers onto this rebuilt JSON. Fetch has already
  // decoded the upstream body, but Content-Encoding / Content-Type still
  // describe the wire bytes — live /backend/auth/qr/session was 200 with
  // a 0-byte body, so the QR UI showed "Failed to start QR login".
  return Response.json(json ?? { success: false, error: "api error" }, {
    status: res.status,
  });
}
