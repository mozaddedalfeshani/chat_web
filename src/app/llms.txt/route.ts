import { llmsTxt } from "@/lib/docs/ai";
import { textResponse } from "@/lib/docs/text-response";

export const dynamic = "force-static";

export function GET() {
  return textResponse(llmsTxt(), "text/plain");
}
