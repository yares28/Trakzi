"use client"

import Script from "next/script"
import { Suspense, useEffect, useRef } from "react"
import { usePathname, useSearchParams } from "next/navigation"

/**
 * Google Analytics 4 (GA4) integration.
 *
 * Set NEXT_PUBLIC_GA_MEASUREMENT_ID in your environment to enable.
 * Example value: G-XXXXXXXXXX (from https://analytics.google.com → Admin → Data Streams)
 *
 * We disable GA's automatic SPA tracking and fire pageviews ourselves on
 * pathname/search changes — Next.js App Router soft-navigations don't
 * trigger gtag's default page_view event reliably.
 */
function GoogleAnalyticsInner({ measurementId }: { measurementId: string }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const lastKey = useRef<string | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const gtag = (window as any).gtag
    if (typeof gtag !== "function") return

    const search = searchParams?.toString() ?? ""
    const key = `${pathname}${search ? `?${search}` : ""}`
    if (lastKey.current === key) return
    lastKey.current = key

    gtag("event", "page_view", {
      page_path: key,
      page_location: window.location.href,
      page_title: typeof document !== "undefined" ? document.title : undefined,
    })
  }, [pathname, searchParams])

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${measurementId}', { send_page_view: false });
        `}
      </Script>
    </>
  )
}

export function GoogleAnalytics() {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
  if (!measurementId) return null

  return (
    <Suspense fallback={null}>
      <GoogleAnalyticsInner measurementId={measurementId} />
    </Suspense>
  )
}
