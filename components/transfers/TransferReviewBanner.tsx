"use client"

import { memo } from "react"
import Link from "next/link"
import { ArrowLeftRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTransferCounts } from "@/hooks/use-transfers"

const STALE_THRESHOLD = 3

/**
 * Two-tier prompting per OQ-5: the sidebar badge always nudges when transfers are
 * pending. This banner only fires when there's a real backlog — more than 3 still
 * unresolved after a week — so it doesn't become wallpaper for the active user.
 */
export const TransferReviewBanner = memo(function TransferReviewBanner() {
    const { data } = useTransferCounts()
    const staleCount = data?.staleCount ?? 0
    const staleAgeDays = data?.staleAgeDays ?? 7

    if (staleCount <= STALE_THRESHOLD) return null

    return (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20 px-4 py-3">
            <ArrowLeftRight className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-sm flex-1">
                <span className="font-medium text-amber-900 dark:text-amber-200">
                    {staleCount} transfers still need review
                </span>
                <span className="text-amber-700 dark:text-amber-400 ml-1.5">
                    — they've been sitting for over {staleAgeDays} days and may be skewing your analytics.
                </span>
            </p>
            <Button
                asChild
                size="sm"
                variant="outline"
                className="shrink-0 h-7 text-xs border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/30"
            >
                <Link href="/transfers">Review</Link>
            </Button>
        </div>
    )
})

TransferReviewBanner.displayName = "TransferReviewBanner"
