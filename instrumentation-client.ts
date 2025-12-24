import posthog from "posthog-js"

/**
 * PostHog Client-Side Initialization
 * 
 * This file is automatically loaded by Next.js for client-side instrumentation.
 * PostHog is initialized conditionally to prevent errors during local development.
 * 
 * Configuration follows PostHog best practices for Next.js App Router:
 * - Uses reverse proxy (/ingest) for privacy and ad-blocker bypass
 * - Error tracking enabled for production debugging
 * - Debug mode enabled in development for troubleshooting
 * - Autocapture disabled in development to reduce noise
 */
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: "/ingest",
    ui_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    // Defaults option specifies PostHog SDK version defaults
    // Using latest stable defaults as of 2024
    defaults: '2024-12-01',
    // Enables capturing unhandled exceptions via Error Tracking
    capture_exceptions: true,
    // Turn on debug in development mode for detailed logging
    debug: process.env.NODE_ENV === "development",
    // Disable autocapture in development to reduce noise
    // Enable in production for automatic event tracking
    autocapture: process.env.NODE_ENV !== "development",
    // Additional recommended options for Next.js
    loaded: (posthog) => {
      // Optional: Log successful initialization in development
      if (process.env.NODE_ENV === 'development') {
        console.debug('[PostHog] Initialized successfully')
      }
    },
  })
}
