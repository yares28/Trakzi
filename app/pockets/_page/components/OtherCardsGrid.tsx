"use client"

import { memo, useState, useCallback, useRef, useEffect } from "react"
import { Package, Plus, Eye, X, Loader2, Pencil, Check, X as XIcon } from "lucide-react"

import { useCurrency } from "@/components/currency-provider"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { OtherTransactionsDialog } from "./OtherTransactionsDialog"

export interface OtherCardData {
  id: string
  label: string
  value: number
}

const MOCK_OTHER_ITEMS: OtherCardData[] = [
  { id: "mock-other-1", label: "Collectible A", value: 12500 },
  { id: "mock-other-2", label: "Electronics", value: 3200 },
  { id: "mock-other-3", label: "Artwork", value: 8500 },
]

interface OtherCardProps {
  id: string
  label: string
  value: number
  onView?: () => void
  onRemove?: () => void | Promise<void>
  onLabelUpdated?: (newLabel: string) => void
}

function OtherCard({ id, label, value, onView, onRemove, onLabelUpdated }: OtherCardProps) {
  const { formatCurrency } = useCurrency()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedLabel, setEditedLabel] = useState(label)
  const [editError, setEditError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  useEffect(() => {
    if (!isEditing) {
      setEditedLabel(label)
      setEditError(null)
    }
  }, [label, isEditing])

  const handleStartEdit = useCallback(() => {
    setIsEditing(true)
    setEditedLabel(label)
    setEditError(null)
  }, [label])

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false)
    setEditedLabel(label)
    setEditError(null)
  }, [label])

  const handleSaveEdit = useCallback(() => {
    const trimmed = editedLabel.trim()
    if (!trimmed) {
      setEditError("Name cannot be empty")
      return
    }
    if (trimmed === label) {
      setIsEditing(false)
      return
    }
    setEditError(null)
    onLabelUpdated?.(trimmed)
    setIsEditing(false)
  }, [editedLabel, label, onLabelUpdated])

  const handleRemove = useCallback(async () => {
    if (!onRemove || isDeleting) return
    setIsDeleting(true)
    try {
      await onRemove()
    } finally {
      setIsDeleting(false)
    }
  }, [onRemove, isDeleting])

  return (
    <Card className="relative overflow-hidden border-border/60 bg-card/50 shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-1 hover:scale-[1.01] group">
      {onRemove && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleRemove}
          disabled={isDeleting}
          aria-label={`Remove ${label}`}
          className="absolute right-2 top-2 z-10 h-8 w-8 rounded-full text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10"
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <X className="h-4 w-4" />
          )}
        </Button>
      )}

      <CardContent className="p-4 pb-10">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">Item</p>

        <div className="relative mt-1 group/label">
          {isEditing ? (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1">
                <Input
                  ref={inputRef}
                  value={editedLabel}
                  onChange={(e) => {
                    setEditedLabel(e.target.value)
                    if (editError) setEditError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleSaveEdit()
                    } else if (e.key === "Escape") {
                      e.preventDefault()
                      handleCancelEdit()
                    }
                  }}
                  maxLength={100}
                  className={`h-8 text-base font-medium ${editError ? "border-destructive" : ""}`}
                  aria-invalid={!!editError}
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleSaveEdit}
                  disabled={!editedLabel.trim()}
                  className="h-8 w-8 shrink-0"
                  aria-label="Save name"
                >
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleCancelEdit}
                  className="h-8 w-8 shrink-0"
                  aria-label="Cancel editing"
                >
                  <XIcon className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
              {editError && (
                <p className="text-xs text-destructive">{editError}</p>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="truncate text-base font-medium text-foreground min-w-0" title={label}>
                {label}
              </span>
              {onLabelUpdated && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleStartEdit}
                  className="h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover/label:opacity-100 hover:bg-accent"
                  aria-label={`Edit name for ${label}`}
                >
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              )}
            </div>
          )}
        </div>

        <p className="mt-1 text-lg tabular-nums text-foreground">
          {formatCurrency(value, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </p>
      </CardContent>

      {onView && (
        <Button
          variant="ghost"
          size="icon-sm"
          className="absolute bottom-2 right-2 z-10 h-8 w-8 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground hover:bg-accent"
          onClick={onView}
          aria-label={`View ${label}`}
        >
          <Eye className="h-4 w-4" />
        </Button>
      )}
    </Card>
  )
}

interface OtherCardsGridProps {
  items: OtherCardData[]
  isLoading?: boolean
  onRemove: (id: string) => void
  onLabelUpdated: (id: string, newLabel: string) => void
  onOpenAdd?: () => void
  onTransactionsLinked?: () => void
}

export const OtherCardsGrid = memo(function OtherCardsGrid({
  items,
  isLoading = false,
  onRemove,
  onLabelUpdated,
  onOpenAdd,
  onTransactionsLinked,
}: OtherCardsGridProps) {
  const [selectedPocketId, setSelectedPocketId] = useState<number | null>(null)

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @md/main:grid-cols-2 @3xl/main:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex flex-col gap-3">
                <div className="h-3 w-12 rounded bg-muted animate-pulse" />
                <div className="h-5 w-2/3 rounded bg-muted animate-pulse" />
                <div className="h-6 w-1/3 rounded bg-muted animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="px-4 lg:px-6">
        <Card className="flex flex-col items-center justify-center py-12">
          <Package className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="mb-4 text-center text-muted-foreground">No items added yet</p>
          <p className="mb-6 max-w-md text-center text-sm text-muted-foreground">
            Track other assets and their value. Add an item to get started.
          </p>
          <Button variant="outline" onClick={onOpenAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Add your first item
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @md/main:grid-cols-2 @3xl/main:grid-cols-3">
        {items.map((item) => (
          <OtherCard
            key={item.id}
            id={item.id}
            label={item.label}
            value={item.value}
            onView={() => {
              const pId = parseInt(item.id, 10)
              if (!isNaN(pId)) setSelectedPocketId(pId)
            }}
            onRemove={() => onRemove(item.id)}
            onLabelUpdated={(newLabel) => onLabelUpdated(item.id, newLabel)}
          />
        ))}
      </div>

      {/* Transactions Dialog */}
      <OtherTransactionsDialog
        pocketId={selectedPocketId}
        open={selectedPocketId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedPocketId(null)
        }}
        onTransactionsLinked={() => {
          onTransactionsLinked?.()
          setSelectedPocketId(null)
        }}
      />
    </>
  )
})

OtherCardsGrid.displayName = "OtherCardsGrid"
