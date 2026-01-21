"use client"

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react"
import { IconInfoCircle } from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
type Align = "start" | "center" | "end"
type Side = "top" | "bottom" | "left" | "right"

const defaultNormalizeCategory = (value: string) => {
  const trimmed = value?.trim?.() ?? ""
  return trimmed || "Other"
}

export interface ChartInfoPopoverCategoryControls {
  title?: string
  description?: string
  categories: string[]
  hiddenCategories: string[]
  onToggle: (category: string) => void
  onClear?: () => void
  emptyState?: string
  normalizeCategory?: (category: string) => string
}

export interface ChartInfoPopoverProps {
  title: string
  description: string
  details?: string[]
  ignoredLabel?: string
  ignoredItems?: string[]
  ignoredFootnote?: string
  triggerAriaLabel?: string
  align?: Align
  side?: Side
  className?: string
  triggerClassName?: string
  categoryControls?: ChartInfoPopoverCategoryControls
  groupingControls?: {
    title?: string
    description?: string
    options: string[]
    defaultValue?: string
  }
  extraContent?: ReactNode
}

export function ChartInfoPopover({
  title,
  description,
  details = [],
  ignoredLabel = "Ignored categories",
  ignoredItems = [],
  ignoredFootnote,
  triggerAriaLabel,
  align = "end",
  side = "bottom",
  className,
  triggerClassName,
  categoryControls,
  groupingControls,
  extraContent,
}: ChartInfoPopoverProps) {
  const [open, setOpen] = useState(false)
  const [categoryPanelOpen, setCategoryPanelOpen] = useState(false)
  const [selectedGrouping, setSelectedGrouping] = useState<string | undefined>(
    groupingControls?.defaultValue ?? groupingControls?.options?.[0]
  )
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)

  const normalizeCategoryValue = (value: string) =>
    (categoryControls?.normalizeCategory ?? defaultNormalizeCategory)(value)

  const hiddenCategorySet = useMemo(() => {
    if (!categoryControls?.hiddenCategories?.length) return new Set<string>()
    const normalize = categoryControls.normalizeCategory ?? defaultNormalizeCategory
    return new Set(categoryControls.hiddenCategories.map((item) => normalize(item)))
  }, [categoryControls])

  useEffect(() => {
    if (!open) {
      setCategoryPanelOpen(false)
    }
  }, [open])

  // Close when clicking anywhere outside the trigger or popover content.
  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (contentRef.current?.contains(target)) return
      if (triggerRef.current?.contains(target)) return
      setOpen(false)
    }
    window.addEventListener("pointerdown", handlePointerDown, true)
    return () => window.removeEventListener("pointerdown", handlePointerDown, true)
  }, [open])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          ref={triggerRef}
          aria-label={triggerAriaLabel ?? `Learn more about ${title}`}
          className={cn(
            "inline-flex items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
            triggerClassName
          )}
          onClick={() => setOpen((prev) => !prev)}
        >
          <IconInfoCircle className="h-4 w-4" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        side={side}
        ref={contentRef}
        className={cn(
          "w-80 max-w-xs bg-popover text-popover-foreground",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
          "data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2",
          className
        )}
      >
        <div className="space-y-3 text-sm max-h-[300px] overflow-y-auto">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-foreground">{title}</h4>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          {groupingControls && groupingControls.options.length > 0 && (
            <div className="rounded-lg border border-border/60 bg-background/70 px-2.5 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                    {groupingControls.title ?? "Grouping"}
                  </span>
                  {groupingControls.description && (
                    <p className="text-[0.7rem] text-muted-foreground/80">
                      {groupingControls.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-2">
                <ToggleGroup
                  type="single"
                  size="sm"
                  variant="outline"
                  value={selectedGrouping}
                  onValueChange={(value) => {
                    if (!value) return
                    setSelectedGrouping(value)
                  }}
                  className="w-full justify-between"
                >
                  {groupingControls.options.map((option) => (
                    <ToggleGroupItem
                      key={option}
                      value={option}
                      aria-label={option}
                      className="flex-1 text-[0.7rem]"
                    >
                      {option}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
            </div>
          )}
          {extraContent}
          {categoryControls && categoryControls.hiddenCategories.length > 0 && (
            <div className="rounded-lg border border-border/60 bg-muted/40 px-2.5 py-2">
              <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                Hidden categories
              </span>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {categoryControls.hiddenCategories.map((category) => (
                  <span
                    key={category}
                    className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-background/80 px-2 py-0.5 text-xs text-foreground"
                  >
                    {category}
                  </span>
                ))}
              </div>
            </div>
          )}
          {categoryControls && (
            <div className="rounded-lg border border-border/60 bg-background/70 px-2.5 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                    {categoryControls.title ?? "Category visibility"}
                  </span>
                  {categoryControls.description && (
                    <p className="text-[0.7rem] text-muted-foreground/80">
                      {categoryControls.description}
                    </p>
                  )}
                  {categoryControls.hiddenCategories.length > 0 && (
                    <p className="text-[0.7rem] text-muted-foreground/70">
                      {categoryControls.hiddenCategories.length} hidden
                    </p>
                  )}
                </div>
                {categoryControls.categories.length > 0 ? (
                  <div className="flex items-center gap-2">
                    {categoryControls.onClear && (
                      <button
                        type="button"
                        className="text-[0.65rem] font-medium text-muted-foreground hover:text-foreground"
                        onClick={categoryControls.onClear}
                        disabled={!categoryControls.hiddenCategories.length}
                      >
                        Reset
                      </button>
                    )}
                    <button
                      type="button"
                      className="rounded-md border border-border/60 bg-background px-2 py-1 text-xs font-medium hover:border-primary/50"
                      onClick={() => setCategoryPanelOpen((prev) => !prev)}
                    >
                      {categoryPanelOpen ? "Hide categories" : "Manage categories"}
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {categoryControls.emptyState ?? "No categories available yet."}
                  </span>
                )}
              </div>
              {categoryPanelOpen && categoryControls.categories.length > 0 && (
                <div className="mt-3 rounded-md border border-border/60 bg-muted/40 p-2 max-h-[200px] overflow-y-auto">
                  <p className="text-[0.7rem] text-muted-foreground mb-2">
                    Tap a category to hide or show it across analytics.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {categoryControls.categories.map((category) => {
                      const normalized = normalizeCategoryValue(category)
                      const isHidden = hiddenCategorySet.has(normalized)
                      return (
                        <button
                          key={`${category}-${normalized}`}
                          type="button"
                          className={cn(
                            "rounded-md px-2 py-1 text-xs font-semibold transition",
                            isHidden
                              ? "border border-destructive/60 bg-destructive/15 text-destructive"
                              : "border border-border/60 bg-background text-foreground hover:border-primary/50"
                          )}
                          onClick={() => categoryControls.onToggle(normalized)}
                        >
                          {category}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

