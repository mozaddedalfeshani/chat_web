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
- `src/components/auth/login-page/` — WhatsApp-Web-style login: phone QR only (see below). The home page is sign-in only, with a Docs link; feature explanations do NOT go here.
- `src/app/docs/` + `src/components/docs/` — public docs (shadcn-docs layout: header, grouped sidebar, Copy page, prev/next, On this page). Every page is data in `src/lib/docs/pages/*.ts`; sidebar order = `DOC_GROUPS` in `src/lib/docs/index.ts` = prev/next order. Follows the app theme (dark default). Mark phone-only features `androidOnly` and keep copy true to what ships. This is where the chat product is explained; `ababilx_main` (ababilx.com) is the company page and only links here.
  AI + SEO come from the same data, nothing to keep in sync by hand: `/llms.txt`, `/llms-full.txt`, `/docs/<slug>.md` (rewritten to `app/docs-md/`), TechArticle JSON-LD, `text/markdown` alternate link, sitemap `lastModified` from `page.updated`. Set `keywords` + `updated` on a page when it changes (or in `lib/docs/page-seo.ts` for pages that do not set their own). Header search (`docs-search.tsx`, ⌘K or `/`) is client-side over `lib/docs/search.ts`, built from the same pages — every block type must be handled in `blockText`. The flock webhook pages (`pages/developers/`) and `/openapi/flock-webhook.json` (`lib/docs/openapi/`) mirror `ababilx-server` `handlers/chat/webhooks/chat_webhook_receive_handler.go` — change a limit or error string there, change it here.
- `src/components/sidebar/app-mode-rail/` — left icon rail (Chats + theme + account). Chat-only: no Board/Wall.
- `src/components/user-shell/` — signed-in chrome + call/chat providers
- `src/components/team/messages/` — chat UI (desktop-style: rail | list | pane)

Three columns on desktop: icon rail, conversation list (`--sig-*` tokens, same header as `ababilxdesktopcode`), message pane. No Ababil-X-frontend floating compose bar or overview link — this app is chat-only.

Message timeline uses the desktop bubble system (`chat-timeline/chat-bubble/`): one neutral `--sig-bubble` fill for both sides, grouped corners, hover toolbar, quoted replies, server-side link previews (`GET /api/link-preview`), and a Signal-style media lightbox.

## Chat wallpaper

Device-local (`localStorage`), same keys/JSON as mobile and desktop. The bundled
`mobile` preset swaps `/wallpapers/webs_light.jpg` and `webs_dark.jpg` with
theme. **The pane is plain by default** (user's call, 2026-10-18): nothing is
written for a new browser, and `retireShippedDefault` (signed-in shell) removes
the doodle pair once from browsers the old `shipDefaultIfFreshInstall` gave it
to. Picking a wallpaper still works.
Picker: DM profile / actions sheet, group details → Chat color & wallpaper.

A picture or video (caption or not) fills the bubble: width
`min(32rem, 100vw - chrome)`, height follows the file, `max-height` is
`min(70dvh, 420px)` — a ceiling, not a size to fill. Time + ticks sit on the
image (bottom-right, no scrim). Quotes keep the text-bubble path.

## Sign-in: phone QR only

User's call, 2026-10-18: the web signs in by a scan from a signed-in phone
and nothing else. Google (`/auth/google/*`) and email + password
(`login-page/email/`, `lib/api/email-auth.ts`, the BFF's `X-APP-KEY`
injection) were removed. A scan is the only sign-in that also carries the
message key and the chats; the others opened an account with every chat
unreadable.

```
QR  phone approves -> /backend/auth/qr/poll -> BFF exchanges the code -> httpOnly cookies
```

- No token ever reaches JS. The BFF drops any `x-app-key` a browser sends.
- The server still serves `/auth/google` and `/auth/email/*` for the phone and
  the desktop app; without the key the email routes answer 503 here.
- A failed hop lands back on `/` as `?error=` (`login-error-notice.tsx`).

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

This app is a signed-in chat client. Crawlers may index only `/` (the login page)
and `/docs/*`. `src/app/sitemap.ts` lists those; `src/app/robots.ts` disallows
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

## Durable history and phone import (on with `delivery_only`)

On whenever `/api/me` says `delivery_only` (every server since 0173), or
with `NEXT_PUBLIC_HISTORY_IMPORT=1`; `historyEnabled()` for code paths,
`useHistoryEnabled()` for render (it re-renders when `/api/me` lands). The
one-scan QR always carries the history key `h`. Contract:
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

## Markdown in messages (2026-09-21)

Bots, webhook feeds and pastes from an AI assistant send markdown as literal
text. `board/tiptap/markdown-source.ts` (`markdownSourceOf`) decides whether a
body is markdown; if so it goes through the editor's own GFM pipeline
(`markdownToTiptapJson`, `@tiptap/markdown`) and renders as a TipTap doc, so a
table or code block looks exactly like one typed with the toolbar.

- **Only plain TipTap qualifies** (unmarked paragraphs + hard breaks, or legacy
  plain text) and **only when it looks like markdown**. Real marks, lists and
  mentions keep the normal renderer; ordinary chat is untouched.
- **Byte-for-byte the mobile rule** (`ababilx-mobile/lib/features/messages/
  markdown/message_markdown_source.dart`, rendered there with `gpt_markdown`).
  Change both, or a message is formatted on one device and raw on the other.
  The test beside it carries the same cases as the Dart test.
- `keepLineBreaks` turns each single newline into a markdown hard break —
  marked would fold it into a space, and the phone keeps it.
- Opt-in: `TiptapViewer markdown`, `CommentMessage markdown`,
  `CommentThreadPanel markdown` — the chat bubble, chat thread and timeline
  rows. Webhook rows use `MarkdownBody` directly. Boards are unchanged.
- Links are TipTap's Link mark, whose `isAllowedUri` already refuses
  `javascript:` and friends.
- `Ababil-X-frontend` carries the same files (it has no chat-bubble dir; its
  timeline is `CommentMessage`).

## Delivery-only chat — interim (2026-10-18)

Server 0173 deletes a personal message once every member's phones have it,
and this app keeps no copy. `src/lib/delivery-only/` is the stopgap until a
local store exists (contract: `../../DELIVERY_ONLY.md`, phase 5). Desktop
carries the same files.

- `/api/me` `delivery_only` → held chats (every DM / group, not a feed) draw
  `HeldHistoryNotice` where loaded history ends, and in place of "No messages
  yet". A quiet private-chat DM draws `PrivateChatNotice` and is neither
  loaded nor marked read (that would clear the phone's badge).
- `last_message_private` → `keepPrivatePreviews` (store `fetchSidebar`), and
  `keepsUnreadOnOpen`: opening such a chat does not mark it read (the newest
  message is on the phone only); a live message while open clears it.
- `meta.private_quote_id` → `usePrivateQuote` (bubble body), same
  conversation's main feed only.
- `chat.private_op` → `applyPrivateOp`, re-dispatched as the ordinary
  realtime event; authorship rule in `private-op.ts` matches the phone's.
- Group call ring list (0172): Meet on a group with no running call opens
  `components/user/group-call/ring/start-call-ring-dialog.tsx` first.

## Linked device (2026-10-18, server 0174)

This browser is a WhatsApp-style linked device: the server holds each
message until it is in this browser's durable store too (user's choices,
`../../ababilx-server/docs/linked-devices-plan.md`). `src/lib/linked-device/`:

```
link.ts        POST /api/messaging/devices {keeps_archive:true}
               -> linked (archive_at) | limit (409, devices) | off
custody.ts     GET /api/chat/private/pending -> store (sealed) -> files
               -> POST /api/chat/private/custody; messages before ops
media.ts       every file on arrival, into the history file store; an
               encrypted file decrypted first (the reader treats a stored
               copy as the file, as for an import)
ops.ts         edit / reaction / delete on the stored row (privateOpEffect)
use-linked-device.ts  link once delivery_only; pull on link, vault unlock,
               reconnect, visible, online, live message events, every 5 min
```

- **Never custody for what is not on disk**: a failed store write or
  download, a timed photo (URL withheld) and an encrypted file whose key has
  not opened yet (locked vault looks the same) all stay pending.
- **Linked = an ordinary chat**: `useDeliveryOnlyStore.linked` turns off the
  interim guards (`usePhoneOnlyChat`, `keepsUnreadOnOpen`,
  `isPrivateChatId`), so private chats load, read-ack and claim focus here.
- Limit: `components/team/messages/linked-device/linked-limit-banner.tsx`
  (labels from the 409, Try again; signing a device out is on the phone).
- **`no_save` is honoured** (server sets it on private-chat and
  group-privacy files): no Save / Copy / Copy link / Open in browser in the
  bubble menu, the asset right-click menu, the file row and the lightbox, and
  the browser's own menu is suppressed over those files. Drag-out is not
  blocked, and nothing stops a screenshot.
- Custody runs one pull at a time; sign-out bumps a generation so a pull
  from the previous account stops, and a pull queued meanwhile starts after
  it. A store write that fails stops the drain (nothing below acts on texts
  not on disk). An op whose target is not stored is settled only when the
  pending page was not full (every pending message seen); otherwise it waits.
- History older than the link comes only from the phone's one-scan import
  (90 days, server `history_days`). Opening a chat marks it read even if its
  newest message was purged before this browser linked. Not browser-tested.

## Live history from the phone (2026-10-18, server 0175)

One-scan QR carries `hl=1`. A new phone answers with a live link instead of
the v2 relay (`lib/history/live/adopt.ts` decides; 409 `history_live_not_offered`
falls back to the relay import). Contract:
`../../ababilx-server/docs/history-live-protocol.md`.

- WhatsApp's shape (user's call): newest 20 per chat on first connect
  (`session.ts` boot, 4 at a time, open chat first), older pages only on
  scroll (`store/chat-feed-phone.ts` asks the phone once the store and the
  server both ran out), files only on tap (`from_phone` attachment ->
  `use-phone-asset.ts` -> `files.ts`, into the history file store).
- `connect.ts` dials lazily: `history.wake` every 3.5 s, 9 s budget, then
  "Couldn't reach your phone" + Try again (`phone-history-notice.tsx`).
- Keys for a page are opened in one `POST /api/chat/e2ee-keys/batch`
  (`keys.ts`) into the same `readKeys` cache `loadReadKey` reads.
- `wire.ts` + signal AAD pinned by hex shared with the phone
  (`wire.test.mjs`). Not browser-tested.
- Chat-list previews: a purged row (no preview, or the `last_message_private`
  label) takes the newest stored message when it is at least as new as the
  server's time (`lib/history/sidebar-local-preview.ts`, the phone's
  `withLocalPreviews`); its time then sorts the row. Feeds with a picture draw
  it (they used to always show the link glyph).
