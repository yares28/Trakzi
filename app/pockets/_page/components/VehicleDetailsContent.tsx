"use client"

import { memo, useState, useCallback, useEffect } from "react"
import { Loader2, ImageIcon, ChevronDown, ChevronUp } from "lucide-react"
import type { VehicleData, VehicleTypeOption, VehicleMetadata } from "@/lib/types/pockets"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

const VEHICLE_SVG_OPTIONS = [
  { value: "/topView/topviewcar1.svg", label: "topviewcar1" },
  { value: "/topView/topviewcar2.svg", label: "topviewcar2" },
  { value: "/topView/topviewcar3.svg", label: "topviewcar3" },
  { value: "/topView/topviewcar4.svg", label: "topviewcar4" },
  { value: "/topView/topviewcar5.svg", label: "topviewcar5" },
  { value: "/topView/topviewcar7.svg", label: "topviewcar7" },
] as const

const VEHICLE_TYPES: VehicleTypeOption[] = [
  "Car",
  "SUV",
  "Truck",
  "Van",
  "Motorcycle",
  "Other",
]

interface VehicleDetailsContentProps {
  vehicle: VehicleData
  onUpdate: (updates: Partial<VehicleData>) => void
  onCancel: () => void
}

export const VehicleDetailsContent = memo(function VehicleDetailsContent({
  vehicle,
  onUpdate,
  onCancel,
}: VehicleDetailsContentProps) {
  const [name, setName] = useState(vehicle.name)
  const [brand, setBrand] = useState(vehicle.brand)
  const [vehicleType, setVehicleType] = useState<VehicleTypeOption>(vehicle.vehicleType)
  const [year, setYear] = useState(vehicle.year.toString())
  const [priceBought, setPriceBought] = useState(vehicle.priceBought.toString())
  const [licensePlate, setLicensePlate] = useState(vehicle.licensePlate || "")
  const [svgPath, setSvgPath] = useState<string>(vehicle.svgPath)
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLayoutOpen, setIsLayoutOpen] = useState(false)

  // Track original price bought
  const originalPriceBought = vehicle.priceBought

  useEffect(() => {
    setName(vehicle.name)
    setBrand(vehicle.brand)
    setVehicleType(vehicle.vehicleType)
    setYear(vehicle.year.toString())
    setPriceBought(vehicle.priceBought.toString())
    setLicensePlate(vehicle.licensePlate || "")
    setSvgPath(vehicle.svgPath)
    setErrors({})
  }, [vehicle])

  const validate = useCallback((): boolean => {
    const next: Record<string, string> = {}
    if (!name.trim()) next.name = "Name is required"
    if (!brand.trim()) next.brand = "Brand is required"
    const y = parseInt(year, 10)
    if (!year || isNaN(y) || y < 1900 || y > new Date().getFullYear() + 1) {
      next.year = "Valid year is required"
    }
    const p = parseFloat(priceBought)
    if (!priceBought || isNaN(p) || p < 0) {
      next.priceBought = "Valid price is required"
    }

    // Check if price changed and financing exists
    if (vehicle.financing && p !== originalPriceBought) {
      next.priceBought = "The financing calculations will be incorrect if you change the price bought. Please fix the financing after saving."
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }, [name, brand, year, priceBought, vehicle.financing, originalPriceBought])

  const handleSave = useCallback(async () => {
    setErrors({})
    if (!validate()) return

    setIsSaving(true)

    try {
      const metadata: Partial<VehicleMetadata> = {
        brand: brand.trim(),
        vehicleType,
        year: parseInt(year, 10),
        priceBought: parseFloat(priceBought) || 0,
        licensePlate: licensePlate.trim() || undefined,
      }

      // Update via API
      const pocketId = parseInt(vehicle.id, 10)
      if (isNaN(pocketId)) {
        throw new Error("Invalid vehicle ID")
      }

      const res = await fetch(`/api/pockets/items?id=${pocketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          metadata,
          svg_path: svgPath,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setErrors({ name: data.error || 'Failed to update vehicle' })
        return
      }

      // Update local state
      onUpdate({
        name: name.trim(),
        brand: brand.trim(),
        vehicleType,
        year: parseInt(year, 10),
        priceBought: parseFloat(priceBought) || 0,
        licensePlate: licensePlate.trim() || undefined,
        svgPath,
      })

      onCancel()
    } catch (err) {
      setErrors({ name: err instanceof Error ? err.message : 'Failed to update vehicle' })
    } finally {
      setIsSaving(false)
    }
  }, [
    name,
    brand,
    vehicleType,
    year,
    priceBought,
    licensePlate,
    svgPath,
    vehicle.id,
    validate,
    onUpdate,
    onCancel,
  ])

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto">
      <div className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="details-name">Car name</Label>
          <Input
            id="details-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. My Daily Driver"
            maxLength={100}
            className={errors.name ? "border-destructive" : ""}
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name}</p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="details-brand">Brand</Label>
          <Input
            id="details-brand"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="e.g. Toyota, BMW"
            maxLength={80}
            className={errors.brand ? "border-destructive" : ""}
          />
          {errors.brand && (
            <p className="text-xs text-destructive">{errors.brand}</p>
          )}
        </div>

        <div className="grid gap-2">
          <Label>Type of vehicle</Label>
          <Select
            value={vehicleType}
            onValueChange={(v) => setVehicleType(v as VehicleTypeOption)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VEHICLE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="details-year">Year</Label>
            <Input
              id="details-year"
              type="number"
              min={1900}
              max={new Date().getFullYear() + 1}
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="e.g. 2022"
              className={errors.year ? "border-destructive" : ""}
            />
            {errors.year && (
              <p className="text-xs text-destructive">{errors.year}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="details-price">Price bought</Label>
            <Input
              id="details-price"
              type="number"
              min={0}
              step={0.01}
              value={priceBought}
              onChange={(e) => setPriceBought(e.target.value)}
              placeholder="0"
              className={errors.priceBought ? "border-destructive" : ""}
            />
            {errors.priceBought && (
              <p className="text-xs text-destructive">{errors.priceBought}</p>
            )}
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="details-license">License plate</Label>
          <Input
            id="details-license"
            value={licensePlate}
            onChange={(e) => setLicensePlate(e.target.value)}
            placeholder="Optional"
            maxLength={20}
          />
        </div>

        <div className="grid gap-2">
          <button
            type="button"
            onClick={() => setIsLayoutOpen(!isLayoutOpen)}
            className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 text-left transition-all hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Label className="cursor-pointer font-medium">Layout</Label>
            {isLayoutOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {isLayoutOpen && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              {VEHICLE_SVG_OPTIONS.map((opt) => {
                const isActive = svgPath === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSvgPath(opt.value)}
                    className={cn(
                      "relative aspect-[4/3] rounded-xl border bg-muted/40 p-3 transition-all",
                      "hover:border-primary/50 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isActive && "border-primary bg-primary/5 shadow-sm",
                    )}
                    aria-pressed={isActive}
                    aria-label={opt.label}
                  >
                    <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-[inherit]">
                      <img
                        src={opt.value}
                        alt={opt.label}
                        className="h-full w-full max-h-[80%] max-w-[80%] object-contain"
                      />
                    </div>
                    <div className="pointer-events-none absolute inset-x-2 bottom-2 flex items-center gap-1 rounded-full bg-background/85 px-2 py-0.5 text-[11px] font-medium text-muted-foreground shadow-sm">
                      <ImageIcon className="h-3 w-3" />
                      <span className="truncate">{opt.label}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-auto flex gap-2 border-t pt-4">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isSaving}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save"
          )}
        </Button>
      </div>
    </div>
  )
})

VehicleDetailsContent.displayName = "VehicleDetailsContent"
