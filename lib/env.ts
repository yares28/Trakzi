// lib/env.ts
// Centralized environment variable helpers for production-safe URL resolution

/**
 * Get the canonical app URL.
 * Priority: NEXT_PUBLIC_APP_URL > Vercel URL > localhost (dev only)
 */
export function getAppUrl(): string {
    if (process.env.NEXT_PUBLIC_APP_URL) {
        return process.env.NEXT_PUBLIC_APP_URL;
    }
    // Vercel provides VERCEL_URL in production/preview deployments
    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`;
    }
    // Fallback for local development only
    return 'http://localhost:3000';
}

/**
 * Get the site URL for external services (e.g., OpenRouter HTTP-Referer)
 * Falls back to app URL if SITE_URL is not set
 */
export function getSiteUrl(): string {
    return process.env.SITE_URL || getAppUrl();
}

/**
 * Get the site name for external services
 */
export function getSiteName(): string {
    return process.env.SITE_NAME || 'Trakzi';
}
