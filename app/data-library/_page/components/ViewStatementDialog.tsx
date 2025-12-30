import type { Dispatch, SetStateAction } from "react"
import { IconLoader2, IconPlus } from "@tabler/icons-react"
import { toast } from "sonner"

import { CategorySelect } from "@/components/category-select"
import { Button } from "@/components/ui/button"
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
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Transactions - {selectedStatement?.name ?? "Statement"}
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
            <Table>
              <TableHeader>
                <TableRow>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {statementTransactions.map((tx) => (
                  <TableRow key={tx.id}>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">
              No transactions found for this statement.
            </p>
          )}
        </DialogContent>
      </Dialog>

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
