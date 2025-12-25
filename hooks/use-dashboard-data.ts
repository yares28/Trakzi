import { useQuery } from "@tanstack/react-query"
import { useDateFilter } from "@/components/date-filter-provider"

// ============================================
// TYPES - Bundle API Response Types
// ============================================

// Analytics Bundle Types
export interface AnalyticsBundleData {
    kpis: {
        totalIncome: number
        totalExpense: number
        netSavings: number
        transactionCount: number
        avgTransaction: number
    }
    categorySpending: Array<{
        category: string
        total: number
        count: number
        color: string | null
    }>
    dailySpending: Array<{
        date: string
        total: number
        income: number
        expense: number
    }>
    monthlyCategories: Array<{
        month: number
        category: string
        total: number
    }>
    dayOfWeekSpending: Array<{
        dayOfWeek: number
        total: number
        count: number
    }>
}

// Home Bundle Types
export interface HomeBundleData {
    kpis: {
        totalIncome: number
        totalExpense: number
        netSavings: number
        transactionCount: number
        avgTransaction: number
    }
    topCategories: Array<{
        category: string
        total: number
        count: number
        color: string | null
        percentage: number
    }>
    activityRings: Array<{
        category: string
        spent: number
        percentage: number
        color: string | null
    }>
    dailySpending: Array<{
        date: string
        total: number
    }>
    recentTransactions: number
}

// Trends Bundle Types
export interface TrendsBundleData {
    categoryTrends: Record<string, Array<{ date: string; value: number }>>
    categories: string[]
}

// Savings Bundle Types
export interface SavingsBundleData {
    kpis: {
        totalSaved: number
        savingsRate: number
        transactionCount: number
        avgSavingsPerTransaction: number
    }
    chartData: Array<{
        date: string
        amount: number
        cumulative: number
    }>
}

// Fridge Bundle Types
export interface FridgeBundleData {
    kpis: {
        totalSpent: number
        shoppingTrips: number
        storesVisited: number
        averageReceipt: number
        itemCount: number
    }
    categorySpending: Array<{
        category: string
        total: number
        count: number
        color: string | null
        broadType: string | null
    }>
    dailySpending: Array<{
        date: string
        total: number
    }>
    storeSpending: Array<{
        storeName: string
        total: number
        count: number
    }>
    macronutrientBreakdown: Array<{
        typeName: string
        total: number
        color: string | null
    }>
}

// Legacy types for backward compatibility
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

// ============================================
// BUNDLE API FETCHERS (with Redis caching)
// ============================================

async function fetchAnalyticsBundle(filter: string | null): Promise<AnalyticsBundleData> {
    const url = filter
        ? `/api/charts/analytics-bundle?filter=${encodeURIComponent(filter)}`
        : `/api/charts/analytics-bundle`

    const response = await fetch(url)
    if (!response.ok) {
        throw new Error(`Failed to fetch analytics bundle: ${response.statusText}`)
    }
    return response.json()
}

async function fetchHomeBundle(filter: string | null): Promise<HomeBundleData> {
    const url = filter
        ? `/api/charts/home-bundle?filter=${encodeURIComponent(filter)}`
        : `/api/charts/home-bundle`

    const response = await fetch(url)
    if (!response.ok) {
        throw new Error(`Failed to fetch home bundle: ${response.statusText}`)
    }
    return response.json()
}

async function fetchTrendsBundle(filter: string | null): Promise<TrendsBundleData> {
    const url = filter
        ? `/api/charts/trends-bundle?filter=${encodeURIComponent(filter)}`
        : `/api/charts/trends-bundle`

    const response = await fetch(url)
    if (!response.ok) {
        throw new Error(`Failed to fetch trends bundle: ${response.statusText}`)
    }
    return response.json()
}

async function fetchSavingsBundle(filter: string | null): Promise<SavingsBundleData> {
    const url = filter
        ? `/api/charts/savings-bundle?filter=${encodeURIComponent(filter)}`
        : `/api/charts/savings-bundle`

    const response = await fetch(url)
    if (!response.ok) {
        throw new Error(`Failed to fetch savings bundle: ${response.statusText}`)
    }
    return response.json()
}

async function fetchFridgeBundle(filter: string | null): Promise<FridgeBundleData> {
    const url = filter
        ? `/api/charts/fridge-bundle?filter=${encodeURIComponent(filter)}`
        : `/api/charts/fridge-bundle`

    const response = await fetch(url)
    if (!response.ok) {
        throw new Error(`Failed to fetch fridge bundle: ${response.statusText}`)
    }
    return response.json()
}

// ============================================
// LEGACY FETCHERS (for DataTable, etc.)
// ============================================

async function fetchTransactions(filter: string | null): Promise<Transaction[]> {
    const baseParams = "all=true"
    const url = filter
        ? `/api/transactions?${baseParams}&filter=${encodeURIComponent(filter)}`
        : `/api/transactions?${baseParams}`

    const response = await fetch(url)
    if (!response.ok) {
        throw new Error(`Failed to fetch transactions: ${response.statusText}`)
    }
    const json = await response.json()

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

// ============================================
// BUNDLE HOOKS (use Redis-cached bundle APIs)
// ============================================

/**
 * Analytics page bundle - pre-aggregated data with Redis caching
 */
export function useAnalyticsBundleData() {
    const { filter } = useDateFilter()

    return useQuery({
        queryKey: ["analytics-bundle", filter],
        queryFn: () => fetchAnalyticsBundle(filter),
    })
}

/**
 * Home page bundle - pre-aggregated data with Redis caching
 */
export function useHomeBundleData() {
    const { filter } = useDateFilter()

    return useQuery({
        queryKey: ["home-bundle", filter],
        queryFn: () => fetchHomeBundle(filter),
    })
}

/**
 * Trends page bundle - category trends with Redis caching
 */
export function useTrendsBundleData() {
    const { filter } = useDateFilter()

    return useQuery({
        queryKey: ["trends-bundle", filter],
        queryFn: () => fetchTrendsBundle(filter),
    })
}

/**
 * Savings page bundle - savings data with Redis caching
 */
export function useSavingsBundleData() {
    const { filter } = useDateFilter()

    return useQuery({
        queryKey: ["savings-bundle", filter],
        queryFn: () => fetchSavingsBundle(filter),
    })
}

/**
 * Fridge page bundle - fridge data with Redis caching
 */
export function useFridgeBundleData() {
    const { filter } = useDateFilter()

    return useQuery({
        queryKey: ["fridge-bundle", filter],
        queryFn: () => fetchFridgeBundle(filter),
    })
}

// ============================================
// LEGACY HOOKS (for backward compatibility)
// ============================================

/**
 * Raw transactions - use for DataTable or when raw data is needed
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
 * Categories - rarely changes
 */
export function useCategories() {
    return useQuery({
        queryKey: ["categories"],
        queryFn: fetchCategories,
        staleTime: 5 * 60 * 1000,
    })
}

// ============================================
// LEGACY COMPOSITE HOOKS (backward compatible)
// These now use bundle APIs internally
// ============================================

/**
 * Home page data - uses home bundle API
 * @deprecated Use useHomeBundleData() for typed bundle data
 */
export function useHomeData() {
    const bundle = useHomeBundleData()
    const categories = useCategories()

    // Convert bundle to legacy format for backward compatibility
    const transactions: Transaction[] = []

    return {
        transactions,
        categories: categories.data ?? [],
        bundle: bundle.data,
        isLoading: bundle.isLoading || categories.isLoading,
        error: bundle.error || categories.error,
    }
}

/**
 * Analytics page data - uses analytics bundle API
 * @deprecated Use useAnalyticsBundleData() for typed bundle data
 */
export function useAnalyticsData() {
    const bundle = useAnalyticsBundleData()
    const categories = useCategories()

    return {
        transactions: [] as Transaction[],
        categories: categories.data ?? [],
        bundle: bundle.data,
        isLoading: bundle.isLoading || categories.isLoading,
        error: bundle.error || categories.error,
    }
}

/**
 * Trends page data - uses trends bundle API
 * @deprecated Use useTrendsBundleData() for typed bundle data
 */
export function useTrendsData() {
    const bundle = useTrendsBundleData()
    const categories = useCategories()

    return {
        transactions: [] as Transaction[],
        categories: categories.data ?? [],
        categoryTrends: bundle.data?.categoryTrends ?? {},
        isLoading: bundle.isLoading || categories.isLoading,
        error: bundle.error || categories.error,
    }
}

/**
 * Savings page data - uses savings bundle API
 * @deprecated Use useSavingsBundleData() for typed bundle data
 */
export function useSavingsData() {
    const bundle = useSavingsBundleData()

    return {
        data: bundle.data,
        isLoading: bundle.isLoading,
        error: bundle.error,
    }
}

/**
 * Fridge page data - uses fridge bundle API
 * @deprecated Use useFridgeBundleData() for typed bundle data
 */
export function useFridgeData() {
    const bundle = useFridgeBundleData()

    return {
        data: bundle.data,
        isLoading: bundle.isLoading,
        error: bundle.error,
    }
}

