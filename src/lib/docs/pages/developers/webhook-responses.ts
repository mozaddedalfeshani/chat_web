import type { DocPage } from "../../types";
import { WEBHOOK_KEYWORDS, WEBHOOK_UPDATED } from "./shared";

export const WEBHOOK_RESPONSES: DocPage = {
  slug: "webhook-responses",
  title: "Responses and errors",
  description:
    "Every status code and error message an AbabilX flock webhook can return, what each one means, and whether to retry.",
  keywords: [...WEBHOOK_KEYWORDS, "webhook error codes", "webhook retry", "429 Retry-After"],
  updated: WEBHOOK_UPDATED,
  intro: [
    {
      type: "p",
      text: "Every answer from the server is JSON with a success field. On success it also has data or duplicate; on failure it has error, a short English string that is stable enough to match on. The one exception is 404, which is plain text.",
    },
  ],
  sections: [
    {
      id: "success",
      heading: "Success",
      blocks: [
        {
          type: "table",
          head: ["Status", "Body", "Meaning"],
          rows: [
            ["201 Created", `{"success":true,"data":{"id":"<uuid>","created_at":"<RFC 3339>"}}`, "The message is stored and on its way to members."],
            ["200 OK", `{"success":true,"duplicate":true}`, "This event_id was already posted to this flock in the last 7 days. Nothing new was stored; treat it as success."],
          ],
        },
      ],
    },
    {
      id: "errors",
      heading: "Every error",
      blocks: [
        {
          type: "table",
          head: ["Status", "error", "Cause", "Retry?"],
          rows: [
            ["400", "invalid request body", "Body is not one JSON object; a field is not a string; JSON over 64 KB; multipart over 351 MB or malformed; payload_json missing, empty, repeated or not JSON; an HTML form post.", "No. Fix the request."],
            ["400", "content or file is required", "No message, no content and no files (a Slack-style {\"text\":…} body lands here).", "No."],
            ["400", "content exceeds 6000 characters", "Text over 6,000 bytes of UTF-8.", "No. Shorten or split it."],
            ["400", "content exceeds 1000 words", "Text over 1,000 words.", "No."],
            ["400", "event_id too long", "event_id over 200 bytes.", "No."],
            ["400", "max 10 attachments allowed", "More than 10 files.", "No."],
            ["400", "invalid file size", "An empty file, or one over 350 MB.", "No."],
            ["400", "invalid file name", "A file part with no usable name, or a name over 255 bytes.", "No."],
            ["400", "attachments exceed 350 MB total limit", "Files add up to more than 350 MB.", "No."],
            ["401", "unauthorized", "Malformed, unknown or replaced URL; wrong secret; the flock was deleted.", "No. Get the current URL from the flock's owner."],
            ["404", "404 page not found (plain text)", "Wrong path, or a method other than POST.", "No."],
            ["429", "rate_limit_exceeded", "Over 60 messages a minute for this flock, or 120 requests a minute from your IP.", "Yes, after Retry-After seconds."],
            ["429", "too many requests, slow down", "Over the API-wide limit for your IP.", "Yes, after Retry-After (1 second)."],
            ["500", "failed to store attachment", "A file could not be saved. Nothing was posted.", "Yes, with backoff."],
            ["500", "(other text)", "A server fault. Nothing was posted.", "Yes, with backoff and the same event_id."],
            ["502 / 504", "(proxy page)", "The host could not reach the server in time.", "Yes, with backoff and the same event_id."],
            ["503", "file uploads are not configured", "File storage is down. Text-only posts still work.", "Later, or send without files."],
          ],
        },
        {
          type: "callout",
          text: "Checks run in this order: URL shape → IP rate limit → URL lookup → secret → flock rate limit → body. So a wrong URL can still answer 429 if it is hammered, and a bad body is only reported for a valid URL.",
        },
      ],
    },
    {
      id: "retry-flow",
      heading: "What to do with an answer",
      blocks: [
        {
          type: "flow",
          steps: [
            { where: "app", title: "POST with an event_id", text: "Make the id unique per real event, such as a run number or an order id." },
            {
              branches: [
                { label: "200 or 201", steps: [{ where: "app", title: "Done", text: "Both mean the message is in the flock." }] },
                { label: "429", steps: [{ where: "app", title: "Wait Retry-After seconds", text: "Then send the same request again." }] },
                { label: "500, 502, 503, 504, timeout", steps: [{ where: "app", title: "Back off and resend", text: "1 s, 2 s, 4 s … up to about 5 tries, same event_id, so a retry can never post twice." }] },
                { label: "400, 401, 404", steps: [{ where: "app", title: "Stop and alert a person", text: "Resending will fail the same way." }] },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "headers",
      heading: "Response headers",
      blocks: [
        {
          type: "table",
          head: ["Header", "When", "Value"],
          rows: [
            ["Content-Type", "Always", "application/json; charset=utf-8 (text/plain for 404)"],
            ["Retry-After", "429", "Whole seconds to wait"],
            ["Access-Control-Allow-Origin", "When the request has an Origin", "*"],
            ["Access-Control-Expose-Headers", "When the request has an Origin", "Retry-After"],
          ],
        },
      ],
    },
    {
      id: "cors",
      heading: "Browsers and CORS",
      blocks: [
        {
          type: "p",
          text: "Any website may call a flock URL. A JSON POST from a browser first sends an OPTIONS preflight, which answers 204 with Access-Control-Allow-Origin: *, Access-Control-Allow-Methods: POST, OPTIONS and any requested headers. No cookies are sent or needed, so do not set credentials: \"include\".",
        },
        {
          type: "code",
          lang: "http",
          title: "Preflight",
          code: `OPTIONS /hooks/chat/<flock-id>/<secret>
Origin: https://shop.example.com
Access-Control-Request-Method: POST
Access-Control-Request-Headers: content-type

HTTP/1.1 204 No Content
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST,OPTIONS
Access-Control-Allow-Headers: *,Content-Type,X-Webhook-Event-Id
Access-Control-Max-Age: 43200`,
        },
      ],
    },
  ],
};
