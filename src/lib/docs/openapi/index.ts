import { absoluteUrl } from "@/lib/site";
import { RESPONSES, SCHEMAS } from "./responses";

/**
 * OpenAPI 3.1 description of a flock's inbound webhook. Kept in step with
 * ababilx-server handlers/chat/webhooks/chat_webhook_receive_handler.go.
 */
export function flockWebhookOpenAPI() {
  return {
    openapi: "3.1.0",
    info: {
      title: "AbabilX flock webhook",
      version: "1.0.0",
      summary: "Post messages and files into an AbabilX flock (read-only chat).",
      description:
        "The secret in the URL is the only credential. Any origin may call it (CORS *, no credentials). Docs: " +
        absoluteUrl("/docs/webhook-api"),
    },
    externalDocs: { url: absoluteUrl("/docs/flocks") },
    servers: [
      { url: "https://chat.ababilx.com" },
      { url: "https://workspace.ababilx.com" },
      { url: "https://api.ababilx.com" },
    ],
    paths: {
      "/hooks/chat/{flockId}/{secret}": {
        parameters: [
          { name: "flockId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          {
            name: "secret",
            in: "path",
            required: true,
            description: "64 hex characters, shown once when the flock or a new URL is made.",
            schema: { type: "string", pattern: "^[0-9a-f]{64}$" },
          },
        ],
        post: {
          operationId: "postToFlock",
          summary: "Post a message",
          parameters: [
            { name: "X-Webhook-Event-ID", in: "header", required: false, schema: { type: "string", maxLength: 200 } },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Message" } },
              "text/plain": {
                description: "Read as JSON. Lets a browser skip the CORS preflight.",
                schema: { type: "string", example: '{"message":"Hello"}' },
              },
              "multipart/form-data": {
                schema: {
                  type: "object",
                  required: ["payload_json"],
                  properties: {
                    payload_json: { type: "string", description: "The Message object as JSON text. Exactly one." },
                    "files[0]": { type: "string", format: "binary", description: "files[0] … files[9]: up to 10 files, 350 MB total." },
                  },
                },
              },
            },
          },
          responses: RESPONSES,
        },
      },
    },
    components: { schemas: SCHEMAS },
  };
}
