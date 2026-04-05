"use client"

import { memo } from "react"
import { TrendingUp, TrendingDown } from "lucide-react"
import { useNetWorth } from "@/hooks/use-net-worth"
import { useCurrency } from "@/components/currency-provider"

export const NetWorthCard = memo(function NetWorthCard() {
    const { data, isLoading } = useNetWorth()
    const { formatCurrency } = useCurrency()

    if (isLoading) {
        return (
            <div className="rounded-lg border p-4 space-y-2">
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                <div className="h-8 w-32 bg-muted rounded animate-pulse" />
            </div>
        )
    }

    if (!data || data.breakdown.length === 0) return null

    const isPositive = data.netWorth >= 0

    return (
        <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Net Worth</p>
                {isPositive
                    ? <TrendingUp className="size-4 text-green-500" />
                    : <TrendingDown className="size-4 text-destructive" />
                }
            </div>

            <p className={`text-2xl font-bold tabular-nums ${isPositive ? "" : "text-destructive"}`}>
                {formatCurrency(data.netWorth)}
            </p>

            <div className="flex gap-4 text-xs text-muted-foreground">
                <span>
                    Assets: <span className="text-foreground font-medium">{formatCurrency(data.totalAssets)}</span>
                </span>
                <span>
                    Liabilities: <span className="text-foreground font-medium">{formatCurrency(data.totalLiabilities)}</span>
                </span>
            </div>
        </div>
    )
})

NetWorthCard.displayName = "NetWorthCard"
