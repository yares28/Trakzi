import { useCallback, useState } from "react"
import type { Dispatch, SetStateAction } from "react"
import { toast } from "sonner"

import type { CategoryLimitExceededData } from "@/components/limits/category-limit-dialog"
import { safeCapture } from "@/lib/posthog-safe"

import { CATEGORY_TIER_STORAGE_KEY } from "../constants"
import type { Category } from "../types"

type UseCategoryManagementOptions = {
  setCategories: Dispatch<SetStateAction<Category[]>>
  onCategoryLimit: (data: CategoryLimitExceededData) => void
}

export const useCategoryManagement = ({
  setCategories,
  onCategoryLimit,
}: UseCategoryManagementOptions) => {
  const [addCategoryDialogOpen, setAddCategoryDialogOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryTier, setNewCategoryTier] = useState<
    "Essentials" | "Mandatory" | "Wants" | "Other"
  >("Wants")
  const [addCategoryLoading, setAddCategoryLoading] = useState(false)
  const [deleteCategoryDialogOpen, setDeleteCategoryDialogOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)
  const [deleteCategoryLoading, setDeleteCategoryLoading] = useState(false)

  const saveCategoryTier = useCallback(
    (categoryName: string, tier: "Essentials" | "Mandatory" | "Wants" | "Other") => {
      if (typeof window === "undefined") return
      try {
        const key = categoryName.trim().toLowerCase()
        const raw = window.localStorage.getItem(CATEGORY_TIER_STORAGE_KEY)
        const map: Record<string, "Essentials" | "Mandatory" | "Wants" | "Other"> = raw
          ? JSON.parse(raw)
          : {}
        map[key] = tier
        window.localStorage.setItem(
          CATEGORY_TIER_STORAGE_KEY,
          JSON.stringify(map)
        )
      } catch {
        // ignore storage errors
      }
    },
    []
  )

  const handleAddCategory = useCallback(async () => {
    const trimmedName = newCategoryName.trim()
    if (!trimmedName) {
      toast.error("Please enter a category name")
      return
    }

    const optimisticId = `temp-${Date.now()}`

    setCategories((prev) => [
      ...prev,
      {
        id: optimisticId as any,
        name: trimmedName,
        color: "#94a3b8",
        createdAt: new Date().toISOString(),
        transactionCount: 0,
        totalSpend: 0,
        totalAmount: 0,
      },
    ])

    try {
      setAddCategoryLoading(true)
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: trimmedName }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))

        setCategories((prev) =>
          prev.filter((c) => String(c.id) !== optimisticId)
        )

        if (
          response.status === 403 &&
          errorData.code === "CATEGORY_LIMIT_EXCEEDED"
        ) {
          onCategoryLimit({
            code: "CATEGORY_LIMIT_EXCEEDED",
            type: "transaction",
            plan: errorData.plan || "free",
            transactionCap: errorData.capacity?.transactionCap,
            receiptCap: errorData.capacity?.receiptCap,
            transactionUsed: errorData.capacity?.transactionUsed,
            receiptUsed: errorData.capacity?.receiptUsed,
            transactionRemaining: errorData.capacity?.transactionRemaining,
            receiptRemaining: errorData.capacity?.receiptRemaining,
            message: errorData.message,
            upgradePlans: errorData.upgradePlans,
          })
          setAddCategoryLoading(false)
          return
        }

        throw new Error(errorData.error || "Failed to add category")
      }

      const created = await response.json()

      setCategories((prev) =>
        prev.map((c) =>
          String(c.id) === optimisticId
            ? {
                id: created.id,
                name: created.name,
                color: created.color,
                createdAt: new Date().toISOString(),
                transactionCount: 0,
                totalSpend: 0,
                totalAmount: 0,
              }
            : c
        )
      )

      setNewCategoryName("")
      setNewCategoryTier("Wants")
      setAddCategoryDialogOpen(false)

      saveCategoryTier(created.name ?? trimmedName, newCategoryTier)

      safeCapture("category_created", {
        category_name: created.name ?? trimmedName,
        category_tier: newCategoryTier,
      })

      toast.success(`Category "${created.name}" added`)
    } catch (error) {
      setCategories((prev) =>
        prev.filter((c) => String(c.id) !== optimisticId)
      )

      console.error("[Add Category] Error:", error)
      const message =
        error instanceof Error ? error.message : "Failed to add category"
      toast.error(message)
    } finally {
      setAddCategoryLoading(false)
    }
  }, [newCategoryName, newCategoryTier, onCategoryLimit, saveCategoryTier, setCategories])

  const handleDeleteCategory = useCallback(async () => {
    if (!categoryToDelete) return

    try {
      setDeleteCategoryLoading(true)
      const response = await fetch(`/api/categories/${categoryToDelete.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to delete category")
      }

      setCategories((prev) =>
        prev.filter((c) => c.id !== categoryToDelete.id)
      )

      setCategoryToDelete(null)
      setDeleteCategoryDialogOpen(false)

      toast.success(`Category "${categoryToDelete.name}" deleted`)
    } catch (error) {
      console.error("[Delete Category] Error:", error)
      const message =
        error instanceof Error ? error.message : "Failed to delete category"
      toast.error(message)
    } finally {
      setDeleteCategoryLoading(false)
    }
  }, [categoryToDelete, setCategories])

  return {
    addCategoryDialogOpen,
    setAddCategoryDialogOpen,
    newCategoryName,
    setNewCategoryName,
    newCategoryTier,
    setNewCategoryTier,
    addCategoryLoading,
    deleteCategoryDialogOpen,
    setDeleteCategoryDialogOpen,
    categoryToDelete,
    setCategoryToDelete,
    deleteCategoryLoading,
    handleAddCategory,
    handleDeleteCategory,
  }
}
