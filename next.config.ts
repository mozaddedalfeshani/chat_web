import type { NextConfig } from "next";

// Hardcoded, no env: see src/lib/api-origin.ts.
const api = "https://api.ababilx.com";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return {
      // Markdown copies of the docs for AI tools: /docs.md, /docs/<slug>.md.
      // Before files, or /docs/[slug] would take "<slug>.md" as a slug and 404.
      beforeFiles: [
        { source: "/docs.md", destination: "/docs-md/introduction" },
        { source: "/docs/:slug([a-z0-9-]+)\\.md", destination: "/docs-md/:slug" },
      ],
      afterFiles: [
        {
          source: "/hooks/chat/:webhookId/:token",
          destination: `${api}/hooks/chat/:webhookId/:token`,
        },
      ],
      fallback: [],
    };
  },
  async redirects() {
    return [
      {
        source: "/user/workspace",
        destination: "/user/messages",
        permanent: false,
      },
      {
        source: "/user/workspace/:path*",
        destination: "/user/messages",
        permanent: false,
      },
      {
        source: "/user/team",
        destination: "/user/messages",
        permanent: true,
      },
      {
        source: "/user/team/:path*",
        destination: "/user/messages",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
