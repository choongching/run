import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Security headers on every response. X-Frame-Options matters most here:
  // the write-approval gate is a button, and a page that can be iframed can
  // have that button overlaid under a fake one (clickjacking). Nothing in Run
  // is meant to be embedded, so framing is denied outright.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
