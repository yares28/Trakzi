"use client"

import { useState, useEffect, memo, useCallback, useMemo } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DEFAULT_CATEGORIES, DEFAULT_CATEGORY_GROUPS, type CategoryGroup } from "@/lib/categories"
import { toast } from "sonner"
import { ChevronDown, Plus } from "lucide-react"
import { CategoryLimitDialog } from "@/components/category-limit-dialog"

type SpendingTier = "Essentials" | "Mandatory" | "Wants"

const CATEGORY_TIER_STORAGE_KEY = "needsWantsCategoryTier"

let cachedCategoryNames: string[] | null = null
let cachedCategoryPromise: Promise<string[]> | null = null
let hasShownCategoryLoadErrorToast = false

function extractCategoryNames(payload: unknown): string[] {
  if (!Array.isArray(payload)) return []
  const names: string[] = []
  for (const item of payload) {
    if (typeof item === "string") {
      names.push(item)
      continue
    }
    if (item && typeof item === "object") {
      const name = (item as { name?: unknown }).name
      if (typeof name === "string") {
        names.push(name)
      }
    }
  }
  return names
    .map((name) => name.trim())
    .filter((name) => name.length > 0)
}

async function loadCategoryNamesOnce(): Promise<string[]> {
  if (cachedCategoryNames) return cachedCategoryNames
  if (!cachedCategoryPromise) {
    cachedCategoryPromise = (async () => {
      const response = await fetch("/api/categories")
      if (!response.ok) {
        throw new Error("Failed to load categories")
      }
      const payload = await response.json()
      const names = extractCategoryNames(payload)
      cachedCategoryNames = names.length > 0 ? names : DEFAULT_CATEGORIES
      return cachedCategoryNames
    })()
  }

  try {
    return await cachedCategoryPromise
  } catch (error) {
    cachedCategoryPromise = null
    throw error
  }
}

function updateCategoryCache(next: string[]) {
  cachedCategoryNames = next
}

function addCategoryToCache(name: string) {
  if (!cachedCategoryNames) {
    cachedCategoryNames = [...DEFAULT_CATEGORIES, name]
    return
  }
  const exists = cachedCategoryNames.some(
    (existing) => existing.toLowerCase() === name.toLowerCase()
  )
  if (!exists) {
    cachedCategoryNames = [...cachedCategoryNames, name]
  }
}

function saveCategoryTier(categoryName: string, tier: SpendingTier) {
  if (typeof window === "undefined") return
  try {
    const key = categoryName.trim().toLowerCase()
    const raw = window.localStorage.getItem(CATEGORY_TIER_STORAGE_KEY)
    const map: Record<string, SpendingTier> = raw ? JSON.parse(raw) : {}
    map[key] = tier
    window.localStorage.setItem(CATEGORY_TIER_STORAGE_KEY, JSON.stringify(map))
  } catch {
    // best-effort only; ignore storage errors
  }
}

interface CategorySelectProps {
  value?: string
  onValueChange: (value: string) => void
  onCategoryAdded?: (category: string) => void
}

export const CategorySelect = memo(function CategorySelect({ value, onValueChange, onCategoryAdded }: CategorySelectProps) {
  const [, setCategories] = useState<string[]>(DEFAULT_CATEGORIES)
  const [newCategory, setNewCategory] = useState("")
  const [newCategoryTier, setNewCategoryTier] = useState<SpendingTier>("Wants")
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [limitDialogData, setLimitDialogData] = useState<{
    currentUsage: number;
    limit: number;
    plan: "free" | "pro" | "max";
  } | null>(null);
  const [isSelectOpen, setIsSelectOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [groupedOptions, setGroupedOptions] = useState<CategoryGroup[]>(DEFAULT_CATEGORY_GROUPS)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(DEFAULT_CATEGORY_GROUPS.map((group) => [group.label, false])),
  )
  // Local state for instant UI updates (updated immediately, synced with prop)
  const [localValue, setLocalValue] = useState<string | undefined>(value)
  
  // Sync local value with prop value
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const collator = useMemo(() => new Intl.Collator(undefined, { sensitivity: "base" }), [])

  const buildGroupedCategories = useCallback(
    (names: string[]): CategoryGroup[] => {
      const normalized = names
        .map((name) => name?.trim())
        .filter((name): name is string => !!name && name.length > 0)

      const uniqueByLowercase = Array.from(
        normalized
          .reduce((map, name) => {
            map.set(name.toLowerCase(), name)
            return map
          }, new Map<string, string>())
          .values(),
      ).sort(collator.compare)

      const defaultNameSet = new Set(DEFAULT_CATEGORIES.map((cat) => cat.toLowerCase()))

      const baseGroups = DEFAULT_CATEGORY_GROUPS.map((group) => ({
        label: group.label,
        categories: group.categories,
      }))

      const customCategories = uniqueByLowercase.filter(
        (name) => !defaultNameSet.has(name.toLowerCase()),
      )

      if (customCategories.length > 0) {
        baseGroups.push({
          label: "Custom Categories",
          categories: customCategories,
        })
      }

      return baseGroups
    },
    [collator],
  )

  const updateGroups = useCallback(
    (names: string[]) => {
      setGroupedOptions(buildGroupedCategories(names))
    },
    [buildGroupedCategories],
  )

  const loadCategories = useCallback(async () => {
    try {
      setIsLoading(true)
      const names = await loadCategoryNamesOnce()
      const alphabetical = names.length > 0 ? [...names].sort(collator.compare) : DEFAULT_CATEGORIES
      setCategories(alphabetical)
      updateCategoryCache(alphabetical)
      updateGroups(alphabetical)
    } catch (error) {
      console.error("[CategorySelect] Failed to load categories:", error)
      setCategories(DEFAULT_CATEGORIES)
      setGroupedOptions(DEFAULT_CATEGORY_GROUPS)
      updateGroups(DEFAULT_CATEGORIES)
      if (!hasShownCategoryLoadErrorToast) {
        toast.error("Unable to load categories. Using defaults.")
        hasShownCategoryLoadErrorToast = true
      }
    } finally {
      setIsLoading(false)
    }
  }, [collator, updateGroups])

  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev }
      groupedOptions.forEach((group) => {
        if (!(group.label in next)) {
          next[group.label] = false
        }
      })
      return next
    })
  }, [groupedOptions])

  // Open the group containing the current value so the Select can display it
  useEffect(() => {
    if (value && !isLoading && groupedOptions.length > 0) {
      setOpenGroups((prev) => {
        const next = { ...prev }
        // Find which group contains the current value
        for (const group of groupedOptions) {
          if (group.categories.some((cat) => cat.toLowerCase() === value.toLowerCase())) {
            next[group.label] = true
            break
          }
        }
        return next
      })
    }
  }, [value, groupedOptions, isLoading])

  const toggleGroup = useCallback((label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }))
  }, [])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  const handleAddCategory = useCallback(async () => {
    const trimmed = newCategory.trim()
    if (!trimmed) {
      toast.error("Please enter a category name")
      return
    }

    const normalized = trimmed.replace(/\s+/g, " ")

    try {
      setIsSubmitting(true)
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: normalized }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        
        // Check if it's a limit error
        if (response.status === 403 && errorData.limitReached) {
          setLimitDialogData({
            currentUsage: errorData.currentUsage || 0,
            limit: errorData.limit || 10,
            plan: errorData.plan || "free",
          });
          setShowLimitDialog(true);
          setIsSubmitting(false);
          return;
        }
        
        throw new Error(errorData.error || "Failed to add category")
      }

      const created = await response.json()
      const createdName = created?.name || normalized

      setCategories((prev) => {
        if (prev.includes(createdName)) {
          updateGroups(prev)
          return prev
        }
        const next = [...prev, createdName].sort(collator.compare)
        updateGroups(next)
        updateCategoryCache(next)
        return next
      })

      setNewCategory("")
      setNewCategoryTier("Wants")
      setIsCreateDialogOpen(false)
      onValueChange(createdName)
      onCategoryAdded?.(createdName)
      addCategoryToCache(createdName)
      // Persist the chosen tier locally for Needs vs Wants classification
      saveCategoryTier(createdName, newCategoryTier)
      toast.success(`Category "${createdName}" added`)
    } catch (error) {
      console.error("[CategorySelect] Failed to add category:", error)
      const message = error instanceof Error ? error.message : "Failed to add category"
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }, [newCategory, newCategoryTier, onValueChange, onCategoryAdded, collator, updateGroups])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddCategory()
    } else if (e.key === "Escape") {
      setIsCreateDialogOpen(false)
      setNewCategory("")
    }
  }, [handleAddCategory])

  const handleInputKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation()
    handleKeyDown(event)
  }, [handleKeyDown])

  const handleInputPointerDown = useCallback((event: React.PointerEvent<HTMLInputElement>) => {
    event.stopPropagation()
  }, [])

  const handleCreateDialogChange = useCallback((open: boolean) => {
    setIsCreateDialogOpen(open)
    if (!open) {
      setNewCategory("")
      setNewCategoryTier("Wants")
    }
  }, [])

  const handleOpenCreateDialog = useCallback(() => {
    setIsSelectOpen(false)
    setIsCreateDialogOpen(true)
  }, [])

  // Find which group contains the selected value
  const selectedValueGroup = useMemo(() => {
    if (!value) return null
    for (const group of groupedOptions) {
      if (group.categories.some((cat) => cat.toLowerCase() === value.toLowerCase())) {
        return group.label
      }
    }
    return null
  }, [value, groupedOptions])

  // Normalize the value to match exactly with category names (case-insensitive lookup)
  // Use localValue for instant updates
  const selectValue = useMemo(() => {
    const val = localValue
    if (!val) return undefined
    
    // Find the exact category name that matches (case-insensitive)
    for (const group of groupedOptions) {
      const match = group.categories.find(
        (cat) => cat.toLowerCase() === val.toLowerCase()
      )
      if (match) {
        return match // Return the exact case from the categories list
      }
    }
    
    // If not found in groups, return the value as-is (might be a custom category)
    return val
  }, [localValue, groupedOptions])
  
  // Wrapper to update local state immediately before calling parent callback
  const handleValueChange = useCallback((newValue: string) => {
    // Update local state immediately for instant UI feedback (Select closes immediately)
    setLocalValue(newValue)
    // Call parent callback asynchronously so it doesn't block the Select from closing
    // Use setTimeout with 0 to schedule it in the next event loop tick
    setTimeout(() => {
      onValueChange(newValue)
    }, 0)
  }, [onValueChange])

  return (
    <>
      <Select
        value={selectValue}
        onValueChange={handleValueChange}
        open={isSelectOpen}
        onOpenChange={setIsSelectOpen}
        disabled={isLoading || isSubmitting}
      >
        <SelectTrigger className="w-[140px] h-8">
          <SelectValue placeholder="Select category" />
        </SelectTrigger>
        <SelectContent>
          {isLoading ? (
            <div className="px-2 py-2 text-xs text-muted-foreground">
              Loading categories...
            </div>
          ) : (
            <>
              {groupedOptions
                ? groupedOptions.map((group) => {
                    const isOpen = openGroups[group.label] ?? false
                    const containsSelectedValue = selectedValueGroup === group.label
                    
                    return (
                      <div key={group.label} className="py-1">
                        <button
                          type="button"
                          className="flex w-full items-center justify-between px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                          onPointerDown={(event) => event.preventDefault()}
                          onClick={() => toggleGroup(group.label)}
                        >
                          <span>{group.label}</span>
                          <ChevronDown
                            className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-0" : "-rotate-90"}`}
                          />
                        </button>
                        {isOpen && (
                          <div className="mt-1 space-y-0.5 pl-4">
                            {group.categories.map((cat) => (
                              <SelectItem key={`${group.label}-${cat}`} value={cat}>
                                {cat}
                              </SelectItem>
                            ))}
                          </div>
                        )}
                        {/* Always render the selected value's SelectItem, even if group is closed */}
                        {!isOpen && containsSelectedValue && selectValue && (
                          <SelectItem key={`${group.label}-${selectValue}-hidden`} value={selectValue} className="hidden">
                            {selectValue}
                          </SelectItem>
                        )}
                      </div>
                    )
                  })
                : null}
              {/* Render selected value if it's not in any group (custom category) */}
              {selectValue && selectedValueGroup === null && (
                <SelectItem key={`custom-${selectValue}`} value={selectValue} className="hidden">
                  {selectValue}
                </SelectItem>
              )}
              <Separator className="my-1" />
              <div className="px-2 py-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full h-8 text-xs justify-start gap-2"
                  onClick={handleOpenCreateDialog}
                >
                  <Plus className="h-3 w-3" />
                  Add custom category
                </Button>
              </div>
            </>
          )}
        </SelectContent>
      </Select>
      <Dialog open={isCreateDialogOpen} onOpenChange={handleCreateDialogChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create category</DialogTitle>
            <DialogDescription>Add a custom category for your transactions.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={handleInputKeyDown}
              onPointerDown={handleInputPointerDown}
              placeholder="Enter category name"
              autoFocus
              disabled={isSubmitting}
            />
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="whitespace-nowrap">Treat as:</span>
              <Select
                value={newCategoryTier}
                onValueChange={(value) => setNewCategoryTier(value as SpendingTier)}
                disabled={isSubmitting}
              >
                <SelectTrigger className="h-8 w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Essentials">Essentials (needs)</SelectItem>
                  <SelectItem value="Mandatory">Mandatory</SelectItem>
                  <SelectItem value="Wants">Wants</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => handleCreateDialogChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleAddCategory} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Add category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Category Limit Dialog */}
      {limitDialogData && (
        <CategoryLimitDialog
          open={showLimitDialog}
          onOpenChange={setShowLimitDialog}
          currentUsage={limitDialogData.currentUsage}
          limit={limitDialogData.limit}
          plan={limitDialogData.plan}
          categoryType="transaction"
        />
      )}
    </>
  )
})
