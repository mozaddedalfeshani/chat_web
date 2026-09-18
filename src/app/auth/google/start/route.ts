import { goApiOrigin } from "@/lib/server/go-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Hands the browser off to the Go API's Google OAuth start.
 *
 * This is a redirect rather than a `/backend` proxy hop on purpose. The Go
 * handler sets an httpOnly `oauth_state` cookie and re-checks it when Google
 * redirects back; proxied, that cookie would be set on a fetch this server
 * made and never reach the browser, so the CSRF check would silently do
 * nothing. A real navigation puts the cookie on the API's own origin, where
 * Google's top-level redirect back sends it again (SameSite=Lax).
 *
 * `client=chat` is what makes the one-time code come back HERE rather than to
 * the workspace web app, which is the other front end this API serves.
 */
export function GET(req: Request) {
  let origin: string;
  try {
    origin = goApiOrigin();
  } catch {
    return Response.redirect(new URL("/?error=auth_unavailable", req.url), 307);
  }
  return new Response(null, {
    status: 307,
    headers: {
      Location: `${origin}/auth/google?client=chat`,
      "Cache-Control": "no-store",
    },
  });
}
