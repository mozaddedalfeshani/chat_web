import type { NextConfig } from "next";

// Hardcoded, no env: see src/lib/api-origin.ts.
const api = "https://api.ababilx.com";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: "/hooks/chat/:webhookId/:token",
        destination: `${api}/hooks/chat/:webhookId/:token`,
      },
    ];
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
