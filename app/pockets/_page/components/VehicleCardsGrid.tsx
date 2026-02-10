"use client"

import { memo, useState, useCallback, useRef, useEffect } from "react"
import {
  Car,
  Plus,
  X,
  Loader2,
  Pencil,
  Check,
  X as XIcon,
  Fuel,
  Wrench,
  Shield,
  FileCheck,
  Banknote,
} from "lucide-react"

import { useCurrency } from "@/components/currency-provider"
import type { VehicleData } from "@/lib/types/pockets"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { VehicleCardBackFace, type BackFaceView } from "./VehicleCardBackFace"

function totalVehicleCost(v: VehicleData): number {
  return (
    v.priceBought +
    (v.fuelTotal ?? 0) +
    (v.maintenanceTotal ?? 0) +
    (v.insuranceTotal ?? 0) +
    (v.certificateTotal ?? 0)
  )
}

function ownershipPercent(v: VehicleData): number | null {
  if (!v.financing || v.priceBought <= 0) return null
  const owned = v.priceBought - v.financing.loanRemaining
  return Math.min(100, Math.max(0, (owned / v.priceBought) * 100))
}

interface VehicleCardProps {
  vehicle: VehicleData
  onUpdate: (updates: Partial<VehicleData>) => void
  onRemove?: () => void
}

function VehicleCard({ vehicle, onUpdate, onRemove }: VehicleCardProps) {
  const { formatCurrency } = useCurrency()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState(vehicle.name)
  const [editError, setEditError] = useState<string | null>(null)
  const [isFlipped, setIsFlipped] = useState(false)
  const [backFaceView, setBackFaceView] = useState<BackFaceView>("fuel")
  const inputRef = useRef<HTMLInputElement>(null)

  const totalCost = totalVehicleCost(vehicle)
  const percentOwned = ownershipPercent(vehicle)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  useEffect(() => {
    if (!isEditing) {
      setEditedName(vehicle.name)
      setEditError(null)
    }
  }, [vehicle.name, isEditing])

  const handleStartEdit = useCallback(() => {
    setIsEditing(true)
    setEditedName(vehicle.name)
    setEditError(null)
  }, [vehicle.name])

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false)
    setEditedName(vehicle.name)
    setEditError(null)
  }, [vehicle.name])

  const handleSaveEdit = useCallback(() => {
    const trimmed = editedName.trim()
    if (!trimmed) {
      setEditError("Name cannot be empty")
      return
    }
    if (trimmed === vehicle.name) {
      setIsEditing(false)
      return
    }
    setEditError(null)
    onUpdate({ name: trimmed })
    setIsEditing(false)
  }, [editedName, vehicle.name, onUpdate])

  const handleRemove = useCallback(async () => {
    if (!onRemove || isDeleting) return
    setIsDeleting(true)
    try {
      await onRemove()
    } finally {
      setIsDeleting(false)
    }
  }, [onRemove, isDeleting])

  const handleActionClick = useCallback((view: BackFaceView) => {
    setBackFaceView(view)
    setIsFlipped(true)
  }, [])

  const handleFlipBack = useCallback(() => {
    setIsFlipped(false)
  }, [])

  const subtitle = [vehicle.brand, vehicle.year].filter(Boolean).join(" · ")
  const showSubtitle = subtitle && subtitle !== "— · "

  return (
    <div
      className={cn(
        "[perspective:1200px] h-[500px] min-h-[20rem]",
        !isFlipped &&
          "transition-transform duration-200 hover:-translate-y-1"
      )}
    >
      {/* Rotating container */}
      <div
        className={cn(
          "relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d]",
          isFlipped && "[transform:rotateY(180deg)]"
        )}
      >
        {/* ─── FRONT FACE ─── */}
        <Card
          className={cn(
            "absolute inset-0 overflow-hidden border-border/60 bg-card/50 py-0 shadow-sm [backface-visibility:hidden] group",
            isFlipped && "pointer-events-none"
          )}
          aria-hidden={isFlipped}
        >
          {onRemove && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleRemove}
              disabled={isDeleting}
              aria-label={`Remove ${vehicle.name}`}
              tabIndex={isFlipped ? -1 : undefined}
              className="absolute right-2 top-2 z-20 h-8 w-8 rounded-full text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
            </Button>
          )}

          <CardContent className="relative flex h-full min-h-[20rem] flex-col p-0">
            {/* Car image area */}
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-[inherit] bg-muted/30 p-4">
              <img
                src={vehicle.svgPath}
                alt=""
                className={
                  vehicle.svgPath?.includes("tGWsP01")
                    ? "h-full w-full max-h-[65%] max-w-[65%] object-contain"
                    : "h-full w-full object-contain"
                }
              />
            </div>

            {/* Buttons at top of card */}
            <div className="absolute inset-x-0 top-0 z-20 flex justify-center pt-2">
              <div className="flex flex-wrap items-center justify-center gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100 sm:gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-xl border-border/80 bg-background/90 shadow-md backdrop-blur-sm transition-all hover:scale-105 hover:bg-primary/10 hover:border-primary/30 hover:shadow-lg sm:h-10 sm:w-10 [&_svg]:size-4 sm:[&_svg]:size-[18px]"
                  onClick={() => handleActionClick("fuel")}
                  tabIndex={isFlipped ? -1 : undefined}
                  aria-label="Fuel"
                  title="Fuel"
                >
                  <Fuel className="size-4 sm:size-[18px]" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-xl border-border/80 bg-background/90 shadow-md backdrop-blur-sm transition-all hover:scale-105 hover:bg-primary/10 hover:border-primary/30 hover:shadow-lg sm:h-10 sm:w-10 [&_svg]:size-4 sm:[&_svg]:size-[18px]"
                  onClick={() => handleActionClick("maintenance")}
                  tabIndex={isFlipped ? -1 : undefined}
                  aria-label="Maintenance"
                  title="Maintenance"
                >
                  <Wrench className="size-4 sm:size-[18px]" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-xl border-border/80 bg-background/90 shadow-md backdrop-blur-sm transition-all hover:scale-105 hover:bg-primary/10 hover:border-primary/30 hover:shadow-lg sm:h-10 sm:w-10 [&_svg]:size-4 sm:[&_svg]:size-[18px]"
                  onClick={() => handleActionClick("insurance")}
                  tabIndex={isFlipped ? -1 : undefined}
                  aria-label="Insurance"
                  title="Insurance"
                >
                  <Shield className="size-4 sm:size-[18px]" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-xl border-border/80 bg-background/90 shadow-md backdrop-blur-sm transition-all hover:scale-105 hover:bg-primary/10 hover:border-primary/30 hover:shadow-lg sm:h-10 sm:w-10 [&_svg]:size-4 sm:[&_svg]:size-[18px]"
                  onClick={() => handleActionClick("certificate")}
                  tabIndex={isFlipped ? -1 : undefined}
                  aria-label="Certificate"
                  title="Certificate"
                >
                  <FileCheck className="size-4 sm:size-[18px]" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-xl border-border/80 bg-background/90 shadow-md backdrop-blur-sm transition-all hover:scale-105 hover:bg-primary/10 hover:border-primary/30 hover:shadow-lg sm:h-10 sm:w-10 [&_svg]:size-4 sm:[&_svg]:size-[18px]"
                  onClick={() => handleActionClick("financing")}
                  tabIndex={isFlipped ? -1 : undefined}
                  aria-label="Financing"
                  title="Financing"
                >
                  <Banknote className="size-4 sm:size-[18px]" />
                </Button>
              </div>
            </div>

            {/* Data overlay at bottom */}
            <div className="absolute inset-x-0 bottom-0 z-10 border-t border-border/20 px-4 py-3 [text-shadow:0_1px_2px_rgba(0,0,0,0.4)]">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Vehicle
              </p>
              <div className="relative mt-1 group/label">
                {isEditing ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                      <Input
                        ref={inputRef}
                        value={editedName}
                        onChange={(e) => {
                          setEditedName(e.target.value)
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
                        tabIndex={isFlipped ? -1 : undefined}
                        className={`h-8 text-base font-medium ${editError ? "border-destructive" : ""}`}
                        aria-invalid={!!editError}
                      />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={handleSaveEdit}
                        disabled={!editedName.trim()}
                        tabIndex={isFlipped ? -1 : undefined}
                        className="h-8 w-8 shrink-0"
                        aria-label="Save name"
                      >
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={handleCancelEdit}
                        tabIndex={isFlipped ? -1 : undefined}
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
                  <>
                    <span
                      className="block pr-8 truncate text-base font-medium text-foreground"
                      title={vehicle.name}
                    >
                      {vehicle.name}
                    </span>
                    {onRemove && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={handleStartEdit}
                        tabIndex={isFlipped ? -1 : undefined}
                        className="absolute right-0 top-0 h-6 w-6 opacity-0 transition-opacity group-hover/label:opacity-100 hover:bg-accent"
                        aria-label={`Edit name for ${vehicle.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    )}
                  </>
                )}
              </div>
              {showSubtitle && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {vehicle.brand} · {vehicle.year}
                  {vehicle.licensePlate ? ` · ${vehicle.licensePlate}` : ""}
                </p>
              )}
              <p className="mt-1 text-lg tabular-nums text-foreground">
                {formatCurrency(totalCost, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </p>
              {percentOwned !== null && vehicle.financing && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {percentOwned.toFixed(0)}% owned
                  {" · "}
                  {formatCurrency(vehicle.financing.loanRemaining, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}{" "}
                  left to pay
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ─── BACK FACE ─── */}
        <Card
          className="absolute inset-0 overflow-hidden border-border/60 bg-card py-0 shadow-sm [backface-visibility:hidden] [transform:rotateY(180deg)]"
          aria-hidden={!isFlipped}
        >
          <VehicleCardBackFace
            vehicle={vehicle}
            activeView={backFaceView}
            onViewChange={setBackFaceView}
            onFlipBack={handleFlipBack}
            onUpdate={onUpdate}
          />
        </Card>
      </div>
    </div>
  )
}

interface VehicleCardsGridProps {
  vehicles: VehicleData[]
  onVehiclesChange: (updater: (prev: VehicleData[]) => VehicleData[]) => void
  onOpenAddVehicle?: () => void
}

export const VehicleCardsGrid = memo(function VehicleCardsGrid({
  vehicles,
  onVehiclesChange,
  onOpenAddVehicle,
}: VehicleCardsGridProps) {
  const handleRemove = useCallback(
    (id: string) => {
      onVehiclesChange((prev) => prev.filter((v) => v.id !== id))
    },
    [onVehiclesChange]
  )

  const handleUpdate = useCallback(
    (id: string, updates: Partial<VehicleData>) => {
      onVehiclesChange((prev) =>
        prev.map((v) => (v.id === id ? { ...v, ...updates } : v))
      )
    },
    [onVehiclesChange]
  )

  if (vehicles.length === 0) {
    return (
      <div className="px-4 lg:px-6">
        <Card className="flex flex-col items-center justify-center py-12">
          <Car className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="mb-4 text-center text-muted-foreground">
            No vehicles added yet
          </p>
          <p className="mb-6 max-w-md text-center text-sm text-muted-foreground">
            Track your vehicles and their value. Add a vehicle to get started.
          </p>
          <Button variant="outline" onClick={onOpenAddVehicle}>
            <Plus className="mr-2 h-4 w-4" />
            Add your first vehicle
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @3xl/main:grid-cols-3">
      {vehicles.map((v) => (
        <VehicleCard
          key={v.id}
          vehicle={v}
          onUpdate={(updates) => handleUpdate(v.id, updates)}
          onRemove={() => handleRemove(v.id)}
        />
      ))}
    </div>
  )
})

VehicleCardsGrid.displayName = "VehicleCardsGrid"

export type { VehicleData }
