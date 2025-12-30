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

import type { ReceiptCategoryType } from "../types"

type ReceiptTypeDialogsProps = {
  addOpen: boolean
  onAddOpenChange: (open: boolean) => void
  newReceiptTypeName: string
  onNewReceiptTypeNameChange: (value: string) => void
  addReceiptTypeLoading: boolean
  onAddReceiptType: () => void
  onCancelAdd: () => void
  deleteOpen: boolean
  onDeleteOpenChange: (open: boolean) => void
  receiptTypeToDelete: ReceiptCategoryType | null
  deleteReceiptTypeLoading: boolean
  onDeleteReceiptType: () => void
}

export function ReceiptTypeDialogs({
  addOpen,
  onAddOpenChange,
  newReceiptTypeName,
  onNewReceiptTypeNameChange,
  addReceiptTypeLoading,
  onAddReceiptType,
  onCancelAdd,
  deleteOpen,
  onDeleteOpenChange,
  receiptTypeToDelete,
  deleteReceiptTypeLoading,
  onDeleteReceiptType,
}: ReceiptTypeDialogsProps) {
  return (
    <>
      <Dialog open={addOpen} onOpenChange={onAddOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Receipt Type</DialogTitle>
            <DialogDescription>
              Create a macronutrient type for organizing grocery categories.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="receipt-type-name">Type Name</Label>
              <Input
                id="receipt-type-name"
                placeholder="e.g., Protein, Carbs, Fat"
                value={newReceiptTypeName}
                onChange={(e) => onNewReceiptTypeNameChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !addReceiptTypeLoading) {
                    e.preventDefault()
                    onAddReceiptType()
                  }
                }}
                disabled={addReceiptTypeLoading}
                autoFocus
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancelAdd} disabled={addReceiptTypeLoading}>
              Cancel
            </Button>
            <Button
              onClick={onAddReceiptType}
              disabled={addReceiptTypeLoading || !newReceiptTypeName.trim()}
            >
              {addReceiptTypeLoading ? (
                <>
                  <IconLoader2 className="mr-2 size-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <IconPlus className="mr-2 size-4" />
                  Add Type
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={onDeleteOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete receipt type?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{" "}
              <span className="font-medium">
                {receiptTypeToDelete?.name ?? "this type"}
              </span>
              . Categories using this type will have their type set to null.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteReceiptTypeLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={onDeleteReceiptType}
              disabled={deleteReceiptTypeLoading}
            >
              {deleteReceiptTypeLoading ? (
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
