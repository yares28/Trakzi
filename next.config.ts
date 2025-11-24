import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure pdf-parse is only used on server side
  // This prevents DOMMatrix errors by treating pdf-parse as external
  serverExternalPackages: ['pdf-parse'],
  
  // Turbopack configuration (Next.js 16+ uses Turbopack by default)
  // Empty config silences the warning - pdf-parse is handled via serverExternalPackages
  turbopack: {},
};

export default nextConfig;
