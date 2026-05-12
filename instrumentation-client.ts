import posthog from "posthog-js"

function initPostHog() {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return
  // @ts-ignore – internal flag; guard against double init
  if (posthog.__loaded) return

  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: "/ingest",
    ui_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    capture_exceptions: true,
    debug: false,
    autocapture: true,
    capture_pageview: false,
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: "[data-sensitive]",
    },
  })
}

if (
  typeof window !== "undefined" &&
  process.env.NODE_ENV !== "development"
) {
  if (localStorage.getItem("trakzi-cookie-consent") === "accepted") {
    initPostHog()
  } else {
    window.addEventListener("trakzi:cookie-consent-accepted", initPostHog, { once: true })
  }
}
