import { withSentryConfig } from "@sentry/nextjs";
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
    // Cloudflare Turnstile (https://challenges.cloudflare.com) is Clerk's bot-protection
    // CAPTCHA provider. It must be allow-listed in script-src (to load the widget JS),
    // frame-src (the challenge renders in an iframe), and connect-src (the widget calls
    // back to verify). Without all three, sign-in fails with the misleading message
    // "CAPTCHA failed to load — may be due to an unsupported browser or extension."
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://*.clerk.accounts.dev https://clerk.trakzi.com https://dev.clerk.trakzi.com https://challenges.cloudflare.com https://js.stripe.com https://eu.i.posthog.com https://eu-assets.i.posthog.com https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://img.clerk.com https://images.clerk.dev https://rankspot-space.sfo3.digitaloceanspaces.com",
      "connect-src 'self' https://*.clerk.accounts.dev https://clerk.trakzi.com https://dev.clerk.trakzi.com https://challenges.cloudflare.com https://api.stripe.com https://eu.i.posthog.com https://eu-assets.i.posthog.com wss://*.clerk.accounts.dev",
      "frame-src https://challenges.cloudflare.com https://js.stripe.com https://hooks.stripe.com https://www.youtube-nocookie.com",
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
      {
        // Demo endpoints serve static MOCK_* fixtures — they are identical for
        // every caller and never touch the DB. Caching at the Vercel edge for an
        // hour removes the function-invocation cost vector entirely (an attacker
        // hammering /api/demo/* now hits the CDN, not the function runtime).
        source: '/api/demo/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=3600, stale-while-revalidate=600' },
        ],
      },
    ]
  },

  async redirects() {
    return [
      {
        source: "/analytics/trends",
        destination: "/analytics?view=trends",
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

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "trakzi",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
