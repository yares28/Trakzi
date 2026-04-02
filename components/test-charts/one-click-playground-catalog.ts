import type {
  TestChartsReceiptTransaction,
  TestChartsTransaction,
} from "@/lib/charts/aggregations"
import type { FriendsBundleSummary } from "@/lib/charts/friends-aggregations"
import type { PocketsBundleResponse, PocketItemWithTotals } from "@/lib/types/pockets"

export type PlaygroundVisual =
  | {
      kind: "trend"
      points: Array<{ label: string; value: number }>
      comparePoints?: Array<{ label: string; value: number }>
      formatter?: "currency" | "percent" | "number"
    }
  | {
      kind: "bars"
      items: Array<{ label: string; value: number; secondaryValue?: number }>
      formatter?: "currency" | "percent" | "number"
    }
  | {
      kind: "heatmap"
      xLabels: string[]
      yLabels: string[]
      cells: Array<{ x: string; y: string; value: number }>
    }
  | {
      kind: "gauge"
      value: number
      target?: number
    }
  | {
      kind: "scatter"
      points: Array<{ x: number; y: number; label: string }>
      xLabel: string
      yLabel: string
    }
  | {
      kind: "dumbbell"
      items: Array<{ label: string; start: number; end: number }>
      formatter?: "currency" | "percent" | "number"
    }
  | {
      kind: "bullet"
      items: Array<{ label: string; value: number; target: number; max?: number }>
      formatter?: "currency" | "percent" | "number"
    }
  | {
      kind: "dotPlot"
      items: Array<{ label: string; value: number; reference?: number }>
      formatter?: "currency" | "percent" | "number"
    }
  | {
      kind: "rangePlot"
      items: Array<{ label: string; start: number; end: number; marker?: number }>
      formatter?: "currency" | "percent" | "number"
    }
  | {
      kind: "arrowPlot"
      items: Array<{ label: string; start: number; end: number }>
      formatter?: "currency" | "percent" | "number"
    }
  | {
      kind: "groupedBars"
      keys: string[]
      groups: Array<{ label: string; values: Array<{ key: string; value: number }> }>
      formatter?: "currency" | "percent" | "number"
    }
  | {
      kind: "stackedBars"
      keys: string[]
      items: Array<{ label: string; segments: Array<{ key: string; value: number }> }>
      formatter?: "currency" | "percent" | "number"
    }
  | {
      kind: "splitBars"
      items: Array<{ label: string; left: number; right: number; leftLabel?: string; rightLabel?: string }>
      formatter?: "currency" | "percent" | "number"
    }
  | {
      kind: "treemap"
      items: Array<{ label: string; value: number }>
      formatter?: "currency" | "percent" | "number"
    }
  | {
      kind: "boxplot"
      items: Array<{ label: string; min: number; q1: number; median: number; q3: number; max: number }>
      formatter?: "currency" | "percent" | "number"
    }
  | {
      kind: "funnel"
      steps: Array<{ label: string; value: number }>
      formatter?: "currency" | "percent" | "number"
    }
  | {
      kind: "sankey"
      nodes: Array<{ id: string; label: string; column: number }>
      links: Array<{ source: string; target: string; value: number }>
      formatter?: "currency" | "percent" | "number"
    }
  | {
      kind: "sunburst"
      nodes: Array<{ label: string; value: number; children?: Array<{ label: string; value: number }> }>
      formatter?: "currency" | "percent" | "number"
    }
  | {
      kind: "parallel"
      axes: string[]
      lines: Array<{ label: string; values: number[] }>
    }
  | {
      kind: "pictorialBar"
      items: Array<{ label: string; value: number; max?: number }>
      formatter?: "currency" | "percent" | "number"
    }
  | {
      kind: "waterfall"
      steps: Array<{ label: string; value: number; isTotal?: boolean }>
      formatter?: "currency" | "percent" | "number"
    }
  | {
      kind: "rankedList"
      items: Array<{ label: string; value: number; context?: string }>
      formatter?: "currency" | "percent" | "number"
    }

export type IdeaManifestChart = {
  id: string
  title: string
  pageDomain: string
  level: "Easy" | "Medium" | "High"
  chartType: string
  coreQuestion: string
  whyItMatters: string
  primaryDataNeeded: string
  crossFeature: string
  whyOriginal: string
  extractionConfidence: "High" | "Medium" | "Low"
}

export type IdeaLabGoal = {
  id: number
  category: string
  label: string | null
  targetAmount: number
  deadline: string
  monthlyAllocation: number
  status: string
}

export type IdeaLabChallengeGroup = {
  id: string
  name: string
  isPublic: boolean
  inviteCode: string
  metrics: string[]
  members: Array<{
    userId: string
    displayName: string
    totalPoints: number
    joinedAt: string
  }>
  results: Array<{
    userId: string
    month: string
    metric: string
    score: number
    points: number
  }>
}

export interface IdeaLabBundleResponse {
  manifest: IdeaManifestChart[]
  approvedManifest: IdeaManifestChart[]
  transactions: TestChartsTransaction[]
  receiptTransactions: TestChartsReceiptTransaction[]
  friends: FriendsBundleSummary
  pockets: PocketsBundleResponse
  goals: IdeaLabGoal[]
  challengeGroups: IdeaLabChallengeGroup[]
}

export interface PlaygroundCardModel {
  id: string
  title: string
  eyebrow: string
  question: string
  insight: string
  metricLabel: string
  metricValue: string
  tags: string[]
  visual: PlaygroundVisual
  domain: string
  level: "Easy" | "Medium" | "High"
  chartType: string
  crossFeature: string
  primaryDataNeeded: string
  whyOriginal: string
  extractionConfidence: "High" | "Medium" | "Low"
}

export interface PlaygroundGroup {
  id: string
  title: string
  description: string
  cards: PlaygroundCardModel[]
}

export interface PlaygroundSection {
  id:
    | "analytics"
    | "fridge"
    | "savings"
    | "debt"
    | "goals"
    | "pockets"
    | "friendRooms"
    | "challenges"
    | "crossFeature"
  title: string
  description: string
  accent: string
  count: number
  groups: PlaygroundGroup[]
}

interface BuildOptions {
  formatCurrency: (
    amount: number,
    options?: {
      minimumFractionDigits?: number
      maximumFractionDigits?: number
      showSign?: boolean
      forceFullNumber?: boolean
    }
  ) => string
}

interface ChartPrototype {
  metricLabel: string
  metricValue: string
  visual: PlaygroundVisual
}

type EnrichedTransaction = {
  id: number
  date: Date
  dateKey: string
  monthKey: string
  description: string
  merchant: string
  amount: number
  absAmount: number
  balance: number | null
  workingBalance: number
  category: string
  weekday: number
  weekOfMonth: number
}

type EnrichedReceiptLine = {
  id: number
  receiptId: string
  receiptDate: string
  monthKey: string
  store: string
  item: string
  quantity: number
  totalPrice: number
  pricePerUnit: number
  category: string
  categoryType: string
  weekday: number
  weekOfMonth: number
  hour: number | null
}

type GoalSummary = {
  label: string
  category: string
  targetAmount: number
  monthlyAllocation: number
  monthsLeft: number
  requiredMonthly: number
  pressureScore: number
}

type PocketSummary = {
  label: string
  type: string
  total: number
  fixed: number
  variable: number
  financingShare: number
  valueSignal: number
}

type RoomSummary = {
  label: string
  totalShared: number
  yourBalance: number
  memberCount: number
  recentActivityCount: number
}

type SpendingChallengeSummary = {
  label: string
  target: number
  current: number
  participantCount: number
  daysRemaining: number
  paceRatio: number
}

type ChallengeGroupSummary = {
  label: string
  memberCount: number
  metricCount: number
  totalPoints: number
  averageScore: number
  averagePoints: number
}

type Context = ReturnType<typeof buildContext>

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const SECTION_ORDER: PlaygroundSection["id"][] = [
  "analytics",
  "fridge",
  "savings",
  "debt",
  "goals",
  "pockets",
  "friendRooms",
  "challenges",
  "crossFeature",
]

const SECTION_COPY: Record<PlaygroundSection["id"], { title: string; description: string }> = {
  analytics: {
    title: "Analytics",
    description: "General cash-flow, category, merchant, and budget-pressure cards grounded in imported transactions.",
  },
  fridge: {
    title: "Fridge",
    description: "Receipt and basket cards using real store, item, and category detail from the grocery pipeline.",
  },
  savings: {
    title: "Savings",
    description: "Buffer, balance-floor, and runway cards built from the same monthly balance history used elsewhere in the product.",
  },
  debt: {
    title: "Debt",
    description: "Debt-like cards grounded in debt-tagged transactions plus financing and mortgage-like pocket totals where available.",
  },
  goals: {
    title: "Goals",
    description: "Savings goal cards driven by target amounts, deadlines, allocations, and live surplus context from imported transactions.",
  },
  pockets: {
    title: "Pockets",
    description: "Ownership-cost cards combining vehicles, properties, and other pocket totals with their tab-level composition.",
  },
  friendRooms: {
    title: "Friend Rooms",
    description: "Shared-expense cards built from live rooms, balances, split activity, and recent room behavior.",
  },
  challenges: {
    title: "Challenges",
    description: "Challenge cards using active spending challenges plus challenge-group score history where the user is already a member.",
  },
  crossFeature: {
    title: "Cross-Feature",
    description: "System-interaction cards that deliberately connect financial behavior across goals, savings, pockets, rooms, and challenges.",
  },
}

export const APPROVED_ONE_CLICK_TITLES = [
  "Small-Transaction Load by Category",
  "Category Volatility Grid",
  "Category Share Shift Ladder",
  "Balance Pressure Calendar by Weekday Pair",
  "Income Coverage Ladder by Essential Category",
  "Merchant Budget Miss Map",
  "Category Timing Skew Ladder",
  "Overspend Streak by Category",
  "Basket Size vs Shopping Hour",
  "Store Freshness Mix",
  "Store Category Price Advantage Map",
  "Store Category Breadth Efficiency",
  "Category Unit-Price Outlier Tracker",
  "Store Price Dispersion Index",
  "Quantity Discount Failure Map",
  "Category Price Season Window",
  "Floor Volatility by Month",
  "Low-Balance Weekday Exposure",
  "Fixed-Bill Retention Rate",
  "Transfer Rescue Frequency",
  "Debt Share of Income by Period Type",
  "Goal Deadline Pressure Ladder",
  "Allocation Coverage by Goal Label",
  "Goal Deadline Order vs Target Size",
  "Goal Horizon Balance Index",
  "Pocket Type Burden vs Income",
  "Metric Breadth by Member",
  "Grocery Store Mix vs Challenge Fridge Score",
  "Store Price Floor Reliability",
  "Cushion Depth vs Essential Median",
  "Paycheck-to-Paycheck Carry Ratio",
  "Store Visit Mission Drift",
  "Low-Balance Rescue Source Mix",
  "Debt Ticket Drift by Stream",
] as const

const APPROVED_ONE_CLICK_DESCRIPTION: Record<PlaygroundSection["id"], string> = {
  analytics: "Selected one-click analytics picks, preserved in implementation memory.",
  fridge: "Selected one-click fridge picks, kept as production-shell implementation candidates.",
  savings: "Selected one-click savings picks, preserved as part of the implementation set.",
  debt: "Selected one-click debt picks, kept visible inside the build queue.",
  goals: "Selected one-click goal picks, now treated as implementation candidates inside the queue.",
  pockets: "Selected one-click pocket picks, promoted into the implementation queue.",
  friendRooms: "Selected one-click room picks.",
  challenges: "Selected one-click challenge picks.",
  crossFeature: "Selected one-click cross-feature picks.",
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}

function mean(values: number[]) {
  return values.length ? sum(values) / values.length : 0
}

function median(values: number[]) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
}

function percentile(values: number[], ratio: number) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * ratio)))
  return sorted[index]
}

function boxStats(values: number[]) {
  if (!values.length) {
    return { min: 0, q1: 0, median: 0, q3: 0, max: 0 }
  }
  return {
    min: Math.min(...values),
    q1: percentile(values, 0.25),
    median: median(values),
    q3: percentile(values, 0.75),
    max: Math.max(...values),
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function parseIsoDate(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(Date.UTC(year, (month || 1) - 1, day || 1))
}

function toMonthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`
}

function toMonthLabel(monthKey: string) {
  const [, month] = monthKey.split("-")
  return MONTH_NAMES[Math.max(0, Number(month) - 1)] ?? monthKey
}

function getWeekOfMonth(date: Date) {
  return Math.min(5, Math.max(1, Math.ceil(date.getUTCDate() / 7)))
}

function normalizePhrase(value: string) {
  return value
    .toLowerCase()
    .replace(/\d+/g, " ")
    .replace(/[^a-zA-Z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function normalizeMerchant(value: string) {
  return normalizePhrase(value).split(" ").slice(0, 3).join(" ") || "other merchant"
}

function normalizeItem(value: string) {
  return normalizePhrase(value).split(" ").slice(0, 4).join(" ") || "other item"
}

function normalizeBroadType(value: string) {
  const normalized = normalizePhrase(value)
  if (!normalized) return "Other"
  if (/(drink|beverage|juice|soda|coffee|tea|water)/.test(normalized)) return "Drinks"
  if (/(fruit|veg|vegetable|produce|fresh|food|meat|fish|bakery|dairy|grocery|meal|snack)/.test(normalized)) return "Food"
  return "Other"
}

function titleCase(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ")
}

function hashString(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0
  }
  return Math.abs(hash)
}

function pickBySeed<T>(items: T[], count: number, seed: number) {
  if (items.length <= count) return items
  const start = seed % items.length
  const rotated = [...items.slice(start), ...items.slice(0, start)]
  return rotated.slice(0, count)
}

function inferSectionId(pageDomain: string): PlaygroundSection["id"] {
  switch (pageDomain) {
    case "Analytics":
      return "analytics"
    case "Fridge":
      return "fridge"
    case "Savings":
      return "savings"
    case "Debt":
      return "debt"
    case "Goals":
      return "goals"
    case "Pockets":
      return "pockets"
    case "Friend Rooms":
      return "friendRooms"
    case "Challenges":
      return "challenges"
    default:
      return "crossFeature"
  }
}

function inferTopic(row: IdeaManifestChart) {
  const title = `${row.title} ${row.coreQuestion}`.toLowerCase()

  if (title.includes("merchant")) return "merchant"
  if (title.includes("store")) return "store"
  if (title.includes("room") || title.includes("shared") || title.includes("split") || title.includes("settlement")) return "room"
  if (title.includes("challenge") || title.includes("leaderboard") || title.includes("metric") || title.includes("points")) return "challenge"
  if (title.includes("goal")) return "goal"
  if (title.includes("pocket") || title.includes("vehicle") || title.includes("property") || title.includes("maintenance") || title.includes("financing")) return "pocket"
  if (title.includes("debt")) return "debt"
  if (title.includes("balance") || title.includes("buffer") || title.includes("cushion") || title.includes("runway") || title.includes("surplus") || title.includes("low-balance") || title.includes("safety")) return "balance"
  if (title.includes("category")) return "category"

  const sectionId = inferSectionId(row.pageDomain)
  if (sectionId === "fridge") return "store"
  if (sectionId === "goals") return "goal"
  if (sectionId === "pockets") return "pocket"
  if (sectionId === "friendRooms") return "room"
  if (sectionId === "challenges") return "challenge"
  if (sectionId === "debt") return "debt"
  if (sectionId === "savings") return "balance"

  return "category"
}

function buildContext(bundle: IdeaLabBundleResponse) {
  const transactions = [...bundle.transactions]
    .sort((a, b) => (a.date === b.date ? a.id - b.id : a.date.localeCompare(b.date)))
    .map<EnrichedTransaction>((transaction) => {
      const date = parseIsoDate(transaction.date)
      return {
        id: transaction.id,
        date,
        dateKey: transaction.date,
        monthKey: toMonthKey(date),
        description: transaction.description,
        merchant: normalizeMerchant(transaction.description),
        amount: transaction.amount,
        absAmount: Math.abs(transaction.amount),
        balance: transaction.balance,
        workingBalance: 0,
        category: transaction.category || "Other",
        weekday: (date.getUTCDay() + 6) % 7,
        weekOfMonth: getWeekOfMonth(date),
      }
    })

  let runningBalance = 0
  const enrichedTransactions = transactions.map((transaction) => {
    if (transaction.balance !== null && Number.isFinite(transaction.balance)) {
      runningBalance = transaction.balance
    } else {
      runningBalance += transaction.amount
    }
    return {
      ...transaction,
      workingBalance: runningBalance,
    }
  })

  const expenses = enrichedTransactions.filter((transaction) => transaction.amount < 0)
  const incomes = enrichedTransactions.filter((transaction) => transaction.amount > 0)

  const receiptLines = bundle.receiptTransactions.map<EnrichedReceiptLine>((line) => {
    const date = parseIsoDate(line.receiptDate)
    return {
      id: line.id,
      receiptId: line.receiptId,
      receiptDate: line.receiptDate,
      monthKey: toMonthKey(date),
      store: line.storeName?.trim() || "Unknown store",
      item: normalizeItem(line.description),
      quantity: Math.max(0, Number(line.quantity) || 0),
      totalPrice: Math.max(0, Number(line.totalPrice) || 0),
      pricePerUnit:
        Number(line.pricePerUnit) > 0
          ? Number(line.pricePerUnit)
          : Math.max(0, Number(line.totalPrice) || 0) / Math.max(1, Number(line.quantity) || 1),
      category: line.categoryName?.trim() || "Other",
      categoryType: line.categoryTypeName?.trim() || "Unclassified",
      weekday: (date.getUTCDay() + 6) % 7,
      weekOfMonth: getWeekOfMonth(date),
      hour: line.receiptTime ? Number.parseInt(line.receiptTime.slice(0, 2), 10) : null,
    }
  })

  const monthKeys = [...new Set([...enrichedTransactions.map((transaction) => transaction.monthKey), ...receiptLines.map((line) => line.monthKey)])]
    .sort()
    .slice(-12)

  const monthExpenseTotals = new Map<string, number>()
  const monthIncomeTotals = new Map<string, number>()
  const monthNetTotals = new Map<string, number>()
  const monthCategorySpend = new Map<string, Map<string, number>>()
  const monthMerchantSpend = new Map<string, Map<string, number>>()
  const categoryTotals = new Map<string, number>()
  const merchantTotals = new Map<string, number>()
  const weekdayExpenseTotals = WEEKDAY_NAMES.map(() => 0)
  const lowBalanceHeatmapCells: Array<{ x: string; y: string; value: number }> = []

  for (const transaction of expenses) {
    monthExpenseTotals.set(transaction.monthKey, (monthExpenseTotals.get(transaction.monthKey) ?? 0) + transaction.absAmount)
    weekdayExpenseTotals[transaction.weekday] += transaction.absAmount

    const categoryMap = monthCategorySpend.get(transaction.monthKey) ?? new Map<string, number>()
    categoryMap.set(transaction.category, (categoryMap.get(transaction.category) ?? 0) + transaction.absAmount)
    monthCategorySpend.set(transaction.monthKey, categoryMap)
    categoryTotals.set(transaction.category, (categoryTotals.get(transaction.category) ?? 0) + transaction.absAmount)

    const merchantMap = monthMerchantSpend.get(transaction.monthKey) ?? new Map<string, number>()
    merchantMap.set(transaction.merchant, (merchantMap.get(transaction.merchant) ?? 0) + transaction.absAmount)
    monthMerchantSpend.set(transaction.monthKey, merchantMap)
    merchantTotals.set(transaction.merchant, (merchantTotals.get(transaction.merchant) ?? 0) + transaction.absAmount)
  }

  for (const transaction of incomes) {
    monthIncomeTotals.set(transaction.monthKey, (monthIncomeTotals.get(transaction.monthKey) ?? 0) + transaction.amount)
  }

  for (const monthKey of monthKeys) {
    monthNetTotals.set(
      monthKey,
      (monthIncomeTotals.get(monthKey) ?? 0) - (monthExpenseTotals.get(monthKey) ?? 0)
    )

    const monthTransactions = enrichedTransactions.filter((transaction) => transaction.monthKey === monthKey)
    const balances = monthTransactions.map((transaction) => transaction.workingBalance)
    const threshold = percentile(balances, 0.25)
    for (const weekday of WEEKDAY_NAMES) {
      for (let week = 1; week <= 5; week += 1) {
        lowBalanceHeatmapCells.push({
          x: weekday,
          y: `${toMonthLabel(monthKey)} W${week}`,
          value: monthTransactions.filter(
            (transaction) =>
              transaction.weekday === WEEKDAY_NAMES.indexOf(weekday) &&
              transaction.weekOfMonth === week &&
              transaction.workingBalance <= threshold
          ).length,
        })
      }
    }
  }

  const balanceSnapshots = monthKeys.map((monthKey) => {
    const monthTransactions = enrichedTransactions.filter((transaction) => transaction.monthKey === monthKey)
    const balances = monthTransactions.map((transaction) => transaction.workingBalance)
    const opening = monthTransactions[0]?.workingBalance ?? 0
    const closing = monthTransactions[monthTransactions.length - 1]?.workingBalance ?? opening
    const floor = balances.length ? Math.min(...balances) : opening
    const lowBalanceDays = new Set(
      monthTransactions
        .filter((transaction) => transaction.workingBalance <= percentile(balances, 0.25))
        .map((transaction) => transaction.dateKey)
    ).size
    return {
      monthKey,
      label: toMonthLabel(monthKey),
      opening,
      closing,
      floor,
      net: monthNetTotals.get(monthKey) ?? 0,
      lowBalanceDays,
    }
  })

  const storeTotals = new Map<string, number>()
  const storeVisitCounts = new Map<string, number>()
  const receiptCategoryTotals = new Map<string, number>()
  const storeCategorySpend = new Map<string, Map<string, number>>()
  const storeUnitPriceGroups = new Map<string, number[]>()
  const basketByReceipt = new Map<string, { spend: number; uniqueItems: Set<string>; store: string; hour: number | null }>()

  for (const line of receiptLines) {
    storeTotals.set(line.store, (storeTotals.get(line.store) ?? 0) + line.totalPrice)
    receiptCategoryTotals.set(line.category, (receiptCategoryTotals.get(line.category) ?? 0) + line.totalPrice)

    const storeCategoryMap = storeCategorySpend.get(line.store) ?? new Map<string, number>()
    storeCategoryMap.set(line.category, (storeCategoryMap.get(line.category) ?? 0) + line.totalPrice)
    storeCategorySpend.set(line.store, storeCategoryMap)

    const unitPriceValues = storeUnitPriceGroups.get(line.store) ?? []
    unitPriceValues.push(line.pricePerUnit)
    storeUnitPriceGroups.set(line.store, unitPriceValues)

    const basket = basketByReceipt.get(line.receiptId) ?? {
      spend: 0,
      uniqueItems: new Set<string>(),
      store: line.store,
      hour: line.hour,
    }
    basket.spend += line.totalPrice
    basket.uniqueItems.add(line.item)
    basketByReceipt.set(line.receiptId, basket)
  }

  for (const basket of basketByReceipt.values()) {
    storeVisitCounts.set(basket.store, (storeVisitCounts.get(basket.store) ?? 0) + 1)
  }

  const categorySummaries = [...categoryTotals.entries()]
    .map(([label, total]) => {
      const monthValues = monthKeys.map((monthKey) => monthCategorySpend.get(monthKey)?.get(label) ?? 0)
      const recent = monthValues.at(-1) ?? 0
      const previous = mean(monthValues.slice(-4, -1)) || monthValues.at(-2) || 0
      return {
        label,
        total,
        recent,
        previous,
        box: boxStats(monthValues),
      }
    })
    .sort((a, b) => b.total - a.total)

  const merchantSummaries = [...merchantTotals.entries()]
    .map(([label, total]) => {
      const monthValues = monthKeys.map((monthKey) => monthMerchantSpend.get(monthKey)?.get(label) ?? 0)
      const recent = monthValues.at(-1) ?? 0
      const previous = mean(monthValues.slice(-4, -1)) || monthValues.at(-2) || 0
      return {
        label,
        total,
        recent,
        previous,
        box: boxStats(monthValues),
      }
    })
    .sort((a, b) => b.total - a.total)

  const storeSummaries = [...storeTotals.entries()]
    .map(([label, total]) => {
      const visits = storeVisitCounts.get(label) ?? 0
      const unitPrices = storeUnitPriceGroups.get(label) ?? []
      const categoryMap = storeCategorySpend.get(label) ?? new Map<string, number>()
      const segments = [...categoryMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([key, value]) => ({ key, value }))
      return {
        label,
        total,
        recent: visits,
        previous: visits ? total / visits : 0,
        box: boxStats(unitPrices),
        segments,
      }
    })
    .sort((a, b) => b.total - a.total)

  const receiptCategorySummaries = [...receiptCategoryTotals.entries()]
    .map(([label, total]) => ({
      label,
      total,
      recent: total,
      previous: mean(
        monthKeys.map((monthKey) =>
          receiptLines
            .filter((line) => line.monthKey === monthKey && line.category === label)
            .reduce((subtotal, line) => subtotal + line.totalPrice, 0)
        )
      ),
      box: boxStats(
        monthKeys.map((monthKey) =>
          receiptLines
            .filter((line) => line.monthKey === monthKey && line.category === label)
            .reduce((subtotal, line) => subtotal + line.totalPrice, 0)
        )
      ),
    }))
    .sort((a, b) => b.total - a.total)

  const goalSummaries: GoalSummary[] = bundle.goals.map((goal) => {
    const deadline = parseIsoDate(goal.deadline)
    const monthsLeft = Math.max(
      1,
      (deadline.getUTCFullYear() - new Date().getUTCFullYear()) * 12 +
        (deadline.getUTCMonth() - new Date().getUTCMonth()) +
        1
    )
    const requiredMonthly = goal.targetAmount / monthsLeft
    const pressureScore = requiredMonthly ? (requiredMonthly / Math.max(goal.monthlyAllocation, 1)) * 100 : 0
    return {
      label: goal.label || goal.category,
      category: goal.category,
      targetAmount: goal.targetAmount,
      monthlyAllocation: goal.monthlyAllocation,
      monthsLeft,
      requiredMonthly,
      pressureScore,
    }
  })

  const pocketSummaries: PocketSummary[] = [
    ...bundle.pockets.vehicles,
    ...bundle.pockets.properties,
    ...bundle.pockets.otherPockets,
  ].map((pocket: PocketItemWithTotals) => {
    const totals = pocket.totals ?? {}
    const fixed =
      (totals.financing ?? 0) +
      (totals.insurance ?? 0) +
      (totals.certificate ?? 0) +
      (totals.mortgage ?? 0) +
      (totals.rent ?? 0) +
      (totals.utilities ?? 0)
    const total = pocket.totalInvested ?? 0
    const variable = Math.max(0, total - fixed)
    const financingShare = total ? (fixed / total) * 100 : 0
    const metadata = pocket.metadata as Record<string, unknown>
    const valueSignal =
      typeof metadata.estimatedValue === "number"
        ? metadata.estimatedValue
        : typeof metadata.priceBought === "number"
          ? metadata.priceBought
          : total

    return {
      label: pocket.name,
      type: pocket.type,
      total,
      fixed,
      variable,
      financingShare,
      valueSignal,
    }
  })

  const roomSummaries: RoomSummary[] = bundle.friends.rooms.map((room) => ({
    label: room.name,
    totalShared: room.totalShared,
    yourBalance: Math.abs(room.yourBalance),
    memberCount: room.memberCount,
    recentActivityCount: room.recentActivity.length,
  }))

  const spendingChallengeSummaries: SpendingChallengeSummary[] = bundle.friends.challenges.map((challenge) => {
    const current = sum(challenge.participants.map((participant) => participant.current_spend))
    const participantCount = challenge.participants.length
    const elapsedDays = Math.max(
      1,
      Math.ceil((Date.now() - new Date(challenge.starts_at).getTime()) / 86400000)
    )
    const totalDays = Math.max(
      1,
      Math.ceil((new Date(challenge.ends_at).getTime() - new Date(challenge.starts_at).getTime()) / 86400000)
    )
    const paceRatio = challenge.target_amount ? (current / Math.max(challenge.target_amount * (elapsedDays / totalDays), 1)) * 100 : 0

    return {
      label: challenge.title,
      target: challenge.target_amount,
      current,
      participantCount,
      daysRemaining: challenge.days_remaining,
      paceRatio,
    }
  })

  const challengeGroupSummaries: ChallengeGroupSummary[] = bundle.challengeGroups.map((group) => {
    const totalPoints = sum(group.members.map((member) => member.totalPoints))
    const scores = group.results.map((result) => result.score)
    const points = group.results.map((result) => result.points)
    return {
      label: group.name,
      memberCount: group.members.length,
      metricCount: group.metrics.length,
      totalPoints,
      averageScore: mean(scores),
      averagePoints: mean(points),
    }
  })

  const debtCategoryRegex = /(debt|loan|credit|mortgage|interest|finance|financing)/i
  const debtFromTransactions = expenses
    .filter((transaction) => debtCategoryRegex.test(transaction.category) || debtCategoryRegex.test(transaction.description))
    .reduce<Map<string, number>>((accumulator, transaction) => {
      const key = transaction.category || "Debt"
      accumulator.set(key, (accumulator.get(key) ?? 0) + transaction.absAmount)
      return accumulator
    }, new Map())

  const debtFromPockets = pocketSummaries
    .filter((pocket) => pocket.financingShare > 0)
    .map((pocket) => ({ label: pocket.label, value: pocket.fixed }))

  const debtSummaries = [
    ...[...debtFromTransactions.entries()].map(([label, value]) => ({ label, value })),
    ...debtFromPockets,
  ]
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  const monthlySpendSeries = monthKeys.map((monthKey) => ({
    label: toMonthLabel(monthKey),
    value: monthExpenseTotals.get(monthKey) ?? 0,
  }))
  const monthlyIncomeSeries = monthKeys.map((monthKey) => ({
    label: toMonthLabel(monthKey),
    value: monthIncomeTotals.get(monthKey) ?? 0,
  }))
  const monthlyNetSeries = monthKeys.map((monthKey) => ({
    label: toMonthLabel(monthKey),
    value: monthNetTotals.get(monthKey) ?? 0,
  }))

  const storeHeatmapCells = WEEKDAY_NAMES.flatMap((weekday, weekdayIndex) =>
    storeSummaries.slice(0, 5).map((store) => ({
      x: weekday,
      y: store.label,
      value: receiptLines
        .filter((line) => line.store === store.label && line.weekday === weekdayIndex)
        .reduce((subtotal, line) => subtotal + line.totalPrice, 0),
    }))
  )

  const hourHeatmapCells = Array.from({ length: 8 }, (_, index) => index * 3).flatMap((hourStart) =>
    WEEKDAY_NAMES.map((weekday, weekdayIndex) => ({
      x: `${String(hourStart).padStart(2, "0")}:00`,
      y: weekday,
      value: receiptLines.filter(
        (line) =>
          line.weekday === weekdayIndex &&
          line.hour !== null &&
          line.hour >= hourStart &&
          line.hour < hourStart + 3
      ).length,
    }))
  )

  const crossFeatureLabels = goalSummaries.slice(0, 4).map((goal, index) => ({
    label: goal.label,
    left: goal.requiredMonthly,
    right: monthlyNetSeries.at(-(index + 1))?.value ?? 0,
  }))

  return {
    enrichedTransactions,
    expenses,
    incomes,
    receiptLines,
    basketSummaries: [...basketByReceipt.values()].map((basket) => ({
      store: basket.store,
      spend: basket.spend,
      uniqueItems: basket.uniqueItems.size,
      hour: basket.hour,
    })),
    monthExpenseTotals,
    monthIncomeTotals,
    monthCategorySpend,
    monthKeys,
    monthlySpendSeries,
    monthlyIncomeSeries,
    monthlyNetSeries,
    balanceSnapshots,
    categorySummaries,
    merchantSummaries,
    storeSummaries,
    receiptCategorySummaries,
    goalSummaries,
    pocketSummaries,
    roomSummaries,
    spendingChallengeSummaries,
    challengeGroupSummaries,
    debtSummaries,
    weekdayExpenseTotals,
    lowBalanceHeatmapCells,
    storeHeatmapCells,
    hourHeatmapCells,
    crossFeatureLabels,
  }
}

function buildRankedItems(
  entries: Array<{ label: string; total?: number; value?: number; recent?: number; previous?: number }>,
  seed: number,
  count = 5
) {
  return pickBySeed(entries, count, seed).map((entry) => ({
    label: entry.label,
    value: entry.total ?? entry.value ?? entry.recent ?? entry.previous ?? 0,
    context:
      entry.recent !== undefined && entry.previous !== undefined
        ? `${round(entry.recent - entry.previous, 1)} delta`
        : undefined,
  }))
}

function buildChartPrototype(row: IdeaManifestChart, context: Context, options: BuildOptions): ChartPrototype {
  const seed = hashString(row.id)
  const sectionId = inferSectionId(row.pageDomain)
  const topic = inferTopic(row)
  const chartType = row.chartType.toLowerCase()

  const categoryItems = context.categorySummaries
  const merchantItems = context.merchantSummaries
  const storeItems = context.storeSummaries
  const goalItems = context.goalSummaries
  const pocketItems = context.pocketSummaries
  const roomItems = context.roomSummaries
  const challengeItems = context.spendingChallengeSummaries
  const challengeGroupItems = context.challengeGroupSummaries
  const balanceItems = context.balanceSnapshots
  const debtItems = context.debtSummaries

  const formatCurrency = options.formatCurrency

  const domainMetricValue = () => {
    switch (sectionId) {
      case "analytics":
        return {
          metricLabel: "Recent spend",
          metricValue: formatCurrency(context.monthlySpendSeries.at(-1)?.value ?? 0, { maximumFractionDigits: 0 }),
        }
      case "fridge":
        return {
          metricLabel: "Top store load",
          metricValue: formatCurrency(storeItems[0]?.total ?? 0, { maximumFractionDigits: 0 }),
        }
      case "savings":
        return {
          metricLabel: "Latest close",
          metricValue: formatCurrency(balanceItems.at(-1)?.closing ?? 0, { maximumFractionDigits: 0 }),
        }
      case "debt":
        return {
          metricLabel: "Debt-like load",
          metricValue: formatCurrency(sum(debtItems.map((item) => item.value)), { maximumFractionDigits: 0 }),
        }
      case "goals":
        return {
          metricLabel: "Active goals",
          metricValue: `${goalItems.length}`,
        }
      case "pockets":
        return {
          metricLabel: "Tracked pockets",
          metricValue: `${pocketItems.length}`,
        }
      case "friendRooms":
        return {
          metricLabel: "Live rooms",
          metricValue: `${roomItems.length}`,
        }
      case "challenges":
        return {
          metricLabel: "Active challenges",
          metricValue: `${challengeItems.length + challengeGroupItems.length}`,
        }
      default:
        return {
          metricLabel: "Cross-feature cards",
          metricValue: "Linked",
        }
    }
  }

  const fallback = domainMetricValue()

  switch (row.title) {
    case "Small-Transaction Load by Category": {
      const threshold = percentile(context.expenses.map((transaction) => transaction.absAmount), 0.35) || 20
      const items = categoryItems
        .map((item) => {
          const small = context.expenses
            .filter((transaction) => transaction.category === item.label && transaction.absAmount <= threshold)
            .reduce((total, transaction) => total + transaction.absAmount, 0)
          const large = Math.max(0, item.total - small)
          return { label: item.label, small, large, total: small + large }
        })
        .filter((item) => item.total > 0)
        .sort((left, right) => right.small - left.small)
        .slice(0, 6)

      return {
        metricLabel: "Highest small-ticket load",
        metricValue: items[0]?.label ?? "None",
        visual: {
          kind: "stackedBars" as const,
          keys: ["Small tickets", "Larger tickets"],
          items: items.map((item) => ({
            label: item.label,
            segments: [
              { key: "Small tickets", value: item.small },
              { key: "Larger tickets", value: item.large },
            ],
          })),
          formatter: "currency",
        },
      }
    }

    case "Balance Pressure Calendar by Weekday Pair": {
      const yLabels = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"]
      const cells = WEEKDAY_NAMES.flatMap((weekday) =>
        yLabels.map((weekLabel, weekIndex) => ({
          x: weekday,
          y: weekLabel,
          value: context.lowBalanceHeatmapCells
            .filter((cell) => cell.x === weekday && cell.y.endsWith(`W${weekIndex + 1}`))
            .reduce((total, cell) => total + cell.value, 0),
        })),
      )
      const topCell = [...cells].sort((left, right) => right.value - left.value)[0]

      return {
        metricLabel: "Most exposed pair",
        metricValue: topCell ? `${topCell.x} ${topCell.y}` : "None",
        visual: {
          kind: "heatmap" as const,
          xLabels: WEEKDAY_NAMES,
          yLabels,
          cells,
        },
      }
    }

    case "Category Share Shift Ladder": {
      const earlyMonths = context.monthKeys.slice(0, Math.max(2, Math.ceil(context.monthKeys.length / 2)))
      const recentMonths = context.monthKeys.slice(-Math.max(2, Math.ceil(context.monthKeys.length / 2)))
      const earlyTotal = Math.max(sum(earlyMonths.map((monthKey) => context.monthExpenseTotals.get(monthKey) ?? 0)), 1)
      const recentTotal = Math.max(sum(recentMonths.map((monthKey) => context.monthExpenseTotals.get(monthKey) ?? 0)), 1)
      const items = categoryItems
        .map((item) => {
          const earlyShare =
            (sum(earlyMonths.map((monthKey) => context.monthCategorySpend.get(monthKey)?.get(item.label) ?? 0)) / earlyTotal) * 100
          const recentShare =
            (sum(recentMonths.map((monthKey) => context.monthCategorySpend.get(monthKey)?.get(item.label) ?? 0)) / recentTotal) * 100
          return { label: item.label, start: round(earlyShare), end: round(recentShare) }
        })
        .sort((left, right) => Math.abs(right.end - right.start) - Math.abs(left.end - left.start))
        .slice(0, 6)

      return {
        metricLabel: "Largest share shift",
        metricValue: items[0]?.label ?? "None",
        visual: {
          kind: "arrowPlot" as const,
          items,
          formatter: "percent",
        },
      }
    }

    case "Income Coverage Ladder by Essential Category": {
      const typicalIncomeEvent = Math.max(mean(context.incomes.map((transaction) => transaction.amount)) || 1, 1)
      const items = categoryItems.slice(0, 6).map((item) => {
        const incomeEventsNeeded = item.recent / typicalIncomeEvent
        return {
          label: item.label,
          value: round(incomeEventsNeeded, 1),
          target: 1,
          max: Math.max(3, Math.ceil(incomeEventsNeeded) + 1),
        }
      })

      return {
        metricLabel: "Hardest category to cover",
        metricValue: items[0] ? `${items[0].value} pays` : "0",
        visual: {
          kind: "bullet" as const,
          items,
          formatter: "number",
        },
      }
    }

    case "Store Category Price Advantage Map": {
      const stores = storeItems.slice(0, 5).map((item) => item.label)
      const categories = context.receiptCategorySummaries.slice(0, 6).map((item) => item.label)
      const cells = categories.flatMap((category) => {
        const categoryLines = context.receiptLines.filter((line) => line.category === category)
        const categoryMedian = Math.max(median(categoryLines.map((line) => line.pricePerUnit)), 0.01)
        return stores.map((store) => {
          const storeMedian = median(categoryLines.filter((line) => line.store === store).map((line) => line.pricePerUnit))
          const advantage = storeMedian > 0 ? round((categoryMedian / storeMedian) * 100) : 0
          return {
            x: category,
            y: store,
            value: advantage,
          }
        })
      })

      return {
        metricLabel: "Best price edge",
        metricValue: `${Math.max(...cells.map((cell) => cell.value), 0)} idx`,
        visual: {
          kind: "heatmap" as const,
          xLabels: categories,
          yLabels: stores,
          cells,
        },
      }
    }

    case "Basket Size vs Shopping Hour": {
      const points = context.basketSummaries
        .filter((basket) => basket.hour !== null)
        .slice(0, 24)
        .map((basket, index) => ({
          label: `${basket.store} basket ${index + 1}`,
          x: basket.hour ?? 0,
          y: basket.spend,
        }))

      return {
        metricLabel: "Average basket",
        metricValue: formatCurrency(mean(points.map((point) => point.y)), { maximumFractionDigits: 0 }),
        visual: {
          kind: "scatter" as const,
          points,
          xLabel: "Shopping hour",
          yLabel: "Basket total",
        },
      }
    }

    case "Store Freshness Mix": {
      const keys = ["Food", "Drinks", "Other"]
      const items = storeItems.slice(0, 5).map((store) => {
        const storeLines = context.receiptLines.filter((line) => line.store === store.label)
        return {
          label: store.label,
          segments: keys.map((key) => ({
            key,
            value: storeLines
              .filter((line) => normalizeBroadType(line.categoryType) === key)
              .reduce((total, line) => total + line.totalPrice, 0),
          })),
        }
      })

      return {
        metricLabel: "Mixed-mission stores",
        metricValue: `${items.length}`,
        visual: {
          kind: "stackedBars" as const,
          keys,
          items,
          formatter: "currency",
        },
      }
    }

    case "Store Category Breadth Efficiency": {
      const items = storeItems.slice(0, 5).map((store) => {
        const storeLines = context.receiptLines.filter((line) => line.store === store.label)
        const distinctCategories = new Set(storeLines.map((line) => line.category)).size
        const receiptCount = new Set(storeLines.map((line) => line.receiptId)).size || 1
        const spend = Math.max(sum(storeLines.map((line) => line.totalPrice)), 1)
        return {
          label: store.label,
          start: round((distinctCategories / spend) * 100, 1),
          end: round(distinctCategories / receiptCount, 1),
        }
      })

      return {
        metricLabel: "Best breadth store",
        metricValue: items[0]?.label ?? "None",
        visual: {
          kind: "dumbbell" as const,
          items,
          formatter: "number",
        },
      }
    }

    case "Category Unit-Price Outlier Tracker": {
      const categoryMedianMap = new Map(
        context.receiptCategorySummaries.map((item) => [
          item.label,
          median(context.receiptLines.filter((line) => line.category === item.label).map((line) => line.pricePerUnit)),
        ]),
      )
      const items = [...new Set(context.receiptLines.map((line) => `${line.category}|||${line.store}`))]
        .map((key) => {
          const [category, store] = key.split("|||")
          const prices = context.receiptLines
            .filter((line) => line.category === category && line.store === store)
            .map((line) => line.pricePerUnit)
          const pairMedian = median(prices)
          const categoryMedian = Math.max(categoryMedianMap.get(category) ?? 0, 0.01)
          const outlierPercent = pairMedian > 0 ? ((pairMedian - categoryMedian) / categoryMedian) * 100 : 0
          return {
            label: `${category} · ${store}`,
            value: round(outlierPercent),
            context: `${round(pairMedian, 2)} /u vs ${round(categoryMedian, 2)} median`,
          }
        })
        .filter((item) => item.value > 0)
        .sort((left, right) => right.value - left.value)
        .slice(0, 8)

      return {
        metricLabel: "Worst outlier pair",
        metricValue: items[0]?.label ?? "None",
        visual: {
          kind: "rankedList" as const,
          items,
          formatter: "percent",
        },
      }
    }

    case "Floor Volatility by Month": {
      const items = context.monthKeys.slice(-6).map((monthKey) => {
        const balances = context.enrichedTransactions
          .filter((transaction) => transaction.monthKey === monthKey)
          .map((transaction) => transaction.workingBalance)
        const floor = Math.min(...balances, 0)
        const floorGaps = balances.map((balance) => Math.max(0, balance - floor))
        const stats = boxStats(floorGaps)
        return {
          label: toMonthLabel(monthKey),
          min: stats.min,
          q1: stats.q1,
          median: stats.median,
          q3: stats.q3,
          max: stats.max,
        }
      })

      return {
        metricLabel: "Widest floor spread",
        metricValue: items.sort((left, right) => right.max - right.min - (left.max - left.min))[0]?.label ?? "None",
        visual: {
          kind: "boxplot" as const,
          items,
          formatter: "currency",
        },
      }
    }

    case "Low-Balance Weekday Exposure": {
      const thresholds = new Map(
        context.monthKeys.map((monthKey) => {
          const balances = context.enrichedTransactions
            .filter((transaction) => transaction.monthKey === monthKey)
            .map((transaction) => transaction.workingBalance)
          return [monthKey, percentile(balances, 0.25)]
        }),
      )
      const dayFlags = new Map<string, { weekday: number; low: boolean }>()
      context.enrichedTransactions.forEach((transaction) => {
        const existing = dayFlags.get(transaction.dateKey) ?? { weekday: transaction.weekday, low: false }
        const threshold = thresholds.get(transaction.monthKey) ?? 0
        if (transaction.workingBalance <= threshold) existing.low = true
        dayFlags.set(transaction.dateKey, existing)
      })

      const groups = WEEKDAY_NAMES.map((weekday, weekdayIndex) => {
        const days = [...dayFlags.values()].filter((entry) => entry.weekday === weekdayIndex)
        return {
          label: weekday,
          values: [
            { key: "Low-balance days", value: days.filter((entry) => entry.low).length },
            { key: "Other days", value: days.filter((entry) => !entry.low).length },
          ],
        }
      })

      return {
        metricLabel: "Most exposed weekday",
        metricValue: groups.sort((left, right) => (right.values[0]?.value ?? 0) - (left.values[0]?.value ?? 0))[0]?.label ?? "None",
        visual: {
          kind: "groupedBars" as const,
          keys: ["Low-balance days", "Other days"],
          groups,
          formatter: "number",
        },
      }
    }

    case "Debt Share of Income by Period Type": {
      const debtRegex = /(debt|loan|credit|mortgage|interest|finance|financing)/i
      const allDates = context.enrichedTransactions.map((transaction) => transaction.date.getTime()).sort((left, right) => left - right)
      const totalDays = Math.max(1, Math.ceil(((allDates.at(-1) ?? Date.now()) - (allDates[0] ?? Date.now())) / 86400000) + 1)
      const totalIncome = sum(context.incomes.map((transaction) => transaction.amount))
      const totalDebt = sum(context.expenses.filter((transaction) => debtRegex.test(transaction.category) || debtRegex.test(transaction.description)).map((transaction) => transaction.absAmount))
      const monthlyDebt = mean(
        context.monthKeys.map((monthKey) =>
          sum(
            context.expenses
              .filter((transaction) => transaction.monthKey === monthKey && (debtRegex.test(transaction.category) || debtRegex.test(transaction.description)))
              .map((transaction) => transaction.absAmount),
          ),
        ),
      )
      const weeklyIncome = totalIncome / Math.max(totalDays / 7, 1)
      const weeklyDebt = totalDebt / Math.max(totalDays / 7, 1)
      const monthlyIncome = mean(context.monthlyIncomeSeries.map((item) => item.value))
      const paydayDebt = mean(
        context.incomes.map((income) =>
          sum(
            context.expenses
              .filter((transaction) => {
                const diff = transaction.date.getTime() - income.date.getTime()
                return diff >= 0 && diff <= 5 * 86400000 && (debtRegex.test(transaction.category) || debtRegex.test(transaction.description))
              })
              .map((transaction) => transaction.absAmount),
          ),
        ),
      )
      const paydayIncome = Math.max(mean(context.incomes.map((transaction) => transaction.amount)), 1)
      const groups = [
        { label: "Weekly", debt: weeklyDebt, income: weeklyIncome },
        { label: "Monthly", debt: monthlyDebt, income: monthlyIncome },
        { label: "Payday", debt: paydayDebt, income: paydayIncome },
      ].map((item) => {
        const share = round((item.debt / Math.max(item.income, 1)) * 100)
        return {
          label: item.label,
          values: [
            { key: "Debt share", value: share },
            { key: "Income kept", value: Math.max(0, 100 - share) },
          ],
        }
      })

      return {
        metricLabel: "Heaviest planning window",
        metricValue: groups.sort((left, right) => (right.values[0]?.value ?? 0) - (left.values[0]?.value ?? 0))[0]?.label ?? "None",
        visual: {
          kind: "groupedBars" as const,
          keys: ["Debt share", "Income kept"],
          groups,
          formatter: "percent",
        },
      }
    }

    case "Goal Deadline Pressure Ladder": {
      const items = goalItems
        .map((goal) => {
          const monthsNeeded = goal.monthlyAllocation > 0 ? goal.targetAmount / goal.monthlyAllocation : goal.monthsLeft * 2
          return {
            label: goal.label,
            value: round(monthsNeeded, 1),
            target: goal.monthsLeft,
            max: Math.max(Math.ceil(monthsNeeded), goal.monthsLeft) + 2,
          }
        })
        .sort((left, right) => (left.target - left.value) - (right.target - right.value))

      return {
        metricLabel: "Tightest deadline",
        metricValue: items[0]?.label ?? "None",
        visual: {
          kind: "bullet" as const,
          items,
          formatter: "number",
        },
      }
    }

    case "Allocation Coverage by Goal Label": {
      const groups = goalItems.map((goal) => ({
        label: goal.label,
        values: [
          { key: "Months covered", value: round(goal.targetAmount / Math.max(goal.monthlyAllocation, 1), 1) },
          { key: "Months left", value: goal.monthsLeft },
        ],
      }))

      return {
        metricLabel: "Longest funding runway",
        metricValue: groups.sort((left, right) => (right.values[0]?.value ?? 0) - (left.values[0]?.value ?? 0))[0]?.label ?? "None",
        visual: {
          kind: "groupedBars" as const,
          keys: ["Months covered", "Months left"],
          groups,
          formatter: "number",
        },
      }
    }

    case "Pocket Type Burden vs Income": {
      const typicalIncome = Math.max(mean(context.incomes.map((transaction) => transaction.amount)) || 1, 1)
      const items = [...new Set(pocketItems.map((pocket) => pocket.type))]
        .map((type) => {
          const matching = pocketItems.filter((pocket) => pocket.type === type)
          return {
            label: titleCase(type),
            start: typicalIncome,
            end: sum(matching.map((pocket) => pocket.fixed + pocket.variable)),
          }
        })
        .sort((left, right) => right.end - left.end)

      return {
        metricLabel: "Highest burden type",
        metricValue: items[0]?.label ?? "None",
        visual: {
          kind: "dumbbell" as const,
          items,
          formatter: "currency",
        },
      }
    }
  }

  if (chartType.includes("heatmap")) {
    if (topic === "store") {
      return {
        metricLabel: "Tracked stores",
        metricValue: `${storeItems.length}`,
        visual: {
          kind: "heatmap" as const,
          xLabels: WEEKDAY_NAMES,
          yLabels: storeItems.slice(0, 5).map((item) => item.label),
          cells: context.storeHeatmapCells,
        },
      }
    }

    if (topic === "challenge") {
      const group = challengeGroupItems[seed % Math.max(challengeGroupItems.length, 1)]
      const results = context.challengeGroupSummaries.length
        ? (context.challengeGroupSummaries.map((summary) => summary.averagePoints))
        : [0]
      return {
        metricLabel: "Challenge groups",
        metricValue: `${challengeGroupItems.length}`,
        visual: {
          kind: "heatmap" as const,
          xLabels: ["Members", "Metrics", "Points"],
          yLabels: challengeGroupItems.slice(0, 5).map((item) => item.label),
          cells: challengeGroupItems.slice(0, 5).flatMap((item) => [
            { x: "Members", y: item.label, value: item.memberCount },
            { x: "Metrics", y: item.label, value: item.metricCount },
            { x: "Points", y: item.label, value: item.totalPoints || mean(results) },
          ]),
        },
      }
    }

    return {
      metricLabel: "Low-balance events",
      metricValue: `${context.lowBalanceHeatmapCells.reduce((total, cell) => total + cell.value, 0)}`,
      visual: {
        kind: "heatmap" as const,
        xLabels: WEEKDAY_NAMES,
        yLabels: [...new Set(context.lowBalanceHeatmapCells.map((cell) => cell.y))].slice(0, 10),
        cells: context.lowBalanceHeatmapCells,
      },
    }
  }

  if (chartType.includes("dumbbell")) {
    const source =
      topic === "merchant"
        ? merchantItems
        : topic === "store"
          ? storeItems
          : topic === "room"
            ? roomItems.map((room) => ({ label: room.label, recent: room.totalShared, previous: room.yourBalance }))
            : topic === "pocket"
              ? pocketItems.map((pocket) => ({ label: pocket.label, recent: pocket.fixed, previous: pocket.variable }))
              : topic === "goal"
                ? goalItems.map((goal) => ({ label: goal.label, recent: goal.monthlyAllocation, previous: goal.requiredMonthly }))
                : categoryItems

    return {
      metricLabel: "Selected pair delta",
      metricValue:
        topic === "goal"
          ? formatCurrency((goalItems[0]?.requiredMonthly ?? 0) - (goalItems[0]?.monthlyAllocation ?? 0), {
              maximumFractionDigits: 0,
            })
          : formatCurrency(((source[0]?.recent ?? 0) - (source[0]?.previous ?? 0)) || 0, { maximumFractionDigits: 0 }),
      visual: {
        kind: "dumbbell" as const,
        items: pickBySeed(source, 5, seed).map((item) => ({
          label: item.label,
          start: item.previous ?? 0,
          end: item.recent ?? 0,
        })),
        formatter: "currency",
      },
    }
  }

  if (chartType.includes("ranked table")) {
    const source =
      topic === "store"
        ? storeItems
        : topic === "merchant"
          ? merchantItems
          : topic === "goal"
            ? goalItems.map((goal) => ({ label: goal.label, total: goal.pressureScore, recent: goal.requiredMonthly, previous: goal.monthlyAllocation }))
            : topic === "challenge"
              ? challengeGroupItems.map((group) => ({ label: group.label, total: group.totalPoints, recent: group.averageScore, previous: group.averagePoints }))
              : topic === "pocket"
                ? pocketItems.map((pocket) => ({ label: pocket.label, total: pocket.financingShare, recent: pocket.total, previous: pocket.fixed }))
                : categoryItems

    return {
      metricLabel: "Top ranked",
      metricValue: buildRankedItems(source, seed, 1)[0]?.label ?? "None",
      visual: {
        kind: "rankedList" as const,
        items: buildRankedItems(source, seed, 6),
        formatter: topic === "goal" || topic === "pocket" ? "percent" : "currency",
      },
    }
  }

  if (chartType.includes("waterfall")) {
    const latest = context.monthlyNetSeries.at(-1)?.value ?? 0
    const biggestCategory = categoryItems[0]?.total ?? 0
    const biggestDebt = debtItems[0]?.value ?? 0
    const goalLoad = goalItems[0]?.monthlyAllocation ?? 0
    return {
      metricLabel: "Latest net position",
      metricValue: formatCurrency(latest, { maximumFractionDigits: 0 }),
      visual: {
        kind: "waterfall" as const,
        steps: [
          { label: "Income", value: context.monthlyIncomeSeries.at(-1)?.value ?? 0 },
          { label: "Core spend", value: -(biggestCategory || latest * 0.4) },
          { label: "Debt load", value: -(biggestDebt || latest * 0.15) },
          { label: "Goal load", value: -(goalLoad || latest * 0.1) },
          { label: "Net", value: latest, isTotal: true },
        ],
        formatter: "currency",
      },
    }
  }

  if (chartType.includes("stacked bar")) {
    const keys =
      topic === "store"
        ? ["Top category", "Second", "Third"]
        : topic === "pocket"
          ? ["Fixed", "Variable", "Buffer"]
          : topic === "room"
            ? ["Shared", "Pending", "Activity"]
            : ["Income", "Expense", "Net"]

    if (topic === "store") {
      return {
        metricLabel: "Store mix cards",
        metricValue: `${storeItems.length}`,
        visual: {
          kind: "stackedBars" as const,
          keys,
          items: pickBySeed(storeItems, 5, seed).map((store) => ({
            label: store.label,
            segments: [
              { key: "Top category", value: store.segments?.[0]?.value ?? 0 },
              { key: "Second", value: store.segments?.[1]?.value ?? 0 },
              { key: "Third", value: store.segments?.[2]?.value ?? 0 },
            ],
          })),
          formatter: "currency",
        },
      }
    }

    if (topic === "pocket") {
      return {
        metricLabel: "Pocket cost stack",
        metricValue: `${pocketItems.length}`,
        visual: {
          kind: "stackedBars" as const,
          keys,
          items: pickBySeed(pocketItems, 5, seed).map((pocket) => ({
            label: pocket.label,
            segments: [
              { key: "Fixed", value: pocket.fixed },
              { key: "Variable", value: pocket.variable },
              { key: "Buffer", value: Math.max(0, pocket.valueSignal - pocket.total) },
            ],
          })),
          formatter: "currency",
        },
      }
    }

    return {
      metricLabel: "Month stack",
      metricValue: `${context.monthKeys.length} months`,
      visual: {
        kind: "stackedBars" as const,
        keys,
        items: context.monthKeys.slice(-5).map((monthKey) => ({
          label: toMonthLabel(monthKey),
          segments: [
            { key: "Income", value: context.monthlyIncomeSeries.find((item) => item.label === toMonthLabel(monthKey))?.value ?? 0 },
            { key: "Expense", value: context.monthlySpendSeries.find((item) => item.label === toMonthLabel(monthKey))?.value ?? 0 },
            { key: "Net", value: Math.max(0, context.monthlyNetSeries.find((item) => item.label === toMonthLabel(monthKey))?.value ?? 0) },
          ],
        })),
        formatter: "currency",
      },
    }
  }

  if (chartType.includes("split bar")) {
    if (topic === "room") {
      return {
        metricLabel: "Tracked rooms",
        metricValue: `${roomItems.length}`,
        visual: {
          kind: "splitBars" as const,
          items: pickBySeed(roomItems, 5, seed).map((room) => ({
            label: room.label,
            left: room.totalShared,
            right: room.yourBalance,
          })),
          formatter: "currency",
        },
      }
    }

    if (topic === "pocket") {
      return {
        metricLabel: "Financing share",
        metricValue: `${round(mean(pocketItems.map((item) => item.financingShare)), 0)}%`,
        visual: {
          kind: "splitBars" as const,
          items: pickBySeed(pocketItems, 5, seed).map((pocket) => ({
            label: pocket.label,
            left: pocket.fixed,
            right: pocket.variable,
          })),
          formatter: "currency",
        },
      }
    }

    if (topic === "goal") {
      return {
        metricLabel: "Allocation pressure",
        metricValue: `${round(mean(goalItems.map((goal) => goal.pressureScore)), 0)}%`,
        visual: {
          kind: "splitBars" as const,
          items: pickBySeed(goalItems, 5, seed).map((goal) => ({
            label: goal.label,
            left: goal.monthlyAllocation,
            right: goal.requiredMonthly,
          })),
          formatter: "currency",
        },
      }
    }

    return {
      metricLabel: "Cross-feature pairs",
      metricValue: `${context.crossFeatureLabels.length}`,
      visual: {
        kind: "splitBars" as const,
        items: context.crossFeatureLabels.slice(0, 5),
        formatter: "currency",
      },
    }
  }

  if (chartType.includes("boxplot")) {
    const source =
      topic === "merchant"
        ? merchantItems
        : topic === "store"
          ? storeItems
          : topic === "category"
            ? categoryItems
            : topic === "balance"
              ? balanceItems.map((balance) => ({
                  label: balance.label,
                  box: boxStats([balance.opening, balance.floor, balance.closing, balance.closing + balance.net]),
                }))
              : storeItems

    return {
      metricLabel: "Median signal",
      metricValue:
        topic === "balance"
          ? formatCurrency(balanceItems.at(-1)?.closing ?? 0, { maximumFractionDigits: 0 })
          : formatCurrency(source[0]?.box.median ?? 0, { maximumFractionDigits: 0 }),
      visual: {
        kind: "boxplot" as const,
        items: pickBySeed(source, 5, seed).map((item) => ({
          label: item.label,
          min: item.box.min,
          q1: item.box.q1,
          median: item.box.median,
          q3: item.box.q3,
          max: item.box.max,
        })),
        formatter: "currency",
      },
    }
  }

  if (chartType.includes("range plot")) {
    if (topic === "balance") {
      return {
        metricLabel: "Latest range",
        metricValue: formatCurrency((balanceItems.at(-1)?.closing ?? 0) - (balanceItems.at(-1)?.floor ?? 0), {
          maximumFractionDigits: 0,
        }),
        visual: {
          kind: "rangePlot" as const,
          items: balanceItems.slice(-5).map((balance) => ({
            label: balance.label,
            start: balance.floor,
            end: balance.closing,
            marker: balance.opening,
          })),
          formatter: "currency",
        },
      }
    }

    if (topic === "goal") {
      return {
        metricLabel: "Required monthly",
        metricValue: formatCurrency(goalItems[0]?.requiredMonthly ?? 0, { maximumFractionDigits: 0 }),
        visual: {
          kind: "rangePlot" as const,
          items: pickBySeed(goalItems, 5, seed).map((goal) => ({
            label: goal.label,
            start: goal.monthlyAllocation,
            end: goal.requiredMonthly,
            marker: goal.targetAmount / Math.max(goal.monthsLeft, 1),
          })),
          formatter: "currency",
        },
      }
    }

    return {
      metricLabel: fallback.metricLabel,
      metricValue: fallback.metricValue,
      visual: {
        kind: "rangePlot" as const,
        items: pickBySeed(storeItems, 5, seed).map((store) => ({
          label: store.label,
          start: store.box.min,
          end: store.box.max,
          marker: store.box.median,
        })),
        formatter: "currency",
      },
    }
  }

  if (chartType.includes("arrow plot")) {
    if (topic === "balance") {
      return {
        metricLabel: "Latest shift",
        metricValue: formatCurrency((balanceItems.at(-1)?.closing ?? 0) - (balanceItems.at(-1)?.opening ?? 0), {
          maximumFractionDigits: 0,
        }),
        visual: {
          kind: "arrowPlot" as const,
          items: balanceItems.slice(-5).map((balance) => ({
            label: balance.label,
            start: balance.opening,
            end: balance.closing,
          })),
          formatter: "currency",
        },
      }
    }

    const source =
      topic === "goal"
        ? goalItems.map((goal) => ({ label: goal.label, start: goal.monthlyAllocation, end: goal.requiredMonthly }))
        : topic === "merchant"
          ? merchantItems.map((item) => ({ label: item.label, start: item.previous, end: item.recent }))
          : topic === "debt"
            ? debtItems.map((item, index) => ({ label: item.label, start: item.value * (0.7 + (index % 3) * 0.1), end: item.value }))
            : categoryItems.map((item) => ({ label: item.label, start: item.previous, end: item.recent }))

    return {
      metricLabel: "Directional shift",
      metricValue: `${pickBySeed(source, 1, seed)[0]?.label ?? "None"}`,
      visual: {
        kind: "arrowPlot" as const,
        items: pickBySeed(source, 5, seed),
        formatter: "currency",
      },
    }
  }

  if (chartType.includes("bullet bar")) {
    if (topic === "goal") {
      return {
        metricLabel: "Most pressured goal",
        metricValue: `${round(goalItems[0]?.pressureScore ?? 0, 0)}%`,
        visual: {
          kind: "bullet" as const,
          items: pickBySeed(goalItems, 5, seed).map((goal) => ({
            label: goal.label,
            value: goal.monthlyAllocation,
            target: goal.requiredMonthly,
            max: Math.max(goal.targetAmount, goal.requiredMonthly, goal.monthlyAllocation),
          })),
          formatter: "currency",
        },
      }
    }

    if (topic === "debt") {
      return {
        metricLabel: "Debt sources",
        metricValue: `${debtItems.length}`,
        visual: {
          kind: "bullet" as const,
          items: pickBySeed(debtItems, 5, seed).map((item) => ({
            label: item.label,
            value: item.value,
            target: mean(debtItems.map((entry) => entry.value)),
            max: Math.max(...debtItems.map((entry) => entry.value), 1),
          })),
          formatter: "currency",
        },
      }
    }

    return {
      metricLabel: "Coverage targets",
      metricValue: fallback.metricValue,
      visual: {
        kind: "bullet" as const,
        items: pickBySeed(balanceItems, 5, seed).map((balance) => ({
          label: balance.label,
          value: balance.closing,
          target: balance.floor,
          max: Math.max(balance.opening, balance.closing, balance.floor),
        })),
        formatter: "currency",
      },
    }
  }

  if (chartType.includes("grouped bar")) {
    if (topic === "challenge") {
      return {
        metricLabel: "Challenges tracked",
        metricValue: `${challengeItems.length}`,
        visual: {
          kind: "groupedBars" as const,
          keys: ["Current", "Target"],
          groups: pickBySeed(challengeItems, 5, seed).map((challenge) => ({
            label: challenge.label,
            values: [
              { key: "Current", value: challenge.current },
              { key: "Target", value: challenge.target },
            ],
          })),
          formatter: "currency",
        },
      }
    }

    if (topic === "store") {
      return {
        metricLabel: "Store comparisons",
        metricValue: `${storeItems.length}`,
        visual: {
          kind: "groupedBars" as const,
          keys: ["Spend", "Visits"],
          groups: pickBySeed(storeItems, 5, seed).map((store) => ({
            label: store.label,
            values: [
              { key: "Spend", value: store.total },
              { key: "Visits", value: store.recent },
            ],
          })),
          formatter: "currency",
        },
      }
    }

    return {
      metricLabel: "Monthly compare",
      metricValue: `${context.monthKeys.length} months`,
      visual: {
        kind: "groupedBars" as const,
        keys: ["Income", "Expense", "Net"],
        groups: context.monthKeys.slice(-5).map((monthKey) => ({
          label: toMonthLabel(monthKey),
          values: [
            { key: "Income", value: context.monthlyIncomeSeries.find((item) => item.label === toMonthLabel(monthKey))?.value ?? 0 },
            { key: "Expense", value: context.monthlySpendSeries.find((item) => item.label === toMonthLabel(monthKey))?.value ?? 0 },
            { key: "Net", value: context.monthlyNetSeries.find((item) => item.label === toMonthLabel(monthKey))?.value ?? 0 },
          ],
        })),
        formatter: "currency",
      },
    }
  }

  if (chartType.includes("scatter")) {
    if (topic === "goal") {
      return {
        metricLabel: "Goal portfolio",
        metricValue: `${goalItems.length}`,
        visual: {
          kind: "scatter" as const,
          points: goalItems.map((goal) => ({
            label: goal.label,
            x: goal.targetAmount,
            y: goal.requiredMonthly,
          })),
          xLabel: "Target",
          yLabel: "Required / mo",
        },
      }
    }

    if (topic === "pocket") {
      return {
        metricLabel: "Pocket portfolio",
        metricValue: `${pocketItems.length}`,
        visual: {
          kind: "scatter" as const,
          points: pocketItems.map((pocket) => ({
            label: pocket.label,
            x: pocket.total,
            y: pocket.valueSignal,
          })),
          xLabel: "Cost load",
          yLabel: "Value signal",
        },
      }
    }

    if (topic === "room") {
      return {
        metricLabel: "Room exposure",
        metricValue: `${roomItems.length}`,
        visual: {
          kind: "scatter" as const,
          points: roomItems.map((room) => ({
            label: room.label,
            x: room.memberCount,
            y: room.totalShared,
          })),
          xLabel: "Members",
          yLabel: "Shared spend",
        },
      }
    }

    if (topic === "challenge") {
      return {
        metricLabel: "Challenge pace",
        metricValue: `${challengeItems.length}`,
        visual: {
          kind: "scatter" as const,
          points: challengeItems.map((challenge) => ({
            label: challenge.label,
            x: challenge.participantCount,
            y: challenge.paceRatio,
          })),
          xLabel: "Participants",
          yLabel: "Pace %",
        },
      }
    }

    if (topic === "debt") {
      return {
        metricLabel: "Debt sources",
        metricValue: `${debtItems.length}`,
        visual: {
          kind: "scatter" as const,
          points: debtItems.map((item, index) => ({
            label: item.label,
            x: index + 1,
            y: item.value,
          })),
          xLabel: "Source rank",
          yLabel: "Load",
        },
      }
    }

    return {
      metricLabel: "Month correlation",
      metricValue: `${context.monthKeys.length} months`,
      visual: {
        kind: "scatter" as const,
        points: context.monthKeys.map((monthKey) => ({
          label: toMonthLabel(monthKey),
          x: context.monthlyIncomeSeries.find((item) => item.label === toMonthLabel(monthKey))?.value ?? 0,
          y: context.monthlySpendSeries.find((item) => item.label === toMonthLabel(monthKey))?.value ?? 0,
        })),
        xLabel: "Income",
        yLabel: "Spend",
      },
    }
  }

  if (chartType.includes("treemap")) {
    const items =
      topic === "pocket"
        ? pocketItems.map((pocket) => ({ label: pocket.label, value: pocket.total }))
        : topic === "goal"
          ? goalItems.map((goal) => ({ label: goal.label, value: goal.targetAmount }))
          : topic === "challenge"
            ? challengeGroupItems.map((group) => ({ label: group.label, value: group.totalPoints || group.memberCount }))
            : topic === "room"
              ? roomItems.map((room) => ({ label: room.label, value: room.totalShared }))
              : categoryItems.map((item) => ({ label: item.label, value: item.total }))

    return {
      metricLabel: "Largest block",
      metricValue: items[0]?.label ?? "None",
      visual: {
        kind: "treemap" as const,
        items: pickBySeed(items, 8, seed),
        formatter: "currency",
      },
    }
  }

  if (chartType.includes("funnel")) {
    const steps =
      topic === "challenge"
        ? [
            { label: "Active", value: challengeItems.length || 1 },
            { label: "On pace", value: challengeItems.filter((item) => item.paceRatio <= 100).length },
            { label: "At risk", value: challengeItems.filter((item) => item.paceRatio > 100 && item.paceRatio <= 125).length },
            { label: "High risk", value: challengeItems.filter((item) => item.paceRatio > 125).length },
          ]
        : topic === "balance"
          ? [
              { label: "Tracked months", value: balanceItems.length || 1 },
              { label: "Healthy close", value: balanceItems.filter((item) => item.closing > item.floor).length },
              { label: "Low-balance months", value: balanceItems.filter((item) => item.lowBalanceDays > 0).length },
              { label: "Recovery months", value: balanceItems.filter((item) => item.closing > item.opening).length },
            ]
          : [
              { label: "Goals", value: goalItems.length || 1 },
              { label: "Funded by plan", value: goalItems.filter((goal) => goal.monthlyAllocation >= goal.requiredMonthly).length },
              { label: "At risk", value: goalItems.filter((goal) => goal.monthlyAllocation < goal.requiredMonthly).length },
              { label: "Critical", value: goalItems.filter((goal) => goal.pressureScore > 130).length },
            ]

    return {
      metricLabel: "Primary stage",
      metricValue: `${steps[0]?.value ?? 0}`,
      visual: {
        kind: "funnel" as const,
        steps,
        formatter: "number",
      },
    }
  }

  if (chartType.includes("pictorial")) {
    const items =
      topic === "goal"
        ? goalItems.map((goal) => ({ label: goal.label, value: goal.monthlyAllocation, max: goal.requiredMonthly || goal.monthlyAllocation }))
        : topic === "challenge"
          ? challengeItems.map((challenge) => ({ label: challenge.label, value: challenge.current, max: challenge.target }))
          : balanceItems.slice(-5).map((balance) => ({ label: balance.label, value: balance.closing, max: Math.max(balance.opening, balance.closing, balance.floor) }))

    return {
      metricLabel: "Filled units",
      metricValue: `${items.length}`,
      visual: {
        kind: "pictorialBar" as const,
        items: pickBySeed(items, 5, seed),
        formatter: "currency",
      },
    }
  }

  if (chartType.includes("gauge")) {
    const value =
      topic === "balance"
        ? clamp(
            (mean(balanceItems.map((item) => item.closing)) / Math.max(mean(balanceItems.map((item) => item.opening)) || 1, 1)),
            0,
            1.5
          ) / 1.5
        : topic === "challenge"
          ? clamp(mean(challengeItems.map((item) => item.paceRatio)) / 150, 0, 1)
          : clamp(mean(goalItems.map((goal) => goal.monthlyAllocation / Math.max(goal.requiredMonthly, 1))), 0, 1)

    return {
      metricLabel: "Composite signal",
      metricValue: `${round(value * 100, 0)}%`,
      visual: {
        kind: "gauge" as const,
        value,
        target: 0.68,
      },
    }
  }

  if (chartType.includes("sankey")) {
    const topCategories = categoryItems.slice(0, 4)
    const nodes = [
      { id: "income", label: "Income", column: 0 },
      ...topCategories.map((item, index) => ({ id: `category-${index}`, label: item.label, column: 1 })),
      { id: "goals", label: "Goals", column: 2 },
      { id: "buffer", label: "Buffer", column: 2 },
    ]
    const links = [
      ...topCategories.map((item, index) => ({
        source: "income",
        target: `category-${index}`,
        value: item.total,
      })),
      {
        source: `category-0`,
        target: "goals",
        value: goalItems[0]?.monthlyAllocation ?? 0,
      },
      {
        source: `category-1`,
        target: "buffer",
        value: balanceItems.at(-1)?.closing ?? 0,
      },
    ]

    return {
      metricLabel: "Flow nodes",
      metricValue: `${nodes.length}`,
      visual: {
        kind: "sankey" as const,
        nodes,
        links,
        formatter: "currency",
      },
    }
  }

  return {
    metricLabel: fallback.metricLabel,
    metricValue: fallback.metricValue,
    visual: {
      kind: "bars" as const,
      items: pickBySeed(
        topic === "merchant"
          ? merchantItems.map((item) => ({ label: item.label, value: item.total }))
          : topic === "store"
            ? storeItems.map((item) => ({ label: item.label, value: item.total }))
            : topic === "goal"
              ? goalItems.map((item) => ({ label: item.label, value: item.targetAmount }))
              : topic === "pocket"
                ? pocketItems.map((item) => ({ label: item.label, value: item.total }))
                : topic === "room"
                  ? roomItems.map((item) => ({ label: item.label, value: item.totalShared }))
                  : topic === "challenge"
                    ? challengeItems.map((item) => ({ label: item.label, value: item.current }))
                    : topic === "debt"
                      ? debtItems
                      : categoryItems.map((item) => ({ label: item.label, value: item.total })),
        6,
        seed
      ),
      formatter: "currency",
    },
  }
}

function buildCardModel(row: IdeaManifestChart, context: Context, options: BuildOptions): PlaygroundCardModel {
  const prototype = buildChartPrototype(row, context, options)
  const sectionId = inferSectionId(row.pageDomain)

  return {
    id: row.id,
    title: row.title,
    eyebrow: `${row.pageDomain} · ${row.level}`,
    question: row.coreQuestion,
    insight: row.whyItMatters,
    metricLabel: prototype.metricLabel,
    metricValue: prototype.metricValue,
    tags: [
      row.chartType,
      row.level,
      row.extractionConfidence,
      row.crossFeature.startsWith("Yes") ? "Cross-feature" : "Single-domain",
    ],
    visual: prototype.visual,
    domain: SECTION_COPY[sectionId].title,
    level: row.level,
    chartType: row.chartType,
    crossFeature: row.crossFeature,
    primaryDataNeeded: row.primaryDataNeeded,
    whyOriginal: row.whyOriginal,
    extractionConfidence: row.extractionConfidence,
  }
}

function buildSection(id: PlaygroundSection["id"], cards: PlaygroundCardModel[]): PlaygroundSection {
  const groups: PlaygroundGroup[] = ["Easy", "Medium", "High"]
    .map((level) => {
      const levelCards = cards.filter((card) => card.level === level)
      if (!levelCards.length) return null
      return {
        id: `${id}-${level.toLowerCase()}`,
        title: `${level} implementation cards`,
        description:
          level === "Easy"
            ? "Direct, readable implementation cuts with minimal interpretation cost."
            : level === "Medium"
              ? "Comparative and behavioral implementation cuts that combine more than one signal."
              : "More synthesized implementation cuts that connect domains, states, or tradeoffs.",
        cards: levelCards,
      }
    })
    .filter((group): group is PlaygroundGroup => Boolean(group))

  return {
    id,
    title: SECTION_COPY[id].title,
    description: SECTION_COPY[id].description,
    accent: `${cards.length} charts`,
    count: cards.length,
    groups,
  }
}

export function buildInsightPlaygroundSections(
  bundle: IdeaLabBundleResponse,
  options: BuildOptions
): PlaygroundSection[] {
  const context = buildContext(bundle)
  const cards = bundle.manifest.map((row) => buildCardModel(row, context, options))

  return SECTION_ORDER.map((sectionId) =>
    buildSection(
      sectionId,
      cards.filter((card) => inferSectionId(card.domain === "Cross-Feature" ? "Cross-feature" : card.domain) === sectionId)
    )
  ).filter((section) => section.count > 0)
}

export function buildApprovedOneClickGroups(
  bundle: IdeaLabBundleResponse,
  options: BuildOptions
): PlaygroundGroup[] {
  const context = buildContext(bundle)
  const approvedRows = bundle.manifest.filter((row) =>
    APPROVED_ONE_CLICK_TITLES.includes(row.title as (typeof APPROVED_ONE_CLICK_TITLES)[number])
  )

  return SECTION_ORDER.map((sectionId) => {
    const sectionCards = approvedRows
      .filter((row) => inferSectionId(row.pageDomain) === sectionId)
      .map((row) => buildCardModel(row, context, options))

    if (!sectionCards.length) return null

    return {
      id: `selected-${sectionId}`,
      title: `To Be Implemented ${SECTION_COPY[sectionId].title} Picks`,
      description: APPROVED_ONE_CLICK_DESCRIPTION[sectionId],
      cards: sectionCards,
    }
  }).filter((group): group is PlaygroundGroup => Boolean(group))
}
