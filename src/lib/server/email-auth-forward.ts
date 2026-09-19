/** The email sign-in routes the Go API guards with X-APP-KEY. */
export function isEmailAuthPath(path: string): boolean {
  return path.startsWith("auth/email/");
}

/**
 * Adds the app key on its way to Go, from server-only env — it never reaches
 * the browser. Whatever the browser sent under that name is dropped first, so
 * a caller can neither choose the key nor learn the real one from a reply.
 */
export function applyAppKey(headers: Headers, path: string): void {
  headers.delete("x-app-key");
  if (!isEmailAuthPath(path)) return;
  const key = process.env.ABABILX_APP_KEY?.trim();
  if (key) headers.set("X-APP-KEY", key);
}
