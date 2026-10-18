import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

const disallow = ["/user/", "/auth/", "/api/", "/hooks/", "/backend/"];

const AI_AGENTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow,
      },
      { userAgent: "Googlebot", allow: "/", disallow },
      { userAgent: "Googlebot-Image", allow: "/", disallow },
      { userAgent: "Bingbot", allow: "/", disallow },
      // AI assistants and answer engines: the docs, /llms.txt and the
      // Markdown copies are written for them. Private routes stay closed.
      ...AI_AGENTS.map((userAgent) => ({ userAgent, allow: "/", disallow })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
