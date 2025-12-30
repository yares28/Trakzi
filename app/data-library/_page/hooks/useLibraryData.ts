import { useCallback, useEffect, useState } from "react"

import { normalizeTransactions } from "@/lib/utils"

import type {
  Category,
  ReceiptCategory,
  ReceiptCategoryType,
  Statement,
  StatsResponse,
  Transaction,
  UserFile,
} from "../types"

export const useLibraryData = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [statements, setStatements] = useState<Statement[]>([])
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [receiptCategoryTypes, setReceiptCategoryTypes] = useState<ReceiptCategoryType[]>([])
  const [receiptCategories, setReceiptCategories] = useState<ReceiptCategory[]>([])
  const [userFiles, setUserFiles] = useState<UserFile[]>([])
  const [receiptTransactionsCount, setReceiptTransactionsCount] = useState(0)
  const [totalUserCategoriesCount, setTotalUserCategoriesCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLibraryData = useCallback(async () => {
    console.log("[Data Library] fetchLibraryData called")
    setLoading(true)
    setError(null)

    try {
      console.log("[Data Library] Fetching bundle with cache: no-store")
      const bundleRes = await fetch("/api/charts/data-library-bundle", {
        cache: "no-store",
      })

      if (!bundleRes.ok) {
        throw new Error(
          (await bundleRes.text()) || "Unable to load data library."
        )
      }

      const bundleData = await bundleRes.json()
      console.log("[Data Library] Received bundle data:", {
        statements: bundleData.statements.length,
        transactions: bundleData.transactions.length,
        cacheKey: bundleRes.headers.get("X-Cache-Key"),
      })

      setTransactions(
        normalizeTransactions(bundleData.transactions) as Transaction[]
      )
      setStats(bundleData.stats)
      setStatements(bundleData.statements)
      setCategories(bundleData.categories)
      setUserFiles(bundleData.userFiles)
      setReceiptCategoryTypes(bundleData.receiptCategoryTypes)
      setReceiptCategories(bundleData.receiptCategories)
      setReceiptTransactionsCount(bundleData.receiptTransactionsCount || 0)
      setTotalUserCategoriesCount(bundleData.userCategoriesCount || 0)
      console.log(
        "[Data Library] State updated with",
        bundleData.statements.length,
        "statements"
      )
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "We hit a snag while syncing the library."
      setError(message)
      console.error("[Data Library] Fetch error:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLibraryData()
  }, [fetchLibraryData])

  return {
    transactions,
    setTransactions,
    statements,
    setStatements,
    stats,
    setStats,
    categories,
    setCategories,
    receiptCategoryTypes,
    setReceiptCategoryTypes,
    receiptCategories,
    setReceiptCategories,
    userFiles,
    setUserFiles,
    receiptTransactionsCount,
    setReceiptTransactionsCount,
    totalUserCategoriesCount,
    setTotalUserCategoriesCount,
    loading,
    setLoading,
    error,
    setError,
    fetchLibraryData,
  }
}
