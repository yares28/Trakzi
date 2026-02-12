"use client"

import { memo, useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import { useCurrency } from "@/components/currency-provider"
import { COUNTRY_CONFIGS, getCountryConfig } from "./country-config"
import {
  computeMortgageResults,
  computeBreakdown,
  generateAmortizationSchedule,
} from "./calculations"
import { MortgageAmortizationChart } from "./MortgageAmortizationChart"
import type { MortgageInputs } from "./types"

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

export const MortgageCalculator = memo(function MortgageCalculator() {
  const { formatCurrency } = useCurrency()

  // Input state
  const [countryCode, setCountryCode] = useState("ES")
  const config = getCountryConfig(countryCode)
  const [regionKey, setRegionKey] = useState(config.defaultRegion)
  const [price, setPrice] = useState(config.defaults.price)
  const [deposit, setDeposit] = useState(config.defaults.deposit)
  const [termYears, setTermYears] = useState(config.defaults.termYears)
  const [interestRate, setInterestRate] = useState(config.defaults.interestRate)
  const [isNewProperty, setIsNewProperty] = useState(false)
  const [borrowerCount, setBorrowerCount] = useState<1 | 2>(1)
  const [startMonth, setStartMonth] = useState(new Date().getMonth() + 1) // 1-12, default to current month
  const [annualTaxRate, setAnnualTaxRate] = useState(config.defaults.annualTaxRate)

  // Derived values
  const depositPercent = useMemo(
    () => price > 0 ? ((deposit / price) * 100).toFixed(1) : "0",
    [deposit, price]
  )
  const depositExceedsPrice = deposit >= price && price > 0

  // Safe fallback: if regionKey doesn't exist in the current country's regions, use default
  const effectiveRegionKey = config.regions[regionKey] ? regionKey : config.defaultRegion

  const inputs: MortgageInputs = useMemo(() => ({
    price,
    deposit,
    termYears,
    interestRate,
    isNewProperty,
    countryCode,
    regionKey: effectiveRegionKey,
    startMonth,
    annualTaxRate,
  }), [price, deposit, termYears, interestRate, isNewProperty, countryCode, effectiveRegionKey, startMonth, annualTaxRate])

  const results = useMemo(() => computeMortgageResults(inputs), [inputs])
  const breakdown = useMemo(() => computeBreakdown(inputs, results), [inputs, results])
  const amortizationData = useMemo(
    () => generateAmortizationSchedule(inputs, results),
    [inputs, results]
  )

  const taxDetailNote = useMemo(() => {
    return results.taxBreakdown
      .map((t) => `${t.label}: ${t.rate}%`)
      .join(" + ")
  }, [results.taxBreakdown])

  // Sorted region entries for the select
  const regionEntries = useMemo(() => {
    return Object.entries(config.regions).sort(([, a], [, b]) =>
      a.name.localeCompare(b.name)
    )
  }, [config.regions])

  const handleCountryChange = (code: string) => {
    setCountryCode(code)
    const newConfig = getCountryConfig(code)
    setRegionKey(newConfig.defaultRegion)
    setPrice(newConfig.defaults.price)
    setDeposit(newConfig.defaults.deposit)
    setTermYears(newConfig.defaults.termYears)
    setInterestRate(newConfig.defaults.interestRate)
    setAnnualTaxRate(newConfig.defaults.annualTaxRate)
    setBorrowerCount(1)
  }

  return (
    <section className="px-4 lg:px-6">
      <Card className="@container/mortgage">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium">
            Mortgage Calculator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Two-column layout on larger container widths */}
          <div className="grid grid-cols-1 gap-6 @xl/mortgage:grid-cols-2">
            {/* LEFT: Inputs */}
            <div className="space-y-4">
              {/* Country */}
              <div className="space-y-1.5">
                <Label htmlFor="mortgage-country">Country</Label>
                <Select value={countryCode} onValueChange={handleCountryChange}>
                  <SelectTrigger id="mortgage-country">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(COUNTRY_CONFIGS).map(([code, cfg]) => (
                      <SelectItem key={code} value={code}>
                        {cfg.flag} {cfg.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Property Price */}
              <div className="space-y-1.5">
                <Label htmlFor="mortgage-price">Property Price</Label>
                <Input
                  id="mortgage-price"
                  type="number"
                  min={0}
                  step={1000}
                  value={price}
                  onChange={(e) => setPrice(Math.max(0, Number(e.target.value)))}
                />
              </div>

              {/* Deposit */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Label htmlFor="mortgage-deposit">Deposit</Label>
                  <Badge variant="secondary" className="text-[10px] leading-none px-1.5 py-0.5">
                    {depositPercent}%
                  </Badge>
                </div>
                <Input
                  id="mortgage-deposit"
                  type="number"
                  min={0}
                  step={1000}
                  value={deposit}
                  onChange={(e) => setDeposit(Math.max(0, Number(e.target.value)))}
                />
                {depositExceedsPrice && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Deposit meets or exceeds the property price. No mortgage needed.
                  </p>
                )}
              </div>

              {/* Term & Interest Rate — side by side */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="mortgage-term">Term (years)</Label>
                  <Input
                    id="mortgage-term"
                    type="number"
                    min={1}
                    max={40}
                    value={termYears}
                    onChange={(e) =>
                      setTermYears(Math.min(40, Math.max(1, Number(e.target.value))))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="mortgage-rate">Interest Rate</Label>
                    <Badge variant="secondary" className="text-[10px] leading-none px-1.5 py-0.5">
                      %
                    </Badge>
                  </div>
                  <Input
                    id="mortgage-rate"
                    type="number"
                    min={0}
                    max={30}
                    step={0.1}
                    value={interestRate}
                    onChange={(e) =>
                      setInterestRate(Math.min(30, Math.max(0, Number(e.target.value))))
                    }
                  />
                </div>
              </div>

              {/* Region */}
              <div className="space-y-1.5">
                <Label htmlFor="mortgage-region">Region</Label>
                <Select value={regionKey} onValueChange={setRegionKey}>
                  <SelectTrigger id="mortgage-region">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {regionEntries.map(([key, region]) => (
                      <SelectItem key={key} value={key}>
                        {region.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Property Condition */}
              <div className="space-y-1.5">
                <Label>Property Condition</Label>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  value={isNewProperty ? "new" : "secondhand"}
                  onValueChange={(v) => {
                    if (v) setIsNewProperty(v === "new")
                  }}
                  className="w-full"
                >
                  <ToggleGroupItem value="new" className="flex-1">
                    New
                  </ToggleGroupItem>
                  <ToggleGroupItem value="secondhand" className="flex-1">
                    Second-hand
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              {/* Borrowers (Spain only) */}
              {countryCode === "ES" && (
                <div className="space-y-1.5">
                  <Label htmlFor="mortgage-borrowers">Borrowers</Label>
                  <ToggleGroup
                    id="mortgage-borrowers"
                    type="single"
                    variant="outline"
                    value={borrowerCount === 1 ? "1" : "2"}
                    onValueChange={(v) => {
                      if (v) setBorrowerCount(v === "2" ? 2 : 1)
                    }}
                    className="w-full"
                  >
                    <ToggleGroupItem value="1" className="flex-1">
                      1
                    </ToggleGroupItem>
                    <ToggleGroupItem value="2" className="flex-1">
                      2
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
              )}

              {/* Start Month & Annual Tax — side by side */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="mortgage-start-month">Start Month</Label>
                  <Select
                    value={String(startMonth)}
                    onValueChange={(v) => setStartMonth(Number(v))}
                  >
                    <SelectTrigger id="mortgage-start-month">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTH_NAMES.map((name, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="mortgage-annual-tax">Annual Tax</Label>
                    <Badge variant="secondary" className="text-[10px] leading-none px-1.5 py-0.5">
                      %
                    </Badge>
                  </div>
                  <Input
                    id="mortgage-annual-tax"
                    type="number"
                    min={0}
                    max={10}
                    step={0.05}
                    value={annualTaxRate}
                    onChange={(e) =>
                      setAnnualTaxRate(Math.min(10, Math.max(0, Number(e.target.value))))
                    }
                  />
                </div>
              </div>
            </div>

            {/* RIGHT: Results */}
            <div className="space-y-4">
              {/* Monthly payment — prominent */}
              <div className="rounded-lg border bg-muted/30 p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  Monthly Payment
                </p>
                <p className="text-3xl font-bold tabular-nums">
                  {formatCurrency(results.monthlyPayment)}
                </p>
                {countryCode === "ES" && borrowerCount === 2 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Per borrower: {formatCurrency(results.monthlyPayment / 2)}
                  </p>
                )}
              </div>

              {/* Summary grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <SummaryItem
                  label="Mortgage Amount"
                  value={formatCurrency(results.loanAmount, { maximumFractionDigits: 0 })}
                />
                <SummaryItem
                  label="Financing"
                  value={`${results.financingPercent.toFixed(1)}%`}
                />
                <SummaryItem
                  label="Property Price"
                  value={formatCurrency(price, { maximumFractionDigits: 0 })}
                />
                <SummaryItem
                  label="Purchase Taxes"
                  value={formatCurrency(results.totalTaxesAndExpenses, { maximumFractionDigits: 0 })}
                />
                <SummaryItem
                  label="Annual Tax (IBI)"
                  value={`${formatCurrency(price * (annualTaxRate / 100), { maximumFractionDigits: 0 })}/yr`}
                />
              </div>

              <Separator />

              {/* Breakdown */}
              <div className="space-y-2 text-sm">
                <p className="font-medium">Cost Breakdown</p>
                <BreakdownRow
                  label="Deposit"
                  value={formatCurrency(breakdown.deposit, { maximumFractionDigits: 0 })}
                />
                <BreakdownRow
                  label="Mortgage"
                  value={formatCurrency(breakdown.loanAmount, { maximumFractionDigits: 0 })}
                />
                <BreakdownRow
                  label="Total Interest"
                  value={formatCurrency(breakdown.totalInterest, { maximumFractionDigits: 0 })}
                />
                <BreakdownRow
                  label="Taxes & Expenses"
                  value={formatCurrency(breakdown.totalTaxesAndExpenses, { maximumFractionDigits: 0 })}
                />
                <BreakdownRow
                  label={`Annual Tax (${termYears}yr)`}
                  value={formatCurrency(breakdown.totalAnnualTaxes, { maximumFractionDigits: 0 })}
                />
                <Separator />
                <BreakdownRow
                  label="Total Cost"
                  value={formatCurrency(breakdown.totalCost, { maximumFractionDigits: 0 })}
                  bold
                />
              </div>

              {/* Tax detail note */}
              <p className="text-[11px] text-muted-foreground">
                {taxDetailNote}
              </p>
            </div>
          </div>

          {/* Chart — full width below */}
          <div>
            <p className="text-sm font-medium mb-2">Amortization Schedule</p>
            <MortgageAmortizationChart data={amortizationData} />
          </div>

          {/* Disclaimer */}
          <p className="text-[10px] text-muted-foreground text-center">
            Estimates only. Consult a financial professional before making decisions.
          </p>
        </CardContent>
      </Card>
    </section>
  )
})

MortgageCalculator.displayName = "MortgageCalculator"

/* ── Small helper components ── */

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="font-medium tabular-nums">{value}</p>
    </div>
  )
}

function BreakdownRow({
  label,
  value,
  bold,
}: {
  label: string
  value: string
  bold?: boolean
}) {
  return (
    <div className="flex justify-between">
      <span className={bold ? "font-medium" : "text-muted-foreground"}>
        {label}
      </span>
      <span className={`tabular-nums ${bold ? "font-semibold" : ""}`}>
        {value}
      </span>
    </div>
  )
}
