/** Every answer POST /hooks/chat/{flockId}/{secret} can give, as OpenAPI. */

const errorBody = (examples: Record<string, string>) => ({
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/Error" },
      examples: Object.fromEntries(
        Object.entries(examples).map(([k, error]) => [k, { value: { success: false, error } }]),
      ),
    },
  },
});

const retryAfter = {
  "Retry-After": { description: "Whole seconds to wait before retrying.", schema: { type: "integer", minimum: 1 } },
};

export const RESPONSES = {
  "200": {
    description: "Duplicate: this event_id was already posted to this flock in the last 7 days. Nothing new was stored. Treat as success.",
    content: { "application/json": { schema: { $ref: "#/components/schemas/Duplicate" } } },
  },
  "201": {
    description: "Created: the message is stored and delivered to members.",
    content: { "application/json": { schema: { $ref: "#/components/schemas/Created" } } },
  },
  "400": {
    description: "The request is wrong. Do not retry unchanged.",
    ...errorBody({
      invalidBody: "invalid request body",
      empty: "content or file is required",
      tooLong: "content exceeds 6000 characters",
      tooManyWords: "content exceeds 1000 words",
      eventIdTooLong: "event_id too long",
      tooManyFiles: "max 10 attachments allowed",
      badFileSize: "invalid file size",
      badFileName: "invalid file name",
      filesTooBig: "attachments exceed 350 MB total limit",
    }),
  },
  "401": {
    description: "Malformed, unknown or replaced URL, wrong secret, or the flock was deleted. Do not retry; get the current URL.",
    ...errorBody({ unauthorized: "unauthorized" }),
  },
  "404": {
    description: "Wrong path, or a method other than POST.",
    content: { "text/plain": { schema: { type: "string", example: "404 page not found" } } },
  },
  "429": {
    description: "Rate limited: 60 messages/min per flock, 120 requests/min per IP to flock URLs, or the API-wide per-IP limit. Retry after Retry-After.",
    headers: retryAfter,
    ...errorBody({ flockOrIp: "rate_limit_exceeded", global: "too many requests, slow down" }),
  },
  "500": {
    description: "Server fault; nothing was posted. Retry with backoff and the same event_id.",
    ...errorBody({ storage: "failed to store attachment" }),
  },
  "503": {
    description: "File storage unavailable. Retry later or post without files.",
    ...errorBody({ uploads: "file uploads are not configured" }),
  },
};

export const SCHEMAS = {
  Message: {
    type: "object",
    additionalProperties: true,
    description: "Unknown fields are ignored. Every field is a string.",
    properties: {
      message: { type: "string", description: "The text. Markdown is rendered. Up to 6000 bytes UTF-8 and 1000 words. Required unless files are attached." },
      content: { type: "string", description: "Used only when message is empty or missing." },
      event_id: { type: "string", maxLength: 200, description: "Idempotency key, remembered 7 days per flock. Header X-Webhook-Event-ID also works; body wins." },
    },
    example: { message: "Deployment of v2.4.1 finished", event_id: "deploy-812" },
  },
  Created: {
    type: "object",
    required: ["success", "data"],
    properties: {
      success: { type: "boolean", const: true },
      data: {
        type: "object",
        required: ["id", "created_at"],
        properties: { id: { type: "string", format: "uuid" }, created_at: { type: "string", format: "date-time" } },
      },
    },
  },
  Duplicate: {
    type: "object",
    required: ["success", "duplicate"],
    properties: { success: { type: "boolean", const: true }, duplicate: { type: "boolean", const: true } },
  },
  Error: {
    type: "object",
    required: ["success", "error"],
    properties: { success: { type: "boolean", const: false }, error: { type: "string" } },
  },
};
