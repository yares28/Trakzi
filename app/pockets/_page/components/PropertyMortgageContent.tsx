"use client"

import { memo, useCallback, useEffect, useMemo, useState } from "react"
import useSWR from "swr"

import { useCurrency } from "@/components/currency-provider"
import { formatDateForDisplay } from "@/lib/date"
import { calculateMonthlyPayment } from "@/app/savings/_page/mortgage/calculations"

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

import type { PropertyCardData } from "./PropertyCardsGrid"

interface TransactionsApiRow {
  id: number
  date: string
  description: string
  amount: number
  category: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

/**
 * Compute remaining mortgage balance after a number of years paid,
 * by iterating month-by-month through the amortization schedule.
 */
function computeRemainingBalance(
  principal: number,
  annualRate: number,
  totalYears: number,
  yearsPaid: number
): number {
  if (principal <= 0 || totalYears <= 0 || yearsPaid <= 0) return principal
  const monthlyPayment = calculateMonthlyPayment(principal, annualRate, totalYears)
  const monthlyRate = annualRate / 100 / 12
  let balance = principal
  const monthsPaid = Math.round(yearsPaid * 12)

  for (let i = 0; i < monthsPaid; i++) {
    if (balance <= 0) break
    const interest = balance * monthlyRate
    const principalPaid = monthlyPayment - interest
    balance = Math.max(0, balance - principalPaid)
  }

  return balance
}

interface PropertyMortgageContentProps {
  property: PropertyCardData
  onUpdate: (updates: Partial<PropertyCardData>) => void
  onDone?: () => void
}

export const PropertyMortgageContent = memo(function PropertyMortgageContent({
  property,
  onUpdate,
  onDone,
}: PropertyMortgageContentProps) {
  const { formatCurrency } = useCurrency()
  const [purchasePrice, setPurchasePrice] = useState(
    property.mortgageOriginalAmount?.toString() ?? "",
  )
  const [interestRate, setInterestRate] = useState(
    property.mortgageInterestRate?.toString() ?? "",
  )
  const [loanYears, setLoanYears] = useState(
    property.mortgageLoanYears?.toString() ?? "",
  )
  const [yearsPaid, setYearsPaid] = useState(
    property.mortgageYearsPaid?.toString() ?? "",
  )

  useEffect(() => {
    setPurchasePrice(property.mortgageOriginalAmount?.toString() ?? "")
    setInterestRate(property.mortgageInterestRate?.toString() ?? "")
    setLoanYears(property.mortgageLoanYears?.toString() ?? "")
    setYearsPaid(property.mortgageYearsPaid?.toString() ?? "")
  }, [
    property.mortgageOriginalAmount,
    property.mortgageInterestRate,
    property.mortgageLoanYears,
    property.mortgageYearsPaid,
  ])

  const linkedIds = property.mortgageLinkedTransactionIds ?? []

  // Fetch transactions from multiple categories: Mortgage, Bank Fees, Taxes & Fees
  const { data: mortgageData, isLoading: isLoadingMortgage } = useSWR<{ data: TransactionsApiRow[] }>(
    `/api/transactions?category=${encodeURIComponent("Mortgage")}&all=true`,
    fetcher,
  )
  const { data: bankFeesData, isLoading: isLoadingBankFees } = useSWR<{ data: TransactionsApiRow[] }>(
    `/api/transactions?category=${encodeURIComponent("Bank Fees")}&all=true`,
    fetcher,
  )
  const { data: taxesFeesData, isLoading: isLoadingTaxesFees } = useSWR<{ data: TransactionsApiRow[] }>(
    `/api/transactions?category=${encodeURIComponent("Taxes & Fees")}&all=true`,
    fetcher,
  )

  const isLoading = isLoadingMortgage || isLoadingBankFees || isLoadingTaxesFees

  // Combine all transactions
  const allTransactions = useMemo(() => {
    const mortgage = (mortgageData?.data ?? []) as TransactionsApiRow[]
    const bankFees = (bankFeesData?.data ?? []) as TransactionsApiRow[]
    const taxesFees = (taxesFeesData?.data ?? []) as TransactionsApiRow[]
    return [...mortgage, ...bankFees, ...taxesFees]
  }, [mortgageData, bankFeesData, taxesFeesData])

  // Separate Mortgage transactions (for principal) from fee transactions
  const mortgageTransactions = useMemo(
    () => allTransactions.filter((tx) => tx.category === "Mortgage"),
    [allTransactions],
  )
  const feeTransactions = useMemo(
    () => allTransactions.filter((tx) => 
      tx.category === "Bank Fees" || tx.category === "Taxes & Fees"
    ),
    [allTransactions],
  )

  // Calculate totals from linked transactions
  const principalPaidFromTx = useMemo(() => {
    return mortgageTransactions
      .filter((tx) => linkedIds.includes(tx.id))
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
  }, [mortgageTransactions, linkedIds])

  const totalFeesLinked = useMemo(() => {
    return feeTransactions
      .filter((tx) => linkedIds.includes(tx.id))
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
  }, [feeTransactions, linkedIds])

  const linkedTotalPaid = principalPaidFromTx + totalFeesLinked

  const effectiveOriginal = property.mortgageOriginalAmount ?? 0
  const numericRate = property.mortgageInterestRate ?? (interestRate ? parseFloat(interestRate) : 0)
  const numericYears = property.mortgageLoanYears ?? (loanYears ? parseFloat(loanYears) : 0)
  const numericYearsPaid = property.mortgageYearsPaid ?? (yearsPaid ? parseFloat(yearsPaid) : 0)

  const mortgageCalc = useMemo(() => {
    if (!effectiveOriginal || !numericYears || numericYears <= 0) {
      return null
    }

    const monthlyPayment = calculateMonthlyPayment(effectiveOriginal, numericRate, numericYears)
    
    // Derive effective years paid from linked Mortgage transactions
    const effectivePaymentsCount = monthlyPayment > 0
      ? Math.min(principalPaidFromTx / monthlyPayment, numericYears * 12)
      : 0
    const effectiveYearsPaidFromTx = effectivePaymentsCount / 12
    
    // Use the maximum of manual input and transaction-derived years paid
    const yearsPaidForCalc = principalPaidFromTx >= monthlyPayment
      ? Math.max(numericYearsPaid, effectiveYearsPaidFromTx)
      : numericYearsPaid
    
    const clampedYearsPaid = Math.min(yearsPaidForCalc, numericYears)
    const remainingBalance = computeRemainingBalance(
      effectiveOriginal, numericRate, numericYears, clampedYearsPaid
    )
    const yearsRemaining = numericYears - clampedYearsPaid
    const totalRemainingToPay = monthlyPayment * yearsRemaining * 12
    const totalRemainingInterest = Math.max(0, totalRemainingToPay - remainingBalance)
    const totalLifetimeCost = monthlyPayment * numericYears * 12
    const totalLifetimeInterest = Math.max(0, totalLifetimeCost - effectiveOriginal)
    const progressPercent = numericYears > 0
      ? Math.round((clampedYearsPaid / numericYears) * 100)
      : 0

    return {
      monthlyPayment,
      remainingBalance,
      yearsRemaining,
      totalRemainingToPay,
      totalRemainingInterest,
      totalLifetimeCost,
      totalLifetimeInterest,
      progressPercent,
      clampedYearsPaid,
      yearsPaidForCalc,
    }
  }, [effectiveOriginal, numericRate, numericYears, numericYearsPaid, principalPaidFromTx])

  const handleSaveMortgageInfo = useCallback(() => {
    const original = parseFloat(purchasePrice)
    const rate = interestRate ? parseFloat(interestRate) : undefined
    const years = loanYears ? parseFloat(loanYears) : undefined
    const paid = yearsPaid ? parseFloat(yearsPaid) : undefined

    if (Number.isNaN(original) || original <= 0) return
    if (rate !== undefined && (Number.isNaN(rate) || rate < 0)) return
    if (years !== undefined && (Number.isNaN(years) || years <= 0)) return
    if (paid !== undefined && (Number.isNaN(paid) || paid < 0)) return
    if (paid !== undefined && years !== undefined && paid > years) return

    // Use amortization-based remaining balance if loan parameters are valid
    let remaining: number
    if (original > 0 && rate !== undefined && rate >= 0 && years !== undefined && years > 0) {
      const monthlyPayment = calculateMonthlyPayment(original, rate, years)
      const effectivePaymentsCount = monthlyPayment > 0
        ? Math.min(principalPaidFromTx / monthlyPayment, years * 12)
        : 0
      const effectiveYearsPaidFromTx = effectivePaymentsCount / 12
      const yearsPaidForCalc = principalPaidFromTx >= monthlyPayment
        ? Math.max(paid ?? 0, effectiveYearsPaidFromTx)
        : (paid ?? 0)
      const clampedYearsPaid = Math.min(yearsPaidForCalc, years)
      remaining = computeRemainingBalance(original, rate, years, clampedYearsPaid)
    } else {
      // Fallback to naive calculation when loan parameters are missing
      remaining = linkedIds.length > 0 ? Math.max(0, original - principalPaidFromTx) : original
    }

    onUpdate({
      mortgageOriginalAmount: original,
      mortgageInterestRate: rate,
      mortgageRemainingAmount: remaining,
      mortgageLoanYears: years,
      mortgageYearsPaid: paid,
      mortgageTotalPaid: principalPaidFromTx,
    })
  }, [purchasePrice, interestRate, loanYears, yearsPaid, linkedIds, principalPaidFromTx, onUpdate])

  const toggleTransaction = useCallback(
    (id: number) => {
      const next = new Set(linkedIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      const arr = Array.from(next)

      // Calculate principal paid (Mortgage category only) and fees separately
      const principalPaid = mortgageTransactions
        .filter((t) => arr.includes(t.id))
        .reduce((sum, t) => sum + Math.abs(t.amount), 0)
      
      const feesPaid = feeTransactions
        .filter((t) => arr.includes(t.id))
        .reduce((sum, t) => sum + Math.abs(t.amount), 0)

      const original = property.mortgageOriginalAmount ?? 0
      const rate = property.mortgageInterestRate ?? 0
      const years = property.mortgageLoanYears ?? 0
      const yearsPaid = property.mortgageYearsPaid ?? 0

      // Use amortization-based remaining balance if loan parameters are valid
      let remaining: number
      if (original > 0 && rate >= 0 && years > 0) {
        const monthlyPayment = calculateMonthlyPayment(original, rate, years)
        const effectivePaymentsCount = monthlyPayment > 0
          ? Math.min(principalPaid / monthlyPayment, years * 12)
          : 0
        const effectiveYearsPaidFromTx = effectivePaymentsCount / 12
        const yearsPaidForCalc = principalPaid >= monthlyPayment
          ? Math.max(yearsPaid, effectiveYearsPaidFromTx)
          : yearsPaid
        const clampedYearsPaid = Math.min(yearsPaidForCalc, years)
        remaining = computeRemainingBalance(original, rate, years, clampedYearsPaid)
      } else {
        // Fallback to naive calculation
        remaining = original > 0 ? Math.max(0, original - principalPaid) : 0
      }

      onUpdate({
        mortgageLinkedTransactionIds: arr,
        mortgageTotalPaid: principalPaid,
        mortgageRemainingAmount: remaining,
      })
    },
    [linkedIds, mortgageTransactions, feeTransactions, onUpdate, property.mortgageOriginalAmount, property.mortgageInterestRate, property.mortgageLoanYears, property.mortgageYearsPaid],
  )

  const handleClear = useCallback(() => {
    onUpdate({
      mortgageOriginalAmount: undefined,
      mortgageInterestRate: undefined,
      mortgageRemainingAmount: undefined,
      mortgageLinkedTransactionIds: [],
      mortgageTotalPaid: undefined,
      mortgageLoanYears: undefined,
      mortgageYearsPaid: undefined,
    })
    setPurchasePrice("")
    setInterestRate("")
    setLoanYears("")
    setYearsPaid("")
    onDone?.()
  }, [onUpdate, onDone])

  const fmtOpts = { minimumFractionDigits: 0, maximumFractionDigits: 0 } as const

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto pr-1">
      {/* Minimalistic input grid: 2 columns */}
      <div className="grid gap-3 grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="mortgage-original" className="text-xs font-medium">Loan amount</Label>
          <Input
            id="mortgage-original"
            type="number"
            min={0}
            step={0.01}
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(e.target.value)}
            onBlur={handleSaveMortgageInfo}
            placeholder="0"
            className="h-9"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="mortgage-rate" className="text-xs font-medium">Interest rate (%)</Label>
          <Input
            id="mortgage-rate"
            type="number"
            min={0}
            max={100}
            step={0.01}
            value={interestRate}
            onChange={(e) => setInterestRate(e.target.value)}
            onBlur={handleSaveMortgageInfo}
            placeholder="e.g. 3"
            className="h-9"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="mortgage-years" className="text-xs font-medium">Loan term (years)</Label>
          <Input
            id="mortgage-years"
            type="number"
            min={1}
            max={80}
            step={1}
            value={loanYears}
            onChange={(e) => setLoanYears(e.target.value)}
            onBlur={handleSaveMortgageInfo}
            placeholder="e.g. 25"
            className="h-9"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="mortgage-years-paid" className="text-xs font-medium">Years paid</Label>
          <Input
            id="mortgage-years-paid"
            type="number"
            min={0}
            max={numericYears || 80}
            step={0.5}
            value={yearsPaid}
            onChange={(e) => setYearsPaid(e.target.value)}
            onBlur={handleSaveMortgageInfo}
            placeholder="0"
            className="h-9"
          />
        </div>
      </div>

      {/* Key metrics — prominently displayed */}
      {mortgageCalc ? (
        <div className="space-y-3">
          {/* Monthly payment — most prominent */}
          <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4 text-center">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Monthly payment</p>
            <p className="text-3xl font-bold tabular-nums text-foreground">
              {formatCurrency(mortgageCalc.monthlyPayment, fmtOpts)}
            </p>
          </div>

          {/* Essential info only */}
          <div className="grid gap-2 rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Remaining balance</span>
              <span className="text-lg font-semibold tabular-nums text-foreground">
                {formatCurrency(mortgageCalc.remainingBalance, fmtOpts)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Total left to pay</span>
              <span className="text-lg font-semibold tabular-nums text-foreground">
                {formatCurrency(mortgageCalc.totalRemainingToPay, fmtOpts)}
              </span>
            </div>
            {principalPaidFromTx > 0 && (
              <div className="flex items-center justify-between border-t pt-2 mt-2">
                <span className="text-xs text-muted-foreground">
                  Linked payments ({mortgageTransactions.filter((tx) => linkedIds.includes(tx.id)).length})
                </span>
                <span className="text-sm font-medium tabular-nums text-foreground">
                  {formatCurrency(principalPaidFromTx, fmtOpts)}
                </span>
              </div>
            )}
          </div>

          {/* Progress bar */}
          {numericYearsPaid > 0 && (
            <div className="space-y-1">
              <Progress value={mortgageCalc.progressPercent} className="h-2" aria-label={`Mortgage progress: ${mortgageCalc.progressPercent}%`} />
              <p className="text-center text-xs text-muted-foreground">
                {mortgageCalc.clampedYearsPaid} of {numericYears} years ({mortgageCalc.progressPercent}%)
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border bg-muted/30 p-4 text-center">
          <p className="text-sm text-muted-foreground">Enter loan details to see calculations</p>
        </div>
      )}

      {/* Transaction linking section — collapsed by default if no transactions */}
      {allTransactions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">Link transactions</Label>
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
                  {allTransactions.map((tx) => (
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

      <div className="mt-auto flex gap-2 pt-2">
        <Button variant="outline" onClick={handleClear} className="flex-1">
          Clear
        </Button>
        <Button 
          onClick={() => {
            handleSaveMortgageInfo()
            onDone?.()
          }} 
          className="flex-1"
        >
          Save
        </Button>
      </div>
    </div>
  )
})

PropertyMortgageContent.displayName = "PropertyMortgageContent"
