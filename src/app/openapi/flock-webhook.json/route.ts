import { flockWebhookOpenAPI } from "@/lib/docs/openapi";

export const dynamic = "force-static";

export function GET() {
  return Response.json(flockWebhookOpenAPI(), {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
