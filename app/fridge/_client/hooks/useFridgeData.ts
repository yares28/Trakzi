import { useCallback, useEffect, useMemo, useState } from "react"

import { deduplicatedFetch } from "@/lib/request-deduplication"

import { normalizeCategoryName } from "../utils/categories"
import type { ReceiptTransactionRow } from "../types"

type ReceiptTableItem = {
  id: string
  name: string
  category: string
  categoryId?: number | null
  categoryColor?: string | null
  price: number
  quantity: number
}

export type ReceiptTableRow = {
  id: string
  storeName: string
  date: string
  totalAmount: number
  items: ReceiptTableItem[]
}

type UseFridgeDataParams = {
  dateFilter: string | null
  refreshNonce: number
}

function buildReceiptTable(transactions: ReceiptTransactionRow[]): ReceiptTableRow[] {
  const receiptMap = new Map<string, ReceiptTableRow>()

  transactions.forEach((tx) => {
    const receiptId = String(tx.receiptId ?? tx.id)
    if (!receiptId) return

    if (!receiptMap.has(receiptId)) {
      receiptMap.set(receiptId, {
        id: receiptId,
        storeName: tx.storeName ?? "Unknown",
        date: tx.receiptDate,
        totalAmount: Number(tx.receiptTotalAmount) || 0,
        items: [],
      })
    }

    const receipt = receiptMap.get(receiptId)
    if (!receipt) return

    const quantity = Number.isFinite(tx.quantity) && tx.quantity > 0 ? tx.quantity : 1
    const pricePerUnit = Number(tx.pricePerUnit)
    const unitPrice =
      pricePerUnit > 0
        ? pricePerUnit
        : quantity > 0 && tx.totalPrice > 0
          ? tx.totalPrice / quantity
          : tx.totalPrice

    receipt.items.push({
      id: String(tx.id),
      name: tx.description || "Untitled",
      category: normalizeCategoryName(tx.categoryName),
      categoryId: tx.categoryId ?? null,
      categoryColor: tx.categoryColor ?? null,
      price: Number(unitPrice.toFixed(2)),
      quantity,
    })

    if (!Number.isFinite(receipt.totalAmount) || receipt.totalAmount <= 0) {
      const nextTotal = receipt.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      receipt.totalAmount = Number(nextTotal.toFixed(2))
    }
  })

  return Array.from(receiptMap.values()).sort((a, b) => b.date.localeCompare(a.date))
}

export function useFridgeData({ dateFilter, refreshNonce }: UseFridgeDataParams) {
  const [receiptTransactions, setReceiptTransactions] = useState<ReceiptTransactionRow[]>([])
  const [isLoadingReceiptTransactions, setIsLoadingReceiptTransactions] = useState(true)

  const fetchReceiptTransactions = useCallback(async () => {
    setIsLoadingReceiptTransactions(true)

    try {
      const url = dateFilter
        ? `/api/fridge?filter=${encodeURIComponent(dateFilter)}&all=true`
        : "/api/fridge?all=true"

      const data = await deduplicatedFetch<ReceiptTransactionRow[]>(url)
      setReceiptTransactions(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Failed to fetch receipt transactions:", error)
      setReceiptTransactions([])
    } finally {
      setIsLoadingReceiptTransactions(false)
    }
  }, [dateFilter])

  useEffect(() => {
    fetchReceiptTransactions()
  }, [fetchReceiptTransactions, refreshNonce])

  const tableData = useMemo(
    () => buildReceiptTable(receiptTransactions),
    [receiptTransactions]
  )

  return {
    receiptTransactions,
    isLoadingReceiptTransactions,
    tableData,
    refreshReceiptTransactions: fetchReceiptTransactions,
  }
}
