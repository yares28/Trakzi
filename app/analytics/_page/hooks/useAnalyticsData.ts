import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@clerk/nextjs"

import { deduplicatedFetch } from "@/lib/request-deduplication"
import { normalizeTransactions } from "@/lib/utils"
import { toast } from "sonner"
import { demoFetch } from "@/lib/demo/demo-fetch"
import { useDemoMode } from "@/lib/demo/demo-context"

import type { AnalyticsTransaction } from "../types"
import { getAnalyticsCacheEntry, getAnalyticsCacheKey, isAnalyticsCacheFresh, setAnalyticsCacheEntry } from "../cache"

export function useAnalyticsData(dateFilter: string | null) {
  const { userId } = useAuth()
  const { isDemoMode } = useDemoMode()
  const userIdArg = isDemoMode ? 'demo' : (userId ?? undefined)
  const filterArg = dateFilter ?? undefined
  const analyticsCacheEntry = isDemoMode ? null : getAnalyticsCacheEntry(userIdArg, filterArg)

  // Transactions state (keyed by user: when userId changes we reset so we don't show previous user's data)
  const [rawTransactions, setRawTransactions] = useState<AnalyticsTransaction[]>(
    () => analyticsCacheEntry?.transactions ?? [],
  )
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(
    () => !analyticsCacheEntry,
  )
  const [ringLimits, setRingLimits] = useState<Record<string, number>>(
    () => analyticsCacheEntry?.ringLimits ?? {},
  )

  // When user or filter changes, sync state from cache (or empty for new user) so we don't show previous user's data
  useEffect(() => {
    if (!userIdArg) return
    const entry = getAnalyticsCacheEntry(userIdArg, filterArg)
    setRawTransactions(entry?.transactions ?? [])
    setRingLimits(entry?.ringLimits ?? {})
    setIsLoadingTransactions(!entry)
  }, [userIdArg, filterArg])

  // Fetch ALL analytics data in parallel for maximum performance
  const fetchAllAnalyticsData = useCallback(async () => {
    const cacheKey = getAnalyticsCacheKey(userIdArg, filterArg)
    const cachedEntry = getAnalyticsCacheEntry(userIdArg, filterArg)
    const hasFreshCache = cachedEntry ? isAnalyticsCacheFresh(cachedEntry) : false

    if (cachedEntry) {
      setRawTransactions(cachedEntry.transactions)
      setRingLimits(cachedEntry.ringLimits)
      setIsLoadingTransactions(false)
      if (hasFreshCache) {
        return
      }
    } else {
      setIsLoadingTransactions(true)
    }

    // Demo mode: fetch from demo API directly
    if (isDemoMode) {
      try {
        const res = await demoFetch("/api/transactions?all=true")
        const data = await res.json()
        const txArray = Array.isArray(data) ? data : (data?.data ?? [])
        setRawTransactions(normalizeTransactions(txArray) as AnalyticsTransaction[])
      } catch { /* demo data unavailable */ }
      setIsLoadingTransactions(false)
      return
    }

    try {
      const startTime = performance.now()
      console.log("[Analytics] Starting parallel data fetch for filter:", dateFilter)

      // Fetch ALL data in parallel - this is the key optimization
      const [
        transactionsResult,
        budgetsData,
        categoriesData,
        financialHealthData,
        dailyTransactionsData,
      ] = await Promise.all([
        // 1. Transactions (use all=true to fetch all for charts)
        deduplicatedFetch<any>(
          dateFilter
            ? `/api/transactions?all=true&filter=${encodeURIComponent(dateFilter)}`
            : "/api/transactions?all=true",
        ).catch(err => {
          console.error("[Analytics] Transactions fetch error:", err)
          return { data: [] }
        }),

        // 2. Budgets
        fetch(
          dateFilter
            ? `/api/budgets?filter=${encodeURIComponent(dateFilter)}`
            : "/api/budgets",
        )
          .then(res => res.ok ? res.json() : {})
          .catch(() => ({})),

        // 3. Categories
        fetch("/api/categories")
          .then(res => res.ok ? res.json() : [])
          .catch(() => []),

        // 4. Financial Health
        deduplicatedFetch<{ data: any[]; years: any[] }>(
          dateFilter
            ? `/api/financial-health?filter=${encodeURIComponent(dateFilter)}`
            : "/api/financial-health",
        ).catch(() => ({ data: [], years: [] })),

        // 5. Daily Transactions
        deduplicatedFetch<Array<{ day: string; value: number }>>(
          dateFilter
            ? `/api/transactions/daily?filter=${encodeURIComponent(dateFilter)}`
            : "/api/transactions/daily",
        ).catch(() => []),
      ])

      void cacheKey
      void categoriesData
      void financialHealthData
      void dailyTransactionsData

      const endTime = performance.now()
      console.log(`[Analytics] All data fetched in ${(endTime - startTime).toFixed(2)}ms`)

      // Set transactions - handle paginated response format {data: [], pagination: {}}
      const txArray = Array.isArray(transactionsResult)
        ? transactionsResult
        : (transactionsResult?.data ?? [])

      const nextTransactions = normalizeTransactions(txArray) as AnalyticsTransaction[]
      console.log(`[Analytics] Setting ${nextTransactions.length} transactions (filter: ${dateFilter})`)
      setRawTransactions(nextTransactions)

      // Set budgets
      const nextRingLimits = (budgetsData && typeof budgetsData === "object")
        ? (budgetsData as Record<string, number>)
        : (cachedEntry?.ringLimits ?? {})

      setRingLimits(nextRingLimits)

      // Update cache even if empty, so we don't hit the API again for empty filters (keyed by userId)
      setAnalyticsCacheEntry(userIdArg, filterArg, {
        transactions: nextTransactions,
        ringLimits: nextRingLimits,
        fetchedAt: Date.now(),
      })
    } catch (error) {
      console.error("Error fetching analytics data:", error)
      toast.error("Network Error", {
        description: "Failed to fetch analytics data. Check your database connection.",
        duration: 8000,
      })
    } finally {
      setIsLoadingTransactions(false)
    }
  }, [userIdArg, filterArg])

  // Fetch all data when user and filter are set (don't fetch with stale or missing user)
  useEffect(() => {
    if (!isDemoMode && !userId) return
    fetchAllAnalyticsData()
  }, [userId, isDemoMode, fetchAllAnalyticsData])

  return {
    rawTransactions,
    isLoadingTransactions,
    ringLimits,
    setRingLimits,
    fetchAllAnalyticsData,
  }
}
