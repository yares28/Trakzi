import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type CreateCategoryDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  newCategoryName: string
  setNewCategoryName: (value: string) => void
  newCategoryTypeId: string
  setNewCategoryTypeId: (value: string) => void
  newCategoryBroadType: string
  setNewCategoryBroadType: (value: string) => void
  availableBroadTypes: string[]
  receiptCategoryTypes: Array<{ id: number; name: string; color: string | null }>
  isCreatingCategory: boolean
  onCreateCategory: () => void
  onCancel: () => void
}

export function CreateCategoryDialog({
  open,
  onOpenChange,
  newCategoryName,
  setNewCategoryName,
  newCategoryTypeId,
  setNewCategoryTypeId,
  newCategoryBroadType,
  setNewCategoryBroadType,
  availableBroadTypes,
  receiptCategoryTypes,
  isCreatingCategory,
  onCreateCategory,
  onCancel,
}: CreateCategoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Receipt Category</DialogTitle>
          <DialogDescription>
            Add a new category to organize your receipt items. Select a macronutrient type and optionally choose a broad category to group it properly.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="category-name">Category Name</Label>
            <Input
              id="category-name"
              placeholder="e.g., Organic Vegetables"
              value={newCategoryName}
              onChange={(event) => setNewCategoryName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && newCategoryName.trim() && newCategoryTypeId) {
                  onCreateCategory()
                }
              }}
              disabled={isCreatingCategory}
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="category-type">Macronutrient Type</Label>
            <Select
              value={newCategoryTypeId}
              onValueChange={setNewCategoryTypeId}
              disabled={isCreatingCategory}
            >
              <SelectTrigger id="category-type">
                <SelectValue placeholder="Select type" />
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
          <div className="grid gap-2">
            <Label htmlFor="category-broad-type">Broad Category</Label>
            <Select
              value={newCategoryBroadType}
              onValueChange={setNewCategoryBroadType}
              disabled={isCreatingCategory}
            >
              <SelectTrigger id="category-broad-type">
                <SelectValue placeholder="Select broad category (optional)" />
              </SelectTrigger>
              <SelectContent>
                {availableBroadTypes.map((broadType) => (
                  <SelectItem key={broadType} value={broadType}>
                    {broadType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isCreatingCategory}
          >
            Cancel
          </Button>
          <Button
            onClick={onCreateCategory}
            disabled={isCreatingCategory || !newCategoryName.trim() || !newCategoryTypeId}
          >
            {isCreatingCategory ? "Creating..." : "Create Category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
