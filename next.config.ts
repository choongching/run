import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // Agents moved out of the admin area in phase 7; old bookmarks follow.
    return [
      {
        source: "/admin/agents",
        destination: "/agents",
        permanent: true,
      },
      {
        source: "/admin/agents/:path*",
        destination: "/agents/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
