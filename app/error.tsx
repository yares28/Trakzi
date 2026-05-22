"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { RotateCcw } from "lucide-react"
import { IconArrowLeft } from "@tabler/icons-react"

// SVG crash chart path — animated draw-in
function CrashChart() {
  return (
    <svg
      viewBox="0 0 260 90"
      fill="none"
      className="w-full max-w-[260px]"
      aria-hidden="true"
    >
      {/* Grid lines */}
      {[20, 45, 70].map((y) => (
        <line
          key={y}
          x1="0"
          y1={y}
          x2="260"
          y2={y}
          stroke="currentColor"
          strokeOpacity="0.06"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
      ))}

      {/* Area fill */}
      <path
        d="M 8 12 L 35 9 L 60 18 L 85 14 L 110 28 L 132 22 L 152 42 L 170 55 L 192 62 L 215 72 L 250 82 L 250 90 L 8 90 Z"
        fill="oklch(0.6368 0.2078 25.3313 / 0.06)"
        className="animate-in fade-in duration-700 delay-300"
      />

      {/* Main line */}
      <path
        d="M 8 12 L 35 9 L 60 18 L 85 14 L 110 28 L 132 22 L 152 42 L 170 55 L 192 62 L 215 72 L 250 82"
        stroke="oklch(0.6368 0.2078 25.3313)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="300"
        strokeDashoffset="300"
        style={{ animation: "chart-draw 1.2s ease-out 0.2s forwards" }}
      />

      {/* Terminal dot */}
      <circle
        cx="250"
        cy="82"
        r="3.5"
        fill="oklch(0.6368 0.2078 25.3313)"
        className="animate-in zoom-in duration-300"
        style={{ animationDelay: "1.3s", animationFillMode: "both", opacity: 0 }}
      />

      <style>{`
        @keyframes chart-draw {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </svg>
  )
}

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[Trakzi Error Boundary]", error)
  }, [error])

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      {/* Ambient glow — behind content */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 50% 35% at 50% 50%, oklch(0.6368 0.2078 25.3313 / 0.08) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Chart */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-full text-muted-foreground">
            <CrashChart />
          </div>

          {/* Label below chart */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className="inline-flex items-center gap-1 font-medium tabular-nums"
              style={{ color: "oklch(0.6368 0.2078 25.3313)" }}
            >
              ▼ 100.00%
            </span>
            <span>vs expected uptime</span>
          </div>
        </div>

        {/* Message */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Your request crashed the market</h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
            Something went wrong on our end. Your portfolio data is safe — this
            was a runtime error, not a margin call.
          </p>
        </div>

        {/* Error details — collapsible; never expose raw message in production */}
        {(error.digest || process.env.NODE_ENV !== "production") && (
          <details className="group rounded-xl border border-border bg-muted/30 text-xs font-mono overflow-hidden">
            <summary className="px-4 py-3 cursor-pointer text-muted-foreground select-none flex items-center gap-2 hover:text-foreground transition-colors">
              <span className="inline-block transition-transform group-open:rotate-90">▶</span>
              Error details
              {error.digest && (
                <span className="ml-auto opacity-50 font-sans">#{error.digest}</span>
              )}
            </summary>
            <div className="px-4 pb-4 pt-1 text-destructive/80 break-all leading-relaxed border-t border-border">
              {process.env.NODE_ENV !== "production" ? error.message || "Unknown error" : `Digest: ${error.digest}`}
            </div>
          </details>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={reset} className="flex-1 gap-2">
            <RotateCcw className="size-4" />
            Try again
          </Button>
          <Link
            href="/"
            className="group inline-flex h-7 items-center gap-1.5 rounded-full border border-border px-3 text-[13px] tracking-tight text-muted-foreground transition-all duration-200 hover:border-primary/30 hover:bg-muted/60 hover:text-foreground"
          >
            <IconArrowLeft className="size-3.5 transition-transform duration-200 ease-out group-hover:-translate-x-0.5" />
            Back to home
          </Link>
        </div>

        <p className="text-center text-[11px] text-muted-foreground/40 tracking-wide">
          If this keeps happening, contact support.
        </p>
      </div>
    </div>
  )
}
