"use client"

import { memo, useState, useEffect, useCallback } from "react"

import type { VehicleData, VehicleFinancing } from "@/lib/types/world-map"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface VehicleFinancingContentProps {
  vehicle: VehicleData
  onUpdate: (updates: Partial<VehicleData>) => void
  onDone?: () => void
}

export const VehicleFinancingContent = memo(function VehicleFinancingContent({
  vehicle,
  onUpdate,
  onDone,
}: VehicleFinancingContentProps) {
  const [upfrontPaid, setUpfrontPaid] = useState(
    vehicle.financing?.upfrontPaid?.toString() ?? ""
  )
  const [annualInterestRate, setAnnualInterestRate] = useState(
    vehicle.financing?.annualInterestRate?.toString() ?? ""
  )
  const [loanRemaining, setLoanRemaining] = useState(
    vehicle.financing?.loanRemaining?.toString() ?? ""
  )

  useEffect(() => {
    setUpfrontPaid(vehicle.financing?.upfrontPaid?.toString() ?? "")
    setAnnualInterestRate(
      vehicle.financing?.annualInterestRate?.toString() ?? ""
    )
    setLoanRemaining(vehicle.financing?.loanRemaining?.toString() ?? "")
  }, [vehicle.financing])

  const handleSave = useCallback(() => {
    const upfront = parseFloat(upfrontPaid)
    const rate = annualInterestRate
      ? parseFloat(annualInterestRate)
      : undefined
    const remaining = parseFloat(loanRemaining)
    if (Number.isNaN(upfront) || upfront < 0) return
    if (Number.isNaN(remaining) || remaining < 0) return
    const financing: VehicleFinancing = {
      upfrontPaid: upfront,
      annualInterestRate: rate,
      loanRemaining: remaining,
    }
    onUpdate({ financing })
    onDone?.()
  }, [upfrontPaid, annualInterestRate, loanRemaining, onUpdate, onDone])

  const handleClear = useCallback(() => {
    onUpdate({ financing: undefined })
    setUpfrontPaid("")
    setAnnualInterestRate("")
    setLoanRemaining("")
    onDone?.()
  }, [onUpdate, onDone])

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto pr-1">
      <p className="text-sm text-muted-foreground">
        Optionally add financing to track how much you own and how much is left
        to pay.
      </p>

      <div className="grid gap-2">
        <Label htmlFor="fin-upfront">Amount paid upfront</Label>
        <Input
          id="fin-upfront"
          type="number"
          min={0}
          step={0.01}
          value={upfrontPaid}
          onChange={(e) => setUpfrontPaid(e.target.value)}
          placeholder="0"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="fin-rate">Annual interest rate (%)</Label>
        <Input
          id="fin-rate"
          type="number"
          min={0}
          max={100}
          step={0.01}
          value={annualInterestRate}
          onChange={(e) => setAnnualInterestRate(e.target.value)}
          placeholder="Optional"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="fin-remaining">Loan remaining to pay</Label>
        <Input
          id="fin-remaining"
          type="number"
          min={0}
          step={0.01}
          value={loanRemaining}
          onChange={(e) => setLoanRemaining(e.target.value)}
          placeholder="0"
        />
        <p className="text-xs text-muted-foreground">
          Update this when you make loan payments to keep % owned accurate.
        </p>
      </div>

      <div className="mt-auto flex gap-2 pt-2">
        <Button variant="outline" onClick={handleClear} className="flex-1">
          Remove financing
        </Button>
        <Button onClick={handleSave} className="flex-1">
          Save
        </Button>
      </div>
    </div>
  )
})

VehicleFinancingContent.displayName = "VehicleFinancingContent"
