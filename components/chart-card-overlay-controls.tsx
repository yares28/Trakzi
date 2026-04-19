"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Chart card header: **left** = drag → expand → favorite → title (title wraps);
 * **right** = `ChartCardTopRightControl` (Basic/Cumulative, filters, etc.).
 * Row and leading use `items-center` so icons, title, and trailing controls align on the Y axis.
 * `!flex` overrides the default `CardHeader` grid so this row layout applies.
 */
export const chartCardHeaderRowClassName =
  "!flex w-full min-w-0 flex-row items-center justify-between gap-2 pb-0"

/** Wraps icon cluster + title on the left; grows so the title can wrap without hitting right controls. */
export const chartCardHeaderLeadingClassName =
  "flex min-w-0 flex-1 items-center gap-2"

/** Drag handle, expand, favorite — fixed cluster before the title. */
export const chartCardHeaderIconClusterClassName = "flex shrink-0 items-center gap-2"

export const chartCardHeaderTitleClassName =
  "min-w-0 flex-1 text-base leading-snug tracking-tight break-words [overflow-wrap:anywhere]"

/** @deprecated Use chartCardHeaderRowClassName */
export const chartCardHeaderShellClassName = chartCardHeaderRowClassName

/** @deprecated Use chartCardHeaderIconClusterClassName */
export const chartCardHeaderControlsClassName = chartCardHeaderIconClusterClassName

/**
 * Styles for chart card top-right triggers (dropdowns, popovers) so they match
 * plain select-style controls instead of the default Button outline hover.
 */
export const chartCardMenuTriggerClassName =
  "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex h-9 items-center justify-between gap-2 rounded-md border bg-transparent px-2.5 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"

/** Sizes menu/popover triggers to their label; caps width when used inside header row controls. */
export const chartCardMenuTriggerWidthClassName = "w-fit max-w-full min-w-0"

/**
 * Keeps Select triggers content-sized (base trigger is `w-fit`); caps width and allows value truncation.
 * Use in `ChartCardTopRightControl` within `CardHeader`.
 */
export const chartCardOverlaySelectWidthClassName =
  "max-w-full min-w-0 [&_[data-slot=select-value]]:min-w-0"

type ChartCardFloatingMetaProps = {
  className?: string
  /** Shown above the info control (typically `ChartAiInsightButton`). */
  insight: React.ReactNode
  /** Info popover trigger (typically `ChartInfoPopover`). */
  info: React.ReactNode
}

/** Bottom-left overlay on chart cards: insight above info. */
export const ChartCardFloatingMeta = React.memo(function ChartCardFloatingMeta({
  className,
  insight,
  info,
}: ChartCardFloatingMetaProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute bottom-2 left-2 z-20 flex flex-col items-center gap-2 sm:bottom-3 sm:left-3",
        "[&_*]:pointer-events-auto",
        className
      )}
    >
      {insight}
      {info}
    </div>
  )
})

ChartCardFloatingMeta.displayName = "ChartCardFloatingMeta"

type ChartCardTopRightControlProps = {
  className?: string
  children: React.ReactNode
}

/** Top-right overlay for data / view switchers on chart cards. */
export const ChartCardTopRightControl = React.memo(function ChartCardTopRightControl({
  className,
  children,
}: ChartCardTopRightControlProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute right-2 top-4 z-20 sm:right-3 sm:top-5",
        "[&_*]:pointer-events-auto",
        className
      )}
    >
      {children}
    </div>
  )
})

ChartCardTopRightControl.displayName = "ChartCardTopRightControl"
