import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Disable React Strict Mode to prevent double-rendering in development
  // Note: This only affects development - production is never double-rendered
  reactStrictMode: false,

  serverExternalPackages: ["@napi-rs/canvas"],

  // Disable Turbopack dev cache to avoid "Persisting failed: write batch or compaction is already active"
  experimental: {
    turbopackFileSystemCacheForDev: false,
  },

  // Silence workspace root warning from multiple lockfiles (global pnpm + local npm)
  outputFileTracingRoot: path.join(__dirname),

  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false,
  },

  async headers() {
    // CSP: Allow Clerk, Stripe, PostHog, and Google Fonts — block everything else.
    // 'unsafe-inline' for styles is required by Tailwind/shadcn SSR.
    // 'unsafe-eval' removed — no eval needed in production.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://clerk.trakzi.com https://dev.clerk.trakzi.com https://js.stripe.com https://eu.i.posthog.com https://eu-assets.i.posthog.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://img.clerk.com https://images.clerk.dev",
      "connect-src 'self' https://*.clerk.accounts.dev https://clerk.trakzi.com https://dev.clerk.trakzi.com https://api.stripe.com https://eu.i.posthog.com https://eu-assets.i.posthog.com wss://*.clerk.accounts.dev",
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "worker-src blob: 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ]
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
