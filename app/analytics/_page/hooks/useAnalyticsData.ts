import { useCallback, useEffect, useState } from "react"

import { deduplicatedFetch } from "@/lib/request-deduplication"
import { normalizeTransactions } from "@/lib/utils"
import { toast } from "sonner"

import type { AnalyticsTransaction } from "../types"
import { getAnalyticsCacheEntry, getAnalyticsCacheKey, isAnalyticsCacheFresh, setAnalyticsCacheEntry } from "../cache"

export function useAnalyticsData(dateFilter: string | null) {
  const analyticsCacheEntry = getAnalyticsCacheEntry(dateFilter)

  // Transactions state
  const [rawTransactions, setRawTransactions] = useState<AnalyticsTransaction[]>(
    () => analyticsCacheEntry?.transactions ?? [],
  )
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(
    () => !analyticsCacheEntry,
  )
  // Independent limits used ONLY for Spending Activity Rings card
  const [ringLimits, setRingLimits] = useState<Record<string, number>>(
    () => analyticsCacheEntry?.ringLimits ?? {},
  )

  // Fetch ALL analytics data in parallel for maximum performance
  const fetchAllAnalyticsData = useCallback(async () => {
    const cacheKey = getAnalyticsCacheKey(dateFilter)
    const cachedEntry = getAnalyticsCacheEntry(dateFilter)
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

    try {
      const startTime = performance.now()
      console.log("[Analytics] Starting parallel data fetch...")

      // Fetch ALL data in parallel - this is the key optimization
      const [
        transactionsData,
        budgetsData,
        categoriesData,
        financialHealthData,
        dailyTransactionsData,
      ] = await Promise.all([
        // 1. Transactions (use all=true to fetch all for charts)
        deduplicatedFetch<any[]>(
          dateFilter
            ? `/api/transactions?all=true&filter=${encodeURIComponent(dateFilter)}`
            : "/api/transactions?all=true",
        ).catch(err => {
          console.error("[Analytics] Transactions fetch error:", err)
          return []
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
          "/api/financial-health",
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
      let nextTransactions = cachedEntry?.transactions ?? []
      const txArray = Array.isArray(transactionsData)
        ? transactionsData
        : ((transactionsData as { data?: any[] } | undefined)?.data ?? [])
      if (Array.isArray(txArray) && txArray.length > 0) {
        nextTransactions = normalizeTransactions(txArray) as AnalyticsTransaction[]
        console.log(`[Analytics] Setting ${txArray.length} transactions`)
        setRawTransactions(nextTransactions)
      }

      // Set budgets
      let nextRingLimits = cachedEntry?.ringLimits ?? {}
      if (budgetsData && typeof budgetsData === "object") {
        nextRingLimits = budgetsData as Record<string, number>
        setRingLimits(nextRingLimits)
      }

      if (txArray.length > 0) {
        setAnalyticsCacheEntry(dateFilter, {
          transactions: nextTransactions,
          ringLimits: nextRingLimits,
          fetchedAt: Date.now(),
        })
      }
    } catch (error) {
      console.error("Error fetching analytics data:", error)
      toast.error("Network Error", {
        description: "Failed to fetch analytics data. Check your database connection.",
        duration: 8000,
      })
    } finally {
      setIsLoadingTransactions(false)
    }
  }, [dateFilter])

  // Fetch all data on mount and when filter changes
  useEffect(() => {
    fetchAllAnalyticsData()
  }, [fetchAllAnalyticsData])

  return {
    rawTransactions,
    isLoadingTransactions,
    ringLimits,
    setRingLimits,
    fetchAllAnalyticsData,
  }
}
