import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  serverExternalPackages: [],

  // Silence workspace root warning from multiple lockfiles (global pnpm + local npm)
  outputFileTracingRoot: path.join(__dirname),

  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false,
  },

  async redirects() {
    return [
      {
        source: "/analytics/trends",
        destination: "/trends",
        permanent: true,
      },
    ]
  },

  // PostHog reverse proxy configuration
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://eu-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://eu.i.posthog.com/:path*",
      },
    ]
  },

  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
