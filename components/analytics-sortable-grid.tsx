"use client"

/**
 * Analytics Sortable Grid Wrapper
 * 
 * This wrapper provides @dnd-kit drag-and-drop with auto-scroll for the analytics page.
 * It's designed to be a drop-in replacement for the GridStack container while keeping
 * the existing chart structure unchanged.
 * 
 * Key features:
 * - Works with existing grid-stack-item-content divs inside
 * - Provides auto-scroll during drag
 * - Maintains chart order persistence
 * 
 * Usage:
 * <AnalyticsSortableGrid 
 *   chartOrder={analyticsChartOrder}
 *   onOrderChange={handleChartOrderChange}
 *   renderChart={(chartId, defaultSize, sizeConfig) => <ChartComponent ... />}
 * />
 */

import * as React from "react"
import { SortableGridProvider, SortableGridItem } from "./sortable-grid"
import { getChartCardSize, type ChartId } from "@/lib/chart-card-sizes.config"

// Default chart sizes for analytics page
const DEFAULT_CHART_SIZES: Record<string, { w: number; h: number; x?: number; y?: number }> = {
    "incomeExpensesTracking1": { w: 12, h: 6, x: 0, y: 0 },
    "incomeExpensesTracking2": { w: 12, h: 6, x: 0, y: 6 },
    "spendingCategoryRankings": { w: 12, h: 8, x: 0, y: 12 },
    "netWorthAllocation": { w: 12, h: 10, x: 0, y: 20 },
    "moneyFlow": { w: 6, h: 10, x: 0, y: 30 },
    "needsWantsBreakdown": { w: 6, h: 10, x: 6, y: 20 },
    "expenseBreakdown": { w: 6, h: 10, x: 6, y: 30 },
    "categoryBubbleMap": { w: 6, h: 10, x: 6, y: 40 },
    "householdSpendMix": { w: 6, h: 10, x: 0, y: 40 },
    "financialHealthScore": { w: 6, h: 10, x: 6, y: 30 },
    "spendingActivityRings": { w: 6, h: 10, x: 0, y: 50 },
    "spendingStreamgraph": { w: 12, h: 9, x: 0, y: 60 },
    "transactionHistory": { w: 12, h: 9, x: 0, y: 69 },
    "dailyTransactionActivity": { w: 12, h: 7, x: 0, y: 78 },
    "dayOfWeekSpending": { w: 6, h: 8, x: 6, y: 86 },
    "allMonthsCategorySpending": { w: 6, h: 8, x: 0, y: 94 },
    "singleMonthCategorySpending": { w: 6, h: 8, x: 6, y: 102 },
    "dayOfWeekCategory": { w: 6, h: 8, x: 0, y: 102 },
    "cashFlowSankey": { w: 12, h: 10, x: 0, y: 110 },
}

interface AnalyticsSortableGridProps {
    chartOrder: string[]
    onOrderChange: (newOrder: string[]) => void
    renderChart: (
        chartId: string,
        defaultSize: { w: number; h: number; x?: number; y?: number },
        sizeConfig: ReturnType<typeof getChartCardSize>
    ) => React.ReactNode
    className?: string
}

export function AnalyticsSortableGrid({
    chartOrder,
    onOrderChange,
    renderChart,
    className = "",
}: AnalyticsSortableGridProps) {
    return (
        <SortableGridProvider
            chartOrder={chartOrder}
            onOrderChange={onOrderChange}
            className={className}
        >
            {chartOrder.map((chartId) => {
                const defaultSize = DEFAULT_CHART_SIZES[chartId] || { w: 12, h: 6, x: 0, y: 0 }
                const sizeConfig = getChartCardSize(chartId as ChartId)
                const initialW = (defaultSize.w === 6 ? 6 : 12) as 6 | 12
                const initialH = defaultSize.h

                const chartElement = renderChart(chartId, defaultSize, sizeConfig)

                // Skip null chart elements
                if (!chartElement) return null

                return (
                    <SortableGridItem
                        key={chartId}
                        id={chartId}
                        w={initialW}
                        h={initialH}
                    >
                        {/* Preserve the grid-stack-item-content structure for compatibility */}
                        <div className="h-full w-full overflow-visible flex flex-col">
                            {chartElement}
                        </div>
                    </SortableGridItem>
                )
            })}
        </SortableGridProvider>
    )
}

// Export the default chart sizes for reference
export { DEFAULT_CHART_SIZES }
