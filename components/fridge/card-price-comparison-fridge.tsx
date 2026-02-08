"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { IconArrowUp, IconArrowDown, IconTrendingUp, IconShoppingCart, IconReceipt } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

interface ReceiptTransaction {
    id: number
    description: string
    pricePerUnit: number
    totalPrice: number
    receiptDate: string
    storeName: string | null
}

interface PriceComparisonProps {
    data: ReceiptTransaction[]
    isLoading?: boolean
}

interface PriceChange {
    productName: string
    currentPrice: number
    previousPrice: number
    change: number
    changePercent: number
    currentDate: string
    previousDate: string
    currentStore: string
    previousStore: string
}

export function CardPriceComparisonFridge({ data, isLoading = false }: PriceComparisonProps) {
    const [showAll, setShowAll] = React.useState(false)

    const { priceChanges, hasData, hasMultiplePurchases } = React.useMemo(() => {
        if (!data || data.length === 0) return { priceChanges: [], hasData: false, hasMultiplePurchases: false }

        // Group by normalized product name
        const byProduct = new Map<string, ReceiptTransaction[]>()

        data.forEach((item) => {
            const normalized = item.description.toLowerCase().trim()
            const existing = byProduct.get(normalized) || []
            existing.push(item)
            byProduct.set(normalized, existing)
        })

        // Check if any products have multiple purchases
        let hasMultiple = false
        byProduct.forEach((purchases) => {
            if (purchases.length >= 2) hasMultiple = true
        })

        // Find products with multiple purchases and price changes
        const changes: PriceChange[] = []

        byProduct.forEach((purchases) => {
            if (purchases.length < 2) return

            // Sort by date descending
            const sorted = [...purchases].sort(
                (a, b) => new Date(b.receiptDate).getTime() - new Date(a.receiptDate).getTime()
            )

            const current = sorted[0]
            const previous = sorted[1]

            const currentPrice = current.pricePerUnit || current.totalPrice
            const previousPrice = previous.pricePerUnit || previous.totalPrice

            if (currentPrice === previousPrice) return

            const change = currentPrice - previousPrice
            const changePercent = ((change / previousPrice) * 100)

            changes.push({
                productName: current.description,
                currentPrice,
                previousPrice,
                change,
                changePercent,
                currentDate: current.receiptDate,
                previousDate: previous.receiptDate,
                currentStore: current.storeName || "Unknown",
                previousStore: previous.storeName || "Unknown",
            })
        })

        // Sort by absolute change percent (biggest changes first)
        return {
            priceChanges: changes.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent)),
            hasData: data.length > 0,
            hasMultiplePurchases: hasMultiple,
        }
    }, [data])

    const displayedChanges = showAll ? priceChanges : priceChanges.slice(0, 5)
    const hasMore = priceChanges.length > 5

    if (isLoading) {
        return (
            <Card className="h-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <IconTrendingUp className="h-5 w-5" />
                        Price Changes
                    </CardTitle>
                    <CardDescription>Analyzing your purchase history...</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        )
    }

    // No data at all
    if (!hasData) {
        return (
            <Card className="h-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <IconTrendingUp className="h-5 w-5" />
                        Price Changes
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-4">
                            <IconReceipt className="h-8 w-8 text-primary/60" />
                        </div>
                        <h3 className="text-sm font-medium mb-1">No receipts uploaded yet</h3>
                        <p className="text-xs text-muted-foreground max-w-[200px]">
                            Upload your first receipt to start tracking price changes on the items you buy
                        </p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    // Has data but no products with multiple purchases
    if (!hasMultiplePurchases) {
        return (
            <Card className="h-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <IconTrendingUp className="h-5 w-5" />
                        Price Changes
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center justify-center text-center">
                        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-amber-500/10 to-amber-500/5 flex items-center justify-center mb-4">
                            <IconShoppingCart className="h-8 w-8 text-amber-500/60" />
                        </div>
                        <h3 className="text-sm font-medium mb-1">Keep shopping!</h3>
                        <p className="text-xs text-muted-foreground max-w-[220px]">
                            Buy the same items multiple times and we'll track price changes automatically
                        </p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    // Has multiple purchases but no price changes detected
    if (priceChanges.length === 0) {
        return (
            <Card className="h-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <IconTrendingUp className="h-5 w-5" />
                        Price Changes
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-green-500/10 to-green-500/5 flex items-center justify-center mb-4">
                            <IconTrendingUp className="h-8 w-8 text-green-500/60" />
                        </div>
                        <h3 className="text-sm font-medium mb-1">Prices are stable</h3>
                        <p className="text-xs text-muted-foreground max-w-[220px]">
                            No significant price changes detected on items you've bought multiple times
                        </p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <IconTrendingUp className="h-5 w-5" />
                    Price Changes
                </CardTitle>
                <CardDescription>
                    {priceChanges.length} item{priceChanges.length !== 1 ? "s" : ""} with price changes
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {displayedChanges.map((item, index) => {
                        const isIncrease = item.change > 0
                        const isSignificant = Math.abs(item.changePercent) > 10

                        return (
                            <div
                                key={`${item.productName}-${index}`}
                                className={cn(
                                    "flex items-center justify-between p-3 rounded-lg border transition-colors",
                                    isSignificant && isIncrease && "border-red-500/20 bg-red-500/5",
                                    isSignificant && !isIncrease && "border-green-500/20 bg-green-500/5",
                                    !isSignificant && "border-border bg-muted/20"
                                )}
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{item.productName}</p>
                                    <p className="text-xs text-muted-foreground">
                                        ${item.previousPrice.toFixed(2)} → ${item.currentPrice.toFixed(2)}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 ml-2">
                                    <Badge
                                        variant="secondary"
                                        className={cn(
                                            "text-xs font-mono",
                                            isIncrease ? "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30" : "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30"
                                        )}
                                    >
                                        {isIncrease ? (
                                            <IconArrowUp className="h-3 w-3 mr-0.5" />
                                        ) : (
                                            <IconArrowDown className="h-3 w-3 mr-0.5" />
                                        )}
                                        {Math.abs(item.changePercent).toFixed(0)}%
                                    </Badge>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {hasMore && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-3"
                        onClick={() => setShowAll(!showAll)}
                    >
                        {showAll ? "Show less" : `Show ${priceChanges.length - 5} more`}
                    </Button>
                )}
            </CardContent>
        </Card>
    )
}
