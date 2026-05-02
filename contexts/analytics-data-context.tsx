"use client"

import { createContext, useContext, ReactNode } from "react"
import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { useDateFilter } from "@/components/date-filter-provider"
import { useAccountFilter } from "@/components/account-filter-provider"
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
    MonthlyByCategory,
    AnalyticsSummary,
} from "@/lib/charts/aggregations"

interface AnalyticsDataContextValue {
    data: AnalyticsSummary | undefined
    isLoading: boolean
    error: Error | null
}

const AnalyticsDataContext = createContext<AnalyticsDataContextValue | null>(null)

async function fetchAnalyticsBundle(filter: string | null, accountIds: string[] = []): Promise<AnalyticsSummary> {
    const params = new URLSearchParams()
    if (filter) params.set('filter', filter)
    if (accountIds.length > 0) params.set('accounts', accountIds.join(','))
    const qs = params.toString()
    const url = qs ? `/api/charts/analytics-bundle?${qs}` : `/api/charts/analytics-bundle`

    // Ensure we bypass any framework fetch caching on the client.
    const response = await fetch(url, { cache: "no-store" })
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
    const { selected: accountIds, isReady: accountsReady } = useAccountFilter()
    const accountKey = accountIds.length === 0 ? "all" : accountIds.join(",")

    const { data, isLoading, error } = useQuery({
        queryKey: ["analytics-bundle", filter, accountKey],
        queryFn: () => fetchAnalyticsBundle(filter, accountIds),
        enabled: accountsReady,
        placeholderData: keepPreviousData,
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
