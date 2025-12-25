import { useQuery } from "@tanstack/react-query"
import { useDateFilter } from "@/components/date-filter-provider"

// Types
export interface Transaction {
    id: number
    date: string
    description: string
    amount: number
    balance: number | null
    category: string
}

export interface Category {
    id: number
    name: string
    color: string | null
    transactionCount: number
    totalSpend: number
}

// Fetcher functions
async function fetchTransactions(filter: string | null): Promise<Transaction[]> {
    const url = filter
        ? `/api/transactions?filter=${encodeURIComponent(filter)}`
        : "/api/transactions"

    const response = await fetch(url)
    if (!response.ok) {
        throw new Error(`Failed to fetch transactions: ${response.statusText}`)
    }
    const json = await response.json()

    // Handle paginated response {data: [], pagination: {}} or direct array
    if (Array.isArray(json)) {
        return json
    }
    return json.data ?? []
}

async function fetchCategories(): Promise<Category[]> {
    const response = await fetch("/api/categories")
    if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.statusText}`)
    }
    return response.json()
}

async function fetchSavingsTransactions(filter: string | null): Promise<Transaction[]> {
    const params = new URLSearchParams()
    if (filter) params.append("filter", filter)
    params.append("category", "Savings")

    const response = await fetch(`/api/transactions?${params.toString()}`)
    if (!response.ok) {
        throw new Error(`Failed to fetch savings: ${response.statusText}`)
    }
    const json = await response.json()

    // Handle paginated response
    if (Array.isArray(json)) {
        return json
    }
    return json.data ?? []
}

async function fetchFridgeItems(): Promise<any[]> {
    const response = await fetch("/api/fridge")
    if (!response.ok) {
        throw new Error(`Failed to fetch fridge items: ${response.statusText}`)
    }
    return response.json()
}

// ============================================
// HOOKS FOR ALL DASHBOARD PAGES
// ============================================

/**
 * Shared transactions hook - used by Home, Analytics, Trends
 * Cached by dateFilter, reused across pages
 */
export function useTransactions(filter?: string | null) {
    const { filter: contextFilter } = useDateFilter()
    const effectiveFilter = filter !== undefined ? filter : contextFilter

    return useQuery({
        queryKey: ["transactions", effectiveFilter],
        queryFn: () => fetchTransactions(effectiveFilter),
    })
}

/**
 * Categories hook - rarely changes, shared across pages
 */
export function useCategories() {
    return useQuery({
        queryKey: ["categories"],
        queryFn: fetchCategories,
        staleTime: 5 * 60 * 1000, // 5 min - categories change rarely
    })
}

/**
 * Home page data - transactions with category visibility
 */
export function useHomeData() {
    const transactions = useTransactions()
    const categories = useCategories()

    return {
        transactions: transactions.data ?? [],
        categories: categories.data ?? [],
        isLoading: transactions.isLoading || categories.isLoading,
        error: transactions.error || categories.error,
    }
}

/**
 * Analytics page data - same as home, heavy processing done client-side
 */
export function useAnalyticsData() {
    const transactions = useTransactions()
    const categories = useCategories()

    return {
        transactions: transactions.data ?? [],
        categories: categories.data ?? [],
        isLoading: transactions.isLoading || categories.isLoading,
        error: transactions.error || categories.error,
    }
}

/**
 * Trends page data - returns transactions + derived category trend data
 * Eliminates N+1 calls by computing all category trends at once
 */
export function useTrendsData() {
    const transactions = useTransactions()
    const categories = useCategories()

    // Compute category trends from transactions
    const categoryTrends = transactions.data
        ? computeCategoryTrends(transactions.data)
        : {}

    return {
        transactions: transactions.data ?? [],
        categories: categories.data ?? [],
        categoryTrends,
        isLoading: transactions.isLoading || categories.isLoading,
        error: transactions.error || categories.error,
    }
}

/**
 * Savings page data - filtered to Savings category only
 */
export function useSavingsData() {
    const { filter } = useDateFilter()

    return useQuery({
        queryKey: ["savings", filter],
        queryFn: () => fetchSavingsTransactions(filter),
    })
}

/**
 * Fridge page data
 */
export function useFridgeData() {
    return useQuery({
        queryKey: ["fridge"],
        queryFn: fetchFridgeItems,
    })
}

// ============================================
// HELPER FUNCTIONS
// ============================================

interface ChartDataPoint {
    date: string
    value: number
}

/**
 * Compute daily totals for each category from transactions
 * Returns { categoryName: ChartDataPoint[] }
 */
function computeCategoryTrends(transactions: Transaction[]): Record<string, ChartDataPoint[]> {
    // Group transactions by category
    const categoryMap = new Map<string, Map<string, number>>()

    for (const tx of transactions) {
        if (tx.amount >= 0) continue // Only expenses

        const category = tx.category || "Other"
        const date = tx.date.split("T")[0]
        const amount = Math.abs(tx.amount)

        if (!categoryMap.has(category)) {
            categoryMap.set(category, new Map())
        }
        const dailyTotals = categoryMap.get(category)!
        dailyTotals.set(date, (dailyTotals.get(date) || 0) + amount)
    }

    // Convert to chart data format
    const result: Record<string, ChartDataPoint[]> = {}
    for (const [category, dailyTotals] of categoryMap) {
        result[category] = Array.from(dailyTotals.entries())
            .map(([date, value]) => ({
                date,
                value: Math.round(value * 100) / 100,
            }))
            .sort((a, b) => a.date.localeCompare(b.date))
    }

    return result
}
