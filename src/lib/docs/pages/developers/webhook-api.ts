import type { DocPage } from "../../types";

const URL_PLACEHOLDER = "https://YOUR-HOST/hooks/chat/FLOCK_ID/SECRET";

export const WEBHOOK_API: DocPage = {
  slug: "webhook-api",
  title: "Post to a flock",
  description: "The request format, limits and error codes for a flock's webhook URL.",
  sections: [
    {
      id: "send",
      heading: "Send a message",
      blocks: [
        {
          type: "p",
          text: "POST JSON to the webhook URL you copied when you created the flock. No other header or login is needed.",
        },
        {
          type: "code",
          lang: "bash",
          title: "curl",
          code: `curl -X POST '${URL_PLACEHOLDER}' \\
  -H 'Content-Type: application/json' \\
  -d '{"message":"Deployment completed"}'`,
        },
        {
          type: "code",
          lang: "js",
          title: "JavaScript (server or browser)",
          code: `await fetch("${URL_PLACEHOLDER}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message: "New order #1042" }),
});`,
        },
        {
          type: "code",
          lang: "python",
          title: "Python",
          code: `import requests

requests.post(
    "${URL_PLACEHOLDER}",
    json={"message": "Backup finished"},
    timeout=10,
)`,
        },
        { type: "p", text: "A successful post answers 201:" },
        {
          type: "code",
          lang: "json",
          code: `{ "success": true, "data": { "id": "…", "created_at": "2026-10-19T09:30:00Z" } }`,
        },
      ],
    },
    {
      id: "fields",
      heading: "Fields",
      blocks: [
        {
          type: "table",
          head: ["Field", "Required", "What it does"],
          rows: [
            ["message", "Yes, unless you attach a file", "The text of the message. Markdown is rendered."],
            ["content", "No", "Alias for message. If both are sent, message wins."],
            ["event_id", "No", "Your own id for this event. Posting the same id twice stores one message. Also accepted as the X-Webhook-Event-ID header."],
          ],
        },
        {
          type: "list",
          items: [
            "Text: up to 6,000 characters and 1,000 words.",
            "JSON body: up to 64 KB.",
            "Escaped line breaks: if the text has two or more literal \\n sequences and no real line breaks, they are turned into line breaks. Contact-form tools often send text this way.",
          ],
        },
      ],
    },
    {
      id: "files",
      heading: "Attach files",
      blocks: [
        {
          type: "p",
          text: "To attach files, send multipart/form-data instead. Put the same JSON in a field called payload_json, and each file in a field named files[0], files[1] and so on.",
        },
        {
          type: "code",
          lang: "bash",
          title: "curl",
          code: `curl -X POST '${URL_PLACEHOLDER}' \\
  -F 'payload_json={"message":"Nightly report"}' \\
  -F 'files[0]=@report.pdf' \\
  -F 'files[1]=@chart.png'`,
        },
        {
          type: "list",
          items: [
            "Up to 10 files per message.",
            "Up to 350 MB across all files in one message.",
            "A message may be only files, with no text.",
          ],
        },
      ],
    },
    {
      id: "retries",
      heading: "Retry safely",
      blocks: [
        {
          type: "p",
          text: "Send an event_id whenever the sender might retry, such as a queue or a tool that repeats on timeout. A repeat answers 200 with duplicate set to true, and no second message appears.",
        },
        {
          type: "code",
          lang: "json",
          code: `{ "success": true, "duplicate": true }`,
        },
      ],
    },
    {
      id: "limits",
      heading: "Rate limits",
      blocks: [
        {
          type: "table",
          head: ["Limit", "Value"],
          rows: [
            ["Per flock", "60 messages a minute"],
            ["Per sender IP address", "120 requests a minute"],
          ],
        },
        {
          type: "p",
          text: "Past a limit you get 429 with a Retry-After header, which a browser script can read too. Wait that many seconds, then try again.",
        },
      ],
    },
    {
      id: "errors",
      heading: "Errors",
      blocks: [
        {
          type: "table",
          head: ["Status", "error", "Meaning"],
          rows: [
            ["400", "invalid request body", "Not valid JSON, or a multipart request with no payload_json."],
            ["400", "content or file is required", "Nothing to post."],
            ["400", "content exceeds …", "Over the character or word limit."],
            ["400", "max 10 attachments allowed", "Too many files, or a file over the size limit."],
            ["401", "unauthorized", "The URL is wrong, or it was replaced. Copy the current one."],
            ["429", "rate_limit_exceeded", "Slow down; see Retry-After."],
            ["503", "file uploads are not configured", "File storage is unavailable. Text still works."],
          ],
        },
        {
          type: "p",
          text: "Every error body looks like { \"success\": false, \"error\": \"…\" }.",
        },
      ],
    },
    {
      id: "good-practice",
      heading: "Good practice",
      blocks: [
        {
          type: "list",
          items: [
            "Keep the URL in a secret store or environment variable, never in public code.",
            "Replace the URL if it may have leaked. Posting stops on the old one at once.",
            "Do not post anything you would not hand to a server: flocks are not end-to-end encrypted.",
            "Use event_id when you retry.",
          ],
        },
      ],
    },
  ],
};
