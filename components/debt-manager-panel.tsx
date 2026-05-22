"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { useCurrency } from "@/components/currency-provider"
import { DebtQuickAddForm } from "@/components/debt-quick-add-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { GoalComposerDefaults } from "@/components/chat/goal-wizard-card"
import type { DerivedGoal } from "@/lib/goals"
import type { DebtAccountSummary } from "@/lib/types/debts"

const DEBT_TYPE_LABELS: Record<string, string> = {
  mortgage_main_home: "Main-home mortgage",
  mortgage_other_property: "Other-property mortgage",
  property_secured_loan: "Property-backed loan",
  vehicle_finance: "Vehicle finance",
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

type EntryDraft = {
  entryType: "payment" | "interest" | "fee" | "drawdown" | "adjustment"
  amount: string
  entryDate: string
  notes: string
}

function createEntryDraft(): EntryDraft {
  return {
    entryType: "payment",
    amount: "",
    entryDate: new Date().toISOString().slice(0, 10),
    notes: "",
  }
}

export function DebtManagerPanel({
  debts,
  goals = [],
  isLoading = false,
  onCreatePayoffGoal,
  onRefresh,
}: {
  debts: DebtAccountSummary[]
  goals?: DerivedGoal[]
  isLoading?: boolean
  onCreatePayoffGoal?: (defaults: GoalComposerDefaults) => void
  onRefresh?: () => void
}) {
  const { formatCurrency } = useCurrency()
  const [activeDebtId, setActiveDebtId] = useState<number | null>(null)
  const [drafts, setDrafts] = useState<Record<number, EntryDraft>>({})
  const [isSubmitting, setIsSubmitting] = useState<number | null>(null)

  const debtTotal = useMemo(() => {
    return debts.reduce((sum, debt) => sum + Math.max(0, debt.current_balance), 0)
  }, [debts])

  const activeCount = debts.filter((debt) => debt.status === "active").length
  const linkedCount = debts.filter((debt) => debt.origin_kind !== "standalone").length
  const payoffGoalByDebtId = useMemo(() => {
    return new Map(
      goals
        .filter((goal) => goal.goalKind === "debt_payoff" && goal.linked_debt_account_id != null)
        .map((goal) => [goal.linked_debt_account_id as number, goal])
    )
  }, [goals])

  const getDraft = (debtId: number) => drafts[debtId] ?? createEntryDraft()

  const updateDraft = (debtId: number, patch: Partial<EntryDraft>) => {
    setDrafts((previous) => ({
      ...previous,
      [debtId]: {
        ...getDraft(debtId),
        ...patch,
      },
    }))
  }

  const submitEntry = async (debtId: number) => {
    const draft = getDraft(debtId)
    const parsedAmount = Number.parseFloat(draft.amount)

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error("Add a valid amount first.")
      return
    }

    setIsSubmitting(debtId)
    try {
      const response = await fetch(`/api/debts/${debtId}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryType: draft.entryType,
          amount: parsedAmount,
          entryDate: draft.entryDate,
          notes: draft.notes.trim() || null,
        }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        toast.error(payload?.error || "Failed to save debt entry")
        return
      }

      toast.success("Debt entry saved")
      setDrafts((previous) => ({ ...previous, [debtId]: createEntryDraft() }))
      onRefresh?.()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save debt entry"
      toast.error(message)
    } finally {
      setIsSubmitting(null)
    }
  }

  return (
    <Card className="@container/card h-full flex flex-col">
      <CardHeader className="gap-2">
        <div className="space-y-1">
          <CardTitle>Debt Manager</CardTitle>
          <CardDescription>
            Add standalone debts here. Pocket-linked mortgages and vehicle finance appear automatically.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <DebtQuickAddForm onCreated={onRefresh} />

          <div className="rounded-2xl border border-border/60 px-4 py-4">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Overview</div>
            <div className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">
              {formatCurrency(debtTotal)}
            </div>
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              <div>{activeCount} active debt{activeCount === 1 ? "" : "s"}</div>
              <div>{linkedCount} linked to pockets</div>
              {isLoading && <div>Updating…</div>}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {debts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 px-4 py-6 text-sm text-muted-foreground">
              No debts yet.
            </div>
          ) : (
            debts.map((debt) => {
              const isOpen = activeDebtId === debt.id
              const draft = getDraft(debt.id)
              const canCreatePayoffGoal = Math.max(0, debt.current_balance) > 0.009

              return (
                <div key={debt.id} className="rounded-2xl border border-border/60 px-4 py-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-medium">{debt.name}</h3>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                          {DEBT_TYPE_LABELS[debt.debt_type] ?? debt.debt_type}
                        </span>
                        {debt.origin_kind !== "standalone" && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                            Linked to pocket
                          </span>
                        )}
                        {payoffGoalByDebtId.get(debt.id) ? (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                            Goal: {payoffGoalByDebtId.get(debt.id)?.displayLabel}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {debt.lender_name && <span>{debt.lender_name}</span>}
                        {debt.minimum_payment != null && <span>Min {formatCurrency(debt.minimum_payment)}</span>}
                        {debt.last_entry_date && <span>Last entry {debt.last_entry_date}</span>}
                        {debt.interest_rate != null && <span>{debt.interest_rate}% APR</span>}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Current balance</div>
                        <div className="text-lg font-semibold tabular-nums">
                          {formatCurrency(Math.max(0, debt.current_balance))}
                        </div>
                      </div>
                      {!payoffGoalByDebtId.get(debt.id) && onCreatePayoffGoal ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!canCreatePayoffGoal}
                          onClick={() =>
                            onCreatePayoffGoal({
                              goalKind: "debt_payoff",
                              category: "Debt Payoff",
                              label: `${debt.name} Payoff`,
                              linkedDebtAccountId: debt.id,
                              startingAmount: Math.max(0, debt.current_balance),
                              targetBalance: 0,
                            })
                          }
                        >
                          {canCreatePayoffGoal ? "Create goal" : "At target"}
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant={isOpen ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => setActiveDebtId((previous) => (previous === debt.id ? null : debt.id))}
                      >
                        {isOpen ? "Close" : "Add entry"}
                      </Button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="mt-4 grid gap-3 border-t border-border/50 pt-4 lg:grid-cols-[160px_160px_1fr_minmax(0,1fr)_auto]">
                      <Select
                        value={draft.entryType}
                        onValueChange={(value: EntryDraft["entryType"]) => updateDraft(debt.id, { entryType: value })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="payment">Payment</SelectItem>
                          <SelectItem value="interest">Interest</SelectItem>
                          <SelectItem value="fee">Fee</SelectItem>
                          <SelectItem value="drawdown">New debt</SelectItem>
                          <SelectItem value="adjustment">Adjustment</SelectItem>
                        </SelectContent>
                      </Select>

                      <Input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        value={draft.amount}
                        onChange={(event) => updateDraft(debt.id, { amount: event.target.value })}
                        placeholder="Amount"
                      />

                      <Input
                        type="date"
                        value={draft.entryDate}
                        onChange={(event) => updateDraft(debt.id, { entryDate: event.target.value })}
                      />

                      <Input
                        value={draft.notes}
                        onChange={(event) => updateDraft(debt.id, { notes: event.target.value })}
                        placeholder="Note"
                      />

                      <Button
                        type="button"
                        onClick={() => submitEntry(debt.id)}
                        disabled={isSubmitting === debt.id}
                      >
                        {isSubmitting === debt.id ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}
