"use client"

/**
 * Test page for @dnd-kit sortable charts with auto-scroll
 * 
 * This demonstrates the new drag-and-drop system with working auto-scroll.
 * Use this as a reference for migrating other pages from GridStack to @dnd-kit.
 */

import { useState, useEffect, useCallback } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { SortableGridProvider, SortableGridItem } from "@/components/sortable-grid"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { ChartLoadingState } from "@/components/chart-loading-state"
import { deduplicatedFetch } from "@/lib/request-deduplication"
import { normalizeTransactions } from "@/lib/utils"
import { useDateFilter } from "@/components/date-filter-provider"
import { type ChartId } from "@/lib/chart-card-sizes.config"

type Transaction = {
    id: number
    date: string
    description: string
    amount: number
    category: string
}

// Chart definitions for this test page
const TEST_CHARTS: { id: ChartId; title: string; w: 6 | 12; h: number }[] = [
    { id: "incomeExpensesTracking1" as ChartId, title: "Income Tracking", w: 12, h: 6 },
    { id: "expenseBreakdown" as ChartId, title: "Expense Breakdown", w: 6, h: 8 },
    { id: "needsWantsBreakdown" as ChartId, title: "Needs vs Wants", w: 6, h: 8 },
    { id: "dayOfWeekSpending" as ChartId, title: "Day of Week Spending", w: 6, h: 6 },
    { id: "allMonthsCategorySpending" as ChartId, title: "Monthly Category", w: 6, h: 6 },
    { id: "transactionHistory" as ChartId, title: "Transaction History", w: 12, h: 8 },
    { id: "cashFlowSankey" as ChartId, title: "Cash Flow", w: 12, h: 10 },
    { id: "spendingStreamgraph" as ChartId, title: "Spending Stream", w: 12, h: 8 },
]

// Storage key for order persistence
const ORDER_STORAGE_KEY = "test-dndkit-chart-order"

export default function TestDndKitPage() {
    // Chart order state
    const [chartOrder, setChartOrder] = useState<string[]>(() =>
        TEST_CHARTS.map(c => c.id)
    )

    // Transaction data
    const { filter: dateFilter } = useDateFilter()
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // Load saved order from localStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem(ORDER_STORAGE_KEY)
            if (saved) {
                const parsed = JSON.parse(saved)
                if (Array.isArray(parsed) && parsed.length === TEST_CHARTS.length) {
                    setChartOrder(parsed)
                }
            }
        } catch (e) {
            console.error("Failed to load chart order:", e)
        }
    }, [])

    // Save order to localStorage
    const handleOrderChange = useCallback((newOrder: string[]) => {
        setChartOrder(newOrder)
        try {
            localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(newOrder))
        } catch (e) {
            console.error("Failed to save chart order:", e)
        }
    }, [])

    // Fetch transactions
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true)
            try {
                const url = dateFilter
                    ? `/api/transactions?filter=${encodeURIComponent(dateFilter)}`
                    : "/api/transactions"
                const data = await deduplicatedFetch<any[]>(url)
                if (Array.isArray(data)) {
                    setTransactions(normalizeTransactions(data) as unknown as Transaction[])
                }
            } catch (e) {
                console.error("Failed to fetch transactions:", e)
            } finally {
                setIsLoading(false)
            }
        }
        fetchData()
    }, [dateFilter])

    // Get chart config by ID
    const getChartConfig = (id: string) => {
        return TEST_CHARTS.find(c => c.id === id) || { id, title: id, w: 12 as const, h: 6 }
    }

    return (
        <SidebarProvider
            style={{
                "--sidebar-width": "calc(var(--spacing) * 72 - 15px)",
                "--header-height": "calc(var(--spacing) * 12)",
            } as React.CSSProperties}
        >
            <AppSidebar variant="inset" />
            <SidebarInset>
                <SiteHeader />
                <main className="flex-1 space-y-4 p-4 pt-0 lg:p-6 lg:pt-2">
                    <div className="flex flex-col gap-2">
                        {/* Page header */}
                        <div className="px-4 lg:px-6 py-4">
                            <h1 className="text-2xl font-bold">@dnd-kit Drag Test</h1>
                            <p className="text-muted-foreground">
                                Drag cards to reorder. Auto-scroll works when dragging near edges!
                            </p>
                        </div>

                        {/* Chart grid with @dnd-kit */}
                        <div className="px-4 lg:px-6">
                            <SortableGridProvider
                                chartOrder={chartOrder}
                                onOrderChange={handleOrderChange}
                            >
                                {chartOrder.map((chartId) => {
                                    const config = getChartConfig(chartId)

                                    return (
                                        <SortableGridItem
                                            key={chartId}
                                            id={chartId}
                                            w={config.w}
                                            h={config.h}
                                        >
                                            <Card className="@container/card h-full flex flex-col">
                                                <CardHeader className="flex flex-row items-center gap-2 py-3">
                                                    <GridStackCardDragHandle />
                                                    <ChartFavoriteButton
                                                        chartId={chartId as ChartId}
                                                        chartTitle={config.title}
                                                        size="md"
                                                    />
                                                    <CardTitle className="text-base font-semibold">
                                                        {config.title}
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="flex-1 min-h-0 flex items-center justify-center">
                                                    {isLoading ? (
                                                        <ChartLoadingState />
                                                    ) : (
                                                        <div className="text-center text-muted-foreground">
                                                            <p className="text-lg font-medium">{config.title}</p>
                                                            <p className="text-sm">
                                                                {transactions.length} transactions loaded
                                                            </p>
                                                            <p className="text-xs mt-2">
                                                                Drag the grip icon to reorder
                                                            </p>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        </SortableGridItem>
                                    )
                                })}
                            </SortableGridProvider>
                        </div>
                    </div>
                </main>
            </SidebarInset>
        </SidebarProvider>
    )
}
