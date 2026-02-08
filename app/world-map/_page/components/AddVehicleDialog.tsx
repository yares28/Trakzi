"use client"

import { memo, useState, useCallback } from "react"
import { Loader2 } from "lucide-react"

import type { VehicleData, VehicleTypeOption } from "@/lib/types/world-map"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
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

const VEHICLE_SVG_OPTIONS = [
  { value: "/topView/topviewcar2.svg", label: "topviewcar2" },
  { value: "/topView/topviewcar6.svg", label: "topviewcar6" },
  { value: "/topView/topviewcar7.svg", label: "topviewcar7" },
  { value: "/topViewInterim/1bvYk01.svg", label: "1bvYk01" },
  { value: "/topViewInterim/hgNqW01.svg", label: "hgNqW01" },
  { value: "/topViewInterim/MEqPS01.svg", label: "MEqPS01" },
  { value: "/topViewInterim/tGWsP01.svg", label: "tGWsP01" },
] as const

const VEHICLE_TYPES: VehicleTypeOption[] = [
  "Car",
  "SUV",
  "Truck",
  "Van",
  "Motorcycle",
  "Other",
]

function generateVehicleId(): string {
  return `vehicle-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

interface AddVehicleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (vehicle: VehicleData) => void
}

export const AddVehicleDialog = memo(function AddVehicleDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddVehicleDialogProps) {
  const [name, setName] = useState("")
  const [brand, setBrand] = useState("")
  const [vehicleType, setVehicleType] = useState<VehicleTypeOption>("Car")
  const [year, setYear] = useState("")
  const [priceBought, setPriceBought] = useState("")
  const [licensePlate, setLicensePlate] = useState("")
  const [svgPath, setSvgPath] = useState<string>(VEHICLE_SVG_OPTIONS[0].value)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = useCallback((): boolean => {
    const next: Record<string, string> = {}
    if (!name.trim()) next.name = "Name is required"
    if (!brand.trim()) next.brand = "Brand is required"
    const y = parseInt(year, 10)
    if (!year || isNaN(y) || y < 1900 || y > new Date().getFullYear() + 1) {
      next.year = "Valid year is required"
    }
    const p = parseFloat(priceBought)
    if (!priceBought || isNaN(p) || p < 0) next.priceBought = "Valid price is required"
    setErrors(next)
    return Object.keys(next).length === 0
  }, [name, brand, year, priceBought])

  const handleSubmit = useCallback(async () => {
    if (!validate()) return
    setIsSubmitting(true)
    setErrors({})
    try {
      const vehicle: VehicleData = {
        id: generateVehicleId(),
        name: name.trim(),
        brand: brand.trim(),
        vehicleType,
        year: parseInt(year, 10),
        priceBought: parseFloat(priceBought) || 0,
        licensePlate: licensePlate.trim(),
        svgPath,
        fuel: { linkedTransactionIds: [] },
        maintenanceTransactionIds: [],
        insuranceTransactionIds: [],
        certificateTransactionIds: [],
      }
      onSuccess(vehicle)
      handleReset()
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }, [
    name,
    brand,
    vehicleType,
    year,
    priceBought,
    licensePlate,
    svgPath,
    validate,
    onSuccess,
    onOpenChange,
  ])

  const handleReset = useCallback(() => {
    setName("")
    setBrand("")
    setVehicleType("Car")
    setYear("")
    setPriceBought("")
    setLicensePlate("")
    setSvgPath(VEHICLE_SVG_OPTIONS[0].value)
    setErrors({})
  }, [])

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) handleReset()
      onOpenChange(newOpen)
    },
    [onOpenChange, handleReset]
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Vehicle</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="vehicle-name">Car name</Label>
            <Input
              id="vehicle-name"
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
            <Label htmlFor="vehicle-brand">Brand</Label>
            <Input
              id="vehicle-brand"
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
              <Label htmlFor="vehicle-year">Year</Label>
              <Input
                id="vehicle-year"
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
              <Label htmlFor="vehicle-price">Price bought</Label>
              <Input
                id="vehicle-price"
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
            <Label htmlFor="vehicle-license">License plate</Label>
            <Input
              id="vehicle-license"
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value)}
              placeholder="Optional"
              maxLength={20}
            />
          </div>

          <div className="grid gap-2">
            <Label>Card icon</Label>
            <Select value={svgPath} onValueChange={setSvgPath}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VEHICLE_SVG_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isSubmitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              "Add vehicle"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})

AddVehicleDialog.displayName = "AddVehicleDialog"
