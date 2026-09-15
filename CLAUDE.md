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
- `src/components/auth/login-page/` — WhatsApp-Web-style QR login. Sign-in is phone QR only.
- `src/components/sidebar/app-mode-rail/` — left icon rail (Chats + theme + account). Chat-only: no Board/Wall.
- `src/components/user-shell/` — signed-in chrome + call/chat providers
- `src/components/team/messages/` — chat UI (desktop-style: rail | list | pane)

Three columns on desktop: icon rail, conversation list (`--sig-*` tokens, same header as `ababilxdesktopcode`), message pane. No Ababil-X-frontend floating compose bar or overview link — this app is chat-only.

Message timeline uses the desktop bubble system (`chat-timeline/chat-bubble/`): one neutral `--sig-bubble` fill for both sides, grouped corners, hover toolbar, quoted replies, server-side link previews (`GET /api/link-preview`), and a Signal-style media lightbox.

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

This app is a signed-in chat client. Crawlers may index only `/` (QR login).
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
