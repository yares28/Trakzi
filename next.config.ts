import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Ensure pdf-parse is only used on server side
  // This prevents DOMMatrix errors by treating pdf-parse as external
  serverExternalPackages: ["pdf-parse"],

  // Silence workspace root warning from multiple lockfiles (global pnpm + local npm)
  outputFileTracingRoot: path.join(__dirname),

  // Skip ESLint during production builds to keep deployments unblocked
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Turbopack configuration (Next.js 16+ uses Turbopack by default)
  // Empty config silences the warning - pdf-parse is handled via serverExternalPackages
  turbopack: {},
};

export default nextConfig;
