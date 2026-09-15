import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

const disallow = ["/user/", "/auth/", "/api/", "/hooks/", "/backend/"];

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
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
