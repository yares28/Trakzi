import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import type { CategoryLimitExceededData } from "@/components/limits/category-limit-dialog"
import { getReceiptBroadTypes } from "@/lib/receipt-categories"

import type { ReceiptCategoryOption } from "../types"

type ReceiptCategoryTypeOption = { id: number; name: string; color: string | null }

type UseReceiptCategoryManagementOptions = {
  onCategoryLimit: (data: CategoryLimitExceededData) => void
}

export function useReceiptCategoryManagement({
  onCategoryLimit,
}: UseReceiptCategoryManagementOptions) {
  const [reviewCategories, setReviewCategories] = useState<ReceiptCategoryOption[]>([])
  const [receiptCategoryTypes, setReceiptCategoryTypes] = useState<ReceiptCategoryTypeOption[]>([])
  const [isCreateCategoryDialogOpen, setIsCreateCategoryDialogOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryTypeId, setNewCategoryTypeId] = useState<string>("")
  const [newCategoryBroadType, setNewCategoryBroadType] = useState<string>("Other")
  const [newCategoryTargetItemId, setNewCategoryTargetItemId] = useState<string | null>(null)
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadCategories() {
      try {
        const response = await fetch("/api/receipt-categories")
        if (!response.ok) return
        const data = await response.json()
        if (cancelled) return

        const categories: ReceiptCategoryOption[] = Array.isArray(data)
          ? data.map((category: any) => ({
              name: String(category.name ?? ""),
              color: category.color ?? null,
              typeName: String(category.typeName ?? category.type_name ?? ""),
              typeColor: category.typeColor ?? category.type_color ?? null,
              broadType: String(category.broadType ?? category.broad_type ?? "Other"),
            }))
          : []

        setReviewCategories(categories)
      } catch (error) {
        console.error("Failed to load receipt categories:", error)
      }
    }

    async function loadCategoryTypes() {
      try {
        const response = await fetch("/api/receipt-categories/types")
        if (!response.ok) return
        const data = await response.json()
        if (cancelled) return

        const types: ReceiptCategoryTypeOption[] = Array.isArray(data)
          ? data.map((type: any) => ({
              id: Number(type.id ?? 0),
              name: String(type.name ?? ""),
              color: type.color ?? null,
            }))
          : []

        setReceiptCategoryTypes(types)
      } catch (error) {
        console.error("Failed to load receipt category types:", error)
      }
    }

    loadCategories()
    loadCategoryTypes()

    return () => {
      cancelled = true
    }
  }, [])

  const availableBroadTypes = useMemo(() => {
    const broadTypes = new Set(getReceiptBroadTypes())
    reviewCategories.forEach((category) => {
      const value = category.broadType?.trim()
      if (value) broadTypes.add(value)
    })

    return Array.from(broadTypes).sort((a, b) => {
      if (a === "Other") return 1
      if (b === "Other") return -1
      return a.localeCompare(b)
    })
  }, [reviewCategories])

  const handleCreateCategory = useCallback(async (): Promise<ReceiptCategoryOption | null> => {
    const trimmed = newCategoryName.trim()
    if (!trimmed) {
      toast.error("Please enter a category name")
      return null
    }

    const typeId = Number(newCategoryTypeId)
    if (!Number.isFinite(typeId)) {
      toast.error("Please select a macronutrient type")
      return null
    }

    setIsCreatingCategory(true)

    try {
      const response = await fetch("/api/receipt-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          typeId,
          broadType: newCategoryBroadType,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (response.status === 403 && errorData.code === "CATEGORY_LIMIT_EXCEEDED") {
          onCategoryLimit({
            code: "CATEGORY_LIMIT_EXCEEDED",
            type: "receipt",
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
          return null
        }

        throw new Error(errorData.error || "Failed to create category")
      }

      const payload = await response.json().catch(() => ({}))
      const nextCategory: ReceiptCategoryOption = {
        name: String(payload.name ?? trimmed),
        color: payload.color ?? null,
        typeName: String(payload.type_name ?? payload.typeName ?? ""),
        typeColor: payload.type_color ?? payload.typeColor ?? null,
        broadType: String(payload.broad_type ?? payload.broadType ?? newCategoryBroadType ?? "Other"),
      }

      setReviewCategories((prev) => {
        const exists = prev.some((category) => category.name.toLowerCase() === nextCategory.name.toLowerCase())
        if (exists) return prev
        return [...prev, nextCategory].sort((a, b) => a.name.localeCompare(b.name))
      })

      toast.success(`Created "${nextCategory.name}"`)

      setNewCategoryName("")
      setNewCategoryTypeId("")
      setNewCategoryBroadType("Other")
      setNewCategoryTargetItemId(null)
      setIsCreateCategoryDialogOpen(false)

      return nextCategory
    } catch (error) {
      console.error("Create category error:", error)
      const message = error instanceof Error ? error.message : "Failed to create category"
      toast.error(message)
      return null
    } finally {
      setIsCreatingCategory(false)
    }
  }, [
    newCategoryName,
    newCategoryTypeId,
    newCategoryBroadType,
    onCategoryLimit,
  ])

  return {
    reviewCategories,
    setReviewCategories,
    receiptCategoryTypes,
    availableBroadTypes,
    isCreateCategoryDialogOpen,
    setIsCreateCategoryDialogOpen,
    newCategoryName,
    setNewCategoryName,
    newCategoryTypeId,
    setNewCategoryTypeId,
    newCategoryBroadType,
    setNewCategoryBroadType,
    newCategoryTargetItemId,
    setNewCategoryTargetItemId,
    isCreatingCategory,
    handleCreateCategory,
  }
}
