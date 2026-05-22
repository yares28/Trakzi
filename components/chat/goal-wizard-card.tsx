"use client"

import { useEffect, useMemo, useState } from "react"
import { addMonths, format, parseISO } from "date-fns"
import {
  CalendarIcon,
  CheckCircle2,
  CreditCard,
  Info,
  Landmark,
  Loader2,
  PiggyBank,
  Target,
  Wallet,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { useCurrency } from "@/components/currency-provider"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { DebtAccountSummary, DebtType } from "@/lib/types/debts"
import type { GoalKind, GoalPocketType } from "@/lib/types/goals"
import type { PocketsBundleResponse } from "@/lib/types/pockets"

const GOAL_KIND_OPTIONS: Array<{
  id: GoalKind
  label: string
  icon: typeof PiggyBank
}> = [
  { id: "savings_target", label: "Savings", icon: PiggyBank },
  { id: "debt_payoff", label: "Debt payoff", icon: CreditCard },
  { id: "net_worth_target", label: "Net worth", icon: Wallet },
  { id: "pocket_funding", label: "Pocket fund", icon: Landmark },
]

const NUMERIC_FIELDS = ["targetAmount", "targetBalance", "startingAmount", "monthlyAllocation"] as const
type NumericDraftField = (typeof NUMERIC_FIELDS)[number]

export type GoalComposerDefaults = {
  goalKind?: GoalKind
  category?: string | null
  label?: string | null
  linkedDebtAccountId?: number | null
  linkedPocketId?: number | null
  linkedPocketType?: GoalPocketType | null
  targetAmount?: number | null
  targetBalance?: number | null
  startingAmount?: number | null
  deadline?: string | null
  monthlyAllocation?: number | null
  notes?: string | null
}

export type GoalFinancialProfile = {
  monthlyIncome: number
  monthlyExpenses: number
  monthlyNet: number
  savingsRate: number
  periodDays: number
}

type PocketOption = {
  id: number
  type: GoalPocketType
  label: string
}

type SuggestionMode = "moderate" | "aggressive"

type GoalDraft = {
  label: string
  category: string
  targetAmount: string
  targetBalance: string
  startingAmount: string
  deadline: string
  monthlyAllocation: string
  monthlyDirty: boolean
  suggestionMode: SuggestionMode
  notes: string
  linkedDebtAccountId: number | null
  linkedPocketId: number | null
  linkedPocketType: GoalPocketType | null
  syncedDebtAccountId: number | null
  syncedPocketKey: string | null
}

type GoalDraftMap = Record<GoalKind, GoalDraft>

type FinanceSuggestion = {
  suggestedMonthly: number
  suggestedMonths: number
  suggestedDeadline: string
  targetPercentOfIncome: number
  actualPercentOfIncome: number
  monthlyIncome: number
  monthlyExpenses: number
  monthlyNet: number
  savingsRate: number
  minimumPayment: number
  strategyLabel: string
  title: string
  actionLabel: string
  amountLabel: string
  summaryLabel: string
  preferredMonths: number
  cappedByCashFlow: boolean
  usedMinimumFloor: boolean
  stretchedBeyondTargetWindow: boolean
  summary: string
  detail: string
}

function defaultDeadline() {
  const next = new Date()
  next.setMonth(next.getMonth() + 6)
  return format(next, "yyyy-MM-dd")
}

function parseDateValue(value: string) {
  if (!value) return undefined
  const parsed = parseISO(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

function toInputAmount(value: number | null | undefined, options?: { showZero?: boolean }) {
  if (value == null || !Number.isFinite(value)) return ""
  if (!options?.showZero && Math.abs(value) < 0.0000001) return ""
  return value.toFixed(2)
}

function normalizeAmountInput(value: string) {
  if (!value.trim()) return ""
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed.toFixed(2) : value
}

function parseAmount(value: string) {
  return Number.parseFloat(value) || 0
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function formatDebtLabel(debt: DebtAccountSummary) {
  return `${debt.name} • ${Math.max(0, debt.current_balance).toFixed(0)}`
}

function getPocketKey(type: GoalPocketType | null, id: number | null) {
  return type && id != null ? `${type}:${id}` : null
}

function getDebtRecommendationProfile(debtType: DebtType, savingsRate: number, mode: SuggestionMode) {
  const savingsBoost =
    savingsRate >= 25 ? 0.02 : savingsRate >= 20 ? 0.01 : savingsRate >= 10 ? 0.005 : 0

  if (["credit_card", "revolving_credit", "overdraft", "buy_now_pay_later", "quick_loan"].includes(debtType)) {
    return {
      debtStrategyLabel: mode === "aggressive" ? "Aggressive payoff" : "Urgent payoff",
      percentOfIncome: clamp((mode === "aggressive" ? 0.075 : 0.05) + savingsBoost, 0.05, 0.1),
      surplusShare: mode === "aggressive" ? (savingsRate >= 20 ? 0.9 : 0.75) : (savingsRate >= 20 ? 0.8 : savingsRate >= 10 ? 0.65 : 0.45),
      preferredMonths: mode === "aggressive" ? 12 : 18,
    }
  }

  if (["student_loan", "personal_loan", "consumer_loan", "credit_line", "medical_debt", "tax_debt", "family_private_loan", "business_loan_personal_liability", "other"].includes(debtType)) {
    return {
      debtStrategyLabel: mode === "aggressive" ? "Faster payoff" : "Balanced payoff",
      percentOfIncome: clamp((mode === "aggressive" ? 0.06 : 0.04) + Math.min(savingsBoost, 0.02), 0.04, 0.08),
      surplusShare: mode === "aggressive" ? (savingsRate >= 20 ? 0.8 : 0.6) : (savingsRate >= 20 ? 0.65 : savingsRate >= 10 ? 0.5 : 0.35),
      preferredMonths: mode === "aggressive" ? 18 : 24,
    }
  }

  if (debtType === "vehicle_finance") {
    return {
      debtStrategyLabel: mode === "aggressive" ? "Accelerated payoff" : "Steady payoff",
      percentOfIncome: clamp((mode === "aggressive" ? 0.04 : 0.025) + Math.min(savingsBoost, 0.015), 0.025, 0.055),
      surplusShare: mode === "aggressive" ? (savingsRate >= 20 ? 0.7 : 0.55) : (savingsRate >= 20 ? 0.6 : savingsRate >= 10 ? 0.45 : 0.3),
      preferredMonths: mode === "aggressive" ? 18 : 30,
    }
  }

  return {
    debtStrategyLabel: mode === "aggressive" ? "Push payoff" : "Long-term payoff",
    percentOfIncome: clamp((mode === "aggressive" ? 0.03 : 0.02) + Math.min(savingsBoost, 0.015), 0.02, 0.05),
    surplusShare: mode === "aggressive" ? (savingsRate >= 20 ? 0.6 : 0.45) : (savingsRate >= 20 ? 0.5 : savingsRate >= 10 ? 0.35 : 0.25),
    preferredMonths: mode === "aggressive" ? 24 : 48,
  }
}

function getGoalRecommendationProfile(
  goalKind: GoalKind,
  savingsRate: number,
  linkedPocketType: GoalPocketType | null,
  mode: SuggestionMode,
  debtType?: DebtType
) {
  if (goalKind === "debt_payoff" && debtType) {
    const profile = getDebtRecommendationProfile(debtType, savingsRate, mode)
    return {
      strategyLabel: profile.debtStrategyLabel,
      percentOfIncome: profile.percentOfIncome,
      surplusShare: profile.surplusShare,
      preferredMonths: profile.preferredMonths,
      title: "Suggested from your finances",
      actionLabel: "Apply amount + date",
      amountLabel: "Suggested payment",
      summaryLabel: "Why this amount",
    }
  }

  if (goalKind === "net_worth_target") {
    return {
      strategyLabel: mode === "aggressive" ? "Fast-track build" : (savingsRate >= 20 ? "Momentum build" : "Base-building plan"),
      percentOfIncome: clamp(mode === "aggressive" ? (savingsRate >= 20 ? 0.08 : 0.06) : (savingsRate >= 20 ? 0.05 : savingsRate >= 10 ? 0.04 : 0.03), 0.03, 0.09),
      surplusShare: mode === "aggressive" ? (savingsRate >= 20 ? 0.75 : 0.55) : (savingsRate >= 20 ? 0.6 : savingsRate >= 10 ? 0.45 : 0.3),
      preferredMonths: mode === "aggressive" ? 18 : 30,
      title: "Suggested from your finances",
      actionLabel: "Apply amount + date",
      amountLabel: "Suggested monthly gain",
      summaryLabel: "Why this amount",
    }
  }

  if (goalKind === "pocket_funding") {
    const isProperty = linkedPocketType === "property"
    return {
      strategyLabel: mode === "aggressive" ? (isProperty ? "Priority reserve" : "Faster reserve") : (isProperty ? "Property reserve" : "Vehicle reserve"),
      percentOfIncome: clamp(mode === "aggressive" ? (isProperty ? 0.055 : 0.045) : (isProperty ? 0.03 : 0.025), 0.02, 0.06),
      surplusShare: mode === "aggressive" ? (isProperty ? 0.65 : 0.5) : (isProperty ? 0.45 : 0.35),
      preferredMonths: mode === "aggressive" ? (isProperty ? 18 : 12) : (isProperty ? 30 : 20),
      title: "Suggested from your finances",
      actionLabel: "Apply amount + date",
      amountLabel: "Suggested monthly reserve",
      summaryLabel: "Why this amount",
    }
  }

  return {
    strategyLabel: mode === "aggressive" ? "Fast-track saving" : (savingsRate >= 20 ? "Focused saving" : "Starter saving"),
    percentOfIncome: clamp(mode === "aggressive" ? (savingsRate >= 20 ? 0.08 : 0.06) : (savingsRate >= 20 ? 0.05 : savingsRate >= 10 ? 0.04 : 0.03), 0.03, 0.09),
    surplusShare: mode === "aggressive" ? (savingsRate >= 20 ? 0.75 : 0.55) : (savingsRate >= 20 ? 0.55 : savingsRate >= 10 ? 0.45 : 0.3),
    preferredMonths: mode === "aggressive" ? 12 : 24,
    title: "Suggested from your finances",
    actionLabel: "Apply amount + date",
    amountLabel: "Suggested monthly saving",
    summaryLabel: "Why this amount",
  }
}

function createDraft(goalKind: GoalKind, defaults?: GoalComposerDefaults, currentNetWorth = 0): GoalDraft {
  const isDefaultKind = defaults?.goalKind === goalKind

  if (goalKind === "debt_payoff") {
    return {
      label: isDefaultKind ? defaults?.label ?? "" : "",
      category: isDefaultKind ? defaults?.category ?? "Debt Payoff" : "Debt Payoff",
      targetAmount: isDefaultKind ? toInputAmount(defaults?.targetAmount) : "",
      targetBalance: isDefaultKind ? toInputAmount(defaults?.targetBalance, { showZero: true }) : "0.00",
      startingAmount: isDefaultKind ? toInputAmount(defaults?.startingAmount) : "",
      deadline: isDefaultKind ? defaults?.deadline ?? defaultDeadline() : defaultDeadline(),
      monthlyAllocation: isDefaultKind ? toInputAmount(defaults?.monthlyAllocation) : "",
      monthlyDirty: Boolean(isDefaultKind && defaults?.monthlyAllocation != null),
      suggestionMode: "moderate",
      notes: isDefaultKind ? defaults?.notes ?? "" : "",
      linkedDebtAccountId: isDefaultKind ? defaults?.linkedDebtAccountId ?? null : null,
      linkedPocketId: null,
      linkedPocketType: null,
      syncedDebtAccountId:
        isDefaultKind &&
        defaults?.linkedDebtAccountId != null &&
        defaults?.startingAmount != null &&
        defaults?.targetBalance != null &&
        Boolean(defaults?.label?.trim())
          ? defaults.linkedDebtAccountId
          : null,
      syncedPocketKey: null,
    }
  }

  if (goalKind === "net_worth_target") {
    return {
      label: isDefaultKind ? defaults?.label ?? "Net Worth Goal" : "Net Worth Goal",
      category: isDefaultKind ? defaults?.category ?? "Net Worth" : "Net Worth",
      targetAmount: isDefaultKind ? toInputAmount(defaults?.targetAmount) : "",
      targetBalance: "0.00",
      startingAmount: isDefaultKind ? toInputAmount(defaults?.startingAmount) : toInputAmount(currentNetWorth, { showZero: true }),
      deadline: isDefaultKind ? defaults?.deadline ?? defaultDeadline() : defaultDeadline(),
      monthlyAllocation: isDefaultKind ? toInputAmount(defaults?.monthlyAllocation) : "",
      monthlyDirty: Boolean(isDefaultKind && defaults?.monthlyAllocation != null),
      suggestionMode: "moderate",
      notes: isDefaultKind ? defaults?.notes ?? "" : "",
      linkedDebtAccountId: null,
      linkedPocketId: null,
      linkedPocketType: null,
      syncedDebtAccountId: null,
      syncedPocketKey: null,
    }
  }

  if (goalKind === "pocket_funding") {
    return {
      label: isDefaultKind ? defaults?.label ?? "" : "",
      category: isDefaultKind ? defaults?.category ?? "Pocket Reserve" : "Pocket Reserve",
      targetAmount: isDefaultKind ? toInputAmount(defaults?.targetAmount) : "",
      targetBalance: "0.00",
      startingAmount: isDefaultKind ? toInputAmount(defaults?.startingAmount, { showZero: true }) : "",
      deadline: isDefaultKind ? defaults?.deadline ?? defaultDeadline() : defaultDeadline(),
      monthlyAllocation: isDefaultKind ? toInputAmount(defaults?.monthlyAllocation) : "",
      monthlyDirty: Boolean(isDefaultKind && defaults?.monthlyAllocation != null),
      suggestionMode: "moderate",
      notes: isDefaultKind ? defaults?.notes ?? "" : "",
      linkedDebtAccountId: null,
      linkedPocketId: isDefaultKind ? defaults?.linkedPocketId ?? null : null,
      linkedPocketType: isDefaultKind ? defaults?.linkedPocketType ?? null : null,
      syncedDebtAccountId: null,
      syncedPocketKey:
        isDefaultKind ? getPocketKey(defaults?.linkedPocketType ?? null, defaults?.linkedPocketId ?? null) : null,
    }
  }

  return {
    label: isDefaultKind ? defaults?.label ?? defaults?.category ?? "" : "",
    category: isDefaultKind ? defaults?.category ?? "Savings Goal" : "Savings Goal",
    targetAmount: isDefaultKind ? toInputAmount(defaults?.targetAmount) : "",
    targetBalance: "0.00",
    startingAmount: isDefaultKind ? toInputAmount(defaults?.startingAmount, { showZero: true }) : "",
    deadline: isDefaultKind ? defaults?.deadline ?? defaultDeadline() : defaultDeadline(),
    monthlyAllocation: isDefaultKind ? toInputAmount(defaults?.monthlyAllocation) : "",
    monthlyDirty: Boolean(isDefaultKind && defaults?.monthlyAllocation != null),
    suggestionMode: "moderate",
    notes: isDefaultKind ? defaults?.notes ?? "" : "",
    linkedDebtAccountId: null,
    linkedPocketId: null,
    linkedPocketType: null,
    syncedDebtAccountId: null,
    syncedPocketKey: null,
  }
}

function createDraftMap(defaults?: GoalComposerDefaults, currentNetWorth = 0): GoalDraftMap {
  return {
    savings_target: createDraft("savings_target", defaults, currentNetWorth),
    debt_payoff: createDraft("debt_payoff", defaults, currentNetWorth),
    net_worth_target: createDraft("net_worth_target", defaults, currentNetWorth),
    pocket_funding: createDraft("pocket_funding", defaults, currentNetWorth),
  }
}

function GoalInfoPopover({ goalKind }: { goalKind: GoalKind }) {
  const entries = [
    { label: "Goal name", description: "The title shown across the goals tab and the rest of the app." },
    { label: "Category", description: "A short grouping label for the goal." },
    {
      label: goalKind === "debt_payoff" ? "Target balance" : goalKind === "net_worth_target" ? "Target net worth" : "Target amount",
      description:
        goalKind === "debt_payoff"
          ? "The debt balance you want to reach, usually 0."
          : "The finish line for this goal.",
    },
    {
      label:
        goalKind === "debt_payoff"
          ? "Current balance"
          : goalKind === "net_worth_target"
            ? "Current net worth snapshot"
            : "Already saved",
      description:
        goalKind === "debt_payoff"
          ? "The live balance from the linked debt."
          : "Your starting point before future progress is added.",
    },
    { label: "Deadline", description: "The date you want this goal to be reached by." },
    {
      label: goalKind === "debt_payoff" ? "Planned payment" : "Monthly plan",
      description:
        goalKind === "debt_payoff"
          ? "How much you expect to pay toward this debt each month."
          : "How much you expect to add to this goal each month.",
    },
    { label: "Recommended pace", description: "The monthly amount needed to hit the target by the deadline." },
    {
      label: "Finance-based suggestion",
      description:
        "A one-click suggestion that uses your filtered income, expenses, savings rate, and debt type to recommend both a monthly amount and a payoff timeline.",
    },
    {
      label: "Suggestion mode",
      description:
        "Moderate aims for a steadier plan. Aggressive pushes for a shorter timeline when your budget can support it.",
    },
    { label: "Notes", description: "Optional context so you remember why this goal matters." },
  ]

  if (goalKind === "debt_payoff") {
    entries.splice(2, 0, {
      label: "Debt",
      description: "The existing debt this payoff goal should follow.",
    })
  }

  if (goalKind === "pocket_funding") {
    entries.splice(2, 0, {
      label: "Linked pocket",
      description: "The property or vehicle reserve this goal belongs to.",
    })
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full">
          <Info className="h-4 w-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[320px] p-0">
        <div className="space-y-3 p-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Goal field guide</p>
            <p className="mt-1 text-xs text-muted-foreground">What each part of this form means.</p>
          </div>
          <div className="space-y-3">
            {entries.map((entry) => (
              <div key={entry.label}>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-foreground/85">{entry.label}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{entry.description}</p>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function GoalWizardCard({
  onDismiss,
  onSaved,
  defaults,
  debts = [],
  pocketsData,
  currentNetWorth = 0,
  financialProfile,
}: {
  onDismiss: () => void
  onSaved?: (goalId: number) => void
  defaults?: GoalComposerDefaults
  debts?: DebtAccountSummary[]
  pocketsData?: PocketsBundleResponse
  currentNetWorth?: number
  financialProfile?: GoalFinancialProfile
}) {
  const { formatCurrency } = useCurrency()
  const fieldLabelClass = "text-[11px] font-medium text-muted-foreground/72"
  const controlClassName = "h-11 rounded-xl border-border/45 bg-background/75 shadow-none"
  const subtleCardClass = "rounded-2xl border border-border/45 bg-muted/10 px-4 py-4"
  const accentCardClass =
    "rounded-2xl border border-border/35 bg-background/55 px-4 py-4"

  const pocketOptions = useMemo<PocketOption[]>(() => {
    const properties = (pocketsData?.properties ?? []).map((pocket) => ({
      id: pocket.id,
      type: "property" as const,
      label: pocket.name,
    }))
    const vehicles = (pocketsData?.vehicles ?? []).map((pocket) => ({
      id: pocket.id,
      type: "vehicle" as const,
      label: pocket.name,
    }))
    return [...properties, ...vehicles]
  }, [pocketsData?.properties, pocketsData?.vehicles])

  const [goalKind, setGoalKind] = useState<GoalKind>(defaults?.goalKind ?? "savings_target")
  const [draftsByKind, setDraftsByKind] = useState<GoalDraftMap>(() => createDraftMap(defaults, currentNetWorth))
  const [isSaving, setIsSaving] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)

  useEffect(() => {
    setGoalKind(defaults?.goalKind ?? "savings_target")
    setDraftsByKind(createDraftMap(defaults, currentNetWorth))
  }, [defaults])

  const activeDraft = draftsByKind[goalKind]

  const updateDraft = (kind: GoalKind, patch: Partial<GoalDraft>) => {
    setDraftsByKind((previous) => ({
      ...previous,
      [kind]: {
        ...previous[kind],
        ...patch,
      },
    }))
  }

  const updateActiveDraft = (patch: Partial<GoalDraft>) => {
    updateDraft(goalKind, patch)
  }

  const normalizeNumericField = (field: NumericDraftField) => {
    updateActiveDraft({ [field]: normalizeAmountInput(activeDraft[field]) } as Partial<GoalDraft>)
  }

  const selectedDebt = useMemo(
    () => debts.find((debt) => Number(debt.id) === activeDraft.linkedDebtAccountId) ?? null,
    [activeDraft.linkedDebtAccountId, debts]
  )
  const payoffEligibleDebts = useMemo(
    () =>
      debts.filter(
        (debt) =>
          debt.status !== "archived" &&
          debt.status !== "paid_off" &&
          Math.max(0, debt.current_balance) > 0.009
      ),
    [debts]
  )
  const selectedPocket = useMemo(
    () =>
      pocketOptions.find(
        (pocket) => pocket.id === activeDraft.linkedPocketId && pocket.type === activeDraft.linkedPocketType
      ) ?? null,
    [activeDraft.linkedPocketId, activeDraft.linkedPocketType, pocketOptions]
  )

  useEffect(() => {
    if (goalKind !== "debt_payoff" || !selectedDebt) return
    if (activeDraft.syncedDebtAccountId === selectedDebt.id) return

    const debtBalance = Math.max(0, selectedDebt.current_balance)
    updateDraft("debt_payoff", {
      category: "Debt Payoff",
      label: `${selectedDebt.name} Payoff`,
      targetAmount: toInputAmount(debtBalance, { showZero: true }),
      startingAmount: toInputAmount(debtBalance, { showZero: true }),
      targetBalance: "0.00",
      monthlyAllocation: "",
      monthlyDirty: false,
      syncedDebtAccountId: selectedDebt.id,
    })
  }, [activeDraft.syncedDebtAccountId, goalKind, selectedDebt])

  useEffect(() => {
    if (goalKind !== "pocket_funding" || !selectedPocket) return
    const pocketKey = `${selectedPocket.type}:${selectedPocket.id}`
    if (activeDraft.syncedPocketKey === pocketKey) return

    updateDraft("pocket_funding", {
      category: selectedPocket.type === "property" ? "Property Reserve" : "Vehicle Reserve",
      label: `${selectedPocket.label} Reserve`,
      syncedPocketKey: pocketKey,
    })
  }, [activeDraft.syncedPocketKey, goalKind, selectedPocket])

  useEffect(() => {
    if (goalKind !== "net_worth_target") return
    if (activeDraft.startingAmount.trim()) return

    updateDraft("net_worth_target", {
      category: activeDraft.category || "Net Worth",
      label: activeDraft.label || "Net Worth Goal",
      startingAmount: toInputAmount(currentNetWorth, { showZero: true }),
    })
  }, [activeDraft.category, activeDraft.label, activeDraft.startingAmount, currentNetWorth, goalKind])

  const parsedTargetAmount = parseAmount(activeDraft.targetAmount)
  const parsedTargetBalance = parseAmount(activeDraft.targetBalance)
  const parsedStartingAmount = parseAmount(activeDraft.startingAmount)
  const parsedMonthlyAllocation = parseAmount(activeDraft.monthlyAllocation)
  const selectedDeadlineDate = useMemo(() => parseDateValue(activeDraft.deadline), [activeDraft.deadline])
  const today = useMemo(() => {
    const next = new Date()
    next.setHours(0, 0, 0, 0)
    return next
  }, [])
  const monthsLeft = useMemo(() => {
    if (!selectedDeadlineDate) return 1
    const diffMs = selectedDeadlineDate.getTime() - Date.now()
    const months = diffMs / (1000 * 60 * 60 * 24 * 30.4375)
    return Math.max(1 / 30, months)
  }, [selectedDeadlineDate])

  const remainingToTarget = useMemo(() => {
    if (goalKind === "debt_payoff") {
      const currentBalance = Math.max(0, selectedDebt?.current_balance ?? parsedStartingAmount)
      return Math.max(0, currentBalance - parsedTargetBalance)
    }

    return Math.max(0, parsedTargetAmount - parsedStartingAmount)
  }, [goalKind, parsedStartingAmount, parsedTargetAmount, parsedTargetBalance, selectedDebt?.current_balance])

  const recommendedMonthly = useMemo(() => {
    if (remainingToTarget <= 0) return 0
    return Number((remainingToTarget / monthsLeft).toFixed(2))
  }, [monthsLeft, remainingToTarget])

  const financeSuggestion = useMemo<FinanceSuggestion | null>(() => {
    if (
      !financialProfile ||
      financialProfile.monthlyIncome <= 0 ||
      remainingToTarget <= 0
    ) {
      return null
    }

    if (goalKind === "debt_payoff" && !selectedDebt) return null

    const profile = getGoalRecommendationProfile(
      goalKind,
      financialProfile.savingsRate,
      activeDraft.linkedPocketType,
      activeDraft.suggestionMode,
      selectedDebt?.debt_type
    )
    const minimumPayment = goalKind === "debt_payoff" ? Math.max(0, selectedDebt?.minimum_payment ?? 0) : 0
    const baselineMonthly = financialProfile.monthlyIncome * profile.percentOfIncome
    const targetWindowMonthly = remainingToTarget / Math.max(1, profile.preferredMonths)
    const cashFlowBudget =
      financialProfile.monthlyNet > 0 ? financialProfile.monthlyNet * profile.surplusShare : 0

    let suggestedMonthly =
      cashFlowBudget > 0
        ? Math.min(Math.max(baselineMonthly, minimumPayment, targetWindowMonthly), cashFlowBudget)
        : Math.max(minimumPayment, baselineMonthly * (activeDraft.suggestionMode === "aggressive" ? 1 : 0.75), targetWindowMonthly)

    const cappedByCashFlow =
      cashFlowBudget > 0 && suggestedMonthly + 0.01 < Math.max(baselineMonthly, minimumPayment, targetWindowMonthly)

    if (suggestedMonthly < minimumPayment) {
      suggestedMonthly = minimumPayment
    }

    suggestedMonthly = Number(suggestedMonthly.toFixed(2))
    if (!Number.isFinite(suggestedMonthly) || suggestedMonthly <= 0) return null

    const suggestedMonths = Math.max(1, Math.ceil(remainingToTarget / suggestedMonthly))
    const suggestedDeadlineDate = addMonths(today, suggestedMonths)
    const suggestedDeadline = format(suggestedDeadlineDate, "yyyy-MM-dd")
    const actualPercentOfIncome =
      financialProfile.monthlyIncome > 0 ? (suggestedMonthly / financialProfile.monthlyIncome) * 100 : 0
    const usedMinimumFloor = minimumPayment > 0 && suggestedMonthly <= minimumPayment + 0.01
    const stretchedBeyondTargetWindow = suggestedMonths > profile.preferredMonths

    const summary =
      activeDraft.suggestionMode === "aggressive"
        ? "This version leans harder into the goal so the timeline stays shorter when your budget allows it."
        : financialProfile.savingsRate >= 20
          ? "Your savings rate is already healthy, so this suggestion still moves with some intent."
          : financialProfile.monthlyNet <= 0
            ? "Cash flow looks tight right now, so the suggestion stays conservative."
            : "This suggestion balances progress with room for the rest of your budget."

    const detail = cappedByCashFlow
      ? `The ${activeDraft.suggestionMode} target was capped so it does not overreach your current free cash flow.`
      : stretchedBeyondTargetWindow
        ? `Your current budget cannot fully support the preferred ${profile.preferredMonths}-month window, so the timeline stretches a bit longer.`
      : usedMinimumFloor
        ? "The suggestion stays close to the debt's minimum payment because that is the current floor."
        : goalKind === "debt_payoff"
          ? "The suggestion uses a percentage of monthly income, adjusted for this debt type and your current savings rate."
          : goalKind === "net_worth_target"
            ? "The suggestion reserves part of your monthly capacity for broad net worth growth without assuming every euro goes into cash."
            : goalKind === "pocket_funding"
              ? "The suggestion sets aside a steady share of income for this reserve while staying inside current cash flow."
              : "The suggestion uses a measured share of income so this goal can progress without crowding out the rest of your budget."

    return {
      suggestedMonthly,
      suggestedMonths,
      suggestedDeadline,
      targetPercentOfIncome: profile.percentOfIncome,
      actualPercentOfIncome,
      monthlyIncome: financialProfile.monthlyIncome,
      monthlyExpenses: financialProfile.monthlyExpenses,
      monthlyNet: financialProfile.monthlyNet,
      savingsRate: financialProfile.savingsRate,
      minimumPayment,
      strategyLabel: profile.strategyLabel,
      title: profile.title,
      actionLabel: profile.actionLabel,
      amountLabel: profile.amountLabel,
      summaryLabel: profile.summaryLabel,
      preferredMonths: profile.preferredMonths,
      cappedByCashFlow,
      usedMinimumFloor,
      stretchedBeyondTargetWindow,
      summary,
      detail,
    }
  }, [activeDraft.linkedPocketType, activeDraft.suggestionMode, financialProfile, goalKind, remainingToTarget, selectedDebt, today])

  const isDebtAlreadyAtTarget = goalKind === "debt_payoff" && remainingToTarget <= 0
  const isDebtMissing = goalKind === "debt_payoff" && activeDraft.linkedDebtAccountId != null && !selectedDebt

  useEffect(() => {
    if (activeDraft.monthlyDirty) return
    updateDraft(goalKind, {
      monthlyAllocation: recommendedMonthly > 0 ? recommendedMonthly.toFixed(2) : "",
    })
  }, [activeDraft.monthlyDirty, goalKind, recommendedMonthly])

  const handleSave = async () => {
    if (!activeDraft.label.trim() || !activeDraft.deadline) {
      toast.error("Add a goal name and deadline first.")
      return
    }

    if (!selectedDeadlineDate) {
      toast.error("Pick a valid deadline first.")
      return
    }

    if ((goalKind === "savings_target" || goalKind === "pocket_funding" || goalKind === "net_worth_target") && parsedTargetAmount <= 0) {
      toast.error("Add a valid target amount.")
      return
    }

    if (goalKind === "debt_payoff" && !activeDraft.linkedDebtAccountId) {
      toast.error("Pick a debt account for this payoff goal.")
      return
    }

    if (isDebtMissing) {
      toast.error("The selected debt could not be found. Pick it again.")
      return
    }

    if (isDebtAlreadyAtTarget) {
      toast.error("This debt is already at or below the target balance.")
      return
    }

    if (goalKind === "debt_payoff" && parsedTargetBalance > Math.max(0, selectedDebt?.current_balance ?? 0)) {
      toast.error("Target balance cannot be higher than the current debt balance.")
      return
    }

    if (goalKind === "pocket_funding" && (!activeDraft.linkedPocketId || !activeDraft.linkedPocketType)) {
      toast.error("Pick a property or vehicle for this funding goal.")
      return
    }

    const resolvedMonthly = activeDraft.monthlyAllocation.trim() ? parsedMonthlyAllocation : recommendedMonthly

    setIsSaving(true)
    try {
      const response = await fetch("/api/chat/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalKind,
          category: activeDraft.category.trim() || activeDraft.label.trim(),
          label: activeDraft.label.trim(),
          targetAmount: goalKind === "debt_payoff" ? Math.max(0, selectedDebt?.current_balance ?? parsedStartingAmount) : parsedTargetAmount,
          deadline: activeDraft.deadline,
          monthlyAllocation: resolvedMonthly,
          priority: 2,
          notes: activeDraft.notes.trim() || null,
          linkedDebtAccountId: activeDraft.linkedDebtAccountId,
          linkedPocketId: activeDraft.linkedPocketId,
          linkedPocketType: activeDraft.linkedPocketType,
          targetBalance: goalKind === "debt_payoff" ? parsedTargetBalance : null,
          startingAmount:
            goalKind === "debt_payoff"
              ? Math.max(0, selectedDebt?.current_balance ?? parsedStartingAmount)
              : goalKind === "net_worth_target"
                ? parsedStartingAmount
                : 0,
          initialContribution:
            goalKind === "savings_target" || goalKind === "pocket_funding"
              ? parsedStartingAmount
              : null,
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        toast.error(payload?.error || "Failed to create goal")
        return
      }

      toast.success("Goal created")
      onSaved?.(payload?.id as number)
      onDismiss()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create goal"
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl rounded-[32px] border border-border/45 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-card)_94%,var(--color-primary)_6%),color-mix(in_oklab,var(--color-card)_98%,transparent))] p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/45 bg-background/70 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            <Target className="h-3.5 w-3.5 text-primary" />
            Create goal
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-semibold tracking-tight text-foreground">Build a goal that fits your finances</h3>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Pick the goal type, set the target, then use either the target-date pace or the finance-based suggestion.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <GoalInfoPopover goalKind={goalKind} />
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onDismiss}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-5">
        <div className="inline-flex w-full flex-wrap gap-1.5 rounded-2xl border border-border/40 bg-muted/12 p-1.5">
          {GOAL_KIND_OPTIONS.map((option) => {
            const Icon = option.icon
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setGoalKind(option.id)}
                className={cn(
                  "flex min-w-[9rem] flex-1 items-center gap-2.5 rounded-[14px] px-3.5 py-3 text-left transition-colors",
                  goalKind === option.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-background/70 hover:text-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4", goalKind === option.id ? "text-primary" : "text-muted-foreground")} />
                <div className="text-sm font-medium">{option.label}</div>
              </button>
            )
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <label className={fieldLabelClass}>Goal name</label>
            <Input
              className={controlClassName}
              value={activeDraft.label}
              onChange={(event) => updateActiveDraft({ label: event.target.value })}
              placeholder="Emergency Fund"
            />
          </div>

          <div className="space-y-2">
            <label className={fieldLabelClass}>Category</label>
            <Input
              className={controlClassName}
              value={activeDraft.category}
              onChange={(event) => updateActiveDraft({ category: event.target.value })}
              placeholder="Savings Goal"
            />
          </div>
        </div>

        {goalKind === "debt_payoff" ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <label className={fieldLabelClass}>Debt</label>
              <Select
                value={activeDraft.linkedDebtAccountId != null ? String(activeDraft.linkedDebtAccountId) : undefined}
                onValueChange={(value) =>
                  updateDraft("debt_payoff", {
                    linkedDebtAccountId: Number.parseInt(value, 10),
                    syncedDebtAccountId: null,
                  })
                }
              >
                <SelectTrigger className={controlClassName}>
                  <SelectValue placeholder="Choose a debt" />
                </SelectTrigger>
                <SelectContent>
                  {payoffEligibleDebts.map((debt) => (
                    <SelectItem key={String(debt.id)} value={String(debt.id)}>
                      {formatDebtLabel(debt)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {payoffEligibleDebts.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  There are no debts with a remaining balance available for a payoff goal.
                </p>
              ) : null}
              {isDebtMissing ? (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  This linked debt is no longer available. Pick another debt.
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className={fieldLabelClass}>Target balance</label>
              <Input
                className={controlClassName}
                type="number"
                min="0"
                step="0.01"
                value={activeDraft.targetBalance}
                onChange={(event) => updateActiveDraft({ targetBalance: event.target.value })}
                onBlur={() => normalizeNumericField("targetBalance")}
              />
              {parsedTargetBalance > Math.max(0, selectedDebt?.current_balance ?? 0) ? (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  The target balance must be less than or equal to the current debt balance.
                </p>
              ) : null}
            </div>
          </div>
        ) : goalKind === "pocket_funding" ? (
          <div className="space-y-2">
            <label className={fieldLabelClass}>Linked pocket</label>
            <Select
              value={selectedPocket ? `${selectedPocket.type}:${selectedPocket.id}` : undefined}
              onValueChange={(value) => {
                const [type, id] = value.split(":")
                updateDraft("pocket_funding", {
                  linkedPocketType: type as GoalPocketType,
                  linkedPocketId: Number.parseInt(id, 10),
                  syncedPocketKey: null,
                })
              }}
            >
              <SelectTrigger className={controlClassName}>
                <SelectValue placeholder="Choose a property or vehicle" />
              </SelectTrigger>
              <SelectContent>
                {pocketOptions.map((pocket) => (
                  <SelectItem key={`${pocket.type}:${pocket.id}`} value={`${pocket.type}:${pocket.id}`}>
                    {pocket.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-3">
          {goalKind !== "debt_payoff" ? (
            <div className="space-y-2">
              <label className={fieldLabelClass}>
                {goalKind === "net_worth_target" ? "Target net worth" : "Target amount"}
              </label>
              <Input
                className={controlClassName}
                type="number"
                min="0"
                step="0.01"
                value={activeDraft.targetAmount}
                onChange={(event) => updateActiveDraft({ targetAmount: event.target.value })}
                onBlur={() => normalizeNumericField("targetAmount")}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <label className={fieldLabelClass}>Current balance</label>
              <div className={cn(controlClassName, "flex items-center px-3 text-sm text-foreground")}>
                {formatCurrency(Math.max(0, selectedDebt?.current_balance ?? 0))}
              </div>
              {isDebtAlreadyAtTarget ? (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  This debt is already at the target balance, so there is nothing left to pay off.
                </p>
              ) : null}
            </div>
          )}

          <div className="space-y-2">
            <label className={fieldLabelClass}>Deadline</label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    controlClassName,
                    "w-full justify-between px-3 font-normal",
                    !selectedDeadlineDate && "text-muted-foreground"
                  )}
                >
                  <span>{selectedDeadlineDate ? format(selectedDeadlineDate, "MMM d, yyyy") : "Pick a deadline"}</span>
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="max-h-[24rem] w-auto overflow-auto p-0" sideOffset={8}>
                <div className="p-3">
                  <Calendar
                    key={activeDraft.deadline || "goal-deadline"}
                    mode="single"
                    selected={selectedDeadlineDate}
                    defaultMonth={selectedDeadlineDate ?? today}
                    onSelect={(date) => {
                      if (!date) return
                      updateActiveDraft({ deadline: format(date, "yyyy-MM-dd") })
                      setCalendarOpen(false)
                    }}
                    captionLayout="dropdown"
                    startMonth={today}
                    endMonth={addMonths(today, 12 * 30)}
                    disabled={(date) => date < today}
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <label className={fieldLabelClass}>
              {goalKind === "debt_payoff" ? "Planned payment" : "Monthly plan"}
            </label>
            <Input
              className={controlClassName}
              type="number"
              min="0"
              step="0.01"
              value={activeDraft.monthlyAllocation}
              onChange={(event) =>
                updateActiveDraft({
                  monthlyDirty: true,
                  monthlyAllocation: event.target.value,
                })
              }
              onBlur={() => normalizeNumericField("monthlyAllocation")}
            />
          </div>
        </div>

        {goalKind !== "debt_payoff" && goalKind !== "net_worth_target" ? (
          <div className="space-y-2">
            <label className={fieldLabelClass}>Already saved</label>
            <Input
              className={controlClassName}
              type="number"
              min="0"
              step="0.01"
              value={activeDraft.startingAmount}
              onChange={(event) => updateActiveDraft({ startingAmount: event.target.value })}
              onBlur={() => normalizeNumericField("startingAmount")}
              placeholder="0.00"
            />
          </div>
        ) : goalKind === "net_worth_target" ? (
          <div className="space-y-2">
            <label className={fieldLabelClass}>Current net worth snapshot</label>
            <Input
              className={controlClassName}
              type="number"
              step="0.01"
              value={activeDraft.startingAmount}
              onChange={(event) => updateActiveDraft({ startingAmount: event.target.value })}
              onBlur={() => normalizeNumericField("startingAmount")}
            />
          </div>
        ) : null}

        <div className={subtleCardClass}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground/72">Recommended pace</p>
              <p className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                {formatCurrency(recommendedMonthly, { minimumFractionDigits: 2, maximumFractionDigits: 2, forceFullNumber: true })}/mo
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatCurrency(remainingToTarget, { minimumFractionDigits: 2, maximumFractionDigits: 2, forceFullNumber: true })} left{" "}
                {monthsLeft >= 1 ? `${monthsLeft.toFixed(1)} months` : `${Math.max(1, Math.round(monthsLeft * 30))} days`}.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="max-w-xs text-sm leading-6 text-muted-foreground">
                {goalKind === "debt_payoff"
                  ? "Based on the linked debt balance and target date."
                  : "Based on the target, current amount, and deadline."}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  updateActiveDraft({
                    monthlyDirty: false,
                    monthlyAllocation: recommendedMonthly > 0 ? recommendedMonthly.toFixed(2) : "",
                  })
                }
              >
                Use target-date pace
              </Button>
            </div>
          </div>
        </div>

        {financeSuggestion ? (
          <div className={accentCardClass}>
            <div className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-muted-foreground/72">{financeSuggestion.title}</p>
                  <p className="text-xl font-semibold tracking-tight text-foreground">
                    {formatCurrency(financeSuggestion.suggestedMonthly, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                      forceFullNumber: true,
                    })}/mo
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {financeSuggestion.strategyLabel} • {financeSuggestion.suggestedMonths} {financeSuggestion.suggestedMonths === 1 ? "month" : "months"} • ends {format(parseISO(financeSuggestion.suggestedDeadline), "MMM yyyy")}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex rounded-full border border-border/40 bg-muted/20 p-1">
                    {(["moderate", "aggressive"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => updateActiveDraft({ suggestionMode: mode })}
                        className={cn(
                          "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                          activeDraft.suggestionMode === mode
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {mode === "moderate" ? "Moderate" : "Aggressive"}
                      </button>
                    ))}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-full"
                    onClick={() =>
                      updateActiveDraft({
                        monthlyDirty: true,
                        monthlyAllocation: financeSuggestion.suggestedMonthly.toFixed(2),
                        deadline: financeSuggestion.suggestedDeadline,
                      })
                    }
                  >
                    {financeSuggestion.actionLabel}
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>{(financeSuggestion.targetPercentOfIncome * 100).toFixed(1)}% of income</span>
                <span>{formatCurrency(financeSuggestion.monthlyIncome, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} in / {formatCurrency(financeSuggestion.monthlyExpenses, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} out</span>
                <span>Savings rate {financeSuggestion.savingsRate.toFixed(1)}%</span>
                {goalKind === "debt_payoff" && financeSuggestion.minimumPayment > 0 ? (
                  <span>
                    Min {formatCurrency(financeSuggestion.minimumPayment, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                      forceFullNumber: true,
                    })}
                  </span>
                ) : null}
              </div>

              <p className="border-t border-border/35 pt-3 text-xs leading-5 text-muted-foreground">
                <span className="font-medium text-foreground">{financeSuggestion.summary}</span>{" "}
                {financeSuggestion.detail}
              </p>
            </div>
          </div>
        ) : financialProfile ? (
          <div className={accentCardClass}>
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground/72">Suggested from your finances</p>
              <p className="text-sm text-muted-foreground">
                Once this goal has something left to fund, the app can suggest a monthly amount and an end date from your current income and expenses.
              </p>
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <label className={fieldLabelClass}>Notes</label>
          <Textarea
            className="min-h-[104px] rounded-2xl border-border/45 bg-background/75 shadow-none"
            value={activeDraft.notes}
            onChange={(event) => updateActiveDraft({ notes: event.target.value })}
            placeholder="Optional context or motivation"
            rows={3}
          />
        </div>

        <div className="flex flex-col gap-3 border-t border-border/35 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm leading-6 text-muted-foreground">
            {goalKind === "debt_payoff" && selectedDebt ? (
              <span>Linked to <span className="font-medium text-foreground">{selectedDebt.name}</span>.</span>
            ) : goalKind === "pocket_funding" && selectedPocket ? (
              <span>Linked to <span className="font-medium text-foreground">{selectedPocket.label}</span>.</span>
            ) : goalKind === "net_worth_target" ? (
              <span>This tracks the default app net worth model, not local calculator toggles.</span>
            ) : (
              <span>Manual contributions will update this goal after it is created.</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={onDismiss}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={isSaving || isDebtAlreadyAtTarget || isDebtMissing}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  Create goal
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
