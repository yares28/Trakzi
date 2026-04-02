import type { DebtAccountSummary } from "@/lib/types/debts"
import type { GoalKind, GoalPocketType, GoalRecord } from "@/lib/types/goals"

export type SavingsGoalRecord = GoalRecord
export type GoalBoardSection = "inProgress" | "dueSoon" | "completed"
export type GoalHealth = "on_track" | "tight" | "behind" | "due_soon" | "completed"

export type GoalContext = {
  debtsById: Map<number, DebtAccountSummary>
  currentNetWorth: number
  pocketNameByKey: Map<string, string>
}

export type DerivedGoal = GoalRecord & {
  displayLabel: string
  goalKind: GoalKind
  targetAmount: number
  targetBalance: number
  startingAmount: number
  manualProgress: number
  currentValue: number
  remainingAmount: number
  progressPercent: number
  monthsLeft: number
  daysUntilDeadline: number
  neededPerMonth: number
  projectedMonthsLeft: number | null
  projectedCompletionDate: string | null
  paceRatio: number
  health: GoalHealth
  healthLabel: string
  section: GoalBoardSection
  nextBestAction: string
  rankingScore: number
  currentValueLabel: string
  targetValueLabel: string
  kindLabel: string
  linkedSummary: string | null
  canAddEntries: boolean
}

const MS_PER_DAY = 1000 * 60 * 60 * 24
const AVERAGE_DAYS_PER_MONTH = 30.4375

function parseNumeric(value: string | number | null | undefined) {
  if (value == null) return 0
  const parsed = typeof value === "number" ? value : Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function parseDate(value: string) {
  return new Date(`${value}T12:00:00`)
}

function differenceInDays(from: Date, to: Date) {
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY)
}

function monthsFromDays(days: number) {
  return Math.max(1, Math.ceil(days / AVERAGE_DAYS_PER_MONTH))
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * MS_PER_DAY)
}

function formatIsoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function computeGoalIdentity(goal: GoalRecord) {
  return goal.label?.trim() || goal.category
}

function getPocketKey(type: GoalPocketType | null, id: number | null) {
  return type && id != null ? `${type}:${id}` : null
}

function computeStatusLabels(goalKind: GoalKind) {
  switch (goalKind) {
    case "debt_payoff":
      return {
        kindLabel: "Debt payoff",
        currentLabel: "Current balance",
        targetLabel: "Target balance",
      }
    case "net_worth_target":
      return {
        kindLabel: "Net worth target",
        currentLabel: "Current net worth",
        targetLabel: "Target net worth",
      }
    case "pocket_funding":
      return {
        kindLabel: "Pocket funding",
        currentLabel: "Saved so far",
        targetLabel: "Target reserve",
      }
    default:
      return {
        kindLabel: "Savings target",
        currentLabel: "Saved so far",
        targetLabel: "Target amount",
      }
  }
}

export function deriveGoal(goal: GoalRecord, context: GoalContext, now = new Date()): DerivedGoal {
  const goalKind = goal.goal_kind ?? "savings_target"
  const labels = computeStatusLabels(goalKind)
  const displayLabel = computeGoalIdentity(goal)
  const targetAmount = parseNumeric(goal.target_amount)
  const targetBalance = parseNumeric(goal.target_balance)
  const manualProgress = parseNumeric(goal.manual_progress)
  const monthlyAllocation = parseNumeric(goal.monthly_allocation)
  const deadline = parseDate(goal.deadline)
  const daysUntilDeadline = differenceInDays(now, deadline)
  const monthsLeft = monthsFromDays(Math.max(1, daysUntilDeadline))

  const linkedDebt = goal.linked_debt_account_id != null ? context.debtsById.get(goal.linked_debt_account_id) ?? null : null
  const linkedPocketKey = getPocketKey(goal.linked_pocket_type, goal.linked_pocket_id)
  const linkedPocketName = linkedPocketKey ? context.pocketNameByKey.get(linkedPocketKey) ?? null : null

  let startingAmount = parseNumeric(goal.starting_amount)
  let currentValue = 0
  let remainingAmount = 0
  let progressPercent = 0
  let neededPerMonth = 0
  let projectedMonthsLeft: number | null = null
  let projectedCompletionDate: string | null = null
  let paceRatio = 1
  let linkedSummary: string | null = null
  let canAddEntries = goalKind === "savings_target" || goalKind === "pocket_funding"

  if (goalKind === "debt_payoff") {
    const currentDebtBalance = Math.max(0, linkedDebt?.current_balance ?? startingAmount)
    if (startingAmount <= 0) {
      startingAmount = Math.max(currentDebtBalance, targetAmount)
    }

    currentValue = currentDebtBalance
    remainingAmount = Math.max(0, currentDebtBalance - targetBalance)
    const payoffSpan = Math.max(1, startingAmount - targetBalance)
    const paidOffAmount = Math.max(0, startingAmount - currentDebtBalance)
    progressPercent = Math.min(100, (paidOffAmount / payoffSpan) * 100)
    neededPerMonth = remainingAmount <= 0 ? 0 : remainingAmount / Math.max(1, daysUntilDeadline / AVERAGE_DAYS_PER_MONTH)
    paceRatio = neededPerMonth <= 0 ? 1 : monthlyAllocation / Math.max(neededPerMonth, 1)
    projectedMonthsLeft = monthlyAllocation > 0 && remainingAmount > 0 ? Math.ceil(remainingAmount / monthlyAllocation) : remainingAmount > 0 ? null : 0
    projectedCompletionDate = projectedMonthsLeft == null ? null : formatIsoDate(addDays(now, Math.round(projectedMonthsLeft * AVERAGE_DAYS_PER_MONTH)))
    linkedSummary = linkedDebt?.name ?? null
    canAddEntries = false
  } else if (goalKind === "net_worth_target") {
    if (startingAmount <= 0) {
      startingAmount = context.currentNetWorth
    }
    currentValue = context.currentNetWorth
    const climbSpan = Math.max(1, targetAmount - startingAmount)
    const gainedAmount = Math.max(0, currentValue - startingAmount)
    remainingAmount = Math.max(0, targetAmount - currentValue)
    progressPercent = Math.min(100, (gainedAmount / climbSpan) * 100)
    neededPerMonth = remainingAmount <= 0 ? 0 : remainingAmount / Math.max(1, daysUntilDeadline / AVERAGE_DAYS_PER_MONTH)
    paceRatio = neededPerMonth <= 0 ? 1 : monthlyAllocation / Math.max(neededPerMonth, 1)
    projectedMonthsLeft = monthlyAllocation > 0 && remainingAmount > 0 ? Math.ceil(remainingAmount / monthlyAllocation) : remainingAmount > 0 ? null : 0
    projectedCompletionDate = projectedMonthsLeft == null ? null : formatIsoDate(addDays(now, Math.round(projectedMonthsLeft * AVERAGE_DAYS_PER_MONTH)))
    canAddEntries = false
  } else {
    currentValue = startingAmount + manualProgress
    remainingAmount = Math.max(0, targetAmount - currentValue)
    progressPercent = targetAmount > 0 ? Math.min(100, (currentValue / targetAmount) * 100) : 0
    neededPerMonth = remainingAmount <= 0 ? 0 : remainingAmount / Math.max(1, daysUntilDeadline / AVERAGE_DAYS_PER_MONTH)
    paceRatio = neededPerMonth <= 0 ? 1 : monthlyAllocation / Math.max(neededPerMonth, 1)
    projectedMonthsLeft = monthlyAllocation > 0 && remainingAmount > 0 ? Math.ceil(remainingAmount / monthlyAllocation) : remainingAmount > 0 ? null : 0
    projectedCompletionDate = projectedMonthsLeft == null ? null : formatIsoDate(addDays(now, Math.round(projectedMonthsLeft * AVERAGE_DAYS_PER_MONTH)))
    linkedSummary = linkedPocketName
  }

  const isCompleted =
    goal.status === "completed" ||
    goal.status === "archived" ||
    (goalKind === "debt_payoff" ? currentValue <= targetBalance : remainingAmount <= 0)

  let health: GoalHealth
  if (isCompleted) {
    health = "completed"
  } else if (daysUntilDeadline <= 0 && remainingAmount > 0) {
    health = "behind"
  } else if (daysUntilDeadline <= 90 && paceRatio >= 1) {
    health = "due_soon"
  } else if (paceRatio >= 1.05) {
    health = "on_track"
  } else if (paceRatio >= 0.9) {
    health = "tight"
  } else {
    health = "behind"
  }

  const healthLabelMap: Record<GoalHealth, string> = {
    on_track: "On Track",
    tight: "Tight",
    behind: "Behind",
    due_soon: "Due Soon",
    completed: "Completed",
  }

  const nextBestActionMap: Record<GoalKind, Record<GoalHealth, string>> = {
    savings_target: {
      on_track: "Keep the monthly plan steady.",
      tight: "This one works, but there is very little buffer.",
      behind: "Add a contribution or move the deadline.",
      due_soon: "This deadline is close, so keep it funded.",
      completed: "Archive it when you are ready and start the next one.",
    },
    pocket_funding: {
      on_track: "Keep funding this reserve at the current pace.",
      tight: "The reserve is doable, but the margin is thin.",
      behind: "Add a contribution or lower the pressure on this reserve.",
      due_soon: "This pocket goal is getting close enough to watch weekly.",
      completed: "The reserve is funded. Archive it when it no longer needs attention.",
    },
    debt_payoff: {
      on_track: "Your payoff pace is healthy for this debt.",
      tight: "One smaller payment month could push this behind.",
      behind: "Raise the planned payment or extend the date.",
      due_soon: "The payoff date is close. Keep this debt visible.",
      completed: "This payoff target is done.",
    },
    net_worth_target: {
      on_track: "Net worth is moving in the right direction.",
      tight: "This target is possible, but there is little room for drift.",
      behind: "Raise the monthly plan or move the target date.",
      due_soon: "The target date is close enough to review now.",
      completed: "You reached this net worth target.",
    },
  }

  const section: GoalBoardSection = isCompleted
    ? "completed"
    : daysUntilDeadline <= 90
      ? "dueSoon"
      : "inProgress"

  const urgencyScore = daysUntilDeadline <= 0 ? 400 : Math.max(0, 180 - daysUntilDeadline)
  const pacePenalty = health === "behind" ? 220 : health === "tight" ? 120 : health === "due_soon" ? 80 : 0
  const remainingWeight = Math.min(180, remainingAmount / 50)
  const priorityWeight = (goal.priority ?? 2) * 20

  return {
    ...goal,
    displayLabel,
    goalKind,
    targetAmount,
    targetBalance,
    startingAmount,
    manualProgress,
    currentValue,
    remainingAmount,
    progressPercent,
    monthsLeft,
    daysUntilDeadline,
    neededPerMonth,
    projectedMonthsLeft,
    projectedCompletionDate,
    paceRatio,
    health,
    healthLabel: healthLabelMap[health],
    section,
    nextBestAction: nextBestActionMap[goalKind][health],
    rankingScore: urgencyScore + pacePenalty + remainingWeight + priorityWeight,
    currentValueLabel: labels.currentLabel,
    targetValueLabel: labels.targetLabel,
    kindLabel: labels.kindLabel,
    linkedSummary,
    canAddEntries,
  }
}

export function summarizeGoals(goals: GoalRecord[], context: GoalContext, now = new Date()) {
  const derived = goals.map((goal) => deriveGoal(goal, context, now))
  const activeGoals = derived.filter((goal) => goal.section !== "completed")
  const completedGoals = derived.filter((goal) => goal.section === "completed")
  const dueSoonGoals = derived.filter((goal) => goal.section === "dueSoon")
  const onTrackGoals = activeGoals.filter((goal) => goal.health === "on_track" || goal.health === "due_soon")
  const netWorthGoal = derived.find((goal) => goal.goalKind === "net_worth_target" && goal.section !== "completed") ?? null
  const debtPayoffGoals = derived.filter((goal) => goal.goalKind === "debt_payoff" && goal.section !== "completed")

  const nextGoalToFund = [...activeGoals].sort((a, b) => b.rankingScore - a.rankingScore)[0] ?? null

  return {
    derived,
    activeGoals,
    completedGoals,
    dueSoonGoals,
    onTrackGoals,
    debtPayoffGoals,
    netWorthGoal,
    totalTarget: activeGoals.reduce((sum, goal) => sum + (goal.goalKind === "debt_payoff" ? goal.startingAmount : goal.targetAmount), 0),
    totalMonthlyPlan: activeGoals.reduce((sum, goal) => sum + parseNumeric(goal.monthly_allocation), 0),
    totalCurrentValue: activeGoals.reduce((sum, goal) => {
      if (goal.goalKind === "debt_payoff") return sum + Math.max(0, goal.startingAmount - goal.currentValue)
      return sum + goal.currentValue
    }, 0),
    nextGoalToFund,
  }
}
