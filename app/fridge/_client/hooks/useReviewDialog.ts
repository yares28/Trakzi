import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import type { TransactionLimitExceededData } from "@/components/limits/transaction-limit-dialog"
import { clearResponseCache } from "@/lib/request-deduplication"
import { getReceiptCategoryByName } from "@/lib/receipt-categories"

import type { ReceiptCategoryOption, UploadedReceipt, UploadedReceiptTransaction } from "../types"

export type ReviewUploadWarning = { fileName: string; reason: string }

type UseReviewDialogOptions = {
  reviewCategories: ReceiptCategoryOption[]
  onCommitSuccess: () => void
  onLimitExceeded: (data: TransactionLimitExceededData) => void
}

export function useReviewDialog({
  reviewCategories,
  onCommitSuccess,
  onLimitExceeded,
}: UseReviewDialogOptions) {
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false)
  const [reviewReceipts, setReviewReceipts] = useState<UploadedReceipt[]>([])
  const [activeReviewReceiptIndex, setActiveReviewReceiptIndex] = useState(0)
  const [reviewUploadWarnings, setReviewUploadWarnings] = useState<ReviewUploadWarning[]>([])
  const [isCommittingReview, setIsCommittingReview] = useState(false)
  const [reviewCommitError, setReviewCommitError] = useState<string | null>(null)
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
  const [activeReviewCategoryBroadType, setActiveReviewCategoryBroadType] = useState("")
  const [showReviewOnly, setShowReviewOnly] = useState(false)
  const [storeLanguageByKey, setStoreLanguageByKey] = useState<Record<string, string>>({})
  const [isStoreLanguageLoading, setIsStoreLanguageLoading] = useState(false)
  const [storeLanguageError, setStoreLanguageError] = useState<string | null>(null)

  const normalizeStoreKey = useCallback((storeName: string | null | undefined) => {
    return (storeName ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ")
      .slice(0, 120)
  }, [])

  const activeReviewReceipt = reviewReceipts[activeReviewReceiptIndex] ?? null
  const activeStoreKey = useMemo(
    () => normalizeStoreKey(activeReviewReceipt?.storeName),
    [activeReviewReceipt?.storeName, normalizeStoreKey]
  )
  const storeLanguageValue = useMemo(() => {
    if (!activeStoreKey) return "auto"
    return storeLanguageByKey[activeStoreKey] ?? activeReviewReceipt?.languageOverride ?? "auto"
  }, [activeReviewReceipt?.languageOverride, activeStoreKey, storeLanguageByKey])

  const reviewCategoryByLowerName = useMemo(() => {
    const map = new Map<string, ReceiptCategoryOption>()
    reviewCategories.forEach((category) => {
      const key = category.name.trim().toLowerCase()
      if (!key) return
      map.set(key, category)
    })
    return map
  }, [reviewCategories])

  const reviewCategoryGroups = useMemo(() => {
    const grouped = new Map<string, ReceiptCategoryOption[]>()

    reviewCategories.forEach((category) => {
      const broadType = category.broadType || "Other"
      const bucket = grouped.get(broadType)
      if (bucket) bucket.push(category)
      else grouped.set(broadType, [category])
    })

    const groups = Array.from(grouped, ([broadType, categories]) => ({
      broadType,
      categories: categories.slice().sort((a, b) => a.name.localeCompare(b.name)),
    }))

    groups.sort((a, b) => {
      if (a.broadType === "Other") return 1
      if (b.broadType === "Other") return -1
      return a.broadType.localeCompare(b.broadType)
    })

    return groups
  }, [reviewCategories])

  useEffect(() => {
    if (reviewCategoryGroups.length === 0) return

    setActiveReviewCategoryBroadType((prev) => {
      if (prev && reviewCategoryGroups.some((group) => group.broadType === prev)) return prev
      const fallback =
        reviewCategoryGroups.find((group) => group.broadType !== "Other")?.broadType ||
        reviewCategoryGroups[0].broadType
      return fallback
    })
  }, [reviewCategoryGroups])

  useEffect(() => {
    if (reviewCategories.length === 0 || reviewReceipts.length === 0) return

    setReviewReceipts((prev) => {
      let changed = false
      const next = prev.map((receipt) => {
        let receiptChanged = false
        const nextTransactions = receipt.transactions.map((transaction) => {
          if (!transaction.categoryName) return transaction

          const key = transaction.categoryName.trim().toLowerCase()
          const matched = reviewCategoryByLowerName.get(key)
          if (!matched) return transaction

          const nextBroadType = transaction.broadType ?? matched.broadType
          const nextTypeName = transaction.categoryTypeName ?? matched.typeName
          if (nextBroadType === transaction.broadType && nextTypeName === transaction.categoryTypeName) {
            return transaction
          }

          receiptChanged = true
          return {
            ...transaction,
            broadType: nextBroadType,
            categoryTypeName: nextTypeName,
          }
        })

        if (!receiptChanged) return receipt
        changed = true
        return { ...receipt, transactions: nextTransactions }
      })

      return changed ? next : prev
    })
  }, [reviewCategories, reviewCategoryByLowerName, reviewReceipts.length])

  useEffect(() => {
    if (activeReviewReceiptIndex >= reviewReceipts.length) {
      setActiveReviewReceiptIndex(Math.max(0, reviewReceipts.length - 1))
    }
  }, [activeReviewReceiptIndex, reviewReceipts.length])

  useEffect(() => {
    if (!activeReviewReceipt?.storeName) return
    if (!activeStoreKey) return
    if (storeLanguageByKey[activeStoreKey]) return

    let isActive = true
    setIsStoreLanguageLoading(true)
    setStoreLanguageError(null)

    fetch(`/api/receipt-stores/language?storeName=${encodeURIComponent(activeReviewReceipt.storeName)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Failed to load store language")
        return response.json()
      })
      .then((data) => {
        if (!isActive) return
        const language = typeof data?.language === "string" ? data.language : "auto"
        setStoreLanguageByKey((prev) => ({ ...prev, [activeStoreKey]: language || "auto" }))
      })
      .catch((error) => {
        if (!isActive) return
        console.error("Store language fetch error:", error)
        setStoreLanguageError("Failed to load store language")
      })
      .finally(() => {
        if (isActive) setIsStoreLanguageLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [activeReviewReceipt?.storeName, activeStoreKey, storeLanguageByKey])

  const handleReviewDialogOpenChange = useCallback((open: boolean) => {
    setIsReviewDialogOpen(open)
    if (!open) {
      setReviewReceipts([])
      setReviewUploadWarnings([])
      setActiveReviewReceiptIndex(0)
      setReviewCommitError(null)
      setOpenDropdownId(null)
      setShowReviewOnly(false)
      setStoreLanguageError(null)
    }
  }, [])

  const handleUploadResults = useCallback(
    (receipts: UploadedReceipt[], warnings: ReviewUploadWarning[]) => {
      setReviewReceipts(receipts)
      setReviewUploadWarnings(warnings)
      setActiveReviewReceiptIndex(0)
      setReviewCommitError(null)
      const hasReviewItems = receipts.some((receipt) =>
        receipt.transactions.some((transaction) => Boolean(transaction.needsReview))
      )
      setShowReviewOnly(hasReviewItems)
      if (receipts.length === 0) {
        toast.error("No receipts were uploaded")
        return
      }
      setIsReviewDialogOpen(true)
    },
    []
  )

  const updateReviewReceipts = useCallback(
    (updater: (transaction: UploadedReceiptTransaction) => UploadedReceiptTransaction | null, itemId: string) => {
      setReviewReceipts((prev) =>
        prev
          .map((receipt) => {
            const nextTransactions = receipt.transactions
              .map((transaction) => {
                if (transaction.id !== itemId) return transaction
                return updater(transaction)
              })
              .filter(Boolean) as UploadedReceiptTransaction[]

            if (nextTransactions.length === receipt.transactions.length) {
              return { ...receipt, transactions: nextTransactions }
            }

            return { ...receipt, transactions: nextTransactions }
          })
          .filter((receipt) => receipt.transactions.length > 0)
      )
    },
    []
  )

  const updateReviewItemCategory = useCallback(
    (itemId: string, value: string) => {
      updateReviewReceipts((transaction) => {
        if (value === "__uncategorized__") {
          return {
            ...transaction,
            categoryName: null,
            broadType: null,
            categoryTypeName: null,
            needsReview: false,
            reviewReason: null,
          }
        }

        const trimmed = value.trim()
        if (!trimmed) {
          return {
            ...transaction,
            categoryName: null,
            needsReview: false,
            reviewReason: null,
          }
        }

        const matched = reviewCategoryByLowerName.get(trimmed.toLowerCase())
        const fallback = getReceiptCategoryByName(trimmed)

        return {
          ...transaction,
          categoryName: trimmed,
          broadType: matched?.broadType ?? fallback?.broadType ?? transaction.broadType ?? null,
          categoryTypeName: matched?.typeName ?? fallback?.type ?? transaction.categoryTypeName ?? null,
          needsReview: false,
          reviewReason: null,
        }
      }, itemId)
    },
    [reviewCategoryByLowerName, updateReviewReceipts]
  )

  const updateReviewItemBroadType = useCallback(
    (itemId: string, value: string) => {
      updateReviewReceipts(
        (transaction) => ({
          ...transaction,
          broadType: value,
          needsReview: false,
          reviewReason: null,
        }),
        itemId
      )
    },
    [updateReviewReceipts]
  )

  const updateReviewItemCategoryType = useCallback(
    (itemId: string, value: string) => {
      updateReviewReceipts(
        (transaction) => ({
          ...transaction,
          categoryTypeName: value,
          needsReview: false,
          reviewReason: null,
        }),
        itemId
      )
    },
    [updateReviewReceipts]
  )

  const updateReviewItemQuantity = useCallback(
    (itemId: string, quantity: number) => {
      updateReviewReceipts((transaction) => {
        const normalizedQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1
        const unitPrice = Number(transaction.pricePerUnit) || 0
        const nextTotal = unitPrice > 0
          ? Number((unitPrice * normalizedQuantity).toFixed(2))
          : Number(transaction.totalPrice) || 0

        return {
          ...transaction,
          quantity: normalizedQuantity,
          totalPrice: nextTotal,
        }
      }, itemId)
    },
    [updateReviewReceipts]
  )

  const deleteReviewItem = useCallback(
    (itemId: string) => {
      updateReviewReceipts(() => null, itemId)
    },
    [updateReviewReceipts]
  )

  const handleCommitReview = useCallback(async () => {
    if (reviewReceipts.length === 0) return

    setIsCommittingReview(true)
    setReviewCommitError(null)

    try {
      const payload = {
        receipts: reviewReceipts.map((receipt) => ({
          fileId: receipt.fileId,
          fileName: receipt.fileName,
          storeName: receipt.storeName,
          receiptDate: receipt.receiptDate,
          receiptTime: receipt.receiptTime,
          currency: receipt.currency,
          totalAmount: receipt.totalAmount,
          transactions: receipt.transactions.map((transaction) => ({
            description: transaction.description,
            quantity: transaction.quantity,
            pricePerUnit: transaction.pricePerUnit,
            totalPrice: transaction.totalPrice,
            categoryName: transaction.categoryName,
            broadType: transaction.broadType,
            categoryTypeName: transaction.categoryTypeName,
          })),
        })),
      }

      const response = await fetch("/api/receipts/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (response.status === 403 && errorData?.code === "LIMIT_EXCEEDED") {
          onLimitExceeded(errorData as TransactionLimitExceededData)
          setReviewCommitError(errorData.message || "Transaction limit reached")
          return
        }
        throw new Error(errorData?.error || "Failed to import receipts")
      }

      const result = await response.json().catch(() => null)
      const inserted = result?.summary?.itemsInserted ?? 0
      const skipped = result?.summary?.itemsSkipped ?? 0

      toast.success("Receipts imported", {
        description: `Imported ${inserted} item(s) from your receipts.`,
      })

      if (skipped > 0 || (result?.rejected && result.rejected.length > 0)) {
        toast.warning("Some items were skipped", {
          description: `Skipped ${skipped} item(s). Review your data for details.`,
        })
      }

      clearResponseCache()
      handleReviewDialogOpenChange(false)
      onCommitSuccess()
    } catch (error) {
      console.error("Commit error:", error)
      const message = error instanceof Error ? error.message : "Failed to import receipts"
      setReviewCommitError(message)
      toast.error(message)
    } finally {
      setIsCommittingReview(false)
    }
  }, [handleReviewDialogOpenChange, onCommitSuccess, onLimitExceeded, reviewReceipts])

  const reviewQueueCount = useMemo(() => {
    if (!activeReviewReceipt) return 0
    return activeReviewReceipt.transactions.filter((transaction) => Boolean(transaction.needsReview)).length
  }, [activeReviewReceipt])
  const hasMultipleReviewReceipts = reviewReceipts.length > 1
  const isFirstReviewReceipt = activeReviewReceiptIndex <= 0
  const isLastReviewReceipt = activeReviewReceiptIndex >= reviewReceipts.length - 1

  const handleStoreLanguageChange = useCallback(
    async (nextLanguage: string) => {
      if (!activeReviewReceipt?.storeName) return
      if (!activeStoreKey) return

      const previousValue =
        storeLanguageByKey[activeStoreKey] ?? activeReviewReceipt.languageOverride ?? "auto"

      setStoreLanguageByKey((prev) => ({ ...prev, [activeStoreKey]: nextLanguage }))
      setIsStoreLanguageLoading(true)
      setStoreLanguageError(null)

      try {
        const response = await fetch("/api/receipt-stores/language", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storeName: activeReviewReceipt.storeName,
            language: nextLanguage,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData?.error || "Failed to save store language")
        }
      } catch (error) {
        console.error("Store language update error:", error)
        setStoreLanguageByKey((prev) => ({ ...prev, [activeStoreKey]: previousValue }))
        setStoreLanguageError("Failed to save store language")
      } finally {
        setIsStoreLanguageLoading(false)
      }
    },
    [activeReviewReceipt?.storeName, activeReviewReceipt?.languageOverride, activeStoreKey, storeLanguageByKey]
  )

  return {
    isReviewDialogOpen,
    handleReviewDialogOpenChange,
    reviewReceipts,
    setReviewReceipts,
    activeReviewReceiptIndex,
    setActiveReviewReceiptIndex,
    reviewUploadWarnings,
    setReviewUploadWarnings,
    isCommittingReview,
    reviewCommitError,
    activeReviewReceipt,
    hasMultipleReviewReceipts,
    isFirstReviewReceipt,
    isLastReviewReceipt,
    reviewCategoryByLowerName,
    reviewCategoryGroups,
    activeReviewCategoryBroadType,
    setActiveReviewCategoryBroadType,
    openDropdownId,
    setOpenDropdownId,
    showReviewOnly,
    setShowReviewOnly,
    reviewQueueCount,
    storeLanguageValue,
    isStoreLanguageLoading,
    storeLanguageError,
    handleStoreLanguageChange,
    updateReviewItemCategory,
    updateReviewItemBroadType,
    updateReviewItemCategoryType,
    updateReviewItemQuantity,
    deleteReviewItem,
    handleCommitReview,
    handleUploadResults,
  }
}
