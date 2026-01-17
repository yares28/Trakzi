import { useState, useEffect, useMemo, type Dispatch, type SetStateAction } from "react"
import { IconLoader2, IconPlus, IconTrash, IconDeviceFloppy } from "@tabler/icons-react"
import { toast } from "sonner"

import { CategorySelect } from "@/components/category-select"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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

type PendingChange = {
  id: number
  receiptTransactionId?: number
  isReceipt: boolean
  originalCategory: string
  newCategory: string
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
}: ViewStatementDialogProps) {
  // Local copy of transactions for editing
  const [localTransactions, setLocalTransactions] = useState<Transaction[]>([])
  
  // Track pending changes
  const [pendingChanges, setPendingChanges] = useState<Map<number, PendingChange>>(new Map())
  const [pendingDeletes, setPendingDeletes] = useState<Set<number>>(new Set())
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  
  // Save/Cancel state
  const [isSaving, setIsSaving] = useState(false)
  
  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteMode, setDeleteMode] = useState<"single" | "batch">("single")
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null)

  // Initialize local transactions when dialog opens or transactions change
  useEffect(() => {
    if (open) {
      setLocalTransactions(statementTransactions)
      setPendingChanges(new Map())
      setPendingDeletes(new Set())
      setSelectedIds(new Set())
    }
  }, [open, statementTransactions])

  // Filter out pending deletes for display
  const visibleTransactions = useMemo(() => 
    localTransactions.filter((tx) => !pendingDeletes.has(tx.id)),
    [localTransactions, pendingDeletes]
  )

  // Check if there are unsaved changes
  const hasChanges = pendingChanges.size > 0 || pendingDeletes.size > 0

  // Check if all visible transactions are selected
  const allSelected = visibleTransactions.length > 0 && 
    visibleTransactions.every((tx) => selectedIds.has(tx.id))

  // Handle select all toggle
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(visibleTransactions.map((tx) => tx.id)))
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

  // Handle category change (local only)
  const handleCategoryChange = (tx: Transaction, newCategory: string) => {
    // Update local transactions
    setLocalTransactions((prev) =>
      prev.map((item) =>
        item.id === tx.id ? { ...item, category: newCategory } : item
      )
    )

    // Track the change
    setPendingChanges((prev) => {
      const next = new Map(prev)
      const existing = next.get(tx.id)
      
      // If changing back to original, remove from pending
      if (existing && existing.originalCategory === newCategory) {
        next.delete(tx.id)
      } else {
        next.set(tx.id, {
          id: tx.id,
          receiptTransactionId: tx.receiptTransactionId,
          isReceipt: Boolean(tx.isReceipt && tx.receiptTransactionId),
          originalCategory: existing?.originalCategory ?? tx.category,
          newCategory,
        })
      }
      return next
    })
  }

  // Mark transaction for deletion
  const handleMarkForDelete = (tx: Transaction) => {
    setTransactionToDelete(tx)
    setDeleteMode("single")
    setDeleteDialogOpen(true)
  }

  // Mark selected transactions for deletion
  const handleMarkSelectedForDelete = () => {
    setDeleteMode("batch")
    setDeleteDialogOpen(true)
  }

  // Confirm delete (add to pending deletes)
  const handleConfirmDelete = () => {
    if (deleteMode === "single" && transactionToDelete) {
      setPendingDeletes((prev) => new Set(prev).add(transactionToDelete.id))
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(transactionToDelete.id)
        return next
      })
    } else if (deleteMode === "batch") {
      setPendingDeletes((prev) => {
        const next = new Set(prev)
        selectedIds.forEach((id) => next.add(id))
        return next
      })
      setSelectedIds(new Set())
    }
    setDeleteDialogOpen(false)
    setTransactionToDelete(null)
  }

  // Cancel and close dialog
  const handleCancel = () => {
    setLocalTransactions(statementTransactions)
    setPendingChanges(new Map())
    setPendingDeletes(new Set())
    setSelectedIds(new Set())
    onOpenChange(false)
  }

  // Save all changes
  const handleSave = async () => {
    setIsSaving(true)
    
    try {
      const errors: string[] = []

      // Apply category changes
      for (const change of pendingChanges.values()) {
        try {
          if (change.isReceipt && change.receiptTransactionId) {
            const response = await fetch(
              `/api/receipt-transactions/${change.receiptTransactionId}/category`,
              {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ categoryName: change.newCategory }),
              }
            )
            if (!response.ok) {
              errors.push(`Failed to update category for receipt transaction`)
            }
          } else {
            const response = await fetch(`/api/transactions/${change.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ category: change.newCategory }),
            })
            if (!response.ok) {
              errors.push(`Failed to update category for transaction`)
            }
          }
        } catch (err) {
          errors.push(`Error updating transaction ${change.id}`)
        }
      }

      // Apply deletes
      for (const id of pendingDeletes) {
        const tx = localTransactions.find((t) => t.id === id)
        if (!tx) continue

        try {
          if (tx.isReceipt && tx.receiptTransactionId) {
            const response = await fetch(`/api/receipt-transactions/${tx.receiptTransactionId}`, {
              method: "DELETE",
            })
            if (!response.ok) {
              errors.push(`Failed to delete receipt transaction`)
            }
          } else {
            const response = await fetch(`/api/transactions/${id}`, {
              method: "DELETE",
            })
            if (!response.ok) {
              errors.push(`Failed to delete transaction`)
            }
          }
        } catch (err) {
          errors.push(`Error deleting transaction ${id}`)
        }
      }

      // Invalidate cache
      await fetch("/api/cache/invalidate?all=true").catch(() => {})

      // Update parent state
      setStatementTransactions((prev) => {
        let updated = prev.filter((tx) => !pendingDeletes.has(tx.id))
        pendingChanges.forEach((change) => {
          updated = updated.map((tx) =>
            tx.id === change.id ? { ...tx, category: change.newCategory } : tx
          )
        })
        return updated
      })

      if (errors.length > 0) {
        toast.error(`Some changes failed: ${errors.length} error(s)`)
      } else {
        const changeCount = pendingChanges.size
        const deleteCount = pendingDeletes.size
        const messages: string[] = []
        if (changeCount > 0) messages.push(`${changeCount} category update${changeCount > 1 ? "s" : ""}`)
        if (deleteCount > 0) messages.push(`${deleteCount} deletion${deleteCount > 1 ? "s" : ""}`)
        toast.success(`Saved: ${messages.join(", ")}`)
        
        safeCapture("statement_transactions_saved", {
          category_updates: changeCount,
          deletions: deleteCount,
        })
      }

      // Reset state and close
      setPendingChanges(new Map())
      setPendingDeletes(new Set())
      setSelectedIds(new Set())
      onOpenChange(false)
      
    } catch (error: any) {
      console.error("Save error:", error)
      toast.error(error.message || "Failed to save changes")
    } finally {
      setIsSaving(false)
    }
  }

  // Sort handler
  const handleSort = () => {
    setLocalTransactions((prev) =>
      [...prev].sort((a, b) =>
        sortDirection === "asc"
          ? new Date(a.date).getTime() - new Date(b.date).getTime()
          : new Date(b.date).getTime() - new Date(a.date).getTime()
      )
    )
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(newOpen) => {
        if (!newOpen && hasChanges) {
          // Could add unsaved changes warning here
          handleCancel()
        } else {
          onOpenChange(newOpen)
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center justify-between pr-8">
              <span>Transactions - {selectedStatement?.name ?? "Statement"}</span>
              {selectedIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleMarkSelectedForDelete}
                >
                  <IconTrash className="size-4 mr-2" />
                  Delete {selectedIds.size} selected
                </Button>
              )}
            </DialogTitle>
            <DialogDescription>
              Detailed ledger entries sourced from this statement.
              {hasChanges && (
                <span className="ml-2 text-amber-600 dark:text-amber-400">
                  ({pendingChanges.size} change{pendingChanges.size !== 1 ? "s" : ""}, {pendingDeletes.size} pending deletion{pendingDeletes.size !== 1 ? "s" : ""})
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {viewLoading ? (
            <div className="flex items-center justify-center py-10 flex-1">
              <IconLoader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : visibleTransactions.length ? (
            <div className="overflow-auto rounded-lg border flex-1 min-h-0">
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
                      onClick={handleSort}
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
                  {visibleTransactions.map((tx) => {
                    const hasChange = pendingChanges.has(tx.id)
                    return (
                      <TableRow key={tx.id} className={hasChange ? "bg-amber-50 dark:bg-amber-950/20" : undefined}>
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
                                const categoryName = value === "__uncategorized__" ? "Uncategorized" : value
                                handleCategoryChange(tx, categoryName)
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
                              onValueChange={(value) => handleCategoryChange(tx, value)}
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
                            onClick={() => handleMarkForDelete(tx)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <IconTrash className="size-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-10 text-center">
              {pendingDeletes.size > 0 
                ? `All transactions marked for deletion. Click Save to confirm.`
                : "No transactions found for this statement."}
            </p>
          )}

          <DialogFooter className="flex-shrink-0 gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
              {isSaving ? (
                <>
                  <IconLoader2 className="mr-2 size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <IconDeviceFloppy className="mr-2 size-4" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
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
                ? `${selectedIds.size} transaction${selectedIds.size > 1 ? "s" : ""} will be marked for deletion. Click Save to confirm.`
                : (
                  <>
                    <span className="font-medium">
                      {transactionToDelete?.description ?? "This transaction"}
                    </span>{" "}
                    will be marked for deletion. Click Save to confirm.
                  </>
                )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDelete}
            >
              <IconTrash className="mr-2 size-4" />
              Mark for Deletion
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
          <DialogFooter>
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
