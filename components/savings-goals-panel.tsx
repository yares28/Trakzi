"use client"

import type { ReactNode } from "react"
import { useMemo, useState } from "react"
import { useCurrency } from "@/components/currency-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { summarizeGoals, type DerivedGoal, type GoalContext } from "@/lib/goals"
import type { GoalRecord, GoalEntryType } from "@/lib/types/goals"
import { cn } from "@/lib/utils"
import { CalendarDays, CheckCircle2, Plus, RotateCcw, Search, Sparkles, Trash2 } from "lucide-react"
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

function SummaryMetric({
  label,
  value,
  helper,
}: {
  label: string
  value: string
  helper: string
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium text-muted-foreground/72">{label}</p>
      <p className="text-base font-semibold tracking-tight text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground">{helper}</p>
    </div>
  )
}

function MetricCell({
  label,
  value,
  helper,
}: {
  label: string
  value: string
  helper: string
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground/65">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{helper}</p>
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
    <div className="mt-4 space-y-3 border-t border-border/35 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-border/40 bg-muted/15 p-1">
          {([
            { id: "quick", label: "Quick add" },
            { id: "transaction", label: "From transactions" },
          ] as const).map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(goalId, { sourceMode: option.id })}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
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
            className="h-9 rounded-full border border-border/40 bg-background px-3 text-xs text-foreground"
          >
            <option value="contribution">Contribution</option>
            <option value="withdrawal">Withdrawal</option>
            <option value="adjustment">Adjustment</option>
          </select>
          <Button
            type="button"
            size="sm"
            className="rounded-full"
            onClick={() => onSubmit(goalId)}
            disabled={!draft.amount || (draft.sourceMode === "transaction" && !draft.transactionId)}
          >
            Save
          </Button>
        </div>
      </div>

      {draft.sourceMode === "transaction" ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)]">
            <select
              value={draft.categoryFilter}
              onChange={(event) => onChange(goalId, { categoryFilter: event.target.value })}
              className="h-10 rounded-xl border border-border/40 bg-background px-3 text-sm text-foreground"
            >
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category === "all" ? "All categories" : category}
                </option>
              ))}
            </select>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-10 rounded-xl border-border/40 bg-background pl-9"
                value={draft.query}
                onChange={(event) => onChange(goalId, { query: event.target.value })}
                placeholder="Filter transactions"
              />
            </div>
          </div>

          <div className="max-h-52 space-y-1 overflow-y-auto">
            {isLoadingTransactions ? (
              <div className="rounded-xl border border-border/35 px-3 py-6 text-center text-sm text-muted-foreground">
                Loading transactions…
              </div>
            ) : transactionsError ? (
              <div className="rounded-xl border border-border/35 px-3 py-6 text-center text-sm text-muted-foreground">
                {transactionsError}
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="rounded-xl border border-border/35 px-3 py-6 text-center text-sm text-muted-foreground">
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
                      "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors",
                      isSelected
                        ? "bg-muted/25 text-foreground"
                        : "hover:bg-muted/15 text-foreground"
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{tx.description}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {tx.category} • {new Date(`${tx.date}T00:00:00`).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <p className="ml-3 text-sm font-medium">{formatCurrency(Math.abs(tx.amount))}</p>
                  </button>
                )
              })
            )}
          </div>

          {selectedTransaction ? (
            <p className="text-xs text-muted-foreground">
              Selected <span className="font-medium text-foreground">{selectedTransaction.description}</span> from{" "}
              {selectedTransaction.category}.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-[140px_160px_minmax(0,1fr)]">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={draft.amount}
            onChange={(event) => onChange(goalId, { amount: event.target.value, transactionId: null })}
            placeholder="Amount"
            className="h-10 rounded-xl border-border/40 bg-background"
          />
          <Input
            type="date"
            value={draft.entryDate}
            onChange={(event) => onChange(goalId, { entryDate: event.target.value })}
            className="h-10 rounded-xl border-border/40 bg-background"
          />
          <Input
            value={draft.note}
            onChange={(event) => onChange(goalId, { note: event.target.value, transactionId: null })}
            placeholder="Optional note"
            className="h-10 rounded-xl border-border/40 bg-background"
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
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        <span className="text-xs text-muted-foreground">{goals.length}</span>
      </div>
      <div className="space-y-3">
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

  const statusClasses: Record<DerivedGoal["health"], string> = {
    on_track: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    tight: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300",
    behind: "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300",
    due_soon: "border-orange-500/20 bg-orange-500/10 text-orange-600 dark:text-orange-300",
    completed: "border-border/60 bg-muted/40 text-muted-foreground",
  }

  return (
    <div className="rounded-[28px] border border-border/60 bg-card/80 px-4 py-4 shadow-sm transition-colors hover:border-border/90 sm:px-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="truncate text-sm font-semibold text-foreground">{goal.displayLabel}</h4>
            <Badge variant="outline" className="border-border/60 bg-muted/25 text-[10px] font-medium text-muted-foreground">
              {goal.kindLabel}
            </Badge>
            {goal.linkedSummary ? (
              <Badge variant="outline" className="border-border/60 bg-muted/25 text-[10px] font-medium text-muted-foreground">
                {goal.linkedSummary}
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{goal.nextBestAction}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold tracking-tight text-foreground">
            {Math.round(goal.progressPercent)}%
          </p>
          <Badge variant="outline" className={cn("mt-1 border text-[10px] font-medium", statusClasses[goal.health])}>
            {goal.healthLabel}
          </Badge>
        </div>
      </div>

      <div className="mt-4">
        <Progress value={goal.progressPercent} className="h-1.5 bg-primary/12" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <MetricCell
          label={goal.currentValueLabel}
          value={formatCurrency(goal.currentValue)}
          helper={goal.goalKind === "debt_payoff" ? "Current linked debt balance" : "Live current value"}
        />
        <MetricCell
          label={goal.targetValueLabel}
          value={goal.goalKind === "debt_payoff" ? formatCurrency(goal.targetBalance) : formatCurrency(goal.targetAmount)}
          helper={goal.goalKind === "debt_payoff" ? "Balance to reach" : "Goal target"}
        />
        <MetricCell
          label="Monthly plan"
          value={formatCurrency(Number.parseFloat(goal.monthly_allocation) || 0)}
          helper={goal.goalKind === "debt_payoff" ? "Planned payoff pace" : "Planned funding pace"}
        />
        <MetricCell
          label="Deadline"
          value={new Date(`${goal.deadline}T00:00:00`).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
          helper={goal.section === "completed" ? "Completed goal" : `${goal.monthsLeft} month${goal.monthsLeft === 1 ? "" : "s"} left`}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          {goal.projectedCompletionDate
            ? `Projected finish ${new Date(`${goal.projectedCompletionDate}T00:00:00`).toLocaleDateString(undefined, {
              month: "short",
              year: "numeric",
            })}`
            : "Projection updates once a monthly plan exists"}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {goal.canAddEntries && (
            <Button
              size="sm"
              variant={isEntryOpen ? "secondary" : "outline"}
              className="h-8 rounded-full px-3 text-xs"
              onClick={() => onToggleEntry(isEntryOpen ? null : goal.id)}
            >
              {isEntryOpen ? "Close entry" : "Add entry"}
            </Button>
          )}
          {goal.section === "completed" ? (
            <Button
              size="sm"
              variant="outline"
              className="h-8 rounded-full px-3 text-xs"
              onClick={() => onUpdateStatus(goal.id, "active")}
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reopen
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-8 rounded-full px-3 text-xs"
              onClick={() => onUpdateStatus(goal.id, "completed")}
            >
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
              Mark complete
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive"
            onClick={() => onDeleteGoal(goal.id)}
            title="Delete goal"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

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

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground/72">Goals</p>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Plan what matters next</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Savings, payoff, net worth, and pocket reserves all live in one place and stay tied to the rest of the app.
          </p>
        </div>
        <Button size="sm" onClick={() => onAddGoal()} className="h-10 rounded-full px-4">
          <Plus className="mr-1.5 h-4 w-4" />
          Add Goal
        </Button>
      </div>

      {isComposerOpen && composer ? composer : null}

      {isLoading ? (
        <div className="flex items-center justify-center rounded-[28px] border border-border/50 bg-card/60 px-6 py-16 text-sm text-muted-foreground">
          <div className="mr-3 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Loading goals…
        </div>
      ) : goals.length === 0 ? (
        <div className="rounded-[32px] border border-dashed border-border/60 bg-muted/15 px-6 py-12 text-center">
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
          <div className="grid gap-4 rounded-[28px] border border-border/40 bg-background/60 px-4 py-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryMetric
              label="Active goals"
              value={`${activeGoals.length}`}
              helper={`${prioritizedDueSoon.length} due soon`}
            />
            <SummaryMetric
              label="Total target"
              value={formatCurrency(totalTarget)}
              helper="Across active goals"
            />
            <SummaryMetric
              label="Current progress"
              value={formatCurrency(totalCurrentValue)}
              helper="Current value across active goals"
            />
            <SummaryMetric
              label="On pace"
              value={activeGoals.length > 0 ? `${onTrackGoals.length}/${activeGoals.length}` : "0"}
              helper={`${formatCurrency(totalMonthlyPlan)} monthly plan`}
            />
          </div>

          {nextGoalToFund ? (
            <div className="rounded-[28px] border border-border/40 bg-background/60 px-5 py-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div className="space-y-1.5">
                  <p className="text-[11px] font-medium text-muted-foreground/72">Focus next</p>
                  <div>
                    <h3 className="text-base font-semibold tracking-tight text-foreground">{nextGoalToFund.displayLabel}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {nextGoalToFund.nextBestAction}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm sm:min-w-[320px]">
                  <MetricCell
                    label="Remaining"
                    value={formatCurrency(nextGoalToFund.remainingAmount)}
                    helper="Still left to close"
                  />
                  <MetricCell
                    label="Needed"
                    value={formatCurrency(nextGoalToFund.neededPerMonth)}
                    helper="To stay on schedule"
                  />
                </div>
              </div>
            </div>
          ) : null}

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
