"use client"

import { memo, useState, useEffect, useCallback } from "react"
// @dnd-kit for drag-and-drop (replaces GridStack)
import { SortableGridProvider, SortableGridItem } from "@/components/sortable-grid"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { deduplicatedFetch } from "@/lib/request-deduplication"
import { getChartCardSize, type ChartId } from "@/lib/chart-card-sizes.config"
import type { TestChartsSummary } from "@/lib/charts/aggregations"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"
import { useDateFilter } from "@/components/date-filter-provider"
import { Button } from "@/components/ui/button"
import { Activity, ChevronRight } from "lucide-react"

// Import all test chart components
import {
    ChartCategoryBubbles,
    ChartWeekdayRadar,
} from "@/components/test-charts"

type TestChartsTransaction = {
    id: number
    date: string
    description: string
    amount: number
    balance: number | null
    category: string
}


interface TestChartProps {
    chartId: string
    data: TestChartsTransaction[]
    isLoading: boolean
}

const TestChart = memo(function TestChart({
    chartId,
    data,
    isLoading,
}: TestChartProps) {
    const chartProps = { data, isLoading }

    switch (chartId) {
        case "testCharts:categoryBubbles": return <ChartCategoryBubbles {...chartProps} />
        case "testCharts:weekdayRadar": return <ChartWeekdayRadar {...chartProps} />
        default: return null
    }
})

TestChart.displayName = "TestChart"

export default function TestChartsPage() {
    // @dnd-kit: Chart order state for each section
    const [analyticsOrder, setAnalyticsOrder] = useState<string[]>([
        "testCharts:categoryBubbles",
        "testCharts:weekdayRadar",
    ])

    // Load saved orders and sizes from localStorage
    const [analyticsSizes, setAnalyticsSizes] = useState<Record<string, { w: number; h: number }>>({})

    useEffect(() => {
        const savedAnalytics = localStorage.getItem('testCharts-analytics-order')
        if (savedAnalytics) setAnalyticsOrder(JSON.parse(savedAnalytics))

        const savedAnalyticsSizes = localStorage.getItem('testCharts-analytics-sizes')
        if (savedAnalyticsSizes) setAnalyticsSizes(JSON.parse(savedAnalyticsSizes))
    }, [])

    const handleAnalyticsOrderChange = (newOrder: string[]) => {
        setAnalyticsOrder(newOrder)
        localStorage.setItem('testCharts-analytics-order', JSON.stringify(newOrder))
    }

    const handleAnalyticsResize = (id: string, w: number, h: number) => {
        setAnalyticsSizes(prev => {
            const next = { ...prev, [id]: { w, h } }
            localStorage.setItem('testCharts-analytics-sizes', JSON.stringify(next))
            return next
        })
    }

    // Date filter state
    const { filter: dateFilter } = useDateFilter()

    // Data state
    const [rawTransactions, setRawTransactions] = useState<TestChartsTransaction[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // Fetch all data from bundle API
    const fetchAllData = useCallback(async () => {
        setIsLoading(true)
        try {
            const bundleUrl = dateFilter
                ? `/api/charts/test-charts-bundle?filter=${encodeURIComponent(dateFilter)}`
                : "/api/charts/test-charts-bundle"

            const bundleData = await deduplicatedFetch<TestChartsSummary>(bundleUrl).catch(() => ({
                transactions: [],
                receiptTransactions: []
            }))

            if (bundleData && Array.isArray(bundleData.transactions)) {
                setRawTransactions(bundleData.transactions)
            } else {
                setRawTransactions([])
            }
        } catch {
            setRawTransactions([])
        } finally {
            setIsLoading(false)
        }
    }, [dateFilter])

    useEffect(() => {
        fetchAllData()
    }, [fetchAllData])

    return (
        <SidebarProvider
            style={
                {
                    "--sidebar-width": "calc(var(--spacing) * 72 - 15px)",
                    "--header-height": "calc(var(--spacing) * 12)",
                } as React.CSSProperties
            }
        >
            <AppSidebar variant="inset" />
            <SidebarInset>
                <SiteHeader />
                <main className="flex-1 space-y-8 p-4 pt-0 lg:p-6 lg:pt-2">
                    {/* Sticky Navigation Bar */}
                    <div className="sticky top-[var(--header-height)] z-30 -mx-4 px-4 py-3 bg-background/80 backdrop-blur-md border-b border-border/40 lg:-mx-6 lg:px-6">
                        <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                            <Button
                                variant="outline"
                                size="sm"
                                className="rounded-full bg-background/50 border-border/60 hover:border-primary/50 transition-all gap-2 shrink-0 shadow-sm"
                                onClick={() => document.getElementById('analytics-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                            >
                                <Activity className="w-3.5 h-3.5 text-primary" />
                                <span className="text-xs font-semibold">Analytics</span>
                            </Button>
<div className="ml-auto flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-muted-foreground/60 px-2">
                                <span>Playground</span>
                                <ChevronRight className="w-3 h-3" />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-8 pb-12">
                        {/* Analytics Section */}
                        <section id="analytics-section" className="space-y-4 scroll-mt-24">
                            <div className="px-4 lg:px-6">
                                <h2 className="text-2xl font-bold tracking-tight">Analytics Playground</h2>
                                <p className="text-muted-foreground text-sm">Experimental chart components under development.</p>
                            </div>
                            <SortableGridProvider
                                chartOrder={analyticsOrder}
                                onOrderChange={handleAnalyticsOrderChange}
                                className="w-full px-4 lg:px-6"
                            >
                                {analyticsOrder.map((chartId) => {
                                    const sizeConfig = getChartCardSize(chartId as ChartId)
                                    const savedSize = analyticsSizes[chartId]
                                    return (
                                        <SortableGridItem
                                            key={chartId}
                                            id={chartId}
                                            w={(savedSize?.w ?? sizeConfig.minW) as any}
                                            h={savedSize?.h ?? sizeConfig.minH}
                                            resizable
                                            onResize={handleAnalyticsResize}
                                        >
                                            <TestChart chartId={chartId} data={rawTransactions} isLoading={isLoading} />
                                        </SortableGridItem>
                                    )
                                })}
                            </SortableGridProvider>
                        </section>
                    </div>
                </main>
            </SidebarInset>
        </SidebarProvider>
    )
}
