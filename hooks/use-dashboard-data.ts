import { useAuth } from "@clerk/nextjs"
import { useQuery } from "@tanstack/react-query"
import { useDateFilter } from "@/components/date-filter-provider"
import { demoFetch } from "@/lib/demo/demo-fetch"
import { useDemoMode } from "@/lib/demo/demo-context"
import type { PocketsBundleResponse } from "@/lib/types/pockets"
import type { DebtAccountSummary } from "@/lib/types/debts"

// ============================================
// TYPES - Bundle API Response Types
// ============================================

// Analytics Bundle Types (extended for all 17 charts)
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
        month: string
        category: string
        total: number
    }>
    dayOfWeekSpending: Array<{
        dayOfWeek: number
        total: number
        count: number
    }>
    // Extended fields for all 17 charts
    dayOfWeekCategory: Array<{
        dayOfWeek: number
        category: string
        total: number
    }>
    transactionHistory: Array<{
        id: number
        date: string
        description: string
        amount: number
        category: string
        color: string | null
    }>
    needsWants: Array<{
        classification: 'Essentials' | 'Mandatory' | 'Wants'
        total: number
        count: number
    }>
    cashFlow: {
        nodes: Array<{ id: string; label: string }>
        links: Array<{ source: string; target: string; value: number }>
    }
    monthlyByCategory: Array<{
        month: string
        category: string
        total: number
    }>
    spendingPyramid: Array<{
        category: string
        userTotal: number
        userPercent: number
        avgTotal: number
        avgPercent: number
    }>
    treeMapData: {
        name: string
        loc?: number
        fullDescription?: string
        children?: Array<{
            name: string
            loc?: number
            fullDescription?: string
            children?: Array<{
                name: string
                loc?: number
                fullDescription?: string
                children?: any[]
            }>
        }>
    }
    // Phase 4: effective cost mode
    effectiveCostMode?: boolean
    sharedExpenseSummary?: {
        totalFronted: number
        totalPendingOwedToYou: number
        totalYouOwe: number
    }
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
        count: number
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
    dayOfWeekSpending: Array<{
        dayOfWeek: number
        total: number
        count: number
    }>
    monthlyCategories: Array<{
        month: number
        category: string
        total: number
    }>
    hourlyActivity: Array<{
        hour: number
        total: number
        count: number
    }>
    dayOfWeekCategory: Array<{
        dayOfWeek: number
        category: string
        total: number
    }>
    hourDayHeatmap: Array<{
        hour: number
        dayOfWeek: number
        total: number
        count: number
    }>
    dayMonthHeatmap: Array<{
        dayOfWeek: number
        month: number
        total: number
        count: number
    }>
    categoryRankings: Array<{
        category: string
        rank: number
        total: number
        previousRank?: number
    }>
}

// Test Charts Bundle Types
export interface TestChartsBundleData {
    transactions: Array<{
        id: number
        date: string
        description: string
        amount: number
        balance: number | null
        category: string
    }>
    receiptTransactions: Array<{
        id: number
        receiptId: string
        storeName: string | null
        receiptDate: string
        receiptTime: string | null
        receiptTotalAmount: number
        receiptStatus: string
        description: string
        quantity: number
        pricePerUnit: number
        totalPrice: number
        categoryId: number | null
        categoryTypeId: number | null
        categoryName: string | null
        categoryColor: string | null
        categoryTypeName: string | null
        categoryTypeColor: string | null
    }>
    hasDataInOtherPeriods?: boolean
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

export interface DebtsData {
    debts: DebtAccountSummary[]
}

function toFiniteNumber(value: unknown, fallback = 0) {
    const parsed = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""))
    return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeDebtSummary(debt: DebtAccountSummary): DebtAccountSummary {
    return {
        ...debt,
        id: Number(debt.id),
        linked_pocket_id: debt.linked_pocket_id == null ? null : Number(debt.linked_pocket_id),
        interest_rate: debt.interest_rate == null ? null : toFiniteNumber(debt.interest_rate),
        minimum_payment: debt.minimum_payment == null ? null : toFiniteNumber(debt.minimum_payment),
        due_day: debt.due_day == null ? null : Number(debt.due_day),
        current_balance: toFiniteNumber(debt.current_balance),
        total_paid: toFiniteNumber(debt.total_paid),
        total_interest: toFiniteNumber(debt.total_interest),
        total_fees: toFiniteNumber(debt.total_fees),
        entry_count: Number(debt.entry_count),
    }
}

// ============================================
// BUNDLE API FETCHERS (with Redis caching)
// ============================================

async function fetchAnalyticsBundle(filter: string | null, effectiveCost = true): Promise<AnalyticsBundleData> {
    const params = new URLSearchParams()
    if (filter) params.set('filter', filter)
    if (!effectiveCost) params.set('effective_cost', '0')
    const qs = params.toString()
    const url = qs ? `/api/charts/analytics-bundle?${qs}` : `/api/charts/analytics-bundle`

    const response = await demoFetch(url)
    if (!response.ok) {
        throw new Error(`Failed to fetch analytics bundle: ${response.statusText}`)
    }
    return response.json()
}

async function fetchHomeBundle(filter: string | null): Promise<HomeBundleData> {
    const url = filter
        ? `/api/charts/home-bundle?filter=${encodeURIComponent(filter)}`
        : `/api/charts/home-bundle`

    const response = await demoFetch(url)
    if (!response.ok) {
        throw new Error(`Failed to fetch home bundle: ${response.statusText}`)
    }
    return response.json()
}

async function fetchTrendsBundle(filter: string | null): Promise<TrendsBundleData> {
    const url = filter
        ? `/api/charts/trends-bundle?filter=${encodeURIComponent(filter)}`
        : `/api/charts/trends-bundle`

    const response = await demoFetch(url)
    if (!response.ok) {
        throw new Error(`Failed to fetch trends bundle: ${response.statusText}`)
    }
    return response.json()
}

async function fetchSavingsBundle(filter: string | null): Promise<SavingsBundleData> {
    const url = filter
        ? `/api/charts/savings-bundle?filter=${encodeURIComponent(filter)}`
        : `/api/charts/savings-bundle`

    const response = await demoFetch(url)
    if (!response.ok) {
        throw new Error(`Failed to fetch savings bundle: ${response.statusText}`)
    }
    return response.json()
}

async function fetchPocketsBundle(): Promise<PocketsBundleResponse> {
    const response = await demoFetch("/api/charts/pockets-bundle")
    if (!response.ok) {
        throw new Error(`Failed to fetch pockets bundle: ${response.statusText}`)
    }
    return response.json()
}

async function fetchDebts(): Promise<DebtsData> {
    const response = await demoFetch("/api/debts")
    if (!response.ok) {
        throw new Error(`Failed to fetch debts: ${response.statusText}`)
    }
    const payload = await response.json() as DebtsData
    return {
        debts: (payload.debts ?? []).map((debt) => normalizeDebtSummary(debt)),
    }
}

async function fetchFridgeBundle(filter: string | null): Promise<FridgeBundleData> {
    const url = filter
        ? `/api/charts/fridge-bundle?filter=${encodeURIComponent(filter)}`
        : `/api/charts/fridge-bundle`

    const response = await demoFetch(url)
    if (!response.ok) {
        throw new Error(`Failed to fetch fridge bundle: ${response.statusText}`)
    }
    return response.json()
}

async function fetchTestChartsBundle(filter: string | null): Promise<TestChartsBundleData> {
    const url = filter
        ? `/api/charts/test-charts-bundle?filter=${encodeURIComponent(filter)}`
        : `/api/charts/test-charts-bundle`

    const response = await demoFetch(url)
    if (!response.ok) {
        throw new Error(`Failed to fetch test charts bundle: ${response.statusText}`)
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

    const response = await demoFetch(url)
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
    const response = await demoFetch("/api/categories")
    if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.statusText}`)
    }
    return response.json()
}

// ============================================
// TOTAL TRANSACTION COUNT (all-time, no filter)
// ============================================

export interface TotalTransactionCount {
    count: number
    timeSpan: string
    firstDate: string | null
    lastDate: string | null
    trend: Array<{ date: string; value: number }>
}

async function fetchTotalTransactionCount(): Promise<TotalTransactionCount> {
    const response = await demoFetch('/api/transactions/total-count')
    if (!response.ok) {
        throw new Error(`Failed to fetch total transaction count: ${response.statusText}`)
    }
    return response.json()
}

/**
 * Get total transaction count across all time (ignores date filter)
 * Used for the "Total Transactions" card in home and analytics pages
 */
export function useTotalTransactionCount() {
    const { isLoaded, isSignedIn, userId } = useAuth()
    const { isDemoMode } = useDemoMode()

    return useQuery({
        queryKey: ["total-transaction-count", isDemoMode ? "demo" : (userId ?? "")],
        queryFn: fetchTotalTransactionCount,
        staleTime: 5 * 60 * 1000, // 5 minutes
        enabled: isDemoMode || (isLoaded && !!isSignedIn && !!userId),
    })
}

// ============================================
// BUNDLE HOOKS (use Redis-cached bundle APIs)
// ============================================

/**
 * Analytics page bundle - pre-aggregated data with Redis caching.
 * Pass showEffectiveCosts=false to get raw transaction amounts (no split substitution).
 */
export function useAnalyticsBundleData(showEffectiveCosts = true) {
    const { userId } = useAuth()
    const { filter, isReady } = useDateFilter()
    const { isDemoMode } = useDemoMode()

    return useQuery({
        queryKey: ["analytics-bundle", isDemoMode ? "demo" : (userId ?? ""), filter, showEffectiveCosts],
        queryFn: () => fetchAnalyticsBundle(filter, showEffectiveCosts),
        enabled: (isDemoMode || !!userId) && isReady,
    })
}

/**
 * Home page bundle - pre-aggregated data with Redis caching
 */
export function useHomeBundleData() {
    const { userId } = useAuth()
    const { filter, isReady } = useDateFilter()
    const { isDemoMode } = useDemoMode()

    return useQuery({
        queryKey: ["home-bundle", isDemoMode ? "demo" : (userId ?? ""), filter],
        queryFn: () => fetchHomeBundle(filter),
        enabled: (isDemoMode || !!userId) && isReady,
    })
}

/**
 * Trends page bundle - category trends with Redis caching
 */
export function useTrendsBundleData() {
    const { userId } = useAuth()
    const { filter, isReady } = useDateFilter()
    const { isDemoMode } = useDemoMode()

    return useQuery({
        queryKey: ["trends-bundle", isDemoMode ? "demo" : (userId ?? ""), filter],
        queryFn: () => fetchTrendsBundle(filter),
        enabled: (isDemoMode || !!userId) && isReady,
    })
}

/**
 * Savings page bundle - savings data with Redis caching
 */
export function useSavingsBundleData() {
    const { userId } = useAuth()
    const { filter, isReady } = useDateFilter()
    const { isDemoMode } = useDemoMode()

    return useQuery({
        queryKey: ["savings-bundle", isDemoMode ? "demo" : (userId ?? ""), filter],
        queryFn: () => fetchSavingsBundle(filter),
        enabled: (isDemoMode || !!userId) && isReady,
    })
}

/**
 * Pockets bundle - vehicles, properties, and other pockets for net worth helpers
 */
export function usePocketsBundleData() {
    const { userId } = useAuth()
    const { isDemoMode } = useDemoMode()

    return useQuery({
        queryKey: ["pockets-bundle", isDemoMode ? "demo" : (userId ?? "")],
        queryFn: fetchPocketsBundle,
        enabled: isDemoMode || !!userId,
    })
}

/**
 * Debt accounts and summaries for savings net worth/debt workflows
 */
export function useDebtAccountsData() {
    const { userId } = useAuth()
    const { isDemoMode } = useDemoMode()

    return useQuery({
        queryKey: ["debts", isDemoMode ? "demo" : (userId ?? "")],
        queryFn: fetchDebts,
        enabled: isDemoMode || !!userId,
    })
}

/**
 * Fridge page bundle - fridge data with Redis caching
 */
export function useFridgeBundleData() {
    const { userId } = useAuth()
    const { filter, isReady } = useDateFilter()
    const { isDemoMode } = useDemoMode()

    return useQuery({
        queryKey: ["fridge-bundle", isDemoMode ? "demo" : (userId ?? ""), filter],
        queryFn: () => fetchFridgeBundle(filter),
        enabled: (isDemoMode || !!userId) && isReady,
    })
}

/**
 * Test charts page bundle - raw transactions and receipt transactions with Redis caching
 */
export function useTestChartsBundleData() {
    const { userId } = useAuth()
    const { filter, isReady } = useDateFilter()
    const { isDemoMode } = useDemoMode()

    return useQuery({
        queryKey: ["test-charts-bundle", isDemoMode ? "demo" : (userId ?? ""), filter],
        queryFn: () => fetchTestChartsBundle(filter),
        enabled: (isDemoMode || !!userId) && isReady,
    })
}

// Groceries Trends Bundle Types
export interface GroceriesTrendsBundleData {
    categoryTrends: Record<string, Array<{ date: string; value: number }>>
    categories: string[]
}

async function fetchGroceriesTrendsBundle(filter: string | null): Promise<GroceriesTrendsBundleData> {
    const url = filter
        ? `/api/charts/groceries-trends-bundle?filter=${encodeURIComponent(filter)}`
        : `/api/charts/groceries-trends-bundle`

    const response = await demoFetch(url)
    if (!response.ok) {
        throw new Error(`Failed to fetch groceries trends bundle: ${response.statusText}`)
    }
    return response.json()
}

/**
 * Groceries trends bundle - groceries category trends with Redis caching
 */
export function useGroceriesTrendsBundleData() {
    const { userId } = useAuth()
    const { filter, isReady } = useDateFilter()
    const { isDemoMode } = useDemoMode()

    return useQuery({
        queryKey: ["groceries-trends-bundle", isDemoMode ? "demo" : (userId ?? ""), filter],
        queryFn: () => fetchGroceriesTrendsBundle(filter),
        enabled: (isDemoMode || !!userId) && isReady,
    })
}

// ============================================
// LEGACY HOOKS (for backward compatibility)
// ============================================

/**
 * Raw transactions - use for DataTable or when raw data is needed
 */
export function useTransactions(filter?: string | null) {
    const { userId } = useAuth()
    const { filter: contextFilter, isReady } = useDateFilter()
    const { isDemoMode } = useDemoMode()
    const effectiveFilter = filter !== undefined ? filter : contextFilter

    return useQuery({
        queryKey: ["transactions", isDemoMode ? "demo" : (userId ?? ""), effectiveFilter],
        queryFn: () => fetchTransactions(effectiveFilter),
        enabled: (isDemoMode || !!userId) && isReady,
    })
}

/**
 * Categories - rarely changes
 */
export function useCategories() {
    const { userId } = useAuth()
    const { isDemoMode } = useDemoMode()

    return useQuery({
        queryKey: ["categories", isDemoMode ? "demo" : (userId ?? "")],
        queryFn: fetchCategories,
        staleTime: 5 * 60 * 1000,
        enabled: isDemoMode || !!userId,
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
