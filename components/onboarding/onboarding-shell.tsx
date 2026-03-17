// components/onboarding/onboarding-shell.tsx
// Responsive container for all onboarding modals:
//   Mobile  → bottom sheet, full width, rounded top corners, slides up
//   Desktop → centered modal, scales with viewport, fully rounded
"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Dialog, DialogPortal, DialogOverlay } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface OnboardingShellProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

export function OnboardingShell({ open, onOpenChange, children }: OnboardingShellProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        {/*
          Mobile  : align to bottom edge (bottom sheet)
          sm+     : center in viewport
        */}
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none sm:p-6">
          <DialogPrimitive.Content
            className={cn(
              "pointer-events-auto relative w-full bg-background border shadow-2xl overflow-hidden",

              // ── Sizing ──────────────────────────────────────────────────
              // Mobile: full width (no max-w)
              // sm   : 448 px
              // lg   : 560 px
              // xl   : 640 px
              "sm:max-w-md lg:max-w-lg xl:max-w-xl",

              // ── Shape ───────────────────────────────────────────────────
              // Mobile: only top corners rounded (bottom sheet)
              // sm+  : all corners rounded
              "rounded-t-3xl sm:rounded-2xl",

              // ── Animations ──────────────────────────────────────────────
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
              "duration-300 ease-out",

              // Mobile: slide up from bottom
              "data-[state=open]:slide-in-from-bottom-8",
              "data-[state=closed]:slide-out-to-bottom-8",

              // Desktop: cancel slide, use zoom instead
              "sm:data-[state=open]:slide-in-from-bottom-0",
              "sm:data-[state=closed]:slide-out-to-bottom-0",
              "sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95",
            )}
          >
            {/* Mobile drag handle pill */}
            <div className="flex justify-center pt-3 pb-0 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
            </div>

            {children}
          </DialogPrimitive.Content>
        </div>
      </DialogPortal>
    </Dialog>
  )
}

OnboardingShell.displayName = "OnboardingShell"
