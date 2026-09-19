# AbabilX Chat (web)

Open-source Next.js client for AbabilX messaging: personal + workspace chat, E2EE, 1:1 and group calls.

**This is the home of web chat.** From 2026-09-09, every chat-related change on
the web is made here — messages and conversations, composer and timeline, E2EE
and the vault screens, calls, connections/People, chat settings. Not in
`../../Ababil-X-frontend/`, which still carries a pre-split **copy** of
`src/components/team/messages/` that nothing keeps in sync: the two are separate
trees, not a shared package, so a change made there never arrives here and a
change made here never arrives there. If a chat fix appears to be missing, check
which tree it landed in before rewriting it.

Everything that is not chat — repositories, standup rules, auto-commit, weekly
digest, PR review, CRM, admin, workspace pages — stays in `Ababil-X-frontend/`.

The monorepo's product overview, the full API endpoint list, the DB table map
and the long-form chat design notes (E2EE, retention, Note to Self, message
requests) live in the root `../../CLAUDE.md`. Read that before changing chat
behaviour; this file is only what it does not say.

**Check**: `bunx tsc --noEmit`. `bunx eslint src/components/team/messages`
reports two pre-existing ref-during-render errors in
`chat-timeline/use-timeline-scroll.ts` — they predate the split and are present
in both trees, so a clean eslint run is not the bar.

## Layout

- `src/app/**/page.tsx` — Server Components only. They compose feature folders.
- `src/components/auth/login-page/` — WhatsApp-Web-style login: phone QR, or Google (see below).
- `src/components/sidebar/app-mode-rail/` — left icon rail (Chats + theme + account). Chat-only: no Board/Wall.
- `src/components/user-shell/` — signed-in chrome + call/chat providers
- `src/components/team/messages/` — chat UI (desktop-style: rail | list | pane)

Three columns on desktop: icon rail, conversation list (`--sig-*` tokens, same header as `ababilxdesktopcode`), message pane. No Ababil-X-frontend floating compose bar or overview link — this app is chat-only.

Message timeline uses the desktop bubble system (`chat-timeline/chat-bubble/`): one neutral `--sig-bubble` fill for both sides, grouped corners, hover toolbar, quoted replies, server-side link previews (`GET /api/link-preview`), and a Signal-style media lightbox.

## Chat wallpaper

Device-local (`localStorage`), same keys/JSON as mobile and desktop. The bundled
`mobile` preset swaps `/wallpapers/webs_light.jpg` and `webs_dark.jpg` with
theme. `shipDefaultIfFreshInstall` (from the signed-in shell) writes that preset
only on a brand-new browser profile; upgrades and an explicit "None" stay plain.
Picker: DM profile / actions sheet, group details → Chat color & wallpaper.

A picture or video (caption or not) fills the bubble: width
`min(32rem, 100vw - chrome)`, height follows the file, `max-height` is
`min(70dvh, 420px)` — a ceiling, not a size to fill. Time + ticks sit on the
image (bottom-right, no scrim). Quotes keep the text-bubble path.

## Sign-in: phone QR, Google, or email

Three ways in, all ending in the same place — httpOnly cookies set by the BFF.
No token ever reaches JS.

```
QR      phone approves  -> /backend/auth/qr/poll -> BFF exchanges the code
Google  /auth/google/start -> {API}/auth/google?client=chat -> Google
        -> {API}/auth/google/callback -> here /auth/google/callback?code=
        -> /backend/auth/exchange
```

- **`/auth/google/start` is a redirect, not a `/backend` proxy hop, and that is
  the whole point.** The Go handler sets an httpOnly `oauth_state` cookie and
  re-checks it when Google comes back. Proxied, that cookie would be set on a
  fetch this server made and never reach the browser, so the CSRF check would
  pass on an empty cookie and silently protect nothing. A real navigation puts
  it on the API's own origin, which Google's top-level redirect sends it back
  to (SameSite=Lax). Redirecting from a route handler also keeps the API origin
  out of the browser bundle, like every other call here.
- **`client=chat` is what makes the code come back to this app.** The API serves
  two web front ends; its `FRONTEND_URL` is the workspace one. The hint travels
  as a `c.` state prefix (authoritative — it round-tripped through Google) plus
  an `oauth_client` cookie as backup, and the server resolves it to
  `CHAT_FRONTEND_URL`. See `ababilx-server/handlers/auth/oauth_client.go`.
- **Server env**: set `CHAT_FRONTEND_URL` on the Go API (falls back to
  `FRONTEND_URL`). Google Cloud needs no new redirect URI — the registered one
  is still `{API}/auth/google/callback`.
- **Email + password** (`login-page/email/`, `lib/api/email-auth.ts`) posts to
  `/backend/auth/email/*`. The BFF adds `X-APP-KEY` from server-only
  `ABABILX_APP_KEY` (`lib/server/email-auth-forward.ts`, never
  `NEXT_PUBLIC_`), skips the 401 refresh retry there (a wrong password is not
  an expired session), and turns a successful answer into the httpOnly
  cookies like a QR approval. `lib/api/app-key.ts` is an older, unused
  browser-side helper with a different header name — do not wire it up.
- A failed hop lands back on `/` as `?error=`, rendered by
  `login-error-notice.tsx`. Never fail silently: a dead button reads as a bug.

## Sidebar search is chats, then messages

`chat-sidebar/conversation-search.ts`. Same order as Signal-Android and
`ababilx-mobile`: name-matched threads first, keyword hits in bodies below. A
conversation can appear in both.

## Vault gate prefers unlock over a dead-end error

`message-vault-gate.tsx` / `message-vault-store.check`. If probing the vault
fails, this browser still has no key — so the gate opens the phone-QR /
recovery unlock screen instead of an "api error · Try again" page that never
offered a way to get one. Session is waited on before the probe so a cold
chat open does not race an unfinished sign-in.

## Run

```bash
cp .env.example .env.local
bun install
bun run dev
```

Set `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SITE_URL` in `.env.local`.

## Search Console / SEO gate

This app is a signed-in chat client. Crawlers may index only `/` (the login page).
`src/app/sitemap.ts` lists that one URL; `src/app/robots.ts` disallows
`/user/`, `/auth/`, `/api/`, `/hooks/`, `/backend/`. Signed-in and callback
layouts also send `noindex`.

The public landing is the **brand gate** for queries like `AbabilX`,
`AbabilX Chat`, `chat AbabilX`: brand-first `<title>` / H1, keyword + OG /
Twitter metadata in `src/app/layout.tsx`, JSON-LD (`Organization` /
`WebSite` / `SoftwareApplication`) via `src/components/seo/home-json-ld.tsx`,
and `src/app/opengraph-image.tsx`. Constants live in `src/lib/site.ts`.
Do not keyword-stuff hidden text; keep copy visible and honest.

After deploy, submit `https://chat.ababilx.com/sitemap.xml` in Search
Console. Optional HTML-tag verify: `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`.
Canonical production origin: `https://chat.ababilx.com`.

## Durable history and phone import (behind `NEXT_PUBLIC_HISTORY_IMPORT=1`)

Off by default; off means the chat behaves exactly as before. Contract:
`ababilx-server/docs/history-transfer-v2-protocol.md` (fixtures copied into
`src/lib/history/fixtures/`, pinned by the `*.test.mjs` beside the code — run
`bun test src`).

```
server page / WS event -> merge (lib/history/merge.ts) -> IndexedDB -> read back -> decrypt -> feed
phone batch            -> stage invisible -> validate -> ONE activating write -> visible
```

- **One database per account**, `ababilx-history:<userId>`, payloads AES-GCM
  under a non-extractable key kept in the same database. Writes resolve on
  transaction `complete`. Messages are stored as they arrived (E2EE bodies stay
  ciphertext) and decrypted on read.
- **The feed reads through the store** (`store/chat-feed-history.ts`): a server
  page is merged, never swapped in. While the server has older pages, a local
  read stops at the oldest server row seen, so imported rows never paper over a
  stretch the server has not been asked for yet.
- **One merge function** for pages, WS events, background sync and imports —
  the section 7 table. Retention sets `deleted_at` too; only `content_purged`
  tells a 180-day placeholder from a deletion, and only a deletion wins.
- **Background sync** (`lib/history/sync/server-sync.ts`): two conversations at
  a time, durable cursors, no receipts at all. The import prompt appears once
  the first pass settles, an empty server included.
- **Imported conversations the server no longer lists stay readable** as
  `local_only` rows with the composer closed (`lock_reason: "local_only"`).
- **Media**: `useLocalAsset` is the one choke point; imported files are served
  by `public/history-media-sw.js` from sealed 1 MiB pieces with Range, so video
  seeks. No worker → blob for files ≤ 64 MiB, the CDN URL otherwise.
- **Import** (`lib/history/transfer/`): Web Locks pick the one tab that runs it;
  the journal (`jobs.ts`) is what a reload resumes from; acks follow durable
  staging, commits follow activation, and the job completes only when the seal
  names the batch received last.
- **Explicit logout** (`lib/history/sign-out.ts`, the rail menu) deletes the
  account's history database. A forced 401 does not. A different account
  signing in deletes every other account's history database.
- Not verified in a real browser here (no browser automation in this repo):
  quota/eviction, reload mid-batch, SW Range seeking, two tabs. Those are the
  manual acceptance steps before turning the flag on.
