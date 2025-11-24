"use client"

import { useState, useEffect, memo, useCallback, useMemo } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { getCategories, addCategory } from "@/lib/categories"
import { toast } from "sonner"
import { Plus } from "lucide-react"

interface CategorySelectProps {
  value?: string
  onValueChange: (value: string) => void
  onCategoryAdded?: (category: string) => void
}

export const CategorySelect = memo(function CategorySelect({ value, onValueChange, onCategoryAdded }: CategorySelectProps) {
  const [categories, setCategories] = useState<string[]>([])
  const [newCategory, setNewCategory] = useState("")
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    setCategories(getCategories())
  }, [])

  // Refresh categories when a new one is added (listen to storage events)
  useEffect(() => {
    const handleStorageChange = () => {
      setCategories(getCategories())
    }
    
    window.addEventListener('storage', handleStorageChange)
    // Also listen to custom event for same-tab updates
    window.addEventListener('categoriesUpdated', handleStorageChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('categoriesUpdated', handleStorageChange)
    }
  }, [])

  const handleAddCategory = useCallback(() => {
    if (!newCategory.trim()) {
      toast.error("Please enter a category name")
      return
    }

    // Normalize to single word
    const normalized = newCategory.trim().split(/\s+/)[0]
    
    if (!normalized || normalized.length === 0) {
      toast.error("Please enter a valid category name")
      return
    }

    const result = addCategory(normalized)
    
    if (result.success) {
      setCategories(result.categories)
      setNewCategory("")
      setIsAdding(false)
      const newCat = result.categories[result.categories.length - 1]
      onValueChange(newCat)
      onCategoryAdded?.(newCat)
      toast.success(result.message)
    } else {
      toast.error(result.message)
    }
  }, [newCategory, onValueChange, onCategoryAdded])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddCategory()
    } else if (e.key === "Escape") {
      setIsAdding(false)
      setNewCategory("")
    }
  }

  // Memoize the value to prevent unnecessary re-renders
  const selectValue = useMemo(() => value || undefined, [value])
  
  return (
    <Select value={selectValue} onValueChange={onValueChange}>
      <SelectTrigger className="w-[140px] h-8">
        <SelectValue placeholder={value || "Select category"} />
      </SelectTrigger>
      <SelectContent>
        {categories.map((cat) => (
          <SelectItem key={cat} value={cat}>
            {cat}
          </SelectItem>
        ))}
        <Separator className="my-1" />
        {isAdding ? (
          <div className="px-2 py-1.5 space-y-2">
            <Input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter category name"
              className="h-8 text-sm"
              autoFocus
            />
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="default"
                className="h-7 flex-1 text-xs"
                onClick={handleAddCategory}
              >
                Add
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 flex-1 text-xs"
                onClick={() => {
                  setIsAdding(false)
                  setNewCategory("")
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="px-2 py-1">
            <Button
              size="sm"
              variant="ghost"
              className="w-full h-8 text-xs justify-start gap-2"
              onClick={() => setIsAdding(true)}
            >
              <Plus className="h-3 w-3" />
              Add custom category
            </Button>
          </div>
        )}
      </SelectContent>
    </Select>
  )
})

