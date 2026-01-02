import { useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { useTransactionDialog } from "@/components/transaction-dialog-provider"
import { toast } from "sonner"
import { normalizeTransactions } from "@/lib/utils"

import type { HomeTransaction } from "../types"

type UseHomeDataOptions = {
  dateFilter: string | null
}

export function useHomeData({ dateFilter }: UseHomeDataOptions) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { setRefreshCallback } = useTransactionDialog()
  const [transactions, setTransactions] = useState<HomeTransaction[]>([])
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false)

  const fetchTransactions = useCallback(
    async (bypassCache = false) => {
      try {
        const url = dateFilter
          ? `/api/transactions?all=true&filter=${encodeURIComponent(dateFilter)}`
          : "/api/transactions?all=true"
        const response = await fetch(url, {
          cache: bypassCache ? "no-store" : "default",
          headers: bypassCache ? { "Cache-Control": "no-cache" } : undefined,
        })
        const data = await response.json()

        if (response.ok) {
          const txArray = Array.isArray(data) ? data : data?.data ?? []
          if (Array.isArray(txArray)) {
            setTransactions(
              normalizeTransactions(txArray) as HomeTransaction[]
            )
          } else if (data?.error) {
            toast.error("API Error", {
              description: data.error,
              duration: 10000,
            })
          }
        } else if (response.status === 401) {
          toast.error("Authentication Error", {
            description: "Please configure DEMO_USER_ID in .env.local",
            duration: 10000,
          })
        } else {
          toast.error("API Error", {
            description: data.error || `HTTP ${response.status}`,
            duration: 8000,
          })
        }
      } catch (error) {
        console.error("Error fetching transactions:", error)
        toast.error("Network Error", {
          description:
            "Failed to fetch transactions. Check your database connection.",
          duration: 8000,
        })
      }
    },
    [dateFilter]
  )

  useEffect(() => {
    const openDialog = searchParams.get("openTransactionDialog")
    if (openDialog === "true") {
      setIsTransactionDialogOpen(true)
      const url = new URL(window.location.href)
      url.searchParams.delete("openTransactionDialog")
      router.replace(url.pathname + url.search, { scroll: false })
    }
  }, [searchParams, router])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  useEffect(() => {
    setRefreshCallback(() => {
      setTimeout(() => {
        fetchTransactions(true)
      }, 300)
    })
  }, [fetchTransactions, setRefreshCallback])

  useEffect(() => {
    const handleTransactionUpdate = () => {
      setTimeout(() => {
        fetchTransactions(true)
      }, 300)
    }

    window.addEventListener("transactionAdded", handleTransactionUpdate, true)
    window.addEventListener("transactionsUpdated", handleTransactionUpdate, true)
    return () => {
      window.removeEventListener("transactionAdded", handleTransactionUpdate, true)
      window.removeEventListener("transactionsUpdated", handleTransactionUpdate, true)
    }
  }, [fetchTransactions])

  return {
    transactions,
    fetchTransactions,
    isTransactionDialogOpen,
    setIsTransactionDialogOpen,
  }
}
