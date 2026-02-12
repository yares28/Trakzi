"use client"

import { memo, useCallback, useMemo, useState } from "react"
import { Loader2, Home, ImageIcon } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

import type { OwnedPropertyMetadata, RentedPropertyMetadata } from "@/lib/types/pockets"

interface AddPropertyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddProperty: () => void
  defaultPropertyType?: "owned" | "rented"
}

const PROPERTY_SVGS = [
  { id: "houseplan1", label: "Plan 1 – Main home", path: "/property/houseplan1.svg" },
  { id: "houseplan2", label: "Plan 2 – Apartment", path: "/property/houseplan2.svg" },
  { id: "houseplan3", label: "Plan 3 – Rental", path: "/property/houseplan3.svg" },
  { id: "houseplan4", label: "Plan 4 – Cabin", path: "/property/houseplan4.svg" },
] as const

export const AddPropertyDialog = memo(function AddPropertyDialog({
  open,
  onOpenChange,
  onAddProperty,
  defaultPropertyType = "owned",
}: AddPropertyDialogProps) {
  const [label, setLabel] = useState("")
  const [value, setValue] = useState<string>("")
  const [selectedSvgId, setSelectedSvgId] = useState<string | null>(PROPERTY_SVGS[0]?.id ?? null)
  const [propertyType, setPropertyType] = useState<"owned" | "rented">(defaultPropertyType)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedSvgPath = useMemo(() => {
    const found = PROPERTY_SVGS.find((s) => s.id === selectedSvgId)
    return found?.path ?? PROPERTY_SVGS[0]?.path
  }, [selectedSvgId])

  const handleClose = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setLabel("")
        setValue("")
        setSelectedSvgId(PROPERTY_SVGS[0]?.id ?? null)
        setPropertyType(defaultPropertyType)
        setError(null)
        setIsSubmitting(false)
      }
      onOpenChange(nextOpen)
    },
    [onOpenChange, defaultPropertyType],
  )

  const handleSubmit = async () => {
    if (!label.trim()) {
      setError("Property name is required")
      return
    }

    const numericValue = Number(value.replace(/[^0-9.]/g, ""))
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      setError("Enter a valid property value")
      return
    }

    if (!selectedSvgPath) {
      setError("Select a layout for this property")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const metadata: OwnedPropertyMetadata | RentedPropertyMetadata =
        propertyType === "owned"
          ? { propertyType: "owned", estimatedValue: Math.round(numericValue) }
          : { propertyType: "rented" }

      const res = await fetch('/api/pockets/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'property',
          name: label.trim(),
          metadata,
          svg_path: selectedSvgPath,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to add property')
        return
      }

      onAddProperty()
      handleClose(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add property")
    } finally {
      setIsSubmitting(false)
    }
  }

  const canSubmit = !!label.trim() && !!value && !!selectedSvgPath && !isSubmitting

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Property</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Property Type Selection */}
          <div className="space-y-2">
            <Label>Property type</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPropertyType("owned")}
                className={cn(
                  "rounded-lg border p-3 text-left transition-all",
                  "hover:border-primary/50 hover:bg-muted/60",
                  propertyType === "owned"
                    ? "border-primary bg-primary/5"
                    : "border-border bg-muted/40",
                )}
              >
                <div className="font-medium">Owned</div>
                <div className="text-xs text-muted-foreground">
                  You own or have a mortgage
                </div>
              </button>
              <button
                type="button"
                onClick={() => setPropertyType("rented")}
                className={cn(
                  "rounded-lg border p-3 text-left transition-all",
                  "hover:border-primary/50 hover:bg-muted/60",
                  propertyType === "rented"
                    ? "border-primary bg-primary/5"
                    : "border-border bg-muted/40",
                )}
              >
                <div className="font-medium">Rented</div>
                <div className="text-xs text-muted-foreground">
                  You pay rent (tenant)
                </div>
              </button>
            </div>
          </div>

          {/* Basic details */}
          <div className="space-y-2">
            <Label htmlFor="property-name">Property name</Label>
            <Input
              id="property-name"
              placeholder="e.g., Main Home, City Apartment"
              value={label}
              onChange={(e) => {
                setLabel(e.target.value)
                if (error) setError(null)
              }}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="property-value">Estimated value</Label>
            <Input
              id="property-value"
              type="number"
              min={0}
              step="1000"
              placeholder="e.g., 420000"
              value={value}
              onChange={(e) => {
                setValue(e.target.value)
                if (error) setError(null)
              }}
            />
            <p className="text-xs text-muted-foreground">
              This is just a rough estimate for now. You can update it later.
            </p>
          </div>

          {/* SVG layout selection */}
          <div className="space-y-2">
            <Label>Layout</Label>
            <div className="grid grid-cols-2 gap-3">
              {PROPERTY_SVGS.map((svg) => {
                const isActive = selectedSvgId === svg.id
                return (
                  <button
                    key={svg.id}
                    type="button"
                    onClick={() => setSelectedSvgId(svg.id)}
                    className={cn(
                      "relative aspect-[4/3] rounded-xl border bg-muted/40 p-3 transition-all",
                      "hover:border-primary/50 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isActive && "border-primary bg-primary/5 shadow-sm",
                    )}
                    aria-pressed={isActive}
                    aria-label={svg.label}
                  >
                    <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-[inherit]">
                      <img
                        src={svg.path}
                        alt={svg.label}
                        className="h-full w-full max-h-[80%] max-w-[80%] object-contain"
                      />
                    </div>
                    <div className="pointer-events-none absolute inset-x-2 bottom-2 flex items-center gap-1 rounded-full bg-background/85 px-2 py-0.5 text-[11px] font-medium text-muted-foreground shadow-sm">
                      <ImageIcon className="h-3 w-3" />
                      <span className="truncate">{svg.label}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Helper text about future linking */}
          <div className="rounded-md border border-dashed border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground flex items-start gap-2">
            <Home className="mt-0.5 h-3.5 w-3.5" />
            <p>
              After adding a property you&apos;ll see buttons on the card for{" "}
              <span className="font-semibold">Mortgage</span>,{" "}
              <span className="font-semibold">Maintenance</span>,{" "}
              <span className="font-semibold">Insurance</span>, and{" "}
              <span className="font-semibold">Taxes</span> so you can link related
              categories and transactions, just like vehicle actions in the Garage tab.
            </p>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isSubmitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              "Add property"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})

AddPropertyDialog.displayName = "AddPropertyDialog"

