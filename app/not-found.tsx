"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Home } from "lucide-react"

const ROWS = [
  ["ROUTE", "NOT FOUND"],
  ["STATUS CODE", "404"],
  ["CATEGORY", "Void / Uncategorised"],
  ["BALANCE OWED", "€0.00"],
]

export default function NotFound() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[var(--bg-0)] flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* Subtle ambient glow */}
      <div
        className="pointer-events-none fixed inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 50%, oklch(0.6716 0.1368 48.513 / 0.12) 0%, transparent 70%)",
        }}
      />

      <div className="relative w-full max-w-[360px] animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Perforated top edge */}
        <div className="flex items-end px-2 h-5 gap-[5px]">
          {Array.from({ length: 32 }).map((_, i) => (
            <div key={i} className="flex-1 h-3 rounded-t-full bg-card border border-border border-b-0" />
          ))}
        </div>

        {/* Receipt body */}
        <div className="bg-card border border-border border-y-0 px-7 py-6 space-y-5 font-mono text-sm">
          {/* Header */}
          <div className="text-center space-y-1">
            <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
              Trakzi Financial Services
            </p>
            <p className="text-[10px] text-muted-foreground">
              {new Date().toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>

          <div className="border-t border-dashed border-border" />

          {/* Giant 404 */}
          <div className="text-center select-none py-2">
            <span
              className="text-[84px] font-black leading-none tracking-tighter"
              style={{ color: "oklch(0.6716 0.1368 48.513)" }}
            >
              404
            </span>
            <p className="text-[10px] tracking-[0.25em] text-muted-foreground uppercase mt-1">
              Transaction Declined
            </p>
          </div>

          <div className="border-t border-dashed border-border" />

          {/* Ledger rows */}
          <div className="space-y-2">
            {ROWS.map(([label, value]) => (
              <div key={label} className="flex justify-between items-baseline gap-4">
                <span className="text-[11px] text-muted-foreground shrink-0">{label}</span>
                <span className="flex-1 border-b border-dotted border-border/50" />
                <span
                  className="text-[11px] font-medium shrink-0"
                  style={
                    label === "STATUS CODE"
                      ? { color: "oklch(0.6368 0.2078 25.3313)" }
                      : undefined
                  }
                >
                  {value}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-border" />

          {/* DECLINED stamp */}
          <div className="flex justify-center py-1">
            <div
              className="text-[11px] font-black tracking-[0.35em] uppercase px-4 py-1.5 rounded"
              style={{
                border: "2px solid oklch(0.6368 0.2078 25.3313 / 0.55)",
                color: "oklch(0.6368 0.2078 25.3313)",
                transform: "rotate(-3.5deg)",
                opacity: 0.75,
              }}
            >
              Declined
            </div>
          </div>

          <div className="border-t border-dashed border-border" />

          {/* Note */}
          <p className="text-center text-[11px] text-muted-foreground leading-relaxed">
            This page was quietly moved to<br />
            <em className="not-italic font-medium text-foreground/70">Uncategorised → Void</em>
            <br />and subsequently written off.
          </p>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button asChild className="flex-1 h-9 gap-1.5 text-xs">
              <Link href="/home">
                <Home className="size-3.5" />
                Go Home
              </Link>
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-9 gap-1.5 text-xs"
              onClick={() => router.back()}
            >
              <ArrowLeft className="size-3.5" />
              Go Back
            </Button>
          </div>

          {/* Receipt footer */}
          <p className="text-center text-[9px] text-muted-foreground/50 tracking-widest pt-1">
            TXN-{(404_000_000 + Math.floor(Math.random() * 99999999))
              .toString(16)
              .toUpperCase()}
          </p>
        </div>

        {/* Perforated bottom edge */}
        <div className="flex items-start px-2 h-5 gap-[5px]">
          {Array.from({ length: 32 }).map((_, i) => (
            <div key={i} className="flex-1 h-3 rounded-b-full bg-card border border-border border-t-0" />
          ))}
        </div>
      </div>
    </div>
  )
}
