"use client"

import type { ReactNode } from "react"
import { useMemo, useState } from "react"
import { useCurrency } from "@/components/currency-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LazyChart } from "@/components/lazy-chart"
import { ChartGoalsProgress } from "@/components/savings/chart-goals-progress"
import { summarizeGoals, type DerivedGoal, type GoalContext } from "@/lib/goals"
import type { GoalRecord, GoalEntryType } from "@/lib/types/goals"
import { cn } from "@/lib/utils"
import { CheckCircle2, Plus, RotateCcw, Search, Sparkles, Target, Trash2 } from "lucide-react"
import type { GoalComposerDefaults } from "@/components/chat/goal-wizard-card"

type GoalEntryDraft = {
  sourceMode: "quick" | "transaction"
  entryType: GoalEntryType
  amount: string
  entryDate: string
  note: string
  transactionId: number | null
  categoryFilter: string
  query: string
}

type GoalSourceTransaction = {
  id: number
  date: string
  description: string
  amount: number
  category: string
}

type SavingsGoalsPanelProps = {
  goals: GoalRecord[]
  goalContext: GoalContext
  isLoading: boolean
  isComposerOpen: boolean
  composer?: ReactNode
  onAddGoal: (defaults?: GoalComposerDefaults) => void
  onDeleteGoal: (id: number) => void | Promise<void>
  onUpdateStatus: (id: number, status: "active" | "completed" | "archived") => void | Promise<void>
  onCreateEntry: (goalId: number, draft: GoalEntryDraft) => void | Promise<void>
  transactions: GoalSourceTransaction[]
  transactionsLoading: boolean
  transactionsError: string | null
}

const GOAL_TEMPLATES: GoalComposerDefaults[] = [
  { goalKind: "savings_target", category: "Emergency Fund", label: "Emergency Fund" },
  { goalKind: "savings_target", category: "Vacation", label: "Vacation" },
  { goalKind: "pocket_funding", category: "Property Reserve", label: "Home Reserve" },
  { goalKind: "net_worth_target", category: "Net Worth", label: "Net Worth Goal" },
]

const KIND_DOT_COLOR: Record<DerivedGoal["goalKind"], string> = {
  savings_target: "var(--chart-1)",
  pocket_funding: "var(--chart-2)",
  debt_payoff: "var(--destructive)",
  net_worth_target: "var(--chart-3)",
}

function createEntryDraft(): GoalEntryDraft {
  return {
    sourceMode: "quick",
    entryType: "contribution",
    amount: "",
    entryDate: new Date().toISOString().slice(0, 10),
    note: "",
    transactionId: null,
    categoryFilter: "all",
    query: "",
  }
}

function Pill({
  label,
  value,
  className,
  style,
}: {
  label: string
  value: string
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      className={cn(
        "rounded-full border border-border/40 px-3 py-1 text-[11px] tracking-tight",
        className
      )}
      style={style}
    >
      <span className="text-muted-foreground/80 uppercase tracking-wider text-[10px]">
        {label}
      </span>
      <span className="ml-1.5 font-medium tabular-nums">{value}</span>
    </div>
  )
}

function GoalEntryForm({
  goalId,
  draft,
  onChange,
  onSubmit,
  transactions,
  isLoadingTransactions,
  transactionsError,
}: {
  goalId: number
  draft: GoalEntryDraft
  onChange: (goalId: number, patch: Partial<GoalEntryDraft>) => void
  onSubmit: (goalId: number) => void
  transactions: GoalSourceTransaction[]
  isLoadingTransactions: boolean
  transactionsError: string | null
}) {
  const { formatCurrency } = useCurrency()
  const categoryOptions = useMemo(
    () => ["all", ...Array.from(new Set(transactions.map((tx) => tx.category))).sort((a, b) => a.localeCompare(b))],
    [transactions]
  )
  const filteredTransactions = useMemo(() => {
    const query = draft.query.trim().toLowerCase()
    return transactions
      .filter((tx) => (draft.categoryFilter === "all" ? true : tx.category === draft.categoryFilter))
      .filter((tx) =>
        query.length === 0
          ? true
          : tx.description.toLowerCase().includes(query) || tx.category.toLowerCase().includes(query)
      )
      .slice(0, 8)
  }, [draft.categoryFilter, draft.query, transactions])
  const selectedTransaction = useMemo(
    () => transactions.find((tx) => tx.id === draft.transactionId) ?? null,
    [draft.transactionId, transactions]
  )

  return (
    <div className="mt-3 space-y-3 border-t border-border/35 pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-full border border-border/40 bg-muted/15 p-0.5">
          {([
            { id: "quick", label: "Quick add" },
            { id: "transaction", label: "From transactions" },
          ] as const).map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(goalId, { sourceMode: option.id })}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                draft.sourceMode === option.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={draft.entryType}
            onChange={(event) => onChange(goalId, { entryType: event.target.value as GoalEntryType })}
            className="h-7 rounded-full border border-border/40 bg-background px-2.5 text-[11px] text-foreground"
          >
            <option value="contribution">Contribution</option>
            <option value="withdrawal">Withdrawal</option>
            <option value="adjustment">Adjustment</option>
          </select>
          <Button
            type="button"
            size="sm"
            className="h-7 rounded-full px-3 text-[11px]"
            onClick={() => onSubmit(goalId)}
            disabled={!draft.amount || (draft.sourceMode === "transaction" && !draft.transactionId)}
          >
            Save
          </Button>
        </div>
      </div>

      {draft.sourceMode === "transaction" ? (
        <div className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-[160px_minmax(0,1fr)]">
            <select
              value={draft.categoryFilter}
              onChange={(event) => onChange(goalId, { categoryFilter: event.target.value })}
              className="h-8 rounded-lg border border-border/40 bg-background px-2.5 text-[12px] text-foreground"
            >
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category === "all" ? "All categories" : category}
                </option>
              ))}
            </select>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-8 rounded-lg border-border/40 bg-background pl-8 text-[12px]"
                value={draft.query}
                onChange={(event) => onChange(goalId, { query: event.target.value })}
                placeholder="Filter transactions"
              />
            </div>
          </div>

          <div className="max-h-44 space-y-1 overflow-y-auto">
            {isLoadingTransactions ? (
              <div className="rounded-lg border border-border/35 px-3 py-4 text-center text-[12px] text-muted-foreground">
                Loading transactions…
              </div>
            ) : transactionsError ? (
              <div className="rounded-lg border border-border/35 px-3 py-4 text-center text-[12px] text-muted-foreground">
                {transactionsError}
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="rounded-lg border border-border/35 px-3 py-4 text-center text-[12px] text-muted-foreground">
                No transactions match this filter.
              </div>
            ) : (
              filteredTransactions.map((tx) => {
                const isSelected = draft.transactionId === tx.id
                return (
                  <button
                    key={tx.id}
                    type="button"
                    onClick={() =>
                      onChange(goalId, {
                        transactionId: tx.id,
                        amount: Math.abs(tx.amount).toFixed(2),
                        entryDate: tx.date.slice(0, 10),
                        note: tx.description,
                        entryType: tx.amount >= 0 ? "contribution" : "withdrawal",
                      })
                    }
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left transition-colors",
                      isSelected
                        ? "bg-muted/25 text-foreground"
                        : "hover:bg-muted/15 text-foreground"
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-medium">{tx.description}</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {tx.category} • {new Date(`${tx.date}T00:00:00`).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <p className="ml-3 text-[12px] font-medium tabular-nums">{formatCurrency(Math.abs(tx.amount))}</p>
                  </button>
                )
              })
            )}
          </div>

          {selectedTransaction ? (
            <p className="text-[11px] text-muted-foreground">
              Selected <span className="font-medium text-foreground">{selectedTransaction.description}</span> from{" "}
              {selectedTransaction.category}.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-[120px_140px_minmax(0,1fr)]">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={draft.amount}
            onChange={(event) => onChange(goalId, { amount: event.target.value, transactionId: null })}
            placeholder="Amount"
            className="h-8 rounded-lg border-border/40 bg-background text-[12px]"
          />
          <Input
            type="date"
            value={draft.entryDate}
            onChange={(event) => onChange(goalId, { entryDate: event.target.value })}
            className="h-8 rounded-lg border-border/40 bg-background text-[12px]"
          />
          <Input
            value={draft.note}
            onChange={(event) => onChange(goalId, { note: event.target.value, transactionId: null })}
            placeholder="Optional note"
            className="h-8 rounded-lg border-border/40 bg-background text-[12px]"
          />
        </div>
      )}
    </div>
  )
}

function GoalSection({
  title,
  description,
  goals,
  openEntryGoalId,
  drafts,
  onToggleEntry,
  onChangeDraft,
  onSubmitEntry,
  onDeleteGoal,
  onUpdateStatus,
  transactions,
  isLoadingTransactions,
  transactionsError,
}: {
  title: string
  description: string
  goals: DerivedGoal[]
  openEntryGoalId: number | null
  drafts: Record<number, GoalEntryDraft>
  onToggleEntry: (goalId: number | null) => void
  onChangeDraft: (goalId: number, patch: Partial<GoalEntryDraft>) => void
  onSubmitEntry: (goalId: number) => void
  onDeleteGoal: (id: number) => void | Promise<void>
  onUpdateStatus: (id: number, status: "active" | "completed" | "archived") => void | Promise<void>
  transactions: GoalSourceTransaction[]
  isLoadingTransactions: boolean
  transactionsError: string | null
}) {
  if (goals.length === 0) return null

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>
        </div>
        <span className="text-[11px] text-muted-foreground/70 tabular-nums">{goals.length}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {goals.map((goal) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            isEntryOpen={openEntryGoalId === goal.id}
            draft={drafts[goal.id] ?? createEntryDraft()}
            onToggleEntry={onToggleEntry}
            onChangeDraft={onChangeDraft}
            onSubmitEntry={onSubmitEntry}
            onDeleteGoal={onDeleteGoal}
            onUpdateStatus={onUpdateStatus}
            transactions={transactions}
            isLoadingTransactions={isLoadingTransactions}
            transactionsError={transactionsError}
          />
        ))}
      </div>
    </section>
  )
}

function healthColors(health: DerivedGoal["health"]): { bar: string; text: string } {
  switch (health) {
    case "on_track":
      return { bar: "var(--chart-1)", text: "var(--chart-1)" }
    case "tight":
      return { bar: "var(--primary)", text: "var(--primary)" }
    case "due_soon":
      return { bar: "var(--primary)", text: "var(--primary)" }
    case "behind":
      return { bar: "var(--destructive)", text: "var(--destructive)" }
    case "completed":
      return { bar: "var(--muted-foreground)", text: "var(--muted-foreground)" }
  }
}

function GoalCard({
  goal,
  isEntryOpen,
  draft,
  onToggleEntry,
  onChangeDraft,
  onSubmitEntry,
  onDeleteGoal,
  onUpdateStatus,
  transactions,
  isLoadingTransactions,
  transactionsError,
}: {
  goal: DerivedGoal
  isEntryOpen: boolean
  draft: GoalEntryDraft
  onToggleEntry: (goalId: number | null) => void
  onChangeDraft: (goalId: number, patch: Partial<GoalEntryDraft>) => void
  onSubmitEntry: (goalId: number) => void
  onDeleteGoal: (id: number) => void | Promise<void>
  onUpdateStatus: (id: number, status: "active" | "completed" | "archived") => void | Promise<void>
  transactions: GoalSourceTransaction[]
  isLoadingTransactions: boolean
  transactionsError: string | null
}) {
  const { formatCurrency } = useCurrency()
  const colors = healthColors(goal.health)
  const monthly = Number.parseFloat(goal.monthly_allocation) || 0
  const deadlineText = new Date(`${goal.deadline}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  })
  const targetValue =
    goal.goalKind === "debt_payoff" ? goal.targetBalance : goal.targetAmount

  return (
    <div className="rounded-xl border border-border/40 bg-card/60 px-4 py-2.5 flex flex-col gap-2 hover:border-border/70 transition-colors">
      {/* Header: dot + label + kind on left, % + health on right */}
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 min-w-0">
          <span
            aria-hidden="true"
            className="inline-block size-1.5 rounded-full shrink-0"
            style={{ backgroundColor: KIND_DOT_COLOR[goal.goalKind] }}
          />
          <span className="text-[13px] font-medium tracking-tight truncate text-foreground">
            {goal.displayLabel}
          </span>
          <span className="text-[10px] text-muted-foreground/70 truncate hidden sm:inline">
            {goal.kindLabel}
            {goal.linkedSummary ? ` · ${goal.linkedSummary}` : ""}
          </span>
        </span>

        <span className="flex items-center gap-2 shrink-0">
          <span className="text-[12px] tabular-nums text-foreground/80">
            {Math.round(goal.progressPercent)}%
          </span>
          <Badge
            variant="outline"
            className="border-border/40 bg-transparent text-[10px] font-medium"
            style={{ color: colors.text, borderColor: "color-mix(in oklch, currentColor 40%, transparent)" }}
          >
            {goal.healthLabel}
          </Badge>
        </span>
      </div>

      {/* Hairline progress bar */}
      <div className="relative h-[3px] w-full overflow-hidden rounded-full bg-muted/50">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.min(100, goal.progressPercent)}%`,
            backgroundColor: colors.bar,
          }}
        />
      </div>

      {/* Compact meta line */}
      <div className="flex items-center justify-between gap-3 text-[11px] tabular-nums text-muted-foreground/80">
        <span className="truncate">
          {formatCurrency(goal.currentValue)}
          <span className="text-muted-foreground/50"> / </span>
          {formatCurrency(targetValue)}
          <span className="text-muted-foreground/40 mx-1.5">·</span>
          <span className="text-muted-foreground/70">Due {deadlineText}</span>
          {monthly > 0 ? (
            <>
              <span className="text-muted-foreground/40 mx-1.5">·</span>
              <span className="text-muted-foreground/70">{formatCurrency(monthly)}/mo</span>
            </>
          ) : null}
        </span>

        <span className="flex items-center gap-1 shrink-0">
          {goal.canAddEntries && (
            <button
              type="button"
              onClick={() => onToggleEntry(isEntryOpen ? null : goal.id)}
              className={cn(
                "flex h-6 items-center gap-1 rounded-full border px-2 text-[10px] transition-colors",
                isEntryOpen
                  ? "border-border/60 bg-muted/40 text-foreground"
                  : "border-border/30 text-muted-foreground hover:text-foreground hover:border-border/60"
              )}
            >
              <Plus className="size-2.5" />
              {isEntryOpen ? "Close" : "Entry"}
            </button>
          )}
          {goal.section === "completed" ? (
            <button
              type="button"
              onClick={() => onUpdateStatus(goal.id, "active")}
              title="Reopen goal"
              className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              <RotateCcw className="size-3" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onUpdateStatus(goal.id, "completed")}
              title="Mark complete"
              className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              <CheckCircle2 className="size-3" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onDeleteGoal(goal.id)}
            title="Delete goal"
            className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-muted/40 transition-colors"
          >
            <Trash2 className="size-3" />
          </button>
        </span>
      </div>

      {/* Inline entry form */}
      {goal.canAddEntries && isEntryOpen ? (
        <GoalEntryForm
          goalId={goal.id}
          draft={draft}
          onChange={onChangeDraft}
          onSubmit={onSubmitEntry}
          transactions={transactions}
          isLoadingTransactions={isLoadingTransactions}
          transactionsError={transactionsError}
        />
      ) : null}
    </div>
  )
}

export function SavingsGoalsPanel({
  goals,
  goalContext,
  isLoading,
  isComposerOpen,
  composer,
  onAddGoal,
  onDeleteGoal,
  onUpdateStatus,
  onCreateEntry,
  transactions,
  transactionsLoading,
  transactionsError,
}: SavingsGoalsPanelProps) {
  const { formatCurrency } = useCurrency()
  const [openEntryGoalId, setOpenEntryGoalId] = useState<number | null>(null)
  const [drafts, setDrafts] = useState<Record<number, GoalEntryDraft>>({})

  const {
    derived,
    activeGoals,
    completedGoals,
    dueSoonGoals,
    onTrackGoals,
    totalMonthlyPlan,
    totalCurrentValue,
    totalTarget,
    nextGoalToFund,
  } = useMemo(() => summarizeGoals(goals, goalContext), [goalContext, goals])

  const inProgressGoals = useMemo(
    () =>
      derived
        .filter((goal) => goal.section === "inProgress")
        .sort((a, b) => b.rankingScore - a.rankingScore),
    [derived]
  )

  const prioritizedDueSoon = useMemo(
    () => [...dueSoonGoals].sort((a, b) => b.rankingScore - a.rankingScore),
    [dueSoonGoals]
  )

  const prioritizedCompleted = useMemo(
    () => [...completedGoals].sort((a, b) => b.id - a.id),
    [completedGoals]
  )

  const updateDraft = (goalId: number, patch: Partial<GoalEntryDraft>) => {
    setDrafts((previous) => ({
      ...previous,
      [goalId]: {
        ...(previous[goalId] ?? createEntryDraft()),
        ...patch,
      },
    }))
  }

  const submitEntry = (goalId: number) => {
    void onCreateEntry(goalId, drafts[goalId] ?? createEntryDraft())
    setDrafts((previous) => ({
      ...previous,
      [goalId]: createEntryDraft(),
    }))
    setOpenEntryGoalId(null)
  }

  const onPaceCount = onTrackGoals.length
  const onPaceTotal = activeGoals.length
  const onPaceColor =
    onPaceTotal === 0
      ? "var(--muted-foreground)"
      : onPaceCount === onPaceTotal
        ? "var(--chart-1)"
        : onPaceCount >= onPaceTotal / 2
          ? "var(--primary)"
          : "var(--destructive)"

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground/72">Goals</p>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Plan what matters next</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Savings, payoff, net worth, and pocket reserves all live in one place and stay tied to the rest of the app.
          </p>
        </div>
        <Button size="sm" onClick={() => onAddGoal()} className="h-9 rounded-full px-4">
          <Plus className="mr-1.5 h-4 w-4" />
          Add Goal
        </Button>
      </div>

      {isComposerOpen && composer ? composer : null}

      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-border/40 bg-card/60 px-6 py-12 text-sm text-muted-foreground">
          <div className="mr-3 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Loading goals…
        </div>
      ) : goals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-muted/15 px-6 py-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <h3 className="mt-5 text-lg font-semibold text-foreground">Start with one clear target</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            The integrated version works best once there is at least one goal to rank, track, and compare against the rest of your app data.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {GOAL_TEMPLATES.map((template) => (
              <button
                key={`${template.goalKind}-${template.label}`}
                type="button"
                onClick={() => onAddGoal(template)}
                className="rounded-full border border-border/60 bg-card/70 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-border/90 hover:bg-card"
              >
                {template.label}
              </button>
            ))}
          </div>
          <Button onClick={() => onAddGoal()} className="mt-6 h-10 rounded-full px-4">
            <Plus className="mr-1.5 h-4 w-4" />
            Add Your First Goal
          </Button>
        </div>
      ) : (
        <>
          {/* Summary pills */}
          <div className="flex flex-wrap gap-3">
            <Pill
              label="Active"
              value={`${activeGoals.length}${prioritizedDueSoon.length > 0 ? ` · ${prioritizedDueSoon.length} due soon` : ""}`}
            />
            <Pill label="Total target" value={formatCurrency(totalTarget)} />
            <Pill label="Saved so far" value={formatCurrency(totalCurrentValue)} />
            <Pill
              label="On pace"
              value={onPaceTotal > 0 ? `${onPaceCount}/${onPaceTotal}` : "—"}
              style={{
                color: onPaceColor,
                borderColor: `color-mix(in oklch, ${onPaceColor} 40%, transparent)`,
              }}
            />
            {totalMonthlyPlan > 0 && (
              <Pill label="Monthly plan" value={formatCurrency(totalMonthlyPlan)} />
            )}
          </div>

          {/* Progress chart */}
          {activeGoals.length > 0 && (
            <LazyChart title="Goal progress" height={220}>
              <ChartGoalsProgress goals={activeGoals} />
            </LazyChart>
          )}

          {/* Compact Focus next callout */}
          {nextGoalToFund ? (
            <div
              className="flex flex-col gap-2 rounded-xl border border-border/40 bg-card/60 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Target className="size-3.5 text-primary shrink-0" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 shrink-0">
                  Focus next
                </span>
                <span className="text-[13px] font-medium tracking-tight truncate text-foreground">
                  {nextGoalToFund.displayLabel}
                </span>
                <span className="text-[11px] text-muted-foreground/70 truncate hidden sm:inline">
                  · {nextGoalToFund.nextBestAction}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] tabular-nums shrink-0">
                <span className="text-muted-foreground/80">
                  <span className="text-muted-foreground/60 mr-1">Remaining</span>
                  <span className="font-medium text-foreground">
                    {formatCurrency(nextGoalToFund.remainingAmount)}
                  </span>
                </span>
                <span className="text-muted-foreground/80">
                  <span className="text-muted-foreground/60 mr-1">Needed</span>
                  <span className="font-medium text-foreground">
                    {formatCurrency(nextGoalToFund.neededPerMonth)}/mo
                  </span>
                </span>
              </div>
            </div>
          ) : null}

          {/* Sections */}
          <GoalSection
            title="In Progress"
            description="Goals that still have breathing room."
            goals={inProgressGoals}
            openEntryGoalId={openEntryGoalId}
            drafts={drafts}
            onToggleEntry={setOpenEntryGoalId}
            onChangeDraft={updateDraft}
            onSubmitEntry={submitEntry}
            onDeleteGoal={onDeleteGoal}
            onUpdateStatus={onUpdateStatus}
            transactions={transactions}
            isLoadingTransactions={transactionsLoading}
            transactionsError={transactionsError}
          />

          <GoalSection
            title="Due Soon"
            description="The goals that deserve extra attention first."
            goals={prioritizedDueSoon}
            openEntryGoalId={openEntryGoalId}
            drafts={drafts}
            onToggleEntry={setOpenEntryGoalId}
            onChangeDraft={updateDraft}
            onSubmitEntry={submitEntry}
            onDeleteGoal={onDeleteGoal}
            onUpdateStatus={onUpdateStatus}
            transactions={transactions}
            isLoadingTransactions={transactionsLoading}
            transactionsError={transactionsError}
          />

          <GoalSection
            title="Completed"
            description="Finished targets that still deserve history."
            goals={prioritizedCompleted}
            openEntryGoalId={openEntryGoalId}
            drafts={drafts}
            onToggleEntry={setOpenEntryGoalId}
            onChangeDraft={updateDraft}
            onSubmitEntry={submitEntry}
            onDeleteGoal={onDeleteGoal}
            onUpdateStatus={onUpdateStatus}
            transactions={transactions}
            isLoadingTransactions={transactionsLoading}
            transactionsError={transactionsError}
          />
        </>
      )}
    </div>
  )
}
