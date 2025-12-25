"use client"

import { createContext, useContext, ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { useDateFilter } from "@/components/date-filter-provider"
import type { AnalyticsSummary } from "@/lib/charts/aggregations"

// Re-export types for chart components
export type {
    CategorySpending,
    DailySpending,
    MonthlyCategory,
    DayOfWeekSpending,
    DayOfWeekCategory,
    TransactionHistoryItem,
    NeedsWantsItem,
    CashFlowData,
    DailyByCategory,
    AnalyticsSummary,
} from "@/lib/charts/aggregations"

interface AnalyticsDataContextValue {
    data: AnalyticsSummary | undefined
    isLoading: boolean
    error: Error | null
}

const AnalyticsDataContext = createContext<AnalyticsDataContextValue | null>(null)

async function fetchAnalyticsBundle(filter: string | null): Promise<AnalyticsSummary> {
    const url = filter
        ? `/api/charts/analytics-bundle?filter=${encodeURIComponent(filter)}`
        : `/api/charts/analytics-bundle`

    const response = await fetch(url)
    if (!response.ok) {
        throw new Error(`Failed to fetch analytics bundle: ${response.statusText}`)
    }
    return response.json()
}

interface AnalyticsDataProviderProps {
    children: ReactNode
}

/**
 * Analytics Data Provider - Fetches consolidated bundle data once,
 * provides it to all child chart components via context
 */
export function AnalyticsDataProvider({ children }: AnalyticsDataProviderProps) {
    const { filter } = useDateFilter()

    const { data, isLoading, error } = useQuery({
        queryKey: ["analytics-bundle", filter],
        queryFn: () => fetchAnalyticsBundle(filter),
    })

    return (
        <AnalyticsDataContext.Provider value={{ data, isLoading, error: error as Error | null }}>
            {children}
        </AnalyticsDataContext.Provider>
    )
}

/**
 * Hook to access analytics bundle data from context
 * Must be used within AnalyticsDataProvider
 */
export function useAnalyticsChartData(): AnalyticsDataContextValue {
    const context = useContext(AnalyticsDataContext)

    if (context === null) {
        throw new Error("useAnalyticsChartData must be used within AnalyticsDataProvider")
    }

    return context
}

/**
 * Check if we're inside the Analytics provider
 */
export function useIsInsideAnalyticsProvider(): boolean {
    const context = useContext(AnalyticsDataContext)
    return context !== null
}
