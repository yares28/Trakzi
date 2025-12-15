import type { NextConfig } from "next";
import path from "path";

// #region agent log
fetch("http://127.0.0.1:7242/ingest/4263eedd-8a99-4193-82ad-974d6be54ab8", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    sessionId: "debug-session",
    runId: "pre-fix",
    hypothesisId: "H1",
    location: "next.config.ts:config-load",
    message: "next.config loaded",
    data: {
      cwd: process.cwd(),
      nodeEnv: process.env.NODE_ENV ?? "unset",
      hasVercelEnv: Boolean(process.env.VERCEL),
    },
    timestamp: Date.now(),
  }),
}).catch(() => {});
// #endregion

const nextConfig: NextConfig = {
  // Ensure pdf-parse is only used on server side
  // This prevents DOMMatrix errors by treating pdf-parse as external
  serverExternalPackages: ["pdf-parse"],

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
};

// #region agent log
fetch("http://127.0.0.1:7242/ingest/4263eedd-8a99-4193-82ad-974d6be54ab8", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    sessionId: "debug-session",
    runId: "pre-fix",
    hypothesisId: "H2",
    location: "next.config.ts:config-values",
    message: "next.config values",
    data: {
      serverExternalPackages: nextConfig.serverExternalPackages,
      outputFileTracingRoot: nextConfig.outputFileTracingRoot,
      typescriptIgnoreBuildErrors: nextConfig.typescript?.ignoreBuildErrors ?? null,
    },
    timestamp: Date.now(),
  }),
}).catch(() => {});
// #endregion

export default nextConfig;

// #region agent log
fetch("http://127.0.0.1:7242/ingest/4263eedd-8a99-4193-82ad-974d6be54ab8", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    sessionId: "debug-session",
    runId: "pre-fix",
    hypothesisId: "H3",
    location: "next.config.ts:env-snapshot",
    message: "runtime env snapshot",
    data: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    timestamp: Date.now(),
  }),
}).catch(() => {});
// #endregion
