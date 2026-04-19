"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { STANDALONE_DEBT_TYPES } from "@/lib/types/debts"

const DEBT_TYPE_LABELS: Record<(typeof STANDALONE_DEBT_TYPES)[number], string> = {
  credit_card: "Credit card",
  revolving_credit: "Revolving credit",
  student_loan: "Student loan",
  personal_loan: "Personal loan",
  consumer_loan: "Consumer loan",
  credit_line: "Credit line",
  overdraft: "Overdraft",
  buy_now_pay_later: "Buy now, pay later",
  quick_loan: "Quick loan",
  tax_debt: "Tax debt",
  medical_debt: "Medical debt",
  family_private_loan: "Family or private loan",
  business_loan_personal_liability: "Business loan with personal liability",
  other: "Other",
}

export function DebtQuickAddForm({
  onCreated,
  compact = false,
}: {
  onCreated?: () => void
  compact?: boolean
}) {
  const [name, setName] = useState("")
  const [debtType, setDebtType] = useState<(typeof STANDALONE_DEBT_TYPES)[number]>("credit_card")
  const [currentBalance, setCurrentBalance] = useState("")
  const [lenderName, setLenderName] = useState("")
  const [interestRate, setInterestRate] = useState("")
  const [minimumPayment, setMinimumPayment] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const reset = () => {
    setName("")
    setDebtType("credit_card")
    setCurrentBalance("")
    setLenderName("")
    setInterestRate("")
    setMinimumPayment("")
  }

  const handleSubmit = async () => {
    const parsedBalance = Number.parseFloat(currentBalance)
    if (!name.trim() || !Number.isFinite(parsedBalance) || parsedBalance <= 0) {
      toast.error("Add a debt name and a valid current balance.")
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch("/api/debts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          debtType,
          currentBalance: parsedBalance,
          lenderName: lenderName.trim() || null,
          interestRate: interestRate ? Number.parseFloat(interestRate) : null,
          minimumPayment: minimumPayment ? Number.parseFloat(minimumPayment) : null,
        }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        toast.error(payload?.error || "Failed to create debt")
        return
      }

      toast.success("Debt added")
      reset()
      onCreated?.()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create debt"
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      <div className={cn("grid gap-3", compact ? "lg:grid-cols-4" : "lg:grid-cols-2")}>
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Debt name"
          className={cn(compact && "border-0 bg-muted/30 shadow-none")}
        />
        <Select value={debtType} onValueChange={(value: (typeof STANDALONE_DEBT_TYPES)[number]) => setDebtType(value)}>
          <SelectTrigger className={cn("w-full", compact && "border-0 bg-muted/30 shadow-none")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STANDALONE_DEBT_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {DEBT_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={currentBalance}
          onChange={(event) => setCurrentBalance(event.target.value)}
          placeholder="Current balance"
          className={cn(compact && "border-0 bg-muted/30 shadow-none")}
        />
        {!compact && (
          <Input
            value={lenderName}
            onChange={(event) => setLenderName(event.target.value)}
            placeholder="Lender"
          />
        )}
      </div>

      <div className={cn("grid gap-3", compact ? "lg:grid-cols-[1fr_1fr_auto]" : "lg:grid-cols-[1fr_1fr]")}>
        <Input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={interestRate}
          onChange={(event) => setInterestRate(event.target.value)}
          placeholder="Interest rate %"
          className={cn(compact && "border-0 bg-muted/30 shadow-none")}
        />
        <Input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={minimumPayment}
          onChange={(event) => setMinimumPayment(event.target.value)}
          placeholder="Minimum payment"
          className={cn(compact && "border-0 bg-muted/30 shadow-none")}
        />
        {compact && (
          <Button type="button" onClick={handleSubmit} disabled={isSaving} className="rounded-full">
            {isSaving ? "Saving..." : "Add debt"}
          </Button>
        )}
      </div>

      {!compact && (
        <Button type="button" onClick={handleSubmit} disabled={isSaving}>
          {isSaving ? "Saving..." : "Add debt"}
        </Button>
      )}
    </div>
  )
}
