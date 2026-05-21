"use client"

import { useEffect } from "react"
import posthog from "posthog-js"

/**
 * Initializes PostHog on the client exactly once.
 *
 * Pre-existing files in this project — components/posthog-pageview.tsx,
 * components/posthog-user-identifier.tsx, lib/posthog-safe.ts — all assume
 * PostHog is initialized somewhere. It was not. `safeCapture()` silently
 * returns false from `isPostHogReady()`, so every analytics event the app
 * tried to send was dropped. Without this component, the app has zero
 * client-side telemetry.
 *
 * Init runs once per page-load via an empty-dependency useEffect. We turn
 * off automatic pageview capture because PostHogPageView already owns that
 * lifecycle for App Router soft-navigations.
 */
export function PostHogInit() {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com"

    if (!key) {
      // No key configured — fail quietly. Common in local/preview envs.
      if (process.env.NODE_ENV !== "production") {
        console.warn("[PostHog] NEXT_PUBLIC_POSTHOG_KEY missing; analytics disabled.")
      }
      return
    }

    if (posthog.__loaded) return // Already initialized (e.g. HMR remount)

    posthog.init(key, {
      api_host: host,
      capture_pageview: false, // Owned by components/posthog-pageview.tsx
      capture_pageleave: true,
      persistence: "localStorage+cookie",
      person_profiles: "identified_only",
      autocapture: true,
      loaded: (instance) => {
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.info("[PostHog] Initialized", { host, distinctId: instance.get_distinct_id() })
        }
      },
    })
  }, [])

  return null
}
