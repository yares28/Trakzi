"use client"

import { memo, useCallback, useEffect, useMemo, useState } from "react"
import useSWR from "swr"
import { Loader2 } from "lucide-react"

import { useCurrency } from "@/components/currency-provider"
import { formatDateForDisplay } from "@/lib/date"
import type {
  VehicleData,
  VehicleFuelInfo,
  VehicleLinkedTransaction,
} from "@/lib/types/world-map"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"

const FUEL_TYPES = ["Gasoline", "Diesel", "Electric", "Hybrid", "LPG", "Other"]

const CATEGORY_NAMES: Record<DetailType, string> = {
  fuel: "Fuel",
  maintenance: "Maintenance",
  insurance: "Insurance",
  certificate: "Certificate",
}

type DetailType = "fuel" | "maintenance" | "insurance" | "certificate"

interface TransactionsApiRow {
  id: number
  date: string
  description: string
  amount: number
  category: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface VehicleDetailContentProps {
  vehicle: VehicleData
  type: DetailType
  onUpdate: (updates: Partial<VehicleData>) => void
}

export const VehicleDetailContent = memo(function VehicleDetailContent({
  vehicle,
  type,
  onUpdate,
}: VehicleDetailContentProps) {
  const { formatCurrency } = useCurrency()
  const categoryName = CATEGORY_NAMES[type]
  const isFuel = type === "fuel"

  const [tankSize, setTankSize] = useState(
    vehicle.fuel.tankSizeL?.toString() ?? ""
  )
  const [fuelType, setFuelType] = useState(vehicle.fuel.fuelType ?? "")

  useEffect(() => {
    setTankSize(vehicle.fuel.tankSizeL?.toString() ?? "")
    setFuelType(vehicle.fuel.fuelType ?? "")
  }, [vehicle.fuel.tankSizeL, vehicle.fuel.fuelType])

  const linkedIds =
    type === "fuel"
      ? vehicle.fuel.linkedTransactionIds
      : type === "maintenance"
        ? vehicle.maintenanceTransactionIds
        : type === "insurance"
          ? vehicle.insuranceTransactionIds
          : vehicle.certificateTransactionIds

  const { data, isLoading } = useSWR<{ data: TransactionsApiRow[] }>(
    `/api/transactions?category=${encodeURIComponent(categoryName)}&all=true`,
    fetcher
  )

  const transactions = useMemo(
    () => (data?.data ?? []) as VehicleLinkedTransaction[],
    [data]
  )

  const toggleTransaction = useCallback(
    (id: number) => {
      const next = new Set(linkedIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      const arr = Array.from(next)
      const newTotal = transactions
        .filter((t) => arr.includes(t.id))
        .reduce((sum, t) => sum + Math.abs(t.amount), 0)
      if (type === "fuel") {
        onUpdate({
          fuel: { ...vehicle.fuel, linkedTransactionIds: arr },
          fuelTotal: newTotal,
        })
      } else if (type === "maintenance") {
        onUpdate({ maintenanceTransactionIds: arr, maintenanceTotal: newTotal })
      } else if (type === "insurance") {
        onUpdate({ insuranceTransactionIds: arr, insuranceTotal: newTotal })
      } else {
        onUpdate({ certificateTransactionIds: arr, certificateTotal: newTotal })
      }
    },
    [linkedIds, type, vehicle.fuel, transactions, onUpdate]
  )

  const saveFuelInfo = useCallback(() => {
    const info: VehicleFuelInfo = {
      ...vehicle.fuel,
      tankSizeL: tankSize ? parseFloat(tankSize) || undefined : undefined,
      fuelType: fuelType || undefined,
    }
    onUpdate({ fuel: info })
  }, [vehicle.fuel, tankSize, fuelType, onUpdate])

  const linkedTotal = useMemo(() => {
    return transactions
      .filter((t) => linkedIds.includes(t.id))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
  }, [transactions, linkedIds])

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto pr-1">
      {isFuel && (
        <div className="space-y-4 rounded-lg border p-3">
          <div className="grid gap-2">
            <Label htmlFor="tank-size">Tank size (L)</Label>
            <Input
              id="tank-size"
              type="number"
              min={0}
              step={0.1}
              value={tankSize}
              onChange={(e) => setTankSize(e.target.value)}
              onBlur={saveFuelInfo}
              placeholder="e.g. 50"
            />
          </div>
          <div className="grid gap-2">
            <Label>Fuel type</Label>
            <Select
              value={fuelType || undefined}
              onValueChange={(v) => {
                setFuelType(v)
                onUpdate({
                  fuel: { ...vehicle.fuel, fuelType: v || undefined },
                })
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {FUEL_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Link transactions ({categoryName})</Label>
          {linkedIds.length > 0 && (
            <span className="text-xs font-medium tabular-nums text-muted-foreground">
              Total:{" "}
              {formatCurrency(linkedTotal, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No transactions in category &quot;{categoryName}&quot; yet. Add
            transactions with this category to link them here.
          </p>
        ) : (
          <div className="rounded-md border overflow-auto max-h-[280px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead className="w-24">Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right w-24">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow
                    key={tx.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleTransaction(tx.id)}
                  >
                    <TableCell
                      className="w-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={linkedIds.includes(tx.id)}
                        onCheckedChange={() => toggleTransaction(tx.id)}
                        aria-label={`Select transaction ${tx.id}`}
                      />
                    </TableCell>
                    <TableCell className="w-24 text-xs text-muted-foreground">
                      {formatDateForDisplay(tx.date, "en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                    <TableCell
                      className="truncate max-w-[140px] text-sm"
                      title={tx.description}
                    >
                      {tx.description}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm font-medium">
                      {formatCurrency(tx.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
})

VehicleDetailContent.displayName = "VehicleDetailContent"
