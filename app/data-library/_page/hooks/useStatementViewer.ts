import { useCallback, useState } from "react"
import type { Dispatch, SetStateAction } from "react"
import { toast } from "sonner"

import type { CategoryLimitExceededData } from "@/components/limits/category-limit-dialog"
import { normalizeTransactions } from "@/lib/utils"
import { safeCapture } from "@/lib/posthog-safe"

import type { ReceiptCategoryOption, Statement, Transaction } from "../types"

type UseStatementViewerOptions = {
  setStatements: Dispatch<SetStateAction<Statement[]>>
  fetchLibraryData: () => Promise<void>
  onCategoryLimit: (data: CategoryLimitExceededData) => void
}

export const useStatementViewer = ({
  setStatements,
  fetchLibraryData,
  onCategoryLimit,
}: UseStatementViewerOptions) => {
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [viewLoading, setViewLoading] = useState(false)
  const [selectedStatement, setSelectedStatement] =
    useState<Statement | null>(null)
  const [statementTransactions, setStatementTransactions] = useState<
    Transaction[]
  >([])
  const [dialogReceiptCategories, setDialogReceiptCategories] = useState<
    ReceiptCategoryOption[]
  >([])
  const [dialogReceiptCategoryTypes, setDialogReceiptCategoryTypes] = useState<
    Array<{ id: number; name: string; color: string | null }>
  >([])
  const [isCreateReceiptCategoryDialogOpen, setIsCreateReceiptCategoryDialogOpen] =
    useState(false)
  const [newDialogReceiptCategoryName, setNewDialogReceiptCategoryName] =
    useState("")
  const [newDialogReceiptCategoryTypeId, setNewDialogReceiptCategoryTypeId] =
    useState<string>("")
  const [isCreatingReceiptCategory, setIsCreatingReceiptCategory] =
    useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [statementToDelete, setStatementToDelete] =
    useState<Statement | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  const handleViewStatementTransactions = useCallback(async (statement: Statement) => {
    setSelectedStatement(statement)
    setViewDialogOpen(true)
    setViewLoading(true)
    setStatementTransactions([])

    if (statement.type === "Receipts" && statement.receiptId) {
      try {
        const [categoriesResponse, typesResponse] = await Promise.all([
          fetch("/api/receipt-categories"),
          fetch("/api/receipt-categories/types"),
        ])

        if (categoriesResponse.ok) {
          const categoriesPayload = (await categoriesResponse.json()) as Array<{
            name?: string
            color?: string | null
            typeName?: string
            typeColor?: string | null
            type_name?: string
            type_color?: string | null
          }>
          const normalized = Array.isArray(categoriesPayload)
            ? categoriesPayload
                .map((category) => ({
                  name: typeof category?.name === "string" ? category.name : "",
                  color:
                    typeof category?.color === "string" ? category.color : null,
                  typeName:
                    typeof category?.typeName === "string"
                      ? category.typeName
                      : typeof category?.type_name === "string"
                      ? category.type_name
                      : "",
                  typeColor:
                    typeof category?.typeColor === "string"
                      ? category.typeColor
                      : typeof category?.type_color === "string"
                      ? category.type_color
                      : null,
                }))
                .filter((category) => category.name.trim().length > 0)
            : []
          setDialogReceiptCategories(normalized)
        }

        if (typesResponse.ok) {
          const typesPayload = (await typesResponse.json()) as Array<{
            id?: number
            name?: string
            color?: string | null
          }>
          const types = Array.isArray(typesPayload)
            ? typesPayload
                .map((type) => ({
                  id: typeof type?.id === "number" ? type.id : 0,
                  name: typeof type?.name === "string" ? type.name : "",
                  color:
                    typeof type?.color === "string" ? type.color : null,
                }))
                .filter((type) => type.id > 0 && type.name.trim().length > 0)
            : []
          setDialogReceiptCategoryTypes(types)
          if (types.length > 0) {
            setNewDialogReceiptCategoryTypeId(
              (prev) => prev || String(types[0].id)
            )
          }
        }

        const response = await fetch(`/api/receipts/${statement.receiptId}`)
        if (response.ok) {
          const data = await response.json()
          const transactions = (data.transactions || []).map((rt: any) => ({
            id: rt.id,
            date: `${rt.receipt_date}T${rt.receipt_time}`,
            description: rt.description,
            amount: -Number(rt.total_price),
            balance: null,
            category: rt.category_name || "Uncategorized",
            receiptTransactionId: rt.id,
            isReceipt: true,
          }))
          setStatementTransactions(
            normalizeTransactions(transactions) as Transaction[]
          )
        } else {
          console.error("Failed to fetch receipt transactions")
          setStatementTransactions([])
        }
      } catch (err) {
        console.error("Error fetching receipt transactions:", err)
        setStatementTransactions([])
      } finally {
        setViewLoading(false)
      }
      return
    }

    const statementId = statement.statementId ?? Number(statement.id)
    if (!statementId) {
      console.error("Missing statement ID")
      setViewLoading(false)
      return
    }

    try {
      const response = await fetch(
        `/api/statements/${statementId}/transactions`
      )
      if (response.ok) {
        const data = await response.json()
        setStatementTransactions(normalizeTransactions(data) as Transaction[])
      } else {
        console.error("Failed to fetch statement transactions")
        setStatementTransactions([])
      }
    } catch (err) {
      console.error("Error fetching statement transactions:", err)
      setStatementTransactions([])
    } finally {
      setViewLoading(false)
    }
  }, [])

  const handleCreateDialogReceiptCategory = useCallback(async () => {
    const trimmedName = newDialogReceiptCategoryName.trim()
    if (!trimmedName) {
      toast.error("Please enter a receipt category name")
      return
    }

    const typeId = Number(newDialogReceiptCategoryTypeId)
    if (!Number.isFinite(typeId)) {
      toast.error("Please select a macronutrient type")
      return
    }

    try {
      setIsCreatingReceiptCategory(true)
      const response = await fetch("/api/receipt-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          typeId: typeId,
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
          setIsCreatingReceiptCategory(false)
          return
        }

        throw new Error(errorData.error || "Failed to add receipt category")
      }

      await response.json()

      const categoriesResponse = await fetch("/api/receipt-categories")
      if (categoriesResponse.ok) {
        const categoriesPayload = (await categoriesResponse.json()) as Array<{
          name?: string
          color?: string | null
          typeName?: string
          typeColor?: string | null
          type_name?: string
          type_color?: string | null
        }>
        const normalized = Array.isArray(categoriesPayload)
          ? categoriesPayload
              .map((category) => ({
                name: typeof category?.name === "string" ? category.name : "",
                color:
                  typeof category?.color === "string" ? category.color : null,
                typeName:
                  typeof category?.typeName === "string"
                    ? category.typeName
                    : typeof category?.type_name === "string"
                    ? category.type_name
                    : "",
                typeColor:
                  typeof category?.typeColor === "string"
                    ? category.typeColor
                    : typeof category?.type_color === "string"
                    ? category.type_color
                    : null,
              }))
              .filter((category) => category.name.trim().length > 0)
          : []
        setDialogReceiptCategories(normalized)
      }

      setNewDialogReceiptCategoryName("")
      setIsCreateReceiptCategoryDialogOpen(false)

      toast.success(`Receipt category "${trimmedName}" added`)
    } catch (error: any) {
      const message = error?.message || "Failed to add receipt category"
      toast.error(message)
    } finally {
      setIsCreatingReceiptCategory(false)
    }
  }, [newDialogReceiptCategoryName, newDialogReceiptCategoryTypeId, onCategoryLimit])

  const handleDeleteStatement = useCallback(async () => {
    if (!statementToDelete) return

    console.log("[Delete] Deleting statement:", statementToDelete)

    if (statementToDelete.type === "Receipts" && statementToDelete.receiptId) {
      setDeleteLoading(true)
      try {
        console.log(
          "[Delete] Calling DELETE /api/receipts/",
          statementToDelete.receiptId
        )
        const response = await fetch(
          `/api/receipts/${statementToDelete.receiptId}`,
          {
            method: "DELETE",
          }
        )
        console.log("[Delete] DELETE response status:", response.status)
        if (response.ok) {
          const result = await response.json()
          console.log("[Delete] DELETE successful:", result)

          safeCapture("statement_deleted", {
            statement_name: statementToDelete.name,
            statement_type: statementToDelete.type,
            is_receipt: true,
          })

          console.log("[Delete] Optimistically removing statement from UI")
          setStatements((prev) =>
            prev.filter((s) => s.id !== statementToDelete.id)
          )
          setDeleteDialogOpen(false)
          setStatementToDelete(null)
          setDeleteLoading(false)

          console.log(
            "[Delete] Calling fetchLibraryData to refresh in background"
          )
          fetchLibraryData().catch((err) => {
            console.error("[Delete] Background refresh failed:", err)
          })
          return
        } else {
          const errorData = await response.json().catch(() => ({}))
          console.error("[Delete] DELETE failed:", errorData)
          alert(errorData.error || "Failed to delete receipt")
        }
      } catch (err) {
        console.error("Error deleting receipt:", err)
        alert(err instanceof Error ? err.message : "Failed to delete receipt")
      } finally {
        setDeleteLoading(false)
      }
      return
    }

    const statementId = statementToDelete.statementId ?? Number(statementToDelete.id)
    if (!statementId) return

    setDeleteLoading(true)
    try {
      const response = await fetch(`/api/statements/${statementId}`, {
        method: "DELETE",
      })
      if (response.ok) {
        safeCapture("statement_deleted", {
          statement_name: statementToDelete.name,
          statement_type: statementToDelete.type,
          is_receipt: false,
        })

        await fetchLibraryData()
        setDeleteDialogOpen(false)
        setStatementToDelete(null)
      } else {
        const errorData = await response.json().catch(() => ({}))
        alert(errorData.error || "Failed to delete statement")
      }
    } catch (err) {
      console.error("Error deleting statement:", err)
      alert(err instanceof Error ? err.message : "Failed to delete statement")
    } finally {
      setDeleteLoading(false)
    }
  }, [fetchLibraryData, setStatements, statementToDelete])

  return {
    viewDialogOpen,
    setViewDialogOpen,
    viewLoading,
    selectedStatement,
    setSelectedStatement,
    statementTransactions,
    setStatementTransactions,
    dialogReceiptCategories,
    dialogReceiptCategoryTypes,
    isCreateReceiptCategoryDialogOpen,
    setIsCreateReceiptCategoryDialogOpen,
    newDialogReceiptCategoryName,
    setNewDialogReceiptCategoryName,
    newDialogReceiptCategoryTypeId,
    setNewDialogReceiptCategoryTypeId,
    isCreatingReceiptCategory,
    deleteDialogOpen,
    setDeleteDialogOpen,
    statementToDelete,
    setStatementToDelete,
    deleteLoading,
    sortDirection,
    setSortDirection,
    handleViewStatementTransactions,
    handleCreateDialogReceiptCategory,
    handleDeleteStatement,
  }
}
