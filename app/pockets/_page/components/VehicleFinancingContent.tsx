"use client"

import { memo, useState, useEffect, useCallback, useMemo } from "react"
import useSWR from "swr"

import { useCurrency } from "@/components/currency-provider"
import { formatDateForDisplay } from "@/lib/date"
import type { VehicleData, VehicleFinancing } from "@/lib/types/pockets"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"

interface TransactionsApiRow {
  id: number
  date: string
  description: string
  amount: number
  category: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

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
  const { formatCurrency } = useCurrency()

  const [upfrontPaid, setUpfrontPaid] = useState(
    vehicle.financing?.upfrontPaid?.toString() ?? ""
  )
  const [annualInterestRate, setAnnualInterestRate] = useState(
    vehicle.financing?.annualInterestRate?.toString() ?? ""
  )
  const [loanRemaining, setLoanRemaining] = useState(
    vehicle.financing?.loanRemaining?.toString() ?? ""
  )

  // Track linked Car Loan transaction IDs locally
  const [linkedIds, setLinkedIds] = useState<number[]>([])

  useEffect(() => {
    setUpfrontPaid(vehicle.financing?.upfrontPaid?.toString() ?? "")
    setAnnualInterestRate(
      vehicle.financing?.annualInterestRate?.toString() ?? ""
    )
    setLoanRemaining(vehicle.financing?.loanRemaining?.toString() ?? "")
  }, [vehicle.financing])

  // Fetch "Car Loan" category transactions
  const { data, isLoading } = useSWR<{ data: TransactionsApiRow[] }>(
    `/api/transactions?category=${encodeURIComponent("Car Loan")}&all=true`,
    fetcher
  )

  const transactions = useMemo(
    () => (data?.data ?? []) as TransactionsApiRow[],
    [data]
  )

  // Original loan amount derived from priceBought - upfrontPaid
  const originalLoan = useMemo(() => {
    const upfront = parseFloat(upfrontPaid) || 0
    return Math.max(0, vehicle.priceBought - upfront)
  }, [vehicle.priceBought, upfrontPaid])

  // Total of linked Car Loan payments
  const linkedTotal = useMemo(() => {
    return transactions
      .filter((t) => linkedIds.includes(t.id))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
  }, [transactions, linkedIds])

  // Effective remaining after linked payments
  const effectiveRemaining = useMemo(() => {
    return Math.max(0, originalLoan - linkedTotal)
  }, [originalLoan, linkedTotal])

  // Ownership percent
  const percentOwned = useMemo(() => {
    if (vehicle.priceBought <= 0) return null
    const owned = vehicle.priceBought - effectiveRemaining
    return Math.min(100, Math.max(0, (owned / vehicle.priceBought) * 100))
  }, [vehicle.priceBought, effectiveRemaining])

  const toggleTransaction = useCallback(
    (id: number) => {
      const next = new Set(linkedIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      const arr = Array.from(next)
      setLinkedIds(arr)

      // Recalculate remaining
      const totalPayments = transactions
        .filter((t) => arr.includes(t.id))
        .reduce((sum, t) => sum + Math.abs(t.amount), 0)
      const newRemaining = Math.max(0, originalLoan - totalPayments)

      const financing: VehicleFinancing = {
        upfrontPaid: parseFloat(upfrontPaid) || 0,
        annualInterestRate: annualInterestRate
          ? parseFloat(annualInterestRate)
          : undefined,
        loanRemaining: newRemaining,
      }
      onUpdate({ financing })
      setLoanRemaining(newRemaining.toString())
    },
    [linkedIds, transactions, originalLoan, upfrontPaid, annualInterestRate, onUpdate]
  )

  const handleSave = useCallback(() => {
    const upfront = parseFloat(upfrontPaid)
    const rate = annualInterestRate
      ? parseFloat(annualInterestRate)
      : undefined
    if (Number.isNaN(upfront) || upfront < 0) return

    // If user has linked payments, use effectiveRemaining; otherwise use manual input
    const remaining = linkedIds.length > 0
      ? effectiveRemaining
      : parseFloat(loanRemaining) || 0

    if (remaining < 0) return

    const financing: VehicleFinancing = {
      upfrontPaid: upfront,
      annualInterestRate: rate,
      loanRemaining: remaining,
    }
    onUpdate({ financing })
    onDone?.()
  }, [upfrontPaid, annualInterestRate, loanRemaining, linkedIds, effectiveRemaining, onUpdate, onDone])

  const handleClear = useCallback(() => {
    onUpdate({ financing: undefined })
    setUpfrontPaid("")
    setAnnualInterestRate("")
    setLoanRemaining("")
    setLinkedIds([])
    onDone?.()
  }, [onUpdate, onDone])

  const fmtOpts = { minimumFractionDigits: 0, maximumFractionDigits: 0 } as const

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto pr-1">
      {/* Input fields — compact 2-column grid */}
      <div className="grid gap-3 grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="fin-upfront" className="text-xs font-medium">Paid upfront</Label>
          <Input
            id="fin-upfront"
            type="number"
            min={0}
            step={0.01}
            value={upfrontPaid}
            onChange={(e) => setUpfrontPaid(e.target.value)}
            onBlur={handleSave}
            placeholder="0"
            className="h-9"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="fin-rate" className="text-xs font-medium">Interest rate (%)</Label>
          <Input
            id="fin-rate"
            type="number"
            min={0}
            max={100}
            step={0.01}
            value={annualInterestRate}
            onChange={(e) => setAnnualInterestRate(e.target.value)}
            onBlur={handleSave}
            placeholder="Optional"
            className="h-9"
          />
        </div>
      </div>

      {/* Key metrics — shown when financing is meaningful */}
      {originalLoan > 0 && (
        <div className="space-y-3">
          {/* Loan remaining — most prominent */}
          <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4 text-center">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Loan remaining</p>
            <p className="text-3xl font-bold tabular-nums text-foreground">
              {formatCurrency(effectiveRemaining, fmtOpts)}
            </p>
          </div>

          {/* Summary row */}
          <div className="grid gap-2 rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Original loan</span>
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {formatCurrency(originalLoan, fmtOpts)}
              </span>
            </div>
            {linkedTotal > 0 && (
              <div className="flex items-center justify-between border-t pt-2 mt-1">
                <span className="text-xs text-muted-foreground">
                  Linked payments ({linkedIds.length})
                </span>
                <span className="text-sm font-medium tabular-nums text-green-600 dark:text-green-400">
                  -{formatCurrency(linkedTotal, fmtOpts)}
                </span>
              </div>
            )}
          </div>

          {/* Ownership progress */}
          {percentOwned !== null && (
            <div className="space-y-1">
              <Progress
                value={percentOwned}
                className="h-2"
                aria-label={`Ownership progress: ${percentOwned.toFixed(0)}%`}
              />
              <p className="text-center text-xs text-muted-foreground">
                {percentOwned.toFixed(0)}% owned
              </p>
            </div>
          )}
        </div>
      )}

      {/* Car Loan transaction linking */}
      {transactions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">Link Car Loan payments</Label>
            {linkedIds.length > 0 && (
              <span className="text-xs font-medium tabular-nums text-muted-foreground">
                {linkedIds.length} linked
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="max-h-[200px] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead className="w-20 text-xs">Date</TableHead>
                    <TableHead className="text-xs">Description</TableHead>
                    <TableHead className="w-20 text-right text-xs">Amount</TableHead>
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
                      <TableCell className="w-20 text-xs text-muted-foreground">
                        {formatDateForDisplay(tx.date, "en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </TableCell>
                      <TableCell
                        className="max-w-[180px] truncate text-xs"
                        title={tx.description}
                      >
                        {tx.description}
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium tabular-nums">
                        {formatCurrency(tx.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {!isLoading && transactions.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No &quot;Car Loan&quot; transactions yet. Add transactions with the Car Loan
          category to link payments and reduce loan remaining.
        </p>
      )}

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
