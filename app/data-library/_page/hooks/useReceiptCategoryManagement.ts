import { useCallback, useState } from "react"
import type { Dispatch, SetStateAction } from "react"
import { toast } from "sonner"

import type { CategoryLimitExceededData } from "@/components/limits/category-limit-dialog"

import type { ReceiptCategory } from "../types"

type UseReceiptCategoryManagementOptions = {
  setReceiptCategories: Dispatch<SetStateAction<ReceiptCategory[]>>
  onCategoryLimit: (data: CategoryLimitExceededData) => void
}

export const useReceiptCategoryManagement = ({
  setReceiptCategories,
  onCategoryLimit,
}: UseReceiptCategoryManagementOptions) => {
  const [addReceiptCategoryDialogOpen, setAddReceiptCategoryDialogOpen] =
    useState(false)
  const [newReceiptCategoryName, setNewReceiptCategoryName] = useState("")
  const [newReceiptCategoryTypeId, setNewReceiptCategoryTypeId] =
    useState<string>("")
  const [addReceiptCategoryLoading, setAddReceiptCategoryLoading] =
    useState(false)
  const [deleteReceiptCategoryDialogOpen, setDeleteReceiptCategoryDialogOpen] =
    useState(false)
  const [receiptCategoryToDelete, setReceiptCategoryToDelete] =
    useState<ReceiptCategory | null>(null)
  const [deleteReceiptCategoryLoading, setDeleteReceiptCategoryLoading] =
    useState(false)

  const handleAddReceiptCategory = useCallback(async () => {
    const trimmedName = newReceiptCategoryName.trim()
    if (!trimmedName) {
      toast.error("Please enter a receipt category name")
      return
    }

    const typeId = Number(newReceiptCategoryTypeId)
    if (!Number.isFinite(typeId)) {
      toast.error("Please select a macronutrient type")
      return
    }

    const optimisticId = `temp-${Date.now()}`

    setReceiptCategories((prev) => [
      ...prev,
      {
        id: optimisticId as any,
        name: trimmedName,
        color: "#94a3b8",
        typeId: typeId,
        typeName: "",
        typeColor: null,
        broadType: "Other",
        createdAt: new Date().toISOString(),
        transactionCount: 0,
        totalSpend: 0,
      },
    ])

    try {
      setAddReceiptCategoryLoading(true)
      const response = await fetch("/api/receipt-categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: trimmedName, typeId }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))

        setReceiptCategories((prev) =>
          prev.filter((c) => String(c.id) !== optimisticId)
        )

        if (
          response.status === 403 &&
          errorData.code === "CATEGORY_LIMIT_EXCEEDED"
        ) {
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
          setAddReceiptCategoryLoading(false)
          return
        }

        throw new Error(errorData.error || "Failed to add receipt category")
      }

      const newCategory = await response.json()

      setReceiptCategories((prev) =>
        prev.map((c) =>
          String(c.id) === optimisticId
            ? {
                id: newCategory.id,
                name: newCategory.name,
                color: newCategory.color,
                typeId: newCategory.typeId || typeId,
                typeName: newCategory.typeName || "",
                typeColor: newCategory.typeColor || null,
                broadType: newCategory.broadType || "Other",
                createdAt: new Date().toISOString(),
                transactionCount: 0,
                totalSpend: 0,
              }
            : c
        )
      )

      setNewReceiptCategoryName("")
      setAddReceiptCategoryDialogOpen(false)

      toast.success(`Receipt category "${trimmedName}" added`)
    } catch (error) {
      setReceiptCategories((prev) =>
        prev.filter((c) => String(c.id) !== optimisticId)
      )

      console.error("[Add Receipt Category] Error:", error)
      const message =
        error instanceof Error
          ? error.message
          : "Failed to add receipt category"
      toast.error(message)
    } finally {
      setAddReceiptCategoryLoading(false)
    }
  }, [newReceiptCategoryName, newReceiptCategoryTypeId, onCategoryLimit, setReceiptCategories])

  const handleDeleteReceiptCategory = useCallback(async () => {
    if (!receiptCategoryToDelete) return

    try {
      setDeleteReceiptCategoryLoading(true)
      const response = await fetch("/api/receipt-categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: receiptCategoryToDelete.id }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to delete receipt category")
      }

      setReceiptCategories((prev) =>
        prev.filter((c) => c.id !== receiptCategoryToDelete.id)
      )

      setReceiptCategoryToDelete(null)
      setDeleteReceiptCategoryDialogOpen(false)

      toast.success(`Receipt category "${receiptCategoryToDelete.name}" deleted`)
    } catch (error) {
      console.error("[Delete Receipt Category] Error:", error)
      const message =
        error instanceof Error
          ? error.message
          : "Failed to delete receipt category"
      toast.error(message)
    } finally {
      setDeleteReceiptCategoryLoading(false)
    }
  }, [receiptCategoryToDelete, setReceiptCategories])

  return {
    addReceiptCategoryDialogOpen,
    setAddReceiptCategoryDialogOpen,
    newReceiptCategoryName,
    setNewReceiptCategoryName,
    newReceiptCategoryTypeId,
    setNewReceiptCategoryTypeId,
    addReceiptCategoryLoading,
    deleteReceiptCategoryDialogOpen,
    setDeleteReceiptCategoryDialogOpen,
    receiptCategoryToDelete,
    setReceiptCategoryToDelete,
    deleteReceiptCategoryLoading,
    handleAddReceiptCategory,
    handleDeleteReceiptCategory,
  }
}
