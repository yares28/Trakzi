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

import type { Category } from "../types"

type CategoryTier = "Essentials" | "Mandatory" | "Wants" | "Other"

type CategoryDialogsProps = {
  addOpen: boolean
  onAddOpenChange: (open: boolean) => void
  newCategoryName: string
  onNewCategoryNameChange: (value: string) => void
  newCategoryTier: CategoryTier
  onCategoryTierChange: (value: CategoryTier) => void
  addCategoryLoading: boolean
  onAddCategory: () => void
  onCancelAdd: () => void
  deleteOpen: boolean
  onDeleteOpenChange: (open: boolean) => void
  categoryToDelete: Category | null
  deleteCategoryLoading: boolean
  onDeleteCategory: () => void
}

export function CategoryDialogs({
  addOpen,
  onAddOpenChange,
  newCategoryName,
  onNewCategoryNameChange,
  newCategoryTier,
  onCategoryTierChange,
  addCategoryLoading,
  onAddCategory,
  onCancelAdd,
  deleteOpen,
  onDeleteOpenChange,
  categoryToDelete,
  deleteCategoryLoading,
  onDeleteCategory,
}: CategoryDialogsProps) {
  return (
    <>
      <Dialog open={addOpen} onOpenChange={onAddOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
            <DialogDescription>
              Create a custom category to label transactions.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="category-name">Category Name</Label>
              <Input
                id="category-name"
                placeholder="e.g., Groceries, Rent, Utilities"
                value={newCategoryName}
                onChange={(e) => onNewCategoryNameChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !addCategoryLoading) {
                    e.preventDefault()
                    onAddCategory()
                  }
                }}
                disabled={addCategoryLoading}
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Category Type</Label>
              <Select
                value={newCategoryTier}
                onValueChange={(value) =>
                  onCategoryTierChange(value as CategoryTier)
                }
                disabled={addCategoryLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select spending type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Essentials">Essentials (needs)</SelectItem>
                  <SelectItem value="Mandatory">Mandatory obligations</SelectItem>
                  <SelectItem value="Wants">Wants / discretionary</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancelAdd} disabled={addCategoryLoading}>
              Cancel
            </Button>
            <Button
              onClick={onAddCategory}
              disabled={addCategoryLoading || !newCategoryName.trim()}
            >
              {addCategoryLoading ? (
                <>
                  <IconLoader2 className="mr-2 size-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <IconPlus className="mr-2 size-4" />
                  Add Category
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={onDeleteOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete category?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{" "}
              <span className="font-medium">
                {categoryToDelete?.name ?? "this category"}
              </span>
              . Transactions using this category will have their category set to null.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteCategoryLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={onDeleteCategory}
              disabled={deleteCategoryLoading}
            >
              {deleteCategoryLoading ? (
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
