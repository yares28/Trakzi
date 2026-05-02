"use client"

import { memo } from "react"
import { TrendingUp, TrendingDown } from "lucide-react"
import { useNetWorth } from "@/hooks/use-net-worth"
import { useAccountFilter } from "@/components/account-filter-provider"

function formatInCurrency(amount: number, currencyCode: string): string {
    try {
        return new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: currencyCode,
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(amount)
    } catch {
        return `${currencyCode} ${amount.toFixed(2)}`
    }
}

export const NetWorthCard = memo(function NetWorthCard() {
    const { data, isLoading } = useNetWorth()
    const { clear: clearAccountFilter } = useAccountFilter()

    if (isLoading) {
        return (
            <div className="rounded-lg border p-4 space-y-2">
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                <div className="h-8 w-32 bg-muted rounded animate-pulse" />
            </div>
        )
    }

    if (!data || data.breakdown.length === 0) return null

    // Sort currencies alphabetically for a stable order; filter out zero-balance entries.
    const currencies = Object.entries(data.byCurrency)
        .filter(([, t]) => t.assets !== 0 || t.liabilities !== 0)
        .sort(([a], [b]) => a.localeCompare(b))

    const isSingleCurrency = currencies.length <= 1
    const primary = currencies[0]?.[1] ?? { assets: 0, liabilities: 0, netWorth: 0 }
    const primaryCode = currencies[0]?.[0] ?? data.primaryCurrency
    const showScopePill = data.filterActive && data.totalAccountCount > data.filteredAccountCount

    return (
        <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Net Worth</p>
                {isSingleCurrency && (
                    primary.netWorth >= 0
                        ? <TrendingUp className="size-4 text-green-500" />
                        : <TrendingDown className="size-4 text-destructive" />
                )}
            </div>

            {isSingleCurrency ? (
                <>
                    <p className={`text-2xl font-bold tabular-nums ${primary.netWorth >= 0 ? "" : "text-destructive"}`}>
                        {formatInCurrency(primary.netWorth, primaryCode)}
                    </p>
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span>
                            Assets:{" "}
                            <span className="text-foreground font-medium">
                                {formatInCurrency(primary.assets, primaryCode)}
                            </span>
                        </span>
                        <span>
                            Liabilities:{" "}
                            <span className="text-foreground font-medium">
                                {formatInCurrency(primary.liabilities, primaryCode)}
                            </span>
                        </span>
                    </div>
                </>
            ) : (
                <div className="space-y-3">
                    {currencies.map(([code, totals]) => (
                        <div key={code} className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground shrink-0">
                                    {code}
                                </span>
                                <span className={`text-base font-bold tabular-nums ${totals.netWorth >= 0 ? "" : "text-destructive"}`}>
                                    {formatInCurrency(totals.netWorth, code)}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                <span>
                                    Assets:{" "}
                                    <span className="text-foreground font-medium">
                                        {formatInCurrency(totals.assets, code)}
                                    </span>
                                </span>
                                <span>
                                    Liabilities:{" "}
                                    <span className="text-foreground font-medium">
                                        {formatInCurrency(totals.liabilities, code)}
                                    </span>
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showScopePill && (
                <div className="flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
                    <span>
                        Viewing {data.filteredAccountCount} of {data.totalAccountCount} accounts
                    </span>
                    <button
                        type="button"
                        onClick={clearAccountFilter}
                        className="ml-auto rounded px-1.5 py-0.5 font-medium text-foreground hover:bg-muted"
                    >
                        Show all
                    </button>
                </div>
            )}
        </div>
    )
})

NetWorthCard.displayName = "NetWorthCard"
