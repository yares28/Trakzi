"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { IconBuildingStore, IconChevronsDown, IconInfoCircle, IconReceipt, IconMapPin } from "@tabler/icons-react"
import { useColorScheme } from "@/components/color-scheme-provider"
import { cn } from "@/lib/utils"

interface ReceiptTransaction {
    id: number
    description: string
    pricePerUnit: number
    totalPrice: number
    receiptDate: string
    storeName: string | null
    categoryName?: string | null
}

interface StoreAnalysisProps {
    data: ReceiptTransaction[]
    isLoading?: boolean
}

interface StoreCategory {
    category: string
    avgPrice: number
    itemCount: number
}

interface StoreStats {
    storeName: string
    totalSpent: number
    itemCount: number
    categories: StoreCategory[]
    avgPricePerItem: number
}

interface CategoryRecommendation {
    category: string
    cheapestStore: string
    cheapestAvg: number
    mostExpensiveStore: string
    mostExpensiveAvg: number
    savings: number
    savingsPercent: number
}

export function CardStoreAnalysisFridge({ data, isLoading = false }: StoreAnalysisProps) {
    const [showAllRecs, setShowAllRecs] = React.useState(false)
    const [showAllStores, setShowAllStores] = React.useState(false)
    const { getPalette } = useColorScheme()

    const palette = React.useMemo(() => {
        return getPalette()
    }, [getPalette])

    const { storeStats, recommendations, hasData, storeCount } = React.useMemo(() => {
        if (!data || data.length === 0) return { storeStats: [], recommendations: [], hasData: false, storeCount: 0 }

        // Group by store
        const byStore = new Map<string, ReceiptTransaction[]>()

        data.forEach((item) => {
            const store = item.storeName || "Unknown Store"
            const existing = byStore.get(store) || []
            existing.push(item)
            byStore.set(store, existing)
        })

        // Calculate stats per store
        const stats: StoreStats[] = []

        byStore.forEach((items, storeName) => {
            const totalSpent = items.reduce((sum, i) => sum + i.totalPrice, 0)

            // Group by category within store
            const byCategory = new Map<string, ReceiptTransaction[]>()
            items.forEach((item) => {
                const cat = item.categoryName || "Uncategorized"
                const existing = byCategory.get(cat) || []
                existing.push(item)
                byCategory.set(cat, existing)
            })

            const categories: StoreCategory[] = []
            byCategory.forEach((catItems, category) => {
                const avgPrice = catItems.reduce((sum, i) => sum + (i.pricePerUnit || i.totalPrice), 0) / catItems.length
                categories.push({ category, avgPrice, itemCount: catItems.length })
            })

            stats.push({
                storeName,
                totalSpent,
                itemCount: items.length,
                categories,
                avgPricePerItem: totalSpent / items.length,
            })
        })

        // Generate category recommendations
        const catByStore = new Map<string, Map<string, number[]>>()

        data.forEach((item) => {
            const cat = item.categoryName || "Uncategorized"
            const store = item.storeName || "Unknown"
            const price = item.pricePerUnit || item.totalPrice

            if (!catByStore.has(cat)) catByStore.set(cat, new Map())
            const storeMap = catByStore.get(cat)!
            if (!storeMap.has(store)) storeMap.set(store, [])
            storeMap.get(store)!.push(price)
        })

        const recs: CategoryRecommendation[] = []

        catByStore.forEach((stores, category) => {
            if (stores.size < 2) return // Need at least 2 stores to compare

            const storeAvgs: { store: string; avg: number }[] = []
            stores.forEach((prices, store) => {
                storeAvgs.push({ store, avg: prices.reduce((a, b) => a + b, 0) / prices.length })
            })

            storeAvgs.sort((a, b) => a.avg - b.avg)

            const cheapest = storeAvgs[0]
            const mostExpensive = storeAvgs[storeAvgs.length - 1]

            const savings = mostExpensive.avg - cheapest.avg
            const savingsPercent = (savings / mostExpensive.avg) * 100

            if (savingsPercent > 5) { // Only show if meaningful difference
                recs.push({
                    category,
                    cheapestStore: cheapest.store,
                    cheapestAvg: cheapest.avg,
                    mostExpensiveStore: mostExpensive.store,
                    mostExpensiveAvg: mostExpensive.avg,
                    savings,
                    savingsPercent,
                })
            }
        })

        recs.sort((a, b) => b.savingsPercent - a.savingsPercent)

        return {
            storeStats: stats.sort((a, b) => b.totalSpent - a.totalSpent),
            recommendations: recs,
            hasData: data.length > 0,
            storeCount: byStore.size,
        }
    }, [data])

    const displayedRecs = showAllRecs ? recommendations : recommendations.slice(0, 5)
    const displayedStores = showAllStores ? storeStats : storeStats.slice(0, 4)
    const hasMoreRecs = recommendations.length > 5
    const hasMoreStores = storeStats.length > 4

    if (isLoading) {
        return (
            <Card className="h-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <IconBuildingStore className="h-5 w-5" />
                        Store Analysis
                    </CardTitle>
                    <CardDescription>Analyzing your shopping patterns...</CardDescription>
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
                        <IconBuildingStore className="h-5 w-5" />
                        Store Analysis
                    </CardTitle>
                    <CardDescription>Compare prices across stores</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-4">
                            <IconReceipt className="h-8 w-8 text-primary/60" />
                        </div>
                        <h3 className="text-sm font-medium mb-1">No receipts uploaded yet</h3>
                        <p className="text-xs text-muted-foreground max-w-[200px]">
                            Upload receipts from different stores to find where you get the best deals
                        </p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    // Only one store
    if (storeCount === 1) {
        return (
            <Card className="h-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <IconBuildingStore className="h-5 w-5" />
                        Store Analysis
                    </CardTitle>
                    <CardDescription>Compare prices across stores</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-amber-500/10 to-amber-500/5 flex items-center justify-center mb-4">
                            <IconMapPin className="h-8 w-8 text-amber-500/60" />
                        </div>
                        <h3 className="text-sm font-medium mb-1">Only one store detected</h3>
                        <p className="text-xs text-muted-foreground max-w-[220px]">
                            Upload receipts from at least 2 different stores to compare prices and find savings
                        </p>
                        {storeStats[0] && (
                            <div className="mt-4 p-3 rounded-lg bg-muted/30 text-left w-full">
                                <p className="text-sm font-medium">{storeStats[0].storeName}</p>
                                <p className="text-xs text-muted-foreground">
                                    {storeStats[0].itemCount} items • ${storeStats[0].totalSpent.toFixed(2)} total
                                </p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        )
    }

    // Multiple stores but no recommendations (no meaningful price differences)
    if (recommendations.length === 0) {
        return (
            <Card className="h-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <IconBuildingStore className="h-5 w-5" />
                        Store Analysis
                    </CardTitle>
                    <CardDescription>{storeCount} stores analyzed</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Spending by Store</h4>
                        <div className="space-y-2">
                            {displayedStores.map((store) => (
                                <div
                                    key={store.storeName}
                                    className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                                >
                                    <div>
                                        <p className="font-medium text-sm">{store.storeName}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {store.itemCount} items • avg ${store.avgPricePerItem.toFixed(2)}/item
                                        </p>
                                    </div>
                                    <span className="font-mono text-sm font-medium">
                                        ${store.totalSpent.toFixed(2)}
                                    </span>
                                </div>
                            ))}
                        </div>
                        {hasMoreStores && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full"
                                onClick={() => setShowAllStores(!showAllStores)}
                            >
                                {showAllStores ? "Show less" : `Show ${storeStats.length - 4} more`}
                            </Button>
                        )}
                    </div>

                    <div className="flex flex-col items-center py-4 text-center border-t">
                        <p className="text-xs text-muted-foreground max-w-[220px]">
                            Prices are similar across stores — you're shopping smart!
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
                    <IconBuildingStore className="h-5 w-5" />
                    Store Analysis
                </CardTitle>
                <CardDescription>
                    {storeCount} stores • {recommendations.length} savings opportunit{recommendations.length !== 1 ? "ies" : "y"}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Store Overview */}
                <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Spending by Store</h4>
                    <div className="space-y-2">
                        {displayedStores.map((store, index) => (
                            <div
                                key={store.storeName}
                                className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                            >
                                <div className="flex items-center gap-2">
                                    <div
                                        className="h-3 w-3 rounded-full shrink-0"
                                        style={{ backgroundColor: palette[index % palette.length] }}
                                    />
                                    <div>
                                        <p className="font-medium text-sm">{store.storeName}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {store.itemCount} items • avg ${store.avgPricePerItem.toFixed(2)}/item
                                        </p>
                                    </div>
                                </div>
                                <span className="font-mono text-sm font-medium">
                                    ${store.totalSpent.toFixed(2)}
                                </span>
                            </div>
                        ))}
                    </div>
                    {hasMoreStores && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full"
                            onClick={() => setShowAllStores(!showAllStores)}
                        >
                            {showAllStores ? "Show less" : `Show ${storeStats.length - 4} more`}
                        </Button>
                    )}
                </div>

                {/* Recommendations */}
                <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <IconInfoCircle className="h-4 w-4" />
                        Recommendations
                    </h4>
                    <div className="space-y-2">
                        {displayedRecs.map((rec, index) => (
                            <div
                                key={`${rec.category}-${index}`}
                                className="p-3 rounded-lg border border-green-500/20 bg-green-500/5"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium">
                                            Buy <span className="text-primary">{rec.category}</span> at{" "}
                                            <span className="font-semibold">{rec.cheapestStore}</span>
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {Math.round(rec.savingsPercent)}% cheaper than {rec.mostExpensiveStore}
                                        </p>
                                    </div>
                                    <Badge variant="secondary" className="text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30 shrink-0">
                                        <IconChevronsDown className="h-3 w-3 mr-0.5" />
                                        ${rec.savings.toFixed(2)}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                    {hasMoreRecs && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full"
                            onClick={() => setShowAllRecs(!showAllRecs)}
                        >
                            {showAllRecs ? "Show less" : `Show ${recommendations.length - 5} more`}
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
