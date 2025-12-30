import { useCallback, useState } from "react"
import { toast } from "sonner"

import type { ReceiptCategoryType } from "../types"

type UseReceiptTypeManagementOptions = {
  fetchLibraryData: () => Promise<void>
}

export const useReceiptTypeManagement = ({
  fetchLibraryData,
}: UseReceiptTypeManagementOptions) => {
  const [addReceiptTypeDialogOpen, setAddReceiptTypeDialogOpen] =
    useState(false)
  const [newReceiptTypeName, setNewReceiptTypeName] = useState("")
  const [addReceiptTypeLoading, setAddReceiptTypeLoading] = useState(false)
  const [deleteReceiptTypeDialogOpen, setDeleteReceiptTypeDialogOpen] =
    useState(false)
  const [receiptTypeToDelete, setReceiptTypeToDelete] =
    useState<ReceiptCategoryType | null>(null)
  const [deleteReceiptTypeLoading, setDeleteReceiptTypeLoading] =
    useState(false)

  const handleAddReceiptType = useCallback(async () => {
    const trimmedName = newReceiptTypeName.trim()
    if (!trimmedName) {
      toast.error("Please enter a macronutrient type name")
      return
    }

    try {
      setAddReceiptTypeLoading(true)
      const response = await fetch("/api/receipt-categories/types", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: trimmedName }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to add receipt type")
      }

      await fetchLibraryData()

      setNewReceiptTypeName("")
      setAddReceiptTypeDialogOpen(false)

      toast.success(`Receipt type "${trimmedName}" added`)
    } catch (error) {
      console.error("[Add Receipt Type] Error:", error)
      const message =
        error instanceof Error ? error.message : "Failed to add receipt type"
      toast.error(message)
    } finally {
      setAddReceiptTypeLoading(false)
    }
  }, [fetchLibraryData, newReceiptTypeName])

  const handleDeleteReceiptType = useCallback(async () => {
    if (!receiptTypeToDelete) return

    try {
      setDeleteReceiptTypeLoading(true)
      const response = await fetch("/api/receipt-categories/types", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: receiptTypeToDelete.id }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to delete receipt type")
      }

      await fetchLibraryData()

      setReceiptTypeToDelete(null)
      setDeleteReceiptTypeDialogOpen(false)

      toast.success(`Receipt type "${receiptTypeToDelete.name}" deleted`)
    } catch (error) {
      console.error("[Delete Receipt Type] Error:", error)
      const message =
        error instanceof Error ? error.message : "Failed to delete receipt type"
      toast.error(message)
    } finally {
      setDeleteReceiptTypeLoading(false)
    }
  }, [fetchLibraryData, receiptTypeToDelete])

  return {
    addReceiptTypeDialogOpen,
    setAddReceiptTypeDialogOpen,
    newReceiptTypeName,
    setNewReceiptTypeName,
    addReceiptTypeLoading,
    deleteReceiptTypeDialogOpen,
    setDeleteReceiptTypeDialogOpen,
    receiptTypeToDelete,
    setReceiptTypeToDelete,
    deleteReceiptTypeLoading,
    handleAddReceiptType,
    handleDeleteReceiptType,
  }
}
