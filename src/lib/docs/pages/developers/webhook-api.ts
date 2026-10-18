import type { DocPage } from "../../types";
import { REQUEST_EXAMPLES } from "./webhook-examples";
import { URL_SHAPE, URL_VAR, WEBHOOK_KEYWORDS, WEBHOOK_UPDATED } from "./shared";

export const WEBHOOK_API: DocPage = {
  slug: "webhook-api",
  title: "Post to a flock",
  description:
    "Webhook API reference for AbabilX flocks: endpoint, request formats (JSON, text/plain, multipart with files), every field, and every limit.",
  keywords: [...WEBHOOK_KEYWORDS, "webhook API reference", "multipart upload webhook", "idempotent webhook"],
  updated: WEBHOOK_UPDATED,
  intro: [
    {
      type: "table",
      head: ["Quick reference", ""],
      rows: [
        ["Endpoint", `POST ${URL_SHAPE}`],
        ["Auth", "The secret in the URL. No header, token or cookie."],
        ["Body", "JSON object, or multipart/form-data when sending files"],
        ["Success", "201 Created, or 200 when event_id repeats"],
        ["CORS", "Any origin, no credentials; preflight allowed"],
        ["Rate", "60 messages a minute per flock, 120 requests a minute per IP"],
        ["Machine-readable spec", "/openapi/flock-webhook.json (OpenAPI 3.1)"],
      ],
    },
  ],
  sections: [
    {
      id: "quickstart",
      heading: "Quick start",
      blocks: [
        { type: "steps", items: ["Create a flock and copy its webhook URL (see Flocks).", `Save it as the environment variable ${URL_VAR}.`, "Send one request:"] },
        {
          type: "code",
          lang: "bash",
          title: "curl",
          code: `curl -sS -X POST "$${URL_VAR}" \\
  -H 'Content-Type: application/json' \\
  -d '{"message":"Deployment of v2.4.1 finished"}'`,
        },
        { type: "p", text: "Response, status 201:" },
        { type: "code", lang: "json", code: `{"success":true,"data":{"id":"6f1c2a9e-5b7d-4c1e-9a43-0d2f8b7e1c55","created_at":"2026-10-19T09:30:00.123456Z"}}` },
      ],
    },
    {
      id: "url",
      heading: "The URL",
      blocks: [
        { type: "p", text: `Use the URL exactly as the app showed it. Its shape is ${URL_SHAPE}. The host may be chat.ababilx.com, workspace.ababilx.com or api.ababilx.com: all three reach the same server, so a URL keeps working whichever one it names.` },
        { type: "list", items: ["flock-id is a UUID.", "secret is 64 hex characters. Anyone with it can post, so keep it out of logs, screenshots and public repositories.", "Only POST is served. Any other method, or any other path, answers 404."] },
      ],
    },
    {
      id: "json",
      heading: "Send text (JSON)",
      blocks: [
        { type: "p", text: "The body must be one JSON object. Every field is a string. Unknown fields are ignored." },
        {
          type: "table",
          head: ["Field", "Type", "Required", "Notes"],
          rows: [
            ["message", "string", "Yes, unless files are attached", "The text. Markdown is rendered: **bold**, _italic_, `code`, code blocks, lists, links, headings. Leading and trailing whitespace is trimmed."],
            ["content", "string", "No", "Used only when message is empty or missing."],
            ["event_id", "string", "No", "Up to 200 bytes. The same id within 7 days stores nothing new (see Responses). The X-Webhook-Event-ID header works too; the body wins if both are set."],
          ],
        },
        {
          type: "code",
          lang: "json",
          title: "Full body",
          code: `{
  "message": "**Build failed** on \`main\`\\n\\n- job: test\\n- commit: a1b0fbe\\n\\n[Open the run](https://ci.example.com/runs/812)",
  "event_id": "ci-run-812"
}`,
        },
        { type: "callout", title: "Slack-style bodies do not work as they are.", text: "A body with only a text field ({\"text\":\"…\"}) has no message, so it answers 400 content or file is required. Rename text to message." },
      ],
    },
    {
      id: "request-examples",
      heading: "Request examples",
      blocks: REQUEST_EXAMPLES,
    },
    {
      id: "content-type",
      heading: "Content-Type",
      blocks: [
        {
          type: "table",
          head: ["Content-Type sent", "How the body is read"],
          rows: [
            ["application/json", "JSON object. The normal choice."],
            ["text/plain (or none)", "Also read as JSON. Useful in a browser: a text/plain POST needs no CORS preflight."],
            ["multipart/form-data", "payload_json field holds the JSON; files[n] fields hold files."],
            ["application/x-www-form-urlencoded", "Not supported: the body is read as JSON and fails with 400 invalid request body."],
          ],
        },
      ],
    },
    {
      id: "files",
      heading: "Send files (multipart)",
      blocks: [
        { type: "p", text: "Send multipart/form-data. Put the JSON body, as text, in a field named payload_json (exactly one). Put each file in its own field named files[0], files[1] … files[9]. A message may be files only: send payload_json as {}." },
        {
          type: "code",
          lang: "bash",
          title: "curl",
          code: `curl -sS -X POST "$${URL_VAR}" \\
  -F 'payload_json={"message":"Nightly report","event_id":"report-2026-10-19"}' \\
  -F 'files[0]=@report.pdf' \\
  -F 'files[1]=@chart.png;type=image/png'`,
        },
        {
          type: "list",
          items: [
            "Up to 10 files per message, 350 MB in total, and no empty files.",
            "Any file type. Send the right Content-Type on each part so pictures and videos are shown inline; unknown types arrive as downloadable files.",
            "File names: up to 255 bytes; any folder part of the name is dropped.",
            "Files show in the order of their field names, so use files[0] to files[9].",
            "Fields not named payload_json or files[n] are ignored.",
          ],
        },
      ],
    },
    {
      id: "limits",
      heading: "All limits",
      blocks: [
        {
          type: "table",
          head: ["What", "Limit", "Over the limit"],
          rows: [
            ["Text length", "6,000 bytes of UTF-8 (about 6,000 English letters or 2,000 Bangla letters)", "400 content exceeds 6000 characters"],
            ["Words", "1,000", "400 content exceeds 1000 words"],
            ["JSON body", "64 KB", "400 invalid request body"],
            ["Multipart body", "351 MB", "400 invalid request body"],
            ["Files per message", "10", "400 max 10 attachments allowed"],
            ["File size", "1 byte to 350 MB each, 350 MB together", "400 invalid file size / attachments exceed 350 MB total limit"],
            ["event_id", "200 bytes", "400 event_id too long"],
            ["Messages per flock", "60 in any 60 seconds", "429 rate_limit_exceeded"],
            ["Requests per IP to flock URLs", "120 in any 60 seconds (wrong URLs count too)", "429 rate_limit_exceeded"],
            ["Requests per IP to the whole API", "100 at once, then 50 a second", "429 too many requests, slow down"],
          ],
        },
      ],
    },
  ],
};
