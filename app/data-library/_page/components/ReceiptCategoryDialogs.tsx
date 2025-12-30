import { IconLoader2, IconPlus, IconTrash } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import type { ReceiptCategory, ReceiptCategoryType } from "../types"

type ReceiptCategoryDialogsProps = {
  addOpen: boolean
  onAddOpenChange: (open: boolean) => void
  newReceiptCategoryName: string
  onNewReceiptCategoryNameChange: (value: string) => void
  newReceiptCategoryTypeId: string
  onNewReceiptCategoryTypeIdChange: (value: string) => void
  receiptCategoryTypes: ReceiptCategoryType[]
  addReceiptCategoryLoading: boolean
  onAddReceiptCategory: () => void
  onCancelAdd: () => void
  deleteOpen: boolean
  onDeleteOpenChange: (open: boolean) => void
  receiptCategoryToDelete: ReceiptCategory | null
  deleteReceiptCategoryLoading: boolean
  onDeleteReceiptCategory: () => void
}

export function ReceiptCategoryDialogs({
  addOpen,
  onAddOpenChange,
  newReceiptCategoryName,
  onNewReceiptCategoryNameChange,
  newReceiptCategoryTypeId,
  onNewReceiptCategoryTypeIdChange,
  receiptCategoryTypes,
  addReceiptCategoryLoading,
  onAddReceiptCategory,
  onCancelAdd,
  deleteOpen,
  onDeleteOpenChange,
  receiptCategoryToDelete,
  deleteReceiptCategoryLoading,
  onDeleteReceiptCategory,
}: ReceiptCategoryDialogsProps) {
  return (
    <>
      <Dialog open={addOpen} onOpenChange={onAddOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Receipt Category</DialogTitle>
            <DialogDescription>
              Create a food category and assign it to a macronutrient type.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="receipt-category-name">Category Name</Label>
              <Input
                id="receipt-category-name"
                placeholder="e.g., Poultry, Produce, Snacks"
                value={newReceiptCategoryName}
                onChange={(e) => onNewReceiptCategoryNameChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !addReceiptCategoryLoading) {
                    e.preventDefault()
                    onAddReceiptCategory()
                  }
                }}
                disabled={addReceiptCategoryLoading}
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Macronutrient Type</Label>
              <Select
                value={newReceiptCategoryTypeId}
                onValueChange={onNewReceiptCategoryTypeIdChange}
                disabled={addReceiptCategoryLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select macronutrient type" />
                </SelectTrigger>
                <SelectContent>
                  {receiptCategoryTypes.map((type) => (
                    <SelectItem key={type.id} value={String(type.id)}>
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full border border-border/50"
                          style={{
                            backgroundColor: type.color ?? undefined,
                            borderColor: type.color ?? undefined,
                          }}
                        />
                        {type.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancelAdd} disabled={addReceiptCategoryLoading}>
              Cancel
            </Button>
            <Button
              onClick={onAddReceiptCategory}
              disabled={
                addReceiptCategoryLoading ||
                !newReceiptCategoryName.trim() ||
                !newReceiptCategoryTypeId
              }
            >
              {addReceiptCategoryLoading ? (
                <>
                  <IconLoader2 className="mr-2 size-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <IconPlus className="mr-2 size-4" />
                  Add Receipt Category
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={onDeleteOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete receipt category?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{" "}
              <span className="font-medium">
                {receiptCategoryToDelete?.name ?? "this category"}
              </span>
              . Transactions using this category will have their category set to null.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteReceiptCategoryLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={onDeleteReceiptCategory}
              disabled={deleteReceiptCategoryLoading}
            >
              {deleteReceiptCategoryLoading ? (
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
    </>
  )
}
