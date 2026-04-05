"use client"

import { memo, useState } from "react"
import { ArrowLeftRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePendingTransfers } from "@/hooks/use-transfers"
import { TransferReviewDialog } from "./TransferReviewDialog"

export const TransferReviewBanner = memo(function TransferReviewBanner() {
    const { data: transfers = [] } = usePendingTransfers()
    const [dialogOpen, setDialogOpen] = useState(false)

    if (transfers.length === 0) return null

    return (
        <>
            <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20 px-4 py-3">
                <ArrowLeftRight className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <p className="text-sm flex-1">
                    <span className="font-medium text-amber-900 dark:text-amber-200">
                        {transfers.length} potential transfer{transfers.length > 1 ? "s" : ""} detected
                    </span>
                    <span className="text-amber-700 dark:text-amber-400 ml-1.5">
                        — review them to keep your analytics accurate.
                    </span>
                </p>
                <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 h-7 text-xs border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                    onClick={() => setDialogOpen(true)}
                >
                    Review
                </Button>
            </div>

            <TransferReviewDialog open={dialogOpen} onOpenChange={setDialogOpen} />
        </>
    )
})

TransferReviewBanner.displayName = "TransferReviewBanner"
