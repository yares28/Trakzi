import { useState, type Dispatch, type SetStateAction } from "react"
import { IconLoader2, IconPlus, IconTrash } from "@tabler/icons-react"
import { toast } from "sonner"

import { CategorySelect } from "@/components/category-select"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { safeCapture } from "@/lib/posthog-safe"

import { formatDateLabel } from "../formatters"
import type { ReceiptCategoryOption, Statement, Transaction } from "../types"

type ViewStatementDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  viewLoading: boolean
  selectedStatement: Statement | null
  statementTransactions: Transaction[]
  setStatementTransactions: Dispatch<SetStateAction<Transaction[]>>
  sortDirection: "asc" | "desc"
  setSortDirection: Dispatch<SetStateAction<"asc" | "desc">>
  dialogReceiptCategories: ReceiptCategoryOption[]
  dialogReceiptCategoryTypes: Array<{ id: number; name: string; color: string | null }>
  isCreateReceiptCategoryDialogOpen: boolean
  onCreateReceiptCategoryOpenChange: (open: boolean) => void
  newDialogReceiptCategoryName: string
  onNewDialogReceiptCategoryNameChange: (value: string) => void
  newDialogReceiptCategoryTypeId: string
  onNewDialogReceiptCategoryTypeIdChange: (value: string) => void
  isCreatingReceiptCategory: boolean
  onCreateDialogReceiptCategory: () => void
  formatCurrency: (value: number) => string
  startTransition: (callback: () => void) => void
}

export function ViewStatementDialog({
  open,
  onOpenChange,
  viewLoading,
  selectedStatement,
  statementTransactions,
  setStatementTransactions,
  sortDirection,
  setSortDirection,
  dialogReceiptCategories,
  dialogReceiptCategoryTypes,
  isCreateReceiptCategoryDialogOpen,
  onCreateReceiptCategoryOpenChange,
  newDialogReceiptCategoryName,
  onNewDialogReceiptCategoryNameChange,
  newDialogReceiptCategoryTypeId,
  onNewDialogReceiptCategoryTypeIdChange,
  isCreatingReceiptCategory,
  onCreateDialogReceiptCategory,
  formatCurrency,
  startTransition,
}: ViewStatementDialogProps) {
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  
  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteMode, setDeleteMode] = useState<"single" | "batch">("single")
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deletingRowId, setDeletingRowId] = useState<number | null>(null)

  // Check if all visible transactions are selected
  const allSelected = statementTransactions.length > 0 && 
    statementTransactions.every((tx) => selectedIds.has(tx.id))

  // Handle select all toggle
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(statementTransactions.map((tx) => tx.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  // Handle single row selection
  const handleSelectRow = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }

  // Request single delete
  const handleRequestDelete = (tx: Transaction) => {
    setTransactionToDelete(tx)
    setDeleteMode("single")
    setDeleteDialogOpen(true)
  }

  // Request batch delete
  const handleRequestBatchDelete = () => {
    setDeleteMode("batch")
    setDeleteDialogOpen(true)
  }

  // Perform delete (single or batch)
  const handleConfirmDelete = async () => {
    setIsDeleting(true)
    
    try {
      if (deleteMode === "single" && transactionToDelete) {
        // Single delete
        setDeletingRowId(transactionToDelete.id)
        
        // Determine if it's a receipt transaction or regular transaction
        if (transactionToDelete.isReceipt && transactionToDelete.receiptTransactionId) {
          const response = await fetch(`/api/receipt-transactions/${transactionToDelete.receiptTransactionId}`, {
            method: "DELETE",
          })
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || "Failed to delete receipt transaction")
          }
        } else {
          const response = await fetch(`/api/transactions/${transactionToDelete.id}`, {
            method: "DELETE",
          })
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || "Failed to delete transaction")
          }
        }
        
        // Remove from local state
        setStatementTransactions((prev) => 
          prev.filter((tx) => tx.id !== transactionToDelete.id)
        )
        setSelectedIds((prev) => {
          const next = new Set(prev)
          next.delete(transactionToDelete.id)
          return next
        })
        
        // Invalidate cache
        await fetch("/api/cache/invalidate?all=true")
        
        toast.success("Transaction deleted")
        safeCapture("transaction_deleted", { 
          transaction_type: transactionToDelete.isReceipt ? "receipt" : "statement" 
        })
        
      } else if (deleteMode === "batch") {
        // Batch delete
        const toDelete = statementTransactions.filter((tx) => selectedIds.has(tx.id))
        
        // Separate receipt transactions from regular transactions
        const receiptTxIds = toDelete
          .filter((tx) => tx.isReceipt && tx.receiptTransactionId)
          .map((tx) => tx.receiptTransactionId!)
        const regularTxIds = toDelete
          .filter((tx) => !tx.isReceipt || !tx.receiptTransactionId)
          .map((tx) => tx.id)
        
        // Delete receipt transactions
        for (const id of receiptTxIds) {
          const response = await fetch(`/api/receipt-transactions/${id}`, {
            method: "DELETE",
          })
          if (!response.ok) {
            console.error(`Failed to delete receipt transaction ${id}`)
          }
        }
        
        // Delete regular transactions
        for (const id of regularTxIds) {
          const response = await fetch(`/api/transactions/${id}`, {
            method: "DELETE",
          })
          if (!response.ok) {
            console.error(`Failed to delete transaction ${id}`)
          }
        }
        
        // Remove from local state
        setStatementTransactions((prev) => 
          prev.filter((tx) => !selectedIds.has(tx.id))
        )
        setSelectedIds(new Set())
        
        // Invalidate cache
        await fetch("/api/cache/invalidate?all=true")
        
        toast.success(`${toDelete.length} transaction${toDelete.length > 1 ? "s" : ""} deleted`)
        safeCapture("transactions_batch_deleted", { count: toDelete.length })
      }
    } catch (error: any) {
      console.error("Delete error:", error)
      toast.error(error.message || "Failed to delete transaction(s)")
    } finally {
      setIsDeleting(false)
      setDeletingRowId(null)
      setDeleteDialogOpen(false)
      setTransactionToDelete(null)
    }
  }

  // Reset selection when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedIds(new Set())
    }
    onOpenChange(newOpen)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-8">
              <span>Transactions - {selectedStatement?.name ?? "Statement"}</span>
              {selectedIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRequestBatchDelete}
                  disabled={isDeleting}
                >
                  <IconTrash className="size-4 mr-2" />
                  Delete {selectedIds.size} selected
                </Button>
              )}
            </DialogTitle>
            <DialogDescription>
              Detailed ledger entries sourced from this statement.
            </DialogDescription>
          </DialogHeader>
          {viewLoading ? (
            <div className="flex items-center justify-center py-10">
              <IconLoader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : statementTransactions.length ? (
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader className="bg-muted sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead
                      onClick={() => {
                        setStatementTransactions((prev) =>
                          [...prev].sort((a, b) =>
                            sortDirection === "asc"
                              ? new Date(a.date).getTime() -
                                new Date(b.date).getTime()
                              : new Date(b.date).getTime() -
                                new Date(a.date).getTime()
                          )
                        )
                        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
                      }}
                      className="cursor-pointer select-none"
                    >
                      Date
                    </TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-12 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statementTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(tx.id)}
                          onCheckedChange={(checked) => handleSelectRow(tx.id, !!checked)}
                          aria-label={`Select transaction ${tx.description}`}
                        />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateLabel(tx.date)}
                      </TableCell>
                      <TableCell>{tx.description}</TableCell>
                      <TableCell>
                        {tx.isReceipt && tx.receiptTransactionId ? (
                          <Select
                            value={tx.category || "__uncategorized__"}
                            onValueChange={(value) => {
                              if (value === "__create_new__") {
                                onCreateReceiptCategoryOpenChange(true)
                                return
                              }

                              const previousCategory = tx.category
                              const categoryName =
                                value === "__uncategorized__" ? null : value

                              startTransition(() => {
                                setStatementTransactions((prev) =>
                                  prev.map((item) =>
                                    item.id === tx.id
                                      ? {
                                          ...item,
                                          category: categoryName || "Uncategorized",
                                        }
                                      : item
                                  )
                                )
                              })

                              fetch(
                                `/api/receipt-transactions/${tx.receiptTransactionId}/category`,
                                {
                                  method: "PATCH",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({
                                    categoryName: categoryName,
                                  }),
                                }
                              )
                                .then(async (response) => {
                                  if (!response.ok) {
                                    startTransition(() => {
                                      setStatementTransactions((prev) =>
                                        prev.map((item) =>
                                          item.id === tx.id
                                            ? { ...item, category: previousCategory }
                                            : item
                                        )
                                      )
                                    })
                                    const errorData = await response
                                      .json()
                                      .catch(() => ({}))
                                    toast.error(
                                      errorData.error || "Failed to update category"
                                    )
                                  } else {
                                    const updated = await response.json()
                                    startTransition(() => {
                                      setStatementTransactions((prev) =>
                                        prev.map((item) =>
                                          item.id === tx.id
                                            ? {
                                                ...item,
                                                category:
                                                  updated.categoryName ||
                                                  "Uncategorized",
                                              }
                                            : item
                                        )
                                      )
                                    })
                                    safeCapture("transaction_category_changed", {
                                      previous_category: previousCategory,
                                      new_category:
                                        updated.categoryName || categoryName,
                                      transaction_type: "receipt",
                                    })
                                  }
                                })
                                .catch((err) => {
                                  startTransition(() => {
                                    setStatementTransactions((prev) =>
                                      prev.map((item) =>
                                        item.id === tx.id
                                          ? { ...item, category: previousCategory }
                                          : item
                                      )
                                    )
                                  })
                                  console.error("Error updating category:", err)
                                  toast.error("Error updating category")
                                })
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__uncategorized__">
                                Uncategorized
                              </SelectItem>
                              {dialogReceiptCategories.map((category) => (
                                <SelectItem key={category.name} value={category.name}>
                                  <span className="flex items-center gap-2">
                                    <span
                                      className="h-2 w-2 rounded-full border border-border/50"
                                      style={{
                                        backgroundColor: category.color ?? undefined,
                                        borderColor: category.color ?? undefined,
                                      }}
                                    />
                                    <span className="truncate">{category.name}</span>
                                    {category.typeName ? (
                                      <span className="ml-auto text-xs text-muted-foreground truncate">
                                        {category.typeName}
                                      </span>
                                    ) : null}
                                  </span>
                                </SelectItem>
                              ))}
                              <Separator className="my-1" />
                              <SelectItem
                                value="__create_new__"
                                onSelect={(event) => {
                                  event.preventDefault()
                                  onCreateReceiptCategoryOpenChange(true)
                                }}
                              >
                                <span className="flex items-center gap-2">
                                  <IconPlus className="h-3 w-3" />
                                  Create new category
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <CategorySelect
                            value={tx.category}
                            onValueChange={(value) => {
                              const previousCategory = tx.category
                              startTransition(() => {
                                setStatementTransactions((prev) =>
                                  prev.map((item) =>
                                    item.id === tx.id
                                      ? { ...item, category: value }
                                      : item
                                  )
                                )
                              })

                              fetch(`/api/transactions/${tx.id}`, {
                                method: "PATCH",
                                headers: {
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                  category: value,
                                }),
                              })
                                .then(async (response) => {
                                  if (!response.ok) {
                                    startTransition(() => {
                                      setStatementTransactions((prev) =>
                                        prev.map((item) =>
                                          item.id === tx.id
                                            ? { ...item, category: previousCategory }
                                            : item
                                        )
                                      )
                                    })
                                    const errorData = await response
                                      .json()
                                      .catch(() => ({}))
                                    toast.error(
                                      errorData.error || "Failed to update category"
                                    )
                                  } else {
                                    safeCapture("transaction_category_changed", {
                                      previous_category: previousCategory,
                                      new_category: value,
                                      transaction_type: "statement",
                                    })
                                  }
                                })
                                .catch((err) => {
                                  startTransition(() => {
                                    setStatementTransactions((prev) =>
                                      prev.map((item) =>
                                        item.id === tx.id
                                          ? { ...item, category: previousCategory }
                                          : item
                                      )
                                    )
                                  })
                                  console.error("Error updating category:", err)
                                  toast.error("Error updating category")
                                })
                            }}
                          />
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(tx.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRequestDelete(tx)}
                          disabled={isDeleting && deletingRowId === tx.id}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          {isDeleting && deletingRowId === tx.id ? (
                            <IconLoader2 className="size-4 animate-spin" />
                          ) : (
                            <IconTrash className="size-4" />
                          )}
                          <span className="sr-only">Delete</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No transactions found for this statement.
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteMode === "batch" 
                ? `Delete ${selectedIds.size} transaction${selectedIds.size > 1 ? "s" : ""}?`
                : "Delete transaction?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteMode === "batch" 
                ? `This will permanently remove ${selectedIds.size} selected transaction${selectedIds.size > 1 ? "s" : ""} from the database.`
                : (
                  <>
                    This will permanently remove{" "}
                    <span className="font-medium">
                      {transactionToDelete?.description ?? "this transaction"}
                    </span>{" "}
                    from the database.
                  </>
                )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <IconLoader2 className="mr-2 size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <IconTrash className="mr-2 size-4" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Receipt Category Dialog */}
      <Dialog
        open={isCreateReceiptCategoryDialogOpen}
        onOpenChange={onCreateReceiptCategoryOpenChange}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Receipt Category</DialogTitle>
            <DialogDescription>
              Add a new category for receipt transactions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dialog-receipt-category-name">Category name</Label>
              <Input
                id="dialog-receipt-category-name"
                placeholder="e.g., Fruits, Vegetables, Meat"
                value={newDialogReceiptCategoryName}
                onChange={(e) =>
                  onNewDialogReceiptCategoryNameChange(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isCreatingReceiptCategory) {
                    e.preventDefault()
                    onCreateDialogReceiptCategory()
                  }
                }}
                disabled={isCreatingReceiptCategory}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Macronutrient type</Label>
              <Select
                value={newDialogReceiptCategoryTypeId}
                onValueChange={onNewDialogReceiptCategoryTypeIdChange}
                disabled={isCreatingReceiptCategory}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {dialogReceiptCategoryTypes.map((type) => (
                    <SelectItem key={type.id} value={String(type.id)}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => onCreateReceiptCategoryOpenChange(false)}
              disabled={isCreatingReceiptCategory}
            >
              Cancel
            </Button>
            <Button
              onClick={onCreateDialogReceiptCategory}
              disabled={
                isCreatingReceiptCategory ||
                !newDialogReceiptCategoryName.trim() ||
                !newDialogReceiptCategoryTypeId
              }
            >
              {isCreatingReceiptCategory ? (
                <>
                  <IconLoader2 className="mr-2 size-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create"
              )}
            </Button>
          </AlertDialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
