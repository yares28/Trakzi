"use client"

import { memo } from "react"
import { useTransferCounts } from "@/hooks/use-transfers"

/**
 * Pill rendered inline next to the Transfers nav item.
 * Hidden when there's nothing to review — the absence of a badge IS the signal.
 */
export const TransfersNavBadge = memo(function TransfersNavBadge() {
    const { data } = useTransferCounts()
    const open = data?.openCount ?? 0
    if (open <= 0) return null

    return (
        <span
            className="ml-auto inline-flex items-center justify-center rounded-full bg-amber-500/90 text-white text-[10px] font-semibold leading-none px-1.5 min-w-[18px] h-[18px] tabular-nums group-data-[collapsible=icon]:hidden"
            aria-label={`${open} transfer${open > 1 ? "s" : ""} to review`}
        >
            {open > 99 ? "99+" : open}
        </span>
    )
})
TransfersNavBadge.displayName = "TransfersNavBadge"
