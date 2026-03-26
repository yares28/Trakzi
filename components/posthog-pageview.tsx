"use client"

import { Suspense, useEffect, useRef } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { safeCapture } from "@/lib/posthog-safe"

/**
 * Fires $pageview on pathname/search changes. Next.js App Router soft navigations
 * do not always trigger PostHog's built-in pageview; we disable automatic pageviews
 * in init and own the lifecycle here.
 */
function PostHogPageViewInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const lastKey = useRef<string | null>(null)

  useEffect(() => {
    const search = searchParams?.toString() ?? ""
    const key = `${pathname}${search ? `?${search}` : ""}`
    if (lastKey.current === key) return
    lastKey.current = key

    if (typeof window === "undefined") return

    safeCapture("$pageview", {
      $current_url: window.location.href,
      path: pathname,
      ...(search ? { search } : {}),
    })
  }, [pathname, searchParams])

  return null
}

export function PostHogPageView() {
  return (
    <Suspense fallback={null}>
      <PostHogPageViewInner />
    </Suspense>
  )
}
