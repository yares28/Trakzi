"use client"

import { useState, useEffect } from "react"
import { getConsentStatus, setConsent } from "@/lib/cookie-consent"

function MiniSparkline() {
  return (
    <svg
      viewBox="0 0 36 18"
      fill="none"
      aria-hidden="true"
      className="w-9 h-[18px] shrink-0"
    >
      <polyline
        points="2,14 8,10 14,12 20,6 26,8 34,3"
        stroke="oklch(0.6368 0.2078 25.3313)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="60"
        strokeDashoffset="60"
        style={{ animation: "spark-draw 0.9s ease-out 0.3s forwards" }}
      />
      <circle cx="34" cy="3" r="1.8" fill="oklch(0.6368 0.2078 25.3313)" opacity="0" style={{ animation: "spark-dot 0.2s ease-out 1.1s forwards" }} />
      <style>{`
        @keyframes spark-draw { to { stroke-dashoffset: 0; } }
        @keyframes spark-dot  { to { opacity: 1; } }
      `}</style>
    </svg>
  )
}

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (getConsentStatus() === null) setVisible(true)
  }, [])

  function accept() {
    setConsent("accepted")
    setVisible(false)
  }

  function decline() {
    setConsent("declined")
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 z-[9999] w-[calc(100%-2rem)] max-w-[480px] -translate-x-1/2 animate-in slide-in-from-bottom-3 fade-in duration-500"
    >
      {/* Ambient glow behind the card */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 rounded-2xl blur-xl opacity-30"
        style={{ background: "radial-gradient(ellipse at 50% 100%, oklch(0.6368 0.2078 25.3313 / 0.4), transparent 70%)" }}
      />

      <div className="relative rounded-2xl border border-border/60 bg-background/95 backdrop-blur-md shadow-xl overflow-hidden">
        {/* Top accent line */}
        <div
          className="absolute top-0 inset-x-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, oklch(0.6368 0.2078 25.3313 / 0.6), transparent)" }}
        />

        <div className="flex items-center gap-3 px-4 py-3.5">
          {/* Icon + label */}
          <div className="flex items-center gap-2 shrink-0">
            <MiniSparkline />
            <span
              className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-widest uppercase px-2 py-0.5 rounded-full border"
              style={{
                color: "oklch(0.6368 0.2078 25.3313)",
                borderColor: "oklch(0.6368 0.2078 25.3313 / 0.3)",
                background: "oklch(0.6368 0.2078 25.3313 / 0.07)",
              }}
            >
              <span
                className="size-1.5 rounded-full animate-pulse"
                style={{ background: "oklch(0.6368 0.2078 25.3313)" }}
              />
              Analytics
            </span>
          </div>

          {/* Divider */}
          <div className="w-px self-stretch bg-border/50 shrink-0" />

          {/* Text */}
          <p className="text-xs text-muted-foreground leading-snug flex-1 min-w-0">
            We use analytics to improve Trakzi.{" "}
            <a href="/cookies" className="underline underline-offset-2 hover:text-foreground transition-colors">
              Cookie policy
            </a>
          </p>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={decline}
              className="h-7 px-3 rounded-lg text-xs font-medium text-muted-foreground border border-border/60 hover:text-foreground hover:border-border transition-colors"
            >
              Decline
            </button>
            <button
              onClick={accept}
              className="h-7 px-3 rounded-lg text-xs font-semibold transition-opacity hover:opacity-85"
              style={{
                background: "oklch(0.6368 0.2078 25.3313)",
                color: "#fff",
              }}
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
