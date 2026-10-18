import type { DocBlock } from "../../types";
import { URL_VAR } from "./shared";

/** One code block per answer the server can give, exactly as it sends it. */
const reply = (title: string, code: string, lang = "json"): DocBlock => ({ type: "code", lang, title, code });
const err = (status: string, error: string) =>
  reply(status, `{"success":false,"error":"${error}"}`);

export const RESPONSE_EXAMPLES: DocBlock[] = [
  reply("201 Created", `{
  "success": true,
  "data": {
    "id": "6f1c2a9e-5b7d-4c1e-9a43-0d2f8b7e1c55",
    "created_at": "2026-10-19T09:30:00.123456Z"
  }
}`),
  reply("200 OK (duplicate event_id)", `{
  "success": true,
  "duplicate": true
}`),
  err("400 Bad Request: body is not a JSON object", "invalid request body"),
  err("400 Bad Request: nothing to post", "content or file is required"),
  err("400 Bad Request: text too long", "content exceeds 6000 characters"),
  err("400 Bad Request: too many words", "content exceeds 1000 words"),
  err("400 Bad Request: event_id too long", "event_id too long"),
  err("400 Bad Request: more than 10 files", "max 10 attachments allowed"),
  err("400 Bad Request: empty or oversized file", "invalid file size"),
  err("400 Bad Request: bad file name", "invalid file name"),
  err("400 Bad Request: files over 350 MB together", "attachments exceed 350 MB total limit"),
  err("401 Unauthorized: wrong, replaced or deleted URL", "unauthorized"),
  reply("404 Not Found (text/plain): wrong path or method", "404 page not found", "text"),
  reply("429 Too Many Requests: flock or IP limit", `HTTP/1.1 429 Too Many Requests
Content-Type: application/json; charset=utf-8
Retry-After: 23

{"success":false,"error":"rate_limit_exceeded"}`, "http"),
  reply("429 Too Many Requests: API-wide limit", `HTTP/1.1 429 Too Many Requests
Retry-After: 1

{"success":false,"error":"too many requests, slow down"}`, "http"),
  err("500 Internal Server Error: file could not be stored", "failed to store attachment"),
  err("503 Service Unavailable: file storage down", "file uploads are not configured"),
];

/** Request bodies, from the smallest that works to every field at once. */
export const REQUEST_EXAMPLES: DocBlock[] = [
  reply("Smallest body", `{"message": "Deployment finished"}`),
  reply("With an event_id (safe to retry)", `{
  "message": "Order #1042 paid: 2,450 BDT",
  "event_id": "order-1042-paid"
}`),
  reply("Markdown", `{
  "message": "## Build failed\\n\\n**Branch:** \`main\`\\n**Commit:** a1b0fbe\\n\\n- test: 3 failed\\n- lint: ok\\n\\n[Open the run](https://ci.example.com/runs/812)"
}`),
  reply("Code block inside the message", `{
  "message": "Error in checkout:\\n\\n\`\`\`\\nTypeError: cannot read 'total' of undefined\\n    at pay (cart.js:41)\\n\`\`\`"
}`),
  reply("content instead of message (same result)", `{"content": "Disk on db-1 is 91% full"}`),
  reply("payload_json for a files-only post (multipart field)", `{}`),
  reply("event_id as a header instead of a field", `curl -sS -X POST "$${URL_VAR}" \\
  -H 'Content-Type: application/json' \\
  -H 'X-Webhook-Event-ID: backup-2026-10-19' \\
  -d '{"message":"Backup finished"}'`, "bash"),
  reply("These do NOT work", `{"text": "hi"}            → 400 content or file is required (use "message")
{"message": 42}            → 400 invalid request body (must be a string)
["hello"]                  → 400 invalid request body (must be an object)
message=hello (form post)  → 400 invalid request body (send JSON)`, "text"),
];
