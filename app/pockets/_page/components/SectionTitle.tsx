"use client"

import { memo } from "react"

interface SectionTitleProps {
  children: string
}

export const SectionTitle = memo(function SectionTitle({ children }: SectionTitleProps) {
  return (
    <div className="relative flex items-center py-6 md:py-8 pl-[82px] pr-4 sm:pl-[90px] lg:pl-[98px]">
      <span
        className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-muted-foreground/30 via-muted-foreground/60 to-muted-foreground/30"
        aria-hidden
      />
      <h2 className="relative z-10 bg-background pr-5 text-2xl font-medium tracking-tight text-foreground md:text-3xl md:tracking-tight">
        {children}
      </h2>
    </div>
  )
})

SectionTitle.displayName = "SectionTitle"
