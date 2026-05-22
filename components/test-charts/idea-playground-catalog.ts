import type {
  TestChartsReceiptTransaction,
  TestChartsTransaction,
} from "@/lib/charts/aggregations"

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
}

export interface PlaygroundGroup {
  id: string
  title: string
  description: string
  cards: PlaygroundCardModel[]
}

export interface PlaygroundSection {
  id: "toImplement" | "analytics" | "fridge" | "savings"
  title: string
  description: string
  accent: string
  count: number
  groups: PlaygroundGroup[]
}

interface BundleInput {
  transactions: TestChartsTransaction[]
  receiptTransactions: TestChartsReceiptTransaction[]
}

interface BuildOptions {
  formatCurrency: (
    amount: number,
    options?: {
      minimumFractionDigits?: number
      maximumFractionDigits?: number
      showSign?: boolean
      forceFullNumber?: boolean
    },
  ) => string
}

type EnrichedTransaction = {
  id: number
  date: Date
  dateKey: string
  monthKey: string
  weekKey: string
  weekday: number
  weekOfMonth: number
  description: string
  merchant: string
  amount: number
  absAmount: number
  balance: number | null
  workingBalance: number
  category: string
}

type EnrichedReceiptLine = {
  id: number
  receiptId: string
  date: Date
  dateKey: string
  monthKey: string
  weekday: number
  weekOfMonth: number
  store: string
  item: string
  quantity: number
  totalPrice: number
  pricePerUnit: number
  category: string
  categoryType: string
  hour: number | null
}

type Basket = {
  receiptId: string
  dateKey: string
  monthKey: string
  store: string
  lines: EnrichedReceiptLine[]
  spend: number
  uniqueItems: number
  uniqueCategories: number
  hour: number | null
}

type BaseData = ReturnType<typeof buildBaseData>

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

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
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2
  }
  return sorted[middle]
}

function percentile(values: number[], ratio: number) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * ratio)))
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

function variance(values: number[]) {
  if (!values.length) return 0
  const avg = mean(values)
  return mean(values.map((value) => (value - avg) ** 2))
}

function standardDeviation(values: number[]) {
  return Math.sqrt(variance(values))
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function formatPercent(value: number, digits = 0) {
  return `${round(value, digits)}%`
}

function parseIsoDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number)
  return new Date(Date.UTC(year, (month || 1) - 1, day || 1))
}

function toMonthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`
}

function toMonthLabel(monthKey: string) {
  const [, month] = monthKey.split("-")
  return MONTH_NAMES[Math.max(0, Number(month) - 1)] ?? monthKey
}

function getISOWeekKey(date: Date) {
  const working = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dayNumber = working.getUTCDay() || 7
  working.setUTCDate(working.getUTCDate() + 4 - dayNumber)
  const yearStart = new Date(Date.UTC(working.getUTCFullYear(), 0, 1))
  const weekNumber = Math.ceil(((working.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${working.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`
}

function getWeekOfMonth(date: Date) {
  return Math.min(5, Math.max(1, Math.ceil(date.getUTCDate() / 7)))
}

function normalizePhrase(value: string) {
  return value
    .toLowerCase()
    .replace(/\d+/g, " ")
    .replace(/[^a-zA-Z\s]/g, " ")
    .replace(/\b(card|visa|mastercard|debit|credit|pos|purchase|payment|ref|txn|cb|sepa)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function normalizeMerchant(value: string) {
  return normalizePhrase(value).split(" ").slice(0, 3).join(" ") || "unknown merchant"
}

function normalizeItem(value: string) {
  return normalizePhrase(value).split(" ").slice(0, 4).join(" ") || "unknown item"
}

function correlation(points: Array<{ x: number; y: number }>) {
  if (points.length < 2) return 0
  const avgX = mean(points.map((point) => point.x))
  const avgY = mean(points.map((point) => point.y))
  let numerator = 0
  let denominatorX = 0
  let denominatorY = 0
  for (const point of points) {
    const deltaX = point.x - avgX
    const deltaY = point.y - avgY
    numerator += deltaX * deltaY
    denominatorX += deltaX ** 2
    denominatorY += deltaY ** 2
  }
  if (!denominatorX || !denominatorY) return 0
  return numerator / Math.sqrt(denominatorX * denominatorY)
}

function toPointSeries(entries: Array<[string, number]>) {
  return entries.map(([label, value]) => ({ label, value }))
}

function topEntries(map: Map<string, number>, limit: number) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
}

function getMonthlySeries(values: Map<string, number>, monthKeys: string[]) {
  return monthKeys.map((monthKey) => [toMonthLabel(monthKey), values.get(monthKey) ?? 0] as [string, number])
}

function buildBaseData(bundle: BundleInput) {
  const sortedTransactions = [...bundle.transactions]
    .sort((a, b) => {
      if (a.date === b.date) return a.id - b.id
      return a.date.localeCompare(b.date)
    })
    .map<EnrichedTransaction>((transaction) => {
      const date = parseIsoDate(transaction.date)
      return {
        id: transaction.id,
        date,
        dateKey: transaction.date,
        monthKey: toMonthKey(date),
        weekKey: getISOWeekKey(date),
        weekday: (date.getUTCDay() + 6) % 7,
        weekOfMonth: getWeekOfMonth(date),
        description: transaction.description,
        merchant: normalizeMerchant(transaction.description),
        amount: transaction.amount,
        absAmount: Math.abs(transaction.amount),
        balance: transaction.balance,
        workingBalance: 0,
        category: transaction.category || "Other",
      }
    })

  let runningBalance = 0
  const transactions = sortedTransactions.map((transaction) => {
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

  const expenseTransactions = transactions.filter((transaction) => transaction.amount < 0)
  const incomeTransactions = transactions.filter((transaction) => transaction.amount > 0)

  const receiptLines = [...bundle.receiptTransactions]
    .sort((a, b) => {
      if (a.receiptDate === b.receiptDate) return a.id - b.id
      return a.receiptDate.localeCompare(b.receiptDate)
    })
    .map<EnrichedReceiptLine>((line) => {
      const date = parseIsoDate(line.receiptDate)
      const hour = line.receiptTime ? Number.parseInt(line.receiptTime.slice(0, 2), 10) : null
      return {
        id: line.id,
        receiptId: line.receiptId,
        date,
        dateKey: line.receiptDate,
        monthKey: toMonthKey(date),
        weekday: (date.getUTCDay() + 6) % 7,
        weekOfMonth: getWeekOfMonth(date),
        store: line.storeName?.trim() || "unknown store",
        item: normalizeItem(line.description),
        quantity: Math.max(0, Number(line.quantity) || 0),
        totalPrice: Math.max(0, Number(line.totalPrice) || 0),
        pricePerUnit:
          Number(line.pricePerUnit) > 0
            ? Number(line.pricePerUnit)
            : Math.max(0, Number(line.totalPrice) || 0) / Math.max(1, Number(line.quantity) || 1),
        category: line.categoryName?.trim() || "Other",
        categoryType: line.categoryTypeName?.trim() || "Unclassified",
        hour: Number.isFinite(hour) ? hour : null,
      }
    })

  const basketsMap = new Map<string, Basket>()
  for (const line of receiptLines) {
    const basket = basketsMap.get(line.receiptId) ?? {
      receiptId: line.receiptId,
      dateKey: line.dateKey,
      monthKey: line.monthKey,
      store: line.store,
      lines: [],
      spend: 0,
      uniqueItems: 0,
      uniqueCategories: 0,
      hour: line.hour,
    }
    basket.lines.push(line)
    basket.spend += line.totalPrice
    if (basket.hour === null && line.hour !== null) {
      basket.hour = line.hour
    }
    basketsMap.set(line.receiptId, basket)
  }

  const baskets = [...basketsMap.values()].map((basket) => {
    const uniqueItems = new Set(basket.lines.map((line) => line.item)).size
    const uniqueCategories = new Set(basket.lines.map((line) => line.category)).size
    return {
      ...basket,
      uniqueItems,
      uniqueCategories,
    }
  })

  const monthKeys = [...new Set(transactions.map((transaction) => transaction.monthKey))].sort()
  const receiptMonthKeys = [...new Set(receiptLines.map((line) => line.monthKey))].sort()
  const combinedMonthKeys = [...new Set([...monthKeys, ...receiptMonthKeys])].sort().slice(-12)
  const recentMonthKeys = combinedMonthKeys.length ? combinedMonthKeys : monthKeys.slice(-12)

  const dailyBalanceMap = new Map<string, number>()
  const dailyExpenseMap = new Map<string, number>()
  const dailyIncomeMap = new Map<string, number>()
  const dailyTransactionCountMap = new Map<string, number>()

  for (const transaction of transactions) {
    dailyBalanceMap.set(transaction.dateKey, transaction.workingBalance)
    dailyTransactionCountMap.set(
      transaction.dateKey,
      (dailyTransactionCountMap.get(transaction.dateKey) ?? 0) + 1,
    )
    if (transaction.amount < 0) {
      dailyExpenseMap.set(transaction.dateKey, (dailyExpenseMap.get(transaction.dateKey) ?? 0) + transaction.absAmount)
    } else if (transaction.amount > 0) {
      dailyIncomeMap.set(transaction.dateKey, (dailyIncomeMap.get(transaction.dateKey) ?? 0) + transaction.amount)
    }
  }

  const monthExpenseTotals = new Map<string, number>()
  const monthIncomeTotals = new Map<string, number>()
  const monthNetTotals = new Map<string, number>()
  const monthActiveExpenseDays = new Map<string, Set<string>>()
  const monthDayExpenses = new Map<string, Map<string, number>>()
  const monthMerchantSpend = new Map<string, Map<string, number>>()
  const monthCategorySpend = new Map<string, Map<string, number>>()
  const merchantTotals = new Map<string, number>()
  const categoryTotals = new Map<string, number>()

  for (const transaction of expenseTransactions) {
    monthExpenseTotals.set(
      transaction.monthKey,
      (monthExpenseTotals.get(transaction.monthKey) ?? 0) + transaction.absAmount,
    )
    const days = monthActiveExpenseDays.get(transaction.monthKey) ?? new Set<string>()
    days.add(transaction.dateKey)
    monthActiveExpenseDays.set(transaction.monthKey, days)

    const expenseByDay = monthDayExpenses.get(transaction.monthKey) ?? new Map<string, number>()
    expenseByDay.set(transaction.dateKey, (expenseByDay.get(transaction.dateKey) ?? 0) + transaction.absAmount)
    monthDayExpenses.set(transaction.monthKey, expenseByDay)

    const merchantSpend = monthMerchantSpend.get(transaction.monthKey) ?? new Map<string, number>()
    merchantSpend.set(transaction.merchant, (merchantSpend.get(transaction.merchant) ?? 0) + transaction.absAmount)
    monthMerchantSpend.set(transaction.monthKey, merchantSpend)
    merchantTotals.set(transaction.merchant, (merchantTotals.get(transaction.merchant) ?? 0) + transaction.absAmount)

    const categorySpend = monthCategorySpend.get(transaction.monthKey) ?? new Map<string, number>()
    categorySpend.set(transaction.category, (categorySpend.get(transaction.category) ?? 0) + transaction.absAmount)
    monthCategorySpend.set(transaction.monthKey, categorySpend)
    categoryTotals.set(transaction.category, (categoryTotals.get(transaction.category) ?? 0) + transaction.absAmount)
  }

  for (const transaction of incomeTransactions) {
    monthIncomeTotals.set(transaction.monthKey, (monthIncomeTotals.get(transaction.monthKey) ?? 0) + transaction.amount)
  }

  for (const monthKey of [...new Set([...monthExpenseTotals.keys(), ...monthIncomeTotals.keys()])]) {
    monthNetTotals.set(monthKey, (monthIncomeTotals.get(monthKey) ?? 0) - (monthExpenseTotals.get(monthKey) ?? 0))
  }

  const monthlyBalanceSnapshots = recentMonthKeys.map((monthKey) => {
    const monthTransactions = transactions.filter((transaction) => transaction.monthKey === monthKey)
    const balances = monthTransactions.map((transaction) => transaction.workingBalance)
    const opening = monthTransactions[0]?.workingBalance ?? 0
    const closing = monthTransactions[monthTransactions.length - 1]?.workingBalance ?? opening
    return {
      monthKey,
      opening,
      closing,
      floor: balances.length ? Math.min(...balances) : opening,
      ceiling: balances.length ? Math.max(...balances) : opening,
      range: balances.length ? Math.max(...balances) - Math.min(...balances) : 0,
    }
  })

  return {
    transactions,
    expenseTransactions,
    incomeTransactions,
    receiptLines,
    baskets,
    recentMonthKeys,
    monthExpenseTotals,
    monthIncomeTotals,
    monthNetTotals,
    monthActiveExpenseDays,
    monthDayExpenses,
    monthMerchantSpend,
    monthCategorySpend,
    merchantTotals,
    categoryTotals,
    dailyBalanceMap,
    dailyExpenseMap,
    dailyIncomeMap,
    dailyTransactionCountMap,
    monthlyBalanceSnapshots,
  }
}

function buildAnalyticsCards(base: BaseData, options: BuildOptions): PlaygroundCardModel[] {
  const { formatCurrency } = options
  const totalExpense = sum(base.expenseTransactions.map((transaction) => transaction.absAmount))
  const merchantDependencyEntries = topEntries(base.merchantTotals, 6)
  const topMerchantShare =
    totalExpense > 0 && merchantDependencyEntries.length
      ? (merchantDependencyEntries[0][1] / totalExpense) * 100
      : 0

  const expenseAmounts = base.expenseTransactions.map((transaction) => transaction.absAmount).sort((a, b) => b - a)
  const topOutlierCount = Math.max(3, Math.ceil(expenseAmounts.length * 0.01))
  const outlierShare = totalExpense > 0 ? (sum(expenseAmounts.slice(0, topOutlierCount)) / totalExpense) * 100 : 0
  const outlierBars = [
    { label: "Top 1%", value: outlierShare },
    {
      label: "Top 10%",
      value:
        totalExpense > 0
          ? (sum(expenseAmounts.slice(0, Math.max(topOutlierCount, Math.ceil(expenseAmounts.length * 0.1)))) / totalExpense) *
            100
          : 0,
    },
    { label: "Rest", value: Math.max(0, 100 - outlierShare) },
  ]

  const microLeakThreshold = Math.max(10, percentile(expenseAmounts, 0.25))
  const microLeakSeries = base.recentMonthKeys.map((monthKey) => {
    const monthExpenses = base.expenseTransactions.filter((transaction) => transaction.monthKey === monthKey)
    const monthSpend = sum(monthExpenses.map((transaction) => transaction.absAmount))
    const microSpend = sum(
      monthExpenses
        .filter((transaction) => transaction.absAmount <= microLeakThreshold)
        .map((transaction) => transaction.absAmount),
    )
    return [toMonthLabel(monthKey), monthSpend ? (microSpend / monthSpend) * 100 : 0] as [string, number]
  })

  const churnSeries = base.recentMonthKeys.map((monthKey, index) => {
    const currentTop = new Set(
      topEntries(base.monthMerchantSpend.get(monthKey) ?? new Map<string, number>(), 5).map(([merchant]) => merchant),
    )
    const previousKey = base.recentMonthKeys[index - 1]
    const previousTop = new Set(
      topEntries(base.monthMerchantSpend.get(previousKey) ?? new Map<string, number>(), 5).map(([merchant]) => merchant),
    )
    if (!previousTop.size || !currentTop.size) return [toMonthLabel(monthKey), 0] as [string, number]
    const overlap = [...currentTop].filter((merchant) => previousTop.has(merchant)).length
    const union = new Set([...currentTop, ...previousTop]).size || 1
    return [toMonthLabel(monthKey), 100 - (overlap / union) * 100] as [string, number]
  })

  const compressionSeries = base.recentMonthKeys.map((monthKey) => {
    const daySpendMap = base.monthDayExpenses.get(monthKey) ?? new Map<string, number>()
    const totalMonthSpend = sum([...daySpendMap.values()])
    const topDaySpend = sum([...daySpendMap.values()].sort((a, b) => b - a).slice(0, 5))
    return [toMonthLabel(monthKey), totalMonthSpend ? (topDaySpend / totalMonthSpend) * 100 : 0] as [string, number]
  })

  const silentDaySeries = base.recentMonthKeys.map((monthKey) => {
    const [year, month] = monthKey.split("-").map(Number)
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
    const activeDays = (base.monthActiveExpenseDays.get(monthKey) ?? new Set()).size
    return [toMonthLabel(monthKey), ((daysInMonth - activeDays) / daysInMonth) * 100] as [string, number]
  })

  const categoryShockEntries = topEntries(
    new Map(
      [...base.categoryTotals.keys()].map((category) => {
        const categoryMonthValues = base.recentMonthKeys.map(
          (monthKey) => base.monthCategorySpend.get(monthKey)?.get(category) ?? 0,
        )
        let biggestShock = 0
        for (let index = 3; index < categoryMonthValues.length; index += 1) {
          const baseline = mean(categoryMonthValues.slice(index - 3, index))
          if (baseline > 0) {
            biggestShock = Math.max(biggestShock, categoryMonthValues[index] / baseline)
          }
        }
        return [category, biggestShock]
      }),
    ),
    6,
  )

  const repeatLockInSeries = base.recentMonthKeys.map((monthKey, index) => {
    const seenMerchants = new Set(
      base.expenseTransactions
        .filter((transaction) => base.recentMonthKeys.slice(Math.max(0, index - 3), index).includes(transaction.monthKey))
        .map((transaction) => transaction.merchant),
    )
    const monthTransactions = base.expenseTransactions.filter((transaction) => transaction.monthKey === monthKey)
    const monthSpend = sum(monthTransactions.map((transaction) => transaction.absAmount))
    const repeatSpend = sum(
      monthTransactions
        .filter((transaction) => seenMerchants.has(transaction.merchant))
        .map((transaction) => transaction.absAmount),
    )
    return [toMonthLabel(monthKey), monthSpend ? (repeatSpend / monthSpend) * 100 : 0] as [string, number]
  })

  const incomeAmounts = base.incomeTransactions.map((transaction) => transaction.amount).sort((a, b) => b - a)
  const creditThreshold = percentile(incomeAmounts, 0.75)
  const refundSeries = base.recentMonthKeys.map((monthKey) => {
    const credits = sum(
      base.incomeTransactions
        .filter((transaction) => transaction.monthKey === monthKey && transaction.amount <= creditThreshold)
        .map((transaction) => transaction.amount),
    )
    const monthSpend = base.monthExpenseTotals.get(monthKey) ?? 0
    return [toMonthLabel(monthKey), monthSpend ? (credits / monthSpend) * 100 : 0] as [string, number]
  })

  const paydayHalfLifeSeries = base.recentMonthKeys.map((monthKey) => {
    const monthIncomeTransactions = base.incomeTransactions.filter((transaction) => transaction.monthKey === monthKey)
    const primaryIncomeDay = monthIncomeTransactions.sort((a, b) => b.amount - a.amount)[0]?.dateKey
    const monthExpenses = base.expenseTransactions.filter(
      (transaction) => transaction.monthKey === monthKey && (!primaryIncomeDay || transaction.dateKey >= primaryIncomeDay),
    )
    const totalPostIncomeSpend = sum(monthExpenses.map((transaction) => transaction.absAmount))
    if (!primaryIncomeDay || !totalPostIncomeSpend) return [toMonthLabel(monthKey), 0] as [string, number]
    let cumulative = 0
    let halfLife = 0
    const sortedMonthExpenses = [...monthExpenses].sort((a, b) => a.dateKey.localeCompare(b.dateKey))
    for (const transaction of sortedMonthExpenses) {
      cumulative += transaction.absAmount
      if (cumulative >= totalPostIncomeSpend / 2) {
        halfLife =
          (parseIsoDate(transaction.dateKey).getTime() - parseIsoDate(primaryIncomeDay).getTime()) / 86400000
        break
      }
    }
    return [toMonthLabel(monthKey), halfLife] as [string, number]
  })

  const frontLoadedSeries = base.recentMonthKeys.map((monthKey) => {
    const monthTransactions = base.expenseTransactions.filter((transaction) => transaction.monthKey === monthKey)
    const firstWeekSpend = sum(
      monthTransactions.filter((transaction) => parseIsoDate(transaction.dateKey).getUTCDate() <= 7).map((transaction) => transaction.absAmount),
    )
    const lastWeekSpend = sum(
      monthTransactions
        .filter((transaction) => parseIsoDate(transaction.dateKey).getUTCDate() >= 24)
        .map((transaction) => transaction.absAmount),
    )
    return {
      label: toMonthLabel(monthKey),
      start: firstWeekSpend,
      end: lastWeekSpend,
    }
  })

  const balanceWhiplashSeries = base.recentMonthKeys.map((monthKey) => {
    const monthTransactions = base.transactions.filter((transaction) => transaction.monthKey === monthKey)
    const dayKeys = [...new Set(monthTransactions.map((transaction) => transaction.dateKey))].sort()
    const dayBalances = dayKeys.map((dayKey) => base.dailyBalanceMap.get(dayKey) ?? 0)
    const deltas = dayBalances.slice(1).map((balance, index) => balance - dayBalances[index])
    return [toMonthLabel(monthKey), standardDeviation(deltas)] as [string, number]
  })

  const collisionCells = []
  for (const monthKey of base.recentMonthKeys.slice(-6)) {
    const monthTransactions = base.transactions.filter((transaction) => transaction.monthKey === monthKey)
    const monthBalances = monthTransactions.map((transaction) => transaction.workingBalance)
    const lowBalanceThreshold = percentile(monthBalances, 0.25)
    for (const weekday of WEEKDAY_NAMES) {
      for (let week = 1; week <= 5; week += 1) {
        const count = monthTransactions.filter(
          (transaction) =>
            transaction.amount < 0 &&
            transaction.workingBalance <= lowBalanceThreshold &&
            WEEKDAY_NAMES[transaction.weekday] === weekday &&
            transaction.weekOfMonth === week,
        ).length
        collisionCells.push({ x: weekday, y: `W${week}`, value: count })
      }
    }
  }

  const merchantScatterPoints = base.recentMonthKeys.map((monthKey) => {
    const merchants = new Set(
      base.expenseTransactions
        .filter((transaction) => transaction.monthKey === monthKey)
        .map((transaction) => transaction.merchant),
    )
    return {
      label: toMonthLabel(monthKey),
      x: merchants.size,
      y: base.monthExpenseTotals.get(monthKey) ?? 0,
    }
  })

  const comebackEntries = topEntries(
    new Map(
      [...base.categoryTotals.keys()].map((category) => {
        const series = base.recentMonthKeys.map((monthKey) => base.monthCategorySpend.get(monthKey)?.get(category) ?? 0)
        let comebacks = 0
        for (let index = 2; index < series.length; index += 1) {
          if (series[index - 2] > series[index - 1] && series[index] > series[index - 1] * 1.25) {
            comebacks += 1
          }
        }
        return [category, comebacks]
      }),
    ),
    6,
  )

  const favoriteMerchantDumbbells = topEntries(base.merchantTotals, 4)
    .map(([merchant]) => {
      const merchantTransactions = base.expenseTransactions.filter((transaction) => transaction.merchant === merchant)
      if (merchantTransactions.length < 4) return null
      const midpoint = Math.floor(merchantTransactions.length / 2)
      const start = median(merchantTransactions.slice(0, midpoint).map((transaction) => transaction.absAmount))
      const end = median(merchantTransactions.slice(midpoint).map((transaction) => transaction.absAmount))
      return { label: merchant.slice(0, 10), start, end }
    })
    .filter((entry): entry is { label: string; start: number; end: number } => Boolean(entry))

  const firstTouchSeries = (() => {
    const seen = new Set<string>()
    return base.recentMonthKeys.map((monthKey) => {
      const monthTransactions = base.expenseTransactions.filter((transaction) => transaction.monthKey === monthKey)
      const monthSpend = sum(monthTransactions.map((transaction) => transaction.absAmount))
      let firstTouchSpend = 0
      for (const transaction of monthTransactions) {
        if (!seen.has(transaction.merchant)) {
          firstTouchSpend += transaction.absAmount
        }
      }
      for (const transaction of monthTransactions) {
        seen.add(transaction.merchant)
      }
      return [toMonthLabel(monthKey), monthSpend ? (firstTouchSpend / monthSpend) * 100 : 0] as [string, number]
    })
  })()

  const cards: PlaygroundCardModel[] = [
    {
      id: "analytics-merchant-dependency",
      title: "Merchant Dependency Curve",
      eyebrow: "Concentration Risk",
      question: "How much of your total spend is quietly riding on one place?",
      insight:
        "This is a cleaner way to spot dependency than a merchant leaderboard because it shows how quickly the tail drops after the first few merchants.",
      metricLabel: "Top merchant share",
      metricValue: formatPercent(topMerchantShare),
      tags: ["Merchants", "Risk"],
      visual: {
        kind: "bars",
        items: merchantDependencyEntries.map(([merchant, value]) => ({
          label: merchant.slice(0, 12),
          value: totalExpense ? (value / totalExpense) * 100 : 0,
        })),
        formatter: "percent",
      },
    },
    {
      id: "analytics-outlier-tax",
      title: "Outlier Tax",
      eyebrow: "Transaction Shape",
      question: "Are a handful of giant payments steering the whole month?",
      insight:
        "If the top 1% of transactions dominate your spend, budget discipline will feel unstable even if everyday behavior looks healthy.",
      metricLabel: "Spend from the biggest 1%",
      metricValue: formatPercent(outlierShare),
      tags: ["Outliers", "Planning"],
      visual: {
        kind: "bars",
        items: outlierBars,
        formatter: "percent",
      },
    },
    {
      id: "analytics-micro-leak-ratio",
      title: "Micro-Leak Ratio",
      eyebrow: "Small Losses",
      question: "How much money disappears through harmless-looking tiny charges?",
      insight:
        "This isolates the quiet erosion layer that usually escapes monthly category reviews because each individual charge feels forgettable.",
      metricLabel: "Current micro-leak share",
      metricValue: formatPercent(microLeakSeries.at(-1)?.[1] ?? 0),
      tags: ["Behavior", "Friction"],
      visual: {
        kind: "trend",
        points: toPointSeries(microLeakSeries),
        formatter: "percent",
      },
    },
    {
      id: "analytics-merchant-churn",
      title: "Merchant Churn Index",
      eyebrow: "Merchant Memory",
      question: "How often does your core spending roster change from month to month?",
      insight:
        "Stable rosters imply habits; churn implies life changes, experiments, or a creeping loss of routine that classic trend charts do not show.",
      metricLabel: "Average top-roster churn",
      metricValue: formatPercent(mean(churnSeries.map(([, value]) => value))),
      tags: ["Merchants", "Change"],
      visual: {
        kind: "trend",
        points: toPointSeries(churnSeries),
        formatter: "percent",
      },
    },
    {
      id: "analytics-spend-compression",
      title: "Spend Compression Days",
      eyebrow: "Rhythm",
      question: "How much of each month gets decided by only a few days?",
      insight:
        "This captures compression risk: the tighter your spend gets packed into a handful of days, the harder it is to self-correct mid-month.",
      metricLabel: "Top-5-day share",
      metricValue: formatPercent(mean(compressionSeries.map(([, value]) => value))),
      tags: ["Rhythm", "Pressure"],
      visual: {
        kind: "trend",
        points: toPointSeries(compressionSeries),
        formatter: "percent",
      },
    },
    {
      id: "analytics-silent-day-coverage",
      title: "Silent Day Coverage",
      eyebrow: "Expense Rhythm",
      question: "Do you still have no-spend breathing room, or is every week active?",
      insight:
        "Silent days are recovery zones. When they shrink, finances feel busier even before the total monthly spend meaningfully changes.",
      metricLabel: "Average silent-day share",
      metricValue: formatPercent(mean(silentDaySeries.map(([, value]) => value))),
      tags: ["Rhythm", "Recovery"],
      visual: {
        kind: "trend",
        points: toPointSeries(silentDaySeries),
        formatter: "percent",
      },
    },
    {
      id: "analytics-category-shock",
      title: "Category Shock Tracker",
      eyebrow: "Instability",
      question: "Which categories are most likely to suddenly jump above their own normal?",
      insight:
        "This is different from biggest categories. It ranks unpredictability, which is often the real reason a month feels off-plan.",
      metricLabel: "Largest shock multiple",
      metricValue: `${round(categoryShockEntries[0]?.[1] ?? 0, 1)}x`,
      tags: ["Categories", "Volatility"],
      visual: {
        kind: "bars",
        items: categoryShockEntries.map(([category, value]) => ({
          label: category.slice(0, 12),
          value,
        })),
        formatter: "number",
      },
    },
    {
      id: "analytics-repeat-lock-in",
      title: "Repeat Merchant Lock-In",
      eyebrow: "Habit Share",
      question: "How much of your monthly spend is already committed to places you keep revisiting?",
      insight:
        "A rising lock-in ratio can mean good routine, but it can also signal that spend is becoming automatic instead of deliberate.",
      metricLabel: "Latest repeat-share",
      metricValue: formatPercent(repeatLockInSeries.at(-1)?.[1] ?? 0),
      tags: ["Merchants", "Habits"],
      visual: {
        kind: "trend",
        points: toPointSeries(repeatLockInSeries),
        formatter: "percent",
      },
    },
    {
      id: "analytics-refund-cushion",
      title: "Refund Cushion Contribution",
      eyebrow: "Positive Offsets",
      question: "How much of your spending pressure got softened by smaller incoming credits?",
      insight:
        "This surfaces the quiet buffer from refunds, reimbursements, or corrections that usually gets lost inside generic income charts.",
      metricLabel: "Offset vs spend",
      metricValue: formatPercent(mean(refundSeries.map(([, value]) => value))),
      tags: ["Credits", "Cushion"],
      visual: {
        kind: "trend",
        points: toPointSeries(refundSeries),
        formatter: "percent",
      },
    },
    {
      id: "analytics-payday-half-life",
      title: "Payday Drag Half-Life",
      eyebrow: "Income Timing",
      question: "After your main paycheck lands, how fast does half of the following spend get pulled forward?",
      insight:
        "It measures the emotional gravity of payday windows: shorter half-lives mean money starts leaving almost immediately.",
      metricLabel: "Median half-life",
      metricValue: `${round(median(paydayHalfLifeSeries.map(([, value]) => value).filter(Boolean)), 0)} days`,
      tags: ["Income", "Timing"],
      visual: {
        kind: "trend",
        points: toPointSeries(paydayHalfLifeSeries),
        formatter: "number",
      },
    },
    {
      id: "analytics-front-loaded-pressure",
      title: "Front-Loaded Spend Pressure",
      eyebrow: "Month Shape",
      question: "Are the first seven days of the month heavier than the last seven?",
      insight:
        "Budget pace looks at progress. This looks at sequence. Some users are fine overall but front-load so hard that the rest of the month feels constrained.",
      metricLabel: "Average first-week spend",
      metricValue: formatCurrency(mean(frontLoadedSeries.map((entry) => entry.start)), {
        maximumFractionDigits: 0,
      }),
      tags: ["Month Shape", "Pacing"],
      visual: {
        kind: "dumbbell",
        items: frontLoadedSeries.slice(-6),
        formatter: "currency",
      },
    },
    {
      id: "analytics-balance-whiplash",
      title: "Balance Whiplash",
      eyebrow: "Cash Motion",
      question: "How violently does your balance swing inside a month?",
      insight:
        "Two months can close at the same number and feel completely different. Whiplash captures that internal turbulence.",
      metricLabel: "Latest intra-month swing noise",
      metricValue: formatCurrency(balanceWhiplashSeries.at(-1)?.[1] ?? 0, {
        maximumFractionDigits: 0,
      }),
      tags: ["Balance", "Volatility"],
      visual: {
        kind: "trend",
        points: toPointSeries(balanceWhiplashSeries),
        formatter: "currency",
      },
    },
    {
      id: "analytics-low-balance-collision",
      title: "Low-Balance Collision Map",
      eyebrow: "Stress Windows",
      question: "When low-balance days happen, which weekday and week-of-month combinations keep showing up?",
      insight:
        "This turns low-balance stress into a repeatable pattern you can design around instead of treating it like random bad luck.",
      metricLabel: "Collision events in recent months",
      metricValue: `${collisionCells.reduce((total, cell) => total + cell.value, 0)}`,
      tags: ["Balance", "Heatmap"],
      visual: {
        kind: "heatmap",
        xLabels: WEEKDAY_NAMES,
        yLabels: ["W1", "W2", "W3", "W4", "W5"],
        cells: collisionCells,
      },
    },
    {
      id: "analytics-variety-vs-growth",
      title: "Merchant Variety vs Spend Growth",
      eyebrow: "Exploration Tradeoff",
      question: "Do bigger months come from spending more everywhere, or just visiting more places?",
      insight:
        "This is a clean way to separate inflation of basket size from inflation of merchant variety, which behave very differently.",
      metricLabel: "Variety-to-spend correlation",
      metricValue: round(correlation(merchantScatterPoints), 2).toString(),
      tags: ["Merchants", "Scatter"],
      visual: {
        kind: "scatter",
        points: merchantScatterPoints,
        xLabel: "Unique merchants",
        yLabel: "Monthly spend",
      },
    },
    {
      id: "analytics-category-comeback",
      title: "Category Comeback Frequency",
      eyebrow: "Behavior Relapse",
      question: "Which categories keep returning right after they looked under control?",
      insight:
        "Comebacks are more actionable than biggest categories because they highlight where restraint keeps collapsing.",
      metricLabel: "Most frequent comeback",
      metricValue: `${round(comebackEntries[0]?.[1] ?? 0, 0)} rebounds`,
      tags: ["Categories", "Relapse"],
      visual: {
        kind: "bars",
        items: comebackEntries.map(([category, value]) => ({
          label: category.slice(0, 12),
          value,
        })),
        formatter: "number",
      },
    },
    {
      id: "analytics-ticket-creep",
      title: "Ticket Creep at Favorite Merchants",
      eyebrow: "Inflation Inside Habits",
      question: "At the merchants you rely on most, is the typical ticket quietly climbing?",
      insight:
        "This is inflation you actually feel. It isolates favorite merchants instead of averaging price pressure across everything.",
      metricLabel: "Median favorite-ticket drift",
      metricValue: formatCurrency(
        mean(favoriteMerchantDumbbells.map((entry) => entry.end - entry.start)),
        { maximumFractionDigits: 0, showSign: true },
      ),
      tags: ["Merchants", "Inflation"],
      visual: {
        kind: "dumbbell",
        items: favoriteMerchantDumbbells,
        formatter: "currency",
      },
    },
    {
      id: "analytics-first-touch-spend",
      title: "First-Touch Spend Share",
      eyebrow: "Novelty Spend",
      question: "How much of each month goes to merchants you had never used before?",
      insight:
        "New-merchant spend is where experimentation, convenience drift, and impulse discovery tend to live long before categories reveal it.",
      metricLabel: "Latest first-touch share",
      metricValue: formatPercent(firstTouchSeries.at(-1)?.[1] ?? 0),
      tags: ["Novelty", "Merchants"],
      visual: {
        kind: "trend",
        points: toPointSeries(firstTouchSeries),
        formatter: "percent",
      },
    },
  ]

  return cards
}

function buildSavingsCards(base: BaseData, options: BuildOptions): PlaygroundCardModel[] {
  const { formatCurrency } = options
  const latestSnapshot = base.monthlyBalanceSnapshots.at(-1)
  const averageMonthlyBurn = mean(base.recentMonthKeys.map((monthKey) => base.monthExpenseTotals.get(monthKey) ?? 0))
  const runwayMonths = averageMonthlyBurn > 0 ? (latestSnapshot?.closing ?? 0) / averageMonthlyBurn : 0

  const refillSeries = base.recentMonthKeys.map((monthKey) => {
    const monthTransactions = base.transactions.filter((transaction) => transaction.monthKey === monthKey)
    const balances = monthTransactions.map((transaction) => transaction.workingBalance)
    if (!balances.length) return [toMonthLabel(monthKey), 0] as [string, number]
    const minBalance = Math.min(...balances)
    const minIndex = balances.findIndex((balance) => balance === minBalance)
    const target = minBalance + (monthTransactions[monthTransactions.length - 1].workingBalance - minBalance) * 0.5
    const recoveryIndex = balances.findIndex((balance, index) => index >= minIndex && balance >= target)
    return [toMonthLabel(monthKey), recoveryIndex >= minIndex ? recoveryIndex - minIndex : 0] as [string, number]
  })

  const surplusSeries = base.recentMonthKeys.map((monthKey) => [toMonthLabel(monthKey), base.monthNetTotals.get(monthKey) ?? 0] as [string, number])
  const positiveMonths = surplusSeries.filter(([, value]) => value > 0).length

  const deficitRecoveryItems = (() => {
    const items: Array<{ label: string; value: number }> = []
    for (let index = 0; index < base.monthlyBalanceSnapshots.length; index += 1) {
      const snapshot = base.monthlyBalanceSnapshots[index]
      const net = base.monthNetTotals.get(snapshot.monthKey) ?? 0
      if (net >= 0) continue
      let lag = 0
      for (let inner = index + 1; inner < base.monthlyBalanceSnapshots.length; inner += 1) {
        lag += 1
        if (base.monthlyBalanceSnapshots[inner].closing >= snapshot.opening) break
      }
      items.push({ label: toMonthLabel(snapshot.monthKey), value: lag })
    }
    return items.slice(-6)
  })()

  const balanceFloorSeries = base.monthlyBalanceSnapshots.map((snapshot) => [toMonthLabel(snapshot.monthKey), snapshot.floor] as [string, number])

  const paycheckRetentionBars = (() => {
    const buckets = [7, 14, 21].map((days) => ({ label: `${days}d`, value: 0, count: 0 }))
    for (const monthKey of base.recentMonthKeys) {
      const incomeDay = base.incomeTransactions
        .filter((transaction) => transaction.monthKey === monthKey)
        .sort((a, b) => b.amount - a.amount)[0]
      if (!incomeDay) continue
      const startingBalance = incomeDay.workingBalance
      for (const bucket of buckets) {
        const targetDate = new Date(incomeDay.date)
        targetDate.setUTCDate(targetDate.getUTCDate() + Number(bucket.label.replace("d", "")))
        const targetDateKey = targetDate.toISOString().slice(0, 10)
        const futureBalance =
          [...base.transactions]
            .filter((transaction) => transaction.dateKey <= targetDateKey)
            .at(-1)?.workingBalance ?? startingBalance
        bucket.value += startingBalance ? (futureBalance / startingBalance) * 100 : 0
        bucket.count += 1
      }
    }
    return buckets.map((bucket) => ({
      label: bucket.label,
      value: bucket.count ? bucket.value / bucket.count : 0,
    }))
  })()

  const fragilitySeries = base.monthlyBalanceSnapshots.map((snapshot) => {
    const monthDaySpend = [...(base.monthDayExpenses.get(snapshot.monthKey) ?? new Map<string, number>()).values()].sort(
      (a, b) => b - a,
    )
    const top3 = sum(monthDaySpend.slice(0, 3))
    return [toMonthLabel(snapshot.monthKey), snapshot.floor ? (top3 / snapshot.floor) * 100 : 0] as [string, number]
  })

  const drawdownBars = (() => {
    let rollingPeak = -Infinity
    return base.transactions
      .map((transaction) => {
        rollingPeak = Math.max(rollingPeak, transaction.workingBalance)
        const drawdown = rollingPeak > 0 ? ((rollingPeak - transaction.workingBalance) / rollingPeak) * 100 : 0
        return {
          label: toMonthLabel(transaction.monthKey),
          value: drawdown,
        }
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
  })()

  const corridorSeries = base.monthlyBalanceSnapshots.map((snapshot) => [toMonthLabel(snapshot.monthKey), snapshot.range] as [string, number])

  const absorbencySeries = base.recentMonthKeys.map((monthKey) => {
    const biggestIncome = Math.max(
      0,
      ...base.incomeTransactions.filter((transaction) => transaction.monthKey === monthKey).map((transaction) => transaction.amount),
    )
    const dailySpend = [...(base.monthDayExpenses.get(monthKey) ?? new Map<string, number>()).values()]
    return [toMonthLabel(monthKey), biggestIncome && dailySpend.length ? biggestIncome / mean(dailySpend) : 0] as [string, number]
  })

  const reserveSurvivalSeries = base.monthlyBalanceSnapshots.map((snapshot) => {
    const monthBurn = base.monthExpenseTotals.get(snapshot.monthKey) ?? 0
    return [toMonthLabel(snapshot.monthKey), monthBurn ? snapshot.floor / monthBurn : 0] as [string, number]
  })

  const cushionIndependenceBars = (() => {
    const incomeMedian = median(base.recentMonthKeys.map((monthKey) => base.monthIncomeTotals.get(monthKey) ?? 0))
    return base.monthlyBalanceSnapshots.map((snapshot) => ({
      label: toMonthLabel(snapshot.monthKey),
      value:
        (base.monthIncomeTotals.get(snapshot.monthKey) ?? 0) < incomeMedian && snapshot.closing > snapshot.opening ? 1 : 0,
    }))
  })()

  const bouncebackRate = (() => {
    let deficits = 0
    let recovered = 0
    for (let index = 0; index < base.recentMonthKeys.length - 1; index += 1) {
      const currentNet = base.monthNetTotals.get(base.recentMonthKeys[index]) ?? 0
      const nextNet = base.monthNetTotals.get(base.recentMonthKeys[index + 1]) ?? 0
      if (currentNet < 0) {
        deficits += 1
        if (nextNet > 0) recovered += 1
      }
    }
    return deficits ? (recovered / deficits) * 100 : 0
  })()

  const floorToCloseSeries = base.monthlyBalanceSnapshots.map((snapshot) => [toMonthLabel(snapshot.monthKey), snapshot.closing - snapshot.floor] as [string, number])

  const groceryFlexDividendSeries = base.recentMonthKeys.map((monthKey, index) => {
    const groceryMonthSpend = sum(base.baskets.filter((basket) => basket.monthKey === monthKey).map((basket) => basket.spend))
    const previousWindow = base.recentMonthKeys.slice(Math.max(0, index - 3), index)
    const groceryBaseline = mean(previousWindow.map((key) => sum(base.baskets.filter((basket) => basket.monthKey === key).map((basket) => basket.spend))))
    const surplusBaseline = mean(previousWindow.map((key) => base.monthNetTotals.get(key) ?? 0))
    const net = base.monthNetTotals.get(monthKey) ?? 0
    const dividend = groceryMonthSpend < groceryBaseline && net > surplusBaseline ? 1 : 0
    return { label: toMonthLabel(monthKey), value: dividend }
  })

  const closingLiftSeries = base.monthlyBalanceSnapshots.map((snapshot) => [toMonthLabel(snapshot.monthKey), snapshot.closing - snapshot.opening] as [string, number])

  const cards: PlaygroundCardModel[] = [
    {
      id: "savings-runway-gauge",
      title: "Emergency Runway Gauge",
      eyebrow: "Buffer Strength",
      question: "If income froze today, how many average months could the current balance absorb?",
      insight:
        "This reframes balance as time instead of money, which is much easier to act on when deciding whether you feel protected or exposed.",
      metricLabel: "Runway at current close",
      metricValue: `${round(runwayMonths, 1)} months`,
      tags: ["Safety", "Runway"],
      visual: {
        kind: "gauge",
        value: clamp(runwayMonths / 6, 0, 1),
        target: 0.66,
      },
    },
    {
      id: "savings-buffer-refill",
      title: "Buffer Refill Speed",
      eyebrow: "Recovery",
      question: "After a monthly low point, how quickly does the buffer start climbing back?",
      insight:
        "Healthy finances do not just avoid dips. They recover quickly. Refill speed exposes that recovery muscle directly.",
      metricLabel: "Median refill time",
      metricValue: `${round(median(refillSeries.map(([, value]) => value).filter(Boolean)), 0)} days`,
      tags: ["Recovery", "Balance"],
      visual: {
        kind: "trend",
        points: toPointSeries(refillSeries),
        formatter: "number",
      },
    },
    {
      id: "savings-surplus-consistency",
      title: "Surplus Consistency",
      eyebrow: "Monthly Discipline",
      question: "How often does the month actually close with surplus cash flow?",
      insight:
        "Consistency matters more than one heroic month because it tells you whether savings behavior survives normal life noise.",
      metricLabel: "Positive months",
      metricValue: `${positiveMonths}/${surplusSeries.length}`,
      tags: ["Consistency", "Net Flow"],
      visual: {
        kind: "trend",
        points: toPointSeries(surplusSeries),
        formatter: "currency",
      },
    },
    {
      id: "savings-deficit-recovery",
      title: "Deficit Recovery Lag",
      eyebrow: "Recovery",
      question: "When a month ends negative, how long does it usually take to climb back above the starting line?",
      insight:
        "Some users run deficits they recover from immediately. Others carry the drag for months. That difference is a major planning signal.",
      metricLabel: "Median recovery lag",
      metricValue: `${round(median(deficitRecoveryItems.map((item) => item.value).filter(Boolean)), 0)} months`,
      tags: ["Deficits", "Recovery"],
      visual: {
        kind: "bars",
        items: deficitRecoveryItems,
        formatter: "number",
      },
    },
    {
      id: "savings-balance-floor-trend",
      title: "Balance Floor Trend",
      eyebrow: "Minimum Protection",
      question: "Is the lowest point of each month getting safer or thinner?",
      insight:
        "Minimum balance tells the truth faster than closing balance because it captures the month’s deepest stress point.",
      metricLabel: "Latest monthly floor",
      metricValue: formatCurrency(balanceFloorSeries.at(-1)?.[1] ?? 0, { maximumFractionDigits: 0 }),
      tags: ["Balance", "Floor"],
      visual: {
        kind: "trend",
        points: toPointSeries(balanceFloorSeries),
        formatter: "currency",
      },
    },
    {
      id: "savings-paycheck-retention",
      title: "Paycheck Retention Curve",
      eyebrow: "Income Persistence",
      question: "How much of the post-paycheck balance tends to remain after one, two, and three weeks?",
      insight:
        "This surfaces whether income buys durable breathing room or disappears almost immediately after landing.",
      metricLabel: "14-day retention",
      metricValue: formatPercent(paycheckRetentionBars[1]?.value ?? 0),
      tags: ["Income", "Retention"],
      visual: {
        kind: "bars",
        items: paycheckRetentionBars,
        formatter: "percent",
      },
    },
    {
      id: "savings-cushion-fragility",
      title: "Cash Cushion Fragility",
      eyebrow: "Stress Test",
      question: "How much of the monthly balance floor could the three worst spending days wipe out?",
      insight:
        "Fragility translates random ugly days into a direct threat level against your cushion, which makes it a strong alerting concept.",
      metricLabel: "Average floor at risk",
      metricValue: formatPercent(mean(fragilitySeries.map(([, value]) => value))),
      tags: ["Stress", "Cushion"],
      visual: {
        kind: "trend",
        points: toPointSeries(fragilitySeries),
        formatter: "percent",
      },
    },
    {
      id: "savings-drawdown-ladder",
      title: "Drawdown Ladder",
      eyebrow: "Worst Dips",
      question: "Which balance drops were the deepest relative to the peak that came before them?",
      insight:
        "This is a more honest risk view than average volatility because it ranks the real stomach-dropping moments you actually felt.",
      metricLabel: "Max drawdown",
      metricValue: formatPercent(drawdownBars[0]?.value ?? 0),
      tags: ["Risk", "Drawdown"],
      visual: {
        kind: "bars",
        items: drawdownBars,
        formatter: "percent",
      },
    },
    {
      id: "savings-volatility-corridor",
      title: "Buffer Volatility Corridor",
      eyebrow: "Balance Motion",
      question: "How wide is the gap between each month’s highest and lowest balance?",
      insight:
        "A wide corridor means the same closing balance is being achieved with much more internal stress and tighter timing.",
      metricLabel: "Average monthly range",
      metricValue: formatCurrency(mean(corridorSeries.map(([, value]) => value)), { maximumFractionDigits: 0 }),
      tags: ["Range", "Balance"],
      visual: {
        kind: "trend",
        points: toPointSeries(corridorSeries),
        formatter: "currency",
      },
    },
    {
      id: "savings-income-absorbency",
      title: "Income Absorbency Days",
      eyebrow: "Paycheck Power",
      question: "How many average expense days does your biggest monthly income event actually fund?",
      insight:
        "This turns paycheck size into practical endurance instead of a raw number, which makes months easier to compare.",
      metricLabel: "Median days funded",
      metricValue: `${round(median(absorbencySeries.map(([, value]) => value).filter(Boolean)), 1)} days`,
      tags: ["Income", "Coverage"],
      visual: {
        kind: "trend",
        points: toPointSeries(absorbencySeries),
        formatter: "number",
      },
    },
    {
      id: "savings-reserve-survival",
      title: "Reserve Survival Score",
      eyebrow: "Safety Margin",
      question: "How much of a month’s spend would your monthly floor have covered before it got replenished?",
      insight:
        "Runway uses closing balance. Survival score uses the weakest point, which makes it a stricter safety measure.",
      metricLabel: "Current floor coverage",
      metricValue: `${round(reserveSurvivalSeries.at(-1)?.[1] ?? 0, 1)}x`,
      tags: ["Floor", "Coverage"],
      visual: {
        kind: "trend",
        points: toPointSeries(reserveSurvivalSeries),
        formatter: "number",
      },
    },
    {
      id: "savings-cushion-independence",
      title: "Cushion Independence",
      eyebrow: "Quality of Surplus",
      question: "How often does balance still grow in months where income lands below your usual level?",
      insight:
        "This isolates discipline from income luck. It rewards months where the buffer grew because the system held, not because income bailed it out.",
      metricLabel: "Low-income wins",
      metricValue: `${sum(cushionIndependenceBars.map((bar) => bar.value))} months`,
      tags: ["Surplus", "Discipline"],
      visual: {
        kind: "bars",
        items: cushionIndependenceBars,
        formatter: "number",
      },
    },
    {
      id: "savings-bounceback-rate",
      title: "Deficit Bounceback Rate",
      eyebrow: "Recovery Discipline",
      question: "When a month goes negative, how often is the next one positive again?",
      insight:
        "Bounceback rate shows whether deficits stay isolated or turn into slow cascades across the quarter.",
      metricLabel: "Next-month rebound rate",
      metricValue: formatPercent(bouncebackRate),
      tags: ["Deficits", "Recovery"],
      visual: {
        kind: "gauge",
        value: clamp(bouncebackRate / 100, 0, 1),
        target: 0.7,
      },
    },
    {
      id: "savings-floor-to-close",
      title: "Floor-to-Close Spread",
      eyebrow: "Recovery Headroom",
      question: "After hitting the monthly low, how much balance usually gets rebuilt by the close?",
      insight:
        "A wide spread means the month finishes with slack. A tight spread means the close is still hugging the danger zone.",
      metricLabel: "Latest spread",
      metricValue: formatCurrency(floorToCloseSeries.at(-1)?.[1] ?? 0, { maximumFractionDigits: 0 }),
      tags: ["Balance", "Recovery"],
      visual: {
        kind: "trend",
        points: toPointSeries(floorToCloseSeries),
        formatter: "currency",
      },
    },
    {
      id: "savings-grocery-flex-dividend",
      title: "Grocery Flex Dividend",
      eyebrow: "Cross-Signal",
      question: "How often do lighter grocery months coincide with better-than-usual surplus months?",
      insight:
        "This is the kind of cross-feature link that makes the product smarter: it shows whether grocery discipline actually frees cash elsewhere.",
      metricLabel: "Dividend months",
      metricValue: `${sum(groceryFlexDividendSeries.map((entry) => entry.value))} / ${groceryFlexDividendSeries.length}`,
      tags: ["Groceries", "Savings"],
      visual: {
        kind: "bars",
        items: groceryFlexDividendSeries,
        formatter: "number",
      },
    },
    {
      id: "savings-closing-lift",
      title: "Closing Balance Lift",
      eyebrow: "Month Finish",
      question: "How far above or below the month’s opening level do you usually finish?",
      insight:
        "Lift is a simple but powerful monthly outcome chart because it compresses all the churn into one directional result.",
      metricLabel: "Average monthly lift",
      metricValue: formatCurrency(mean(closingLiftSeries.map(([, value]) => value)), {
        maximumFractionDigits: 0,
        showSign: true,
      }),
      tags: ["Net Result", "Balance"],
      visual: {
        kind: "trend",
        points: toPointSeries(closingLiftSeries),
        formatter: "currency",
      },
    },
  ]

  return cards
}

function buildFridgeCards(base: BaseData, options: BuildOptions): PlaygroundCardModel[] {
  const { formatCurrency } = options
  const complexitySeries = base.recentMonthKeys.map((monthKey) => {
    const monthBaskets = base.baskets.filter((basket) => basket.monthKey === monthKey)
    return [toMonthLabel(monthKey), mean(monthBaskets.map((basket) => basket.uniqueItems))] as [string, number]
  })

  const itemPriceChangeEntries = (() => {
    const itemMap = new Map<string, EnrichedReceiptLine[]>()
    for (const line of base.receiptLines) {
      const lines = itemMap.get(line.item) ?? []
      lines.push(line)
      itemMap.set(line.item, lines)
    }
    return [...itemMap.entries()]
      .map(([item, lines]) => {
        if (lines.length < 3) return null
        const midpoint = Math.floor(lines.length / 2)
        const start = mean(lines.slice(0, midpoint).map((line) => line.pricePerUnit))
        const end = mean(lines.slice(midpoint).map((line) => line.pricePerUnit))
        return { label: item.slice(0, 12), start, end, delta: Math.abs(end - start) }
      })
      .filter((entry): entry is { label: string; start: number; end: number; delta: number } => Boolean(entry))
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 6)
  })()

  const storeSpecializationEntries = (() => {
    const storeCategoryMap = new Map<string, Map<string, number>>()
    for (const line of base.receiptLines) {
      const categoryMap = storeCategoryMap.get(line.store) ?? new Map<string, number>()
      categoryMap.set(line.category, (categoryMap.get(line.category) ?? 0) + line.totalPrice)
      storeCategoryMap.set(line.store, categoryMap)
    }
    return topEntries(
      new Map(
        [...storeCategoryMap.entries()].map(([store, categoryMap]) => {
          const total = sum([...categoryMap.values()])
          const hhi = total
            ? sum([...categoryMap.values()].map((value) => {
                const share = value / total
                return share ** 2
              })) * 100
            : 0
          return [store, hhi]
        }),
      ),
      6,
    )
  })()

  const repeatedItems = new Set(
    [...base.receiptLines.reduce((map, line) => {
      map.set(line.item, (map.get(line.item) ?? 0) + 1)
      return map
    }, new Map<string, number>()).entries()]
      .filter(([, count]) => count >= 3)
      .map(([item]) => item),
  )

  const stapleDependenceSeries = base.recentMonthKeys.map((monthKey) => {
    const monthLines = base.receiptLines.filter((line) => line.monthKey === monthKey)
    const total = sum(monthLines.map((line) => line.totalPrice))
    const stapleSpend = sum(monthLines.filter((line) => repeatedItems.has(line.item)).map((line) => line.totalPrice))
    return [toMonthLabel(monthKey), total ? (stapleSpend / total) * 100 : 0] as [string, number]
  })

  const experimentSeries = (() => {
    const seen = new Set<string>()
    return base.recentMonthKeys.map((monthKey) => {
      const monthLines = base.receiptLines.filter((line) => line.monthKey === monthKey)
      const uniqueItems = [...new Set(monthLines.map((line) => line.item))]
      const newItems = uniqueItems.filter((item) => !seen.has(item))
      uniqueItems.forEach((item) => seen.add(item))
      return [toMonthLabel(monthKey), uniqueItems.length ? (newItems.length / uniqueItems.length) * 100 : 0] as [string, number]
    })
  })()

  const planningVsGrazing = base.recentMonthKeys.map((monthKey) => {
    const monthBaskets = base.baskets.filter((basket) => basket.monthKey === monthKey)
    const planned = monthBaskets.filter((basket) => basket.uniqueItems >= 8).length
    const grazing = monthBaskets.filter((basket) => basket.uniqueItems <= 3).length
    return { label: toMonthLabel(monthKey), start: planned, end: grazing }
  })

  const proteinBasketSeries = base.recentMonthKeys.map((monthKey) => {
    const monthBaskets = base.baskets.filter((basket) => basket.monthKey === monthKey)
    const basketsWithProtein = monthBaskets.filter((basket) =>
      basket.lines.some((line) => line.categoryType.toLowerCase().includes("protein")),
    ).length
    return [toMonthLabel(monthKey), monthBaskets.length ? (basketsWithProtein / monthBaskets.length) * 100 : 0] as [string, number]
  })

  const mixedBasketSeries = base.recentMonthKeys.map((monthKey) => {
    const monthBaskets = base.baskets.filter((basket) => basket.monthKey === monthKey)
    const mixed = monthBaskets.filter((basket) => basket.uniqueCategories >= 3).length
    return [toMonthLabel(monthKey), monthBaskets.length ? (mixed / monthBaskets.length) * 100 : 0] as [string, number]
  })

  const checkoutDriftSeries = base.recentMonthKeys.map((monthKey) => {
    const hours = base.baskets.filter((basket) => basket.monthKey === monthKey).map((basket) => basket.hour).filter((hour): hour is number => hour !== null)
    return [toMonthLabel(monthKey), hours.length ? median(hours) : 0] as [string, number]
  })

  const storeHopperSeries = base.recentMonthKeys.map((monthKey) => {
    const monthBaskets = base.baskets.filter((basket) => basket.monthKey === monthKey)
    const uniqueStores = new Set(monthBaskets.map((basket) => basket.store)).size
    return [toMonthLabel(monthKey), monthBaskets.length ? (uniqueStores / monthBaskets.length) * 100 : 0] as [string, number]
  })

  const replenishmentEntries = (() => {
    const itemDateMap = new Map<string, string[]>()
    for (const line of base.receiptLines) {
      const dates = itemDateMap.get(line.item) ?? []
      dates.push(line.dateKey)
      itemDateMap.set(line.item, dates)
    }
    return [...itemDateMap.entries()]
      .map(([item, dates]) => {
        if (dates.length < 3) return null
        const sortedDates = [...new Set(dates)].sort()
        const gaps = sortedDates.slice(1).map((date, index) => {
          return (parseIsoDate(date).getTime() - parseIsoDate(sortedDates[index]).getTime()) / 86400000
        })
        return { label: item.slice(0, 12), value: median(gaps) }
      })
      .filter((entry): entry is { label: string; value: number } => Boolean(entry))
      .sort((a, b) => a.value - b.value)
      .slice(0, 6)
  })()

  const bulkEfficiencyEntries = (() => {
    const itemGroup = new Map<string, EnrichedReceiptLine[]>()
    for (const line of base.receiptLines) {
      const lines = itemGroup.get(line.item) ?? []
      lines.push(line)
      itemGroup.set(line.item, lines)
    }
    return [...itemGroup.entries()]
      .map(([item, lines]) => {
        const singles = lines.filter((line) => line.quantity <= 1.2).map((line) => line.pricePerUnit)
        const bulk = lines.filter((line) => line.quantity > 1.2).map((line) => line.pricePerUnit)
        if (!singles.length || !bulk.length) return null
        return { label: item.slice(0, 12), start: mean(singles), end: mean(bulk), savings: mean(singles) - mean(bulk) }
      })
      .filter((entry): entry is { label: string; start: number; end: number; savings: number } => Boolean(entry))
      .sort((a, b) => b.savings - a.savings)
      .slice(0, 6)
  })()

  const surpriseSeries = base.recentMonthKeys.map((monthKey) => {
    const monthBaskets = base.baskets.filter((basket) => basket.monthKey === monthKey)
    const complexityBaseline = mean(monthBaskets.map((basket) => basket.uniqueCategories))
    const surprising = monthBaskets.filter((basket) => basket.uniqueCategories >= complexityBaseline + 2).length
    return [toMonthLabel(monthKey), monthBaskets.length ? (surprising / monthBaskets.length) * 100 : 0] as [string, number]
  })

  const priceMemoryEntries = (() => {
    const itemGroup = new Map<string, number[]>()
    for (const line of base.receiptLines) {
      const prices = itemGroup.get(line.item) ?? []
      prices.push(line.pricePerUnit)
      itemGroup.set(line.item, prices)
    }
    return [...itemGroup.entries()]
      .map(([item, prices]) => {
        if (prices.length < 3) return null
        const avg = mean(prices)
        if (!avg) return null
        return { label: item.slice(0, 12), value: (standardDeviation(prices) / avg) * 100 }
      })
      .filter((entry): entry is { label: string; value: number } => Boolean(entry))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
  })()

  const categoryPairingHeatmap = (() => {
    const categoryPairs = new Map<string, number>()
    const topCategories = topEntries(
      new Map(
        [...base.receiptLines.reduce((map, line) => {
          map.set(line.category, (map.get(line.category) ?? 0) + line.totalPrice)
          return map
        }, new Map<string, number>()).entries()],
      ),
      5,
    ).map(([category]) => category)

    for (const basket of base.baskets) {
      const categories = [...new Set(basket.lines.map((line) => line.category))].filter((category) =>
        topCategories.includes(category),
      )
      for (const left of categories) {
        for (const right of categories) {
          if (left === right) continue
          const key = `${left}::${right}`
          categoryPairs.set(key, (categoryPairs.get(key) ?? 0) + 1)
        }
      }
    }

    return {
      xLabels: topCategories,
      yLabels: topCategories,
      cells: topCategories.flatMap((left) =>
        topCategories.map((right) => ({
          x: right,
          y: left,
          value: left === right ? 0 : categoryPairs.get(`${left}::${right}`) ?? 0,
        })),
      ),
    }
  })()

  const missionPurityEntries = (() => {
    const storePurity = new Map<string, number[]>()
    for (const basket of base.baskets) {
      const categorySpend = new Map<string, number>()
      for (const line of basket.lines) {
        categorySpend.set(line.category, (categorySpend.get(line.category) ?? 0) + line.totalPrice)
      }
      const purity = basket.spend ? Math.max(...categorySpend.values()) / basket.spend : 0
      const purities = storePurity.get(basket.store) ?? []
      purities.push(purity)
      storePurity.set(basket.store, purities)
    }
    return topEntries(
      new Map(
        [...storePurity.entries()].map(([store, purities]) => [store, mean(purities) * 100]),
      ),
      6,
    )
  })()

  const groceryPressureSeries = base.recentMonthKeys.map((monthKey) => {
    const grocerySpend = sum(base.baskets.filter((basket) => basket.monthKey === monthKey).map((basket) => basket.spend))
    const totalExpense = base.monthExpenseTotals.get(monthKey) ?? 0
    return [toMonthLabel(monthKey), totalExpense ? (grocerySpend / totalExpense) * 100 : 0] as [string, number]
  })

  const cards: PlaygroundCardModel[] = [
    {
      id: "fridge-basket-complexity",
      title: "Basket Complexity Index",
      eyebrow: "Basket Architecture",
      question: "Are grocery trips becoming more composed and planned, or more fragmented?",
      insight:
        "Complexity tracks how many distinct items each trip carries, which is a strong signal for planned stock-ups versus reactive top-ups.",
      metricLabel: "Average unique items",
      metricValue: `${round(mean(complexitySeries.map(([, value]) => value)), 1)} items`,
      tags: ["Baskets", "Planning"],
      visual: {
        kind: "trend",
        points: toPointSeries(complexitySeries),
        formatter: "number",
      },
    },
    {
      id: "fridge-unit-price-drift",
      title: "Unit Price Drift Leaders",
      eyebrow: "Price Drift",
      question: "Which repeated items changed most between your earlier and later purchases?",
      insight:
        "This reveals the real inflation hits in your own kitchen instead of the generic market basket the news talks about.",
      metricLabel: "Largest per-unit drift",
      metricValue: formatCurrency(Math.abs((itemPriceChangeEntries[0]?.end ?? 0) - (itemPriceChangeEntries[0]?.start ?? 0)), {
        maximumFractionDigits: 2,
      }),
      tags: ["Inflation", "Items"],
      visual: {
        kind: "dumbbell",
        items: itemPriceChangeEntries,
        formatter: "currency",
      },
    },
    {
      id: "fridge-store-specialization",
      title: "Store Specialization Score",
      eyebrow: "Store Intelligence",
      question: "Which stores are true missions and which ones are broad all-rounders?",
      insight:
        "A specialization score lets you distinguish destination stores from catch-all ones, which is more useful than raw spend alone.",
      metricLabel: "Most specialized store",
      metricValue: formatPercent(storeSpecializationEntries[0]?.[1] ?? 0),
      tags: ["Stores", "Mission"],
      visual: {
        kind: "bars",
        items: storeSpecializationEntries.map(([store, value]) => ({
          label: store.slice(0, 12),
          value,
        })),
        formatter: "percent",
      },
    },
    {
      id: "fridge-staples-dependence",
      title: "Pantry Staples Dependence",
      eyebrow: "Repeat Buying",
      question: "How much of grocery spend is concentrated in the same repeat items?",
      insight:
        "This is the pantry version of merchant dependency. It surfaces whether your food system is stable, stale, or overly rigid.",
      metricLabel: "Latest staple share",
      metricValue: formatPercent(stapleDependenceSeries.at(-1)?.[1] ?? 0),
      tags: ["Staples", "Dependence"],
      visual: {
        kind: "trend",
        points: toPointSeries(stapleDependenceSeries),
        formatter: "percent",
      },
    },
    {
      id: "fridge-new-item-experiment",
      title: "New Item Experiment Rate",
      eyebrow: "Novelty",
      question: "What share of each month’s groceries comes from items you had not bought before?",
      insight:
        "This tracks experimentation directly and can explain why a month felt expensive or unusually fun even when totals were similar.",
      metricLabel: "Latest experiment rate",
      metricValue: formatPercent(experimentSeries.at(-1)?.[1] ?? 0),
      tags: ["Novelty", "Items"],
      visual: {
        kind: "trend",
        points: toPointSeries(experimentSeries),
        formatter: "percent",
      },
    },
    {
      id: "fridge-planning-vs-grazing",
      title: "Planning vs Grazing",
      eyebrow: "Trip Style",
      question: "Are you mostly doing deliberate stock-up trips or quick top-up missions?",
      insight:
        "A lot of grocery stress comes from drift into too many small trips. This gives that drift a shape you can actually monitor.",
      metricLabel: "Latest planned trips",
      metricValue: `${round(planningVsGrazing.at(-1)?.start ?? 0, 0)} stock-ups`,
      tags: ["Trips", "Planning"],
      visual: {
        kind: "dumbbell",
        items: planningVsGrazing.slice(-6),
        formatter: "number",
      },
    },
    {
      id: "fridge-protein-penetration",
      title: "Protein Basket Penetration",
      eyebrow: "Nutrition Pattern",
      question: "How often do grocery baskets actually include protein-tagged items?",
      insight:
        "This shifts nutrition from spend share to basket presence, which is often closer to how people think about meal readiness.",
      metricLabel: "Protein baskets",
      metricValue: formatPercent(proteinBasketSeries.at(-1)?.[1] ?? 0),
      tags: ["Protein", "Baskets"],
      visual: {
        kind: "trend",
        points: toPointSeries(proteinBasketSeries),
        formatter: "percent",
      },
    },
    {
      id: "fridge-mixed-basket-balance",
      title: "Mixed Basket Balance",
      eyebrow: "Composition",
      question: "How often are your trips broad enough to cover multiple food categories instead of one narrow mission?",
      insight:
        "Mixed baskets usually mean fuller planning. Narrow baskets usually mean patching holes. Both are useful, but you should know the balance.",
      metricLabel: "Mixed-trip share",
      metricValue: formatPercent(mixedBasketSeries.at(-1)?.[1] ?? 0),
      tags: ["Trips", "Mix"],
      visual: {
        kind: "trend",
        points: toPointSeries(mixedBasketSeries),
        formatter: "percent",
      },
    },
    {
      id: "fridge-checkout-drift",
      title: "Checkout Hour Drift",
      eyebrow: "Timing",
      question: "Is grocery shopping drifting earlier, later, or becoming more erratic across months?",
      insight:
        "Checkout timing can reveal routine breakdowns and lifestyle shifts long before total spend changes.",
      metricLabel: "Median checkout hour",
      metricValue: `${round(checkoutDriftSeries.at(-1)?.[1] ?? 0, 1)}h`,
      tags: ["Time", "Routine"],
      visual: {
        kind: "trend",
        points: toPointSeries(checkoutDriftSeries),
        formatter: "number",
      },
    },
    {
      id: "fridge-store-hopper",
      title: "Store Hopper Index",
      eyebrow: "Store Behavior",
      question: "How fragmented is your grocery circuit each month?",
      insight:
        "More store hopping can mean optimization, but it can also mean friction. The index gives that tradeoff a simple readout.",
      metricLabel: "Unique stores per 100 trips",
      metricValue: `${round(storeHopperSeries.at(-1)?.[1] ?? 0, 0)}`,
      tags: ["Stores", "Fragmentation"],
      visual: {
        kind: "trend",
        points: toPointSeries(storeHopperSeries),
        formatter: "number",
      },
    },
    {
      id: "fridge-replenishment-rhythm",
      title: "Replenishment Rhythm",
      eyebrow: "Repeat Cadence",
      question: "Which pantry items keep bringing you back the fastest?",
      insight:
        "This exposes the real cadence of household consumption and can help distinguish staples from accidental money drains.",
      metricLabel: "Fastest repeat cycle",
      metricValue: `${round(replenishmentEntries[0]?.value ?? 0, 0)} days`,
      tags: ["Rhythm", "Items"],
      visual: {
        kind: "bars",
        items: replenishmentEntries,
        formatter: "number",
      },
    },
    {
      id: "fridge-bulk-efficiency",
      title: "Bulk Buy Efficiency",
      eyebrow: "Quantity Economics",
      question: "Which repeated items actually get cheaper when you buy more of them?",
      insight:
        "People assume bulk is cheaper. This checks the assumption against your own receipts item by item.",
      metricLabel: "Best bulk discount",
      metricValue: formatCurrency((bulkEfficiencyEntries[0]?.start ?? 0) - (bulkEfficiencyEntries[0]?.end ?? 0), {
        maximumFractionDigits: 2,
      }),
      tags: ["Bulk", "Price"],
      visual: {
        kind: "dumbbell",
        items: bulkEfficiencyEntries,
        formatter: "currency",
      },
    },
    {
      id: "fridge-basket-surprise",
      title: "Basket Surprise Factor",
      eyebrow: "Basket Diversity",
      question: "How often do grocery trips become unexpectedly broad compared with your normal basket shape?",
      insight:
        "Surprise baskets usually explain why a trip felt like a reset instead of a refill, and they often foreshadow cost jumps.",
      metricLabel: "Latest surprise share",
      metricValue: formatPercent(surpriseSeries.at(-1)?.[1] ?? 0),
      tags: ["Baskets", "Diversity"],
      visual: {
        kind: "trend",
        points: toPointSeries(surpriseSeries),
        formatter: "percent",
      },
    },
    {
      id: "fridge-price-memory-gaps",
      title: "Price Memory Gaps",
      eyebrow: "Volatility",
      question: "Which items are hardest to keep a stable price memory for because the unit price keeps moving?",
      insight:
        "These are the items that make intuition unreliable. They feel randomly expensive because, in your data, they often are.",
      metricLabel: "Highest price volatility",
      metricValue: formatPercent(priceMemoryEntries[0]?.value ?? 0),
      tags: ["Price", "Volatility"],
      visual: {
        kind: "bars",
        items: priceMemoryEntries,
        formatter: "percent",
      },
    },
    {
      id: "fridge-category-pairing",
      title: "Category Pairing Map",
      eyebrow: "Co-Occurrence",
      question: "Which grocery categories keep appearing together inside the same basket?",
      insight:
        "Pairings reveal how people actually shop for meals and routines, which is more useful than looking at categories in isolation.",
      metricLabel: "Tracked top pairings",
      metricValue: `${categoryPairingHeatmap.cells.filter((cell) => cell.value > 0).length}`,
      tags: ["Categories", "Heatmap"],
      visual: {
        kind: "heatmap",
        xLabels: categoryPairingHeatmap.xLabels,
        yLabels: categoryPairingHeatmap.yLabels,
        cells: categoryPairingHeatmap.cells,
      },
    },
    {
      id: "fridge-store-mission-purity",
      title: "Store Mission Purity",
      eyebrow: "Store Roles",
      question: "Which stores tend to serve one dominant mission rather than a broad basket?",
      insight:
        "This separates targeted stops from full-stock trips, which is helpful when optimizing where convenience starts becoming expensive.",
      metricLabel: "Most mission-pure store",
      metricValue: formatPercent(missionPurityEntries[0]?.[1] ?? 0),
      tags: ["Stores", "Purity"],
      visual: {
        kind: "bars",
        items: missionPurityEntries.map(([store, value]) => ({
          label: store.slice(0, 12),
          value,
        })),
        formatter: "percent",
      },
    },
    {
      id: "fridge-household-pressure",
      title: "Household Grocery Pressure",
      eyebrow: "Cross-Signal",
      question: "What share of total expense pressure is being carried by tracked grocery baskets each month?",
      insight:
        "This is where groceries finally talk to the rest of the money story instead of living in their own isolated tab.",
      metricLabel: "Latest grocery pressure",
      metricValue: formatPercent(groceryPressureSeries.at(-1)?.[1] ?? 0),
      tags: ["Groceries", "Cross-Signal"],
      visual: {
        kind: "trend",
        points: toPointSeries(groceryPressureSeries),
        formatter: "percent",
      },
    },
  ]

  return cards
}

function buildSection(
  id: PlaygroundSection["id"],
  title: string,
  description: string,
  accent: string,
  groups: PlaygroundGroup[],
): PlaygroundSection {
  return {
    id,
    title,
    description,
    accent,
    count: groups.reduce((total, group) => total + group.cards.length, 0),
    groups,
  }
}

function buildMidLevelAnalyticsCards(base: BaseData, options: BuildOptions): PlaygroundCardModel[] {
  const { formatCurrency } = options
  const allDailyExpenses = [...base.dailyExpenseMap.values()].filter((value) => value > 0)
  const highCostThreshold = percentile(allDailyExpenses, 0.9) || 0
  const dailyBalances = [...base.dailyBalanceMap.values()]
  const lowBalanceThreshold = percentile(dailyBalances, 0.25) || 0

  const primaryIncomeByMonth = new Map(
    base.recentMonthKeys.map((monthKey) => {
      const income = [...base.incomeTransactions]
        .filter((transaction) => transaction.monthKey === monthKey)
        .sort((a, b) => b.amount - a.amount || a.dateKey.localeCompare(b.dateKey))[0]
      return [monthKey, income] as const
    }),
  )

  const prePaydayCushion = base.recentMonthKeys.map((monthKey) => {
    const primaryIncome = primaryIncomeByMonth.get(monthKey)
    const monthTransactions = base.transactions.filter((transaction) => transaction.monthKey === monthKey)
    if (!primaryIncome || !monthTransactions.length) {
      return [toMonthLabel(monthKey), base.monthlyBalanceSnapshots.find((snapshot) => snapshot.monthKey === monthKey)?.floor ?? 0] as [string, number]
    }
    const incomeDay = primaryIncome.date.getTime()
    const balances = monthTransactions
      .filter((transaction) => incomeDay - transaction.date.getTime() <= 5 * 86400000 && transaction.date.getTime() < incomeDay)
      .map((transaction) => transaction.workingBalance)
    return [toMonthLabel(monthKey), balances.length ? Math.min(...balances) : primaryIncome.workingBalance] as [string, number]
  })

  const largestExpenseShare = base.recentMonthKeys.map((monthKey) => {
    const monthExpenses = base.expenseTransactions.filter((transaction) => transaction.monthKey === monthKey)
    const biggest = Math.max(0, ...monthExpenses.map((transaction) => transaction.absAmount))
    const income = base.monthIncomeTotals.get(monthKey) ?? 0
    return [toMonthLabel(monthKey), income ? (biggest / income) * 100 : 0] as [string, number]
  })

  const burnPerActiveDay = base.recentMonthKeys.map((monthKey) => {
    const spend = base.monthExpenseTotals.get(monthKey) ?? 0
    const activeDays = (base.monthActiveExpenseDays.get(monthKey) ?? new Set()).size || 0
    return [toMonthLabel(monthKey), activeDays ? spend / activeDays : 0] as [string, number]
  })

  const highCostDayCount = base.recentMonthKeys.map((monthKey) => {
    const count = [...(base.monthDayExpenses.get(monthKey) ?? new Map<string, number>()).values()].filter(
      (value) => value >= highCostThreshold,
    ).length
    return [toMonthLabel(monthKey), count] as [string, number]
  })

  const weeklyExpenseLoadItems = Array.from({ length: 5 }, (_, index) => {
    const week = index + 1
    const values = base.recentMonthKeys.map((monthKey) =>
      sum(
        base.expenseTransactions
          .filter((transaction) => transaction.monthKey === monthKey && transaction.weekOfMonth === week)
          .map((transaction) => transaction.absAmount),
      ),
    )
    return {
      label: `Week ${week}`,
      value: mean(values),
    }
  })

  const topDebitRecovery = base.recentMonthKeys.map((monthKey) => {
    const monthTransactions = base.transactions.filter((transaction) => transaction.monthKey === monthKey)
    const biggestExpense = [...monthTransactions]
      .filter((transaction) => transaction.amount < 0)
      .sort((a, b) => b.absAmount - a.absAmount)[0]
    if (!biggestExpense) return [toMonthLabel(monthKey), 0] as [string, number]
    const preBalance = biggestExpense.workingBalance + biggestExpense.absAmount
    const recovery = monthTransactions.find(
      (transaction) =>
        transaction.date.getTime() >= biggestExpense.date.getTime() && transaction.workingBalance >= preBalance,
    )
    const days =
      recovery && recovery !== biggestExpense
        ? (recovery.date.getTime() - biggestExpense.date.getTime()) / 86400000
        : 0
    return [toMonthLabel(monthKey), days] as [string, number]
  })

  const incomeTimingStability = base.recentMonthKeys.map((monthKey) => {
    const incomes = base.incomeTransactions
      .filter((transaction) => transaction.monthKey === monthKey)
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
    const gaps = incomes.slice(1).map((transaction, index) => {
      return (transaction.date.getTime() - incomes[index].date.getTime()) / 86400000
    })
    return [toMonthLabel(monthKey), standardDeviation(gaps)] as [string, number]
  })

  const firstIncomeDelay = base.recentMonthKeys.map((monthKey) => {
    const firstIncome = base.incomeTransactions
      .filter((transaction) => transaction.monthKey === monthKey)
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey))[0]
    return [toMonthLabel(monthKey), firstIncome ? firstIncome.date.getUTCDate() : 0] as [string, number]
  })

  const netPositiveWeeks = base.recentMonthKeys.map((monthKey) => {
    const weeklyNet = new Map<number, number>()
    for (const transaction of base.transactions.filter((entry) => entry.monthKey === monthKey)) {
      weeklyNet.set(transaction.weekOfMonth, (weeklyNet.get(transaction.weekOfMonth) ?? 0) + transaction.amount)
    }
    return [toMonthLabel(monthKey), [...weeklyNet.values()].filter((value) => value > 0).length] as [string, number]
  })

  const shockCoverageDays = base.recentMonthKeys.map((monthKey) => {
    const monthExpenses = base.expenseTransactions.filter((transaction) => transaction.monthKey === monthKey)
    const biggest = Math.max(0, ...monthExpenses.map((transaction) => transaction.absAmount))
    const averageDaily = (base.monthExpenseTotals.get(monthKey) ?? 0) / Math.max(1, (base.monthActiveExpenseDays.get(monthKey) ?? new Set()).size)
    return [toMonthLabel(monthKey), averageDaily ? biggest / averageDaily : 0] as [string, number]
  })

  const sevenDayHold = base.recentMonthKeys.map((monthKey) => {
    const primaryIncome = primaryIncomeByMonth.get(monthKey)
    if (!primaryIncome) return [toMonthLabel(monthKey), 0] as [string, number]
    const targetDate = new Date(primaryIncome.date)
    targetDate.setUTCDate(targetDate.getUTCDate() + 7)
    const futureBalance =
      [...base.transactions]
        .filter((transaction) => transaction.date.getTime() <= targetDate.getTime())
        .at(-1)?.workingBalance ?? primaryIncome.workingBalance
    return [toMonthLabel(monthKey), primaryIncome.workingBalance ? (futureBalance / primaryIncome.workingBalance) * 100 : 0] as [string, number]
  })

  const merchantMedianTicket = topEntries(base.merchantTotals, 6).map(([merchant]) => {
    const tickets = base.expenseTransactions
      .filter((transaction) => transaction.merchant === merchant)
      .map((transaction) => transaction.absAmount)
    return {
      label: merchant.slice(0, 12),
      value: median(tickets),
    }
  })

  const topMerchantShareTrend = base.recentMonthKeys.map((monthKey) => {
    const merchantSpend = base.monthMerchantSpend.get(monthKey) ?? new Map<string, number>()
    const biggest = Math.max(0, ...merchantSpend.values())
    const spend = base.monthExpenseTotals.get(monthKey) ?? 0
    return [toMonthLabel(monthKey), spend ? (biggest / spend) * 100 : 0] as [string, number]
  })

  const frequencySeverityScatter = base.recentMonthKeys.map((monthKey) => {
    const monthExpenses = base.expenseTransactions.filter((transaction) => transaction.monthKey === monthKey)
    return {
      label: toMonthLabel(monthKey),
      x: monthExpenses.length,
      y: mean(monthExpenses.map((transaction) => transaction.absAmount)),
    }
  })

  const lowBalanceDayCount = base.recentMonthKeys.map((monthKey) => {
    const dayKeys = [...new Set(base.transactions.filter((transaction) => transaction.monthKey === monthKey).map((transaction) => transaction.dateKey))]
    const count = dayKeys.filter((dateKey) => (base.dailyBalanceMap.get(dateKey) ?? 0) <= lowBalanceThreshold).length
    return [toMonthLabel(monthKey), count] as [string, number]
  })

  const incomeShockBuffer = base.recentMonthKeys.map((monthKey) => {
    const income = base.monthIncomeTotals.get(monthKey) ?? 0
    const biggest = Math.max(
      0,
      ...base.expenseTransactions.filter((transaction) => transaction.monthKey === monthKey).map((transaction) => transaction.absAmount),
    )
    return [toMonthLabel(monthKey), biggest ? income / biggest : 0] as [string, number]
  })

  const monthEndCushionDays = base.recentMonthKeys.map((monthKey) => {
    const snapshot = base.monthlyBalanceSnapshots.find((entry) => entry.monthKey === monthKey)
    const monthSpend = base.monthExpenseTotals.get(monthKey) ?? 0
    const averageDaily = monthSpend / Math.max(1, (base.monthActiveExpenseDays.get(monthKey) ?? new Set()).size)
    return [toMonthLabel(monthKey), averageDaily ? (snapshot?.closing ?? 0) / averageDaily : 0] as [string, number]
  })

  return [
    {
      id: "analytics-pre-payday-cushion",
      title: "Pre-Payday Cushion Trend",
      eyebrow: "Cash Pressure",
      question: "How much balance is usually left right before the main income hits?",
      insight: "This is a practical stress signal because it tells you whether cash is lasting until the next refill, not just whether the month closes okay.",
      metricLabel: "Latest pre-payday cushion",
      metricValue: formatCurrency(prePaydayCushion.at(-1)?.[1] ?? 0, { maximumFractionDigits: 0 }),
      tags: ["Balance", "Income"],
      visual: { kind: "trend", points: toPointSeries(prePaydayCushion), formatter: "currency" },
    },
    {
      id: "analytics-largest-expense-share",
      title: "Largest Expense Share of Income",
      eyebrow: "Shock Size",
      question: "How much of the month's income can one expense consume on its own?",
      insight: "Big months often feel hard because of one hit, not because of everything. This quantifies that single-hit risk.",
      metricLabel: "Latest shock share",
      metricValue: formatPercent(largestExpenseShare.at(-1)?.[1] ?? 0),
      tags: ["Income", "Shock"],
      visual: { kind: "trend", points: toPointSeries(largestExpenseShare), formatter: "percent" },
    },
    {
      id: "analytics-burn-per-active-day",
      title: "Cash Burn per Active Spend Day",
      eyebrow: "Spend Efficiency",
      question: "On the days you actually spend, how expensive are those days becoming?",
      insight: "This separates total monthly spend from day-level intensity, which is often the more actionable behavior lever.",
      metricLabel: "Latest burn day",
      metricValue: formatCurrency(burnPerActiveDay.at(-1)?.[1] ?? 0, { maximumFractionDigits: 0 }),
      tags: ["Intensity", "Spend"],
      visual: { kind: "trend", points: toPointSeries(burnPerActiveDay), formatter: "currency" },
    },
    {
      id: "analytics-high-cost-day-count",
      title: "High-Cost Day Count",
      eyebrow: "Pressure Days",
      question: "How many days per month break above your own high-spend threshold?",
      insight: "This gives you a clean count of expensive days instead of leaving them buried inside totals.",
      metricLabel: "Latest count",
      metricValue: `${round(highCostDayCount.at(-1)?.[1] ?? 0, 0)} days`,
      tags: ["Threshold", "Days"],
      visual: { kind: "trend", points: toPointSeries(highCostDayCount), formatter: "number" },
    },
    {
      id: "analytics-weekly-expense-load",
      title: "Weekly Expense Load",
      eyebrow: "Month Shape",
      question: "Which week of the month carries the heaviest average spend load?",
      insight: "This helps you plan around predictable pressure windows without relying on day-of-week charts.",
      metricLabel: "Heaviest average week",
      metricValue: weeklyExpenseLoadItems.sort((a, b) => b.value - a.value)[0]?.label ?? "Week 1",
      tags: ["Weeks", "Planning"],
      visual: { kind: "bars", items: weeklyExpenseLoadItems, formatter: "currency" },
    },
    {
      id: "analytics-top-debit-recovery",
      title: "Top Debit Recovery Time",
      eyebrow: "Recovery",
      question: "After the month's biggest expense lands, how long does the balance take to recover?",
      insight: "The amount matters, but recovery time tells you how much that expense actually disturbs the system.",
      metricLabel: "Latest recovery time",
      metricValue: `${round(topDebitRecovery.at(-1)?.[1] ?? 0, 0)} days`,
      tags: ["Recovery", "Balance"],
      visual: { kind: "trend", points: toPointSeries(topDebitRecovery), formatter: "number" },
    },
    {
      id: "analytics-income-timing-stability",
      title: "Income Timing Stability",
      eyebrow: "Income Rhythm",
      question: "How predictable is the spacing between income events?",
      insight: "Even if total income is fine, timing noise can create unnecessary cash stress. This chart surfaces that timing reliability.",
      metricLabel: "Latest timing deviation",
      metricValue: `${round(incomeTimingStability.at(-1)?.[1] ?? 0, 1)} days`,
      tags: ["Income", "Timing"],
      visual: { kind: "trend", points: toPointSeries(incomeTimingStability), formatter: "number" },
    },
    {
      id: "analytics-first-income-delay",
      title: "First Income Delay",
      eyebrow: "Month Start",
      question: "How late into the month does the first income event usually arrive?",
      insight: "This is important for users whose income timing drives whether the month starts comfortable or tight.",
      metricLabel: "Latest first income day",
      metricValue: `Day ${round(firstIncomeDelay.at(-1)?.[1] ?? 0, 0)}`,
      tags: ["Income", "Month Start"],
      visual: { kind: "trend", points: toPointSeries(firstIncomeDelay), formatter: "number" },
    },
    {
      id: "analytics-net-positive-weeks",
      title: "Net Positive Weeks",
      eyebrow: "Weekly Outcome",
      question: "How many weeks in each month actually finish net positive?",
      insight: "A month can close fine while most weeks feel bad. This makes weekly cash experience visible.",
      metricLabel: "Latest positive weeks",
      metricValue: `${round(netPositiveWeeks.at(-1)?.[1] ?? 0, 0)} weeks`,
      tags: ["Weeks", "Outcome"],
      visual: { kind: "trend", points: toPointSeries(netPositiveWeeks), formatter: "number" },
    },
    {
      id: "analytics-expense-shock-coverage",
      title: "Expense Shock Coverage",
      eyebrow: "Single-Hit Risk",
      question: "How many normal spend days does the biggest expense of the month equal?",
      insight: "This translates large expenses into an easier unit: days of normal life that one purchase effectively consumes.",
      metricLabel: "Latest shock size",
      metricValue: `${round(shockCoverageDays.at(-1)?.[1] ?? 0, 1)} days`,
      tags: ["Shock", "Coverage"],
      visual: { kind: "trend", points: toPointSeries(shockCoverageDays), formatter: "number" },
    },
    {
      id: "analytics-seven-day-hold",
      title: "7-Day Post-Income Hold",
      eyebrow: "Income Retention",
      question: "One week after the main income lands, how much of that balance is still intact?",
      insight: "This is a practical bridge between income timing and spending pressure because it shows how quickly cash starts leaking out.",
      metricLabel: "Latest 7-day hold",
      metricValue: formatPercent(sevenDayHold.at(-1)?.[1] ?? 0),
      tags: ["Income", "Retention"],
      visual: { kind: "trend", points: toPointSeries(sevenDayHold), formatter: "percent" },
    },
    {
      id: "analytics-merchant-ticket-benchmark",
      title: "Merchant Ticket Benchmark",
      eyebrow: "Merchant Pricing",
      question: "At the merchants you use most, what does a typical expense ticket look like?",
      insight: "This helps you see whether day-to-day pressure is coming from where you shop, not just what categories say.",
      metricLabel: "Highest median ticket",
      metricValue: formatCurrency(Math.max(0, ...merchantMedianTicket.map((entry) => entry.value)), { maximumFractionDigits: 0 }),
      tags: ["Merchants", "Ticket Size"],
      visual: { kind: "bars", items: merchantMedianTicket, formatter: "currency" },
    },
    {
      id: "analytics-top-merchant-share-trend",
      title: "Top Merchant Share Trend",
      eyebrow: "Merchant Exposure",
      question: "How much of each month's spend depends on the single biggest merchant?",
      insight: "This is a more tactical version of merchant concentration because it updates month by month instead of only giving one annual summary.",
      metricLabel: "Latest top-merchant share",
      metricValue: formatPercent(topMerchantShareTrend.at(-1)?.[1] ?? 0),
      tags: ["Merchants", "Exposure"],
      visual: { kind: "trend", points: toPointSeries(topMerchantShareTrend), formatter: "percent" },
    },
    {
      id: "analytics-frequency-vs-severity",
      title: "Expense Frequency vs Severity",
      eyebrow: "Month Diagnosis",
      question: "Are expensive months driven by more transactions or by larger transactions?",
      insight: "This is one of the clearest diagnosis charts for understanding why a month got expensive without jumping straight into category deep dives.",
      metricLabel: "Tracked months",
      metricValue: `${frequencySeverityScatter.length}`,
      tags: ["Scatter", "Diagnosis"],
      visual: { kind: "scatter", points: frequencySeverityScatter, xLabel: "Expense count", yLabel: "Average expense" },
    },
    {
      id: "analytics-low-balance-day-count",
      title: "Low-Balance Day Count",
      eyebrow: "Balance Stress",
      question: "How many days per month finish below your own low-balance threshold?",
      insight: "This turns low-balance stress into a clean count you can try to reduce over time.",
      metricLabel: "Latest low-balance days",
      metricValue: `${round(lowBalanceDayCount.at(-1)?.[1] ?? 0, 0)} days`,
      tags: ["Balance", "Stress"],
      visual: { kind: "trend", points: toPointSeries(lowBalanceDayCount), formatter: "number" },
    },
    {
      id: "analytics-income-shock-buffer",
      title: "Income-to-Shock Buffer",
      eyebrow: "Coverage",
      question: "How many times over does monthly income cover the biggest expense hit?",
      insight: "This is more actionable than a broad ratio because it tells you whether the biggest hit is manageable or destabilizing.",
      metricLabel: "Latest coverage",
      metricValue: `${round(incomeShockBuffer.at(-1)?.[1] ?? 0, 1)}x`,
      tags: ["Income", "Coverage"],
      visual: { kind: "trend", points: toPointSeries(incomeShockBuffer), formatter: "number" },
    },
    {
      id: "analytics-month-end-cushion-days",
      title: "Month-End Cushion Days",
      eyebrow: "Closing Safety",
      question: "At the end of the month, how many average spend days would the closing balance cover?",
      insight: "This gives a much more intuitive read of month-end safety than a raw balance number alone.",
      metricLabel: "Latest cushion",
      metricValue: `${round(monthEndCushionDays.at(-1)?.[1] ?? 0, 1)} days`,
      tags: ["Closing", "Safety"],
      visual: { kind: "trend", points: toPointSeries(monthEndCushionDays), formatter: "number" },
    },
  ]
}

function buildMidLevelFridgeCards(base: BaseData, options: BuildOptions): PlaygroundCardModel[] {
  const { formatCurrency } = options
  const basketCosts = base.baskets.map((basket) => basket.spend)
  const expensiveBasketThreshold = percentile(basketCosts, 0.9) || 0
  const medianBasketCost = median(basketCosts) || 0
  const repeatedItems = new Set(
    [...base.receiptLines.reduce((map, line) => {
      map.set(line.item, (map.get(line.item) ?? 0) + 1)
      return map
    }, new Map<string, number>()).entries()]
      .filter(([, count]) => count >= 3)
      .map(([item]) => item),
  )

  const avgBasketCost = base.recentMonthKeys.map((monthKey) => {
    const monthBaskets = base.baskets.filter((basket) => basket.monthKey === monthKey)
    return [toMonthLabel(monthKey), mean(monthBaskets.map((basket) => basket.spend))] as [string, number]
  })

  const costPerItemTrend = base.recentMonthKeys.map((monthKey) => {
    const monthBaskets = base.baskets.filter((basket) => basket.monthKey === monthKey)
    const values = monthBaskets.map((basket) => basket.spend / Math.max(1, basket.uniqueItems))
    return [toMonthLabel(monthKey), mean(values)] as [string, number]
  })

  const expensiveBasketCount = base.recentMonthKeys.map((monthKey) => {
    const count = base.baskets.filter((basket) => basket.monthKey === monthKey && basket.spend >= expensiveBasketThreshold).length
    return [toMonthLabel(monthKey), count] as [string, number]
  })

  const stockUpTripShare = base.recentMonthKeys.map((monthKey) => {
    const monthBaskets = base.baskets.filter((basket) => basket.monthKey === monthKey)
    const stockUps = monthBaskets.filter((basket) => basket.uniqueItems >= 8).length
    return [toMonthLabel(monthKey), monthBaskets.length ? (stockUps / monthBaskets.length) * 100 : 0] as [string, number]
  })

  const topUpTripShare = base.recentMonthKeys.map((monthKey) => {
    const monthBaskets = base.baskets.filter((basket) => basket.monthKey === monthKey)
    const topUps = monthBaskets.filter((basket) => basket.uniqueItems <= 3).length
    return [toMonthLabel(monthKey), monthBaskets.length ? (topUps / monthBaskets.length) * 100 : 0] as [string, number]
  })

  const basketValueVsSize = base.recentMonthKeys.map((monthKey) => {
    const monthBaskets = base.baskets.filter((basket) => basket.monthKey === monthKey)
    return {
      label: toMonthLabel(monthKey),
      x: mean(monthBaskets.map((basket) => basket.uniqueItems)),
      y: mean(monthBaskets.map((basket) => basket.spend)),
    }
  })

  const storePriceIndex = topEntries(
    new Map(
      [...new Set(base.baskets.map((basket) => basket.store))].map((store) => {
        const storeBaskets = base.baskets.filter((basket) => basket.store === store)
        return [store, mean(storeBaskets.map((basket) => basket.spend / Math.max(1, basket.uniqueItems)))]
      }),
    ),
    6,
  ).map(([store, value]) => ({ label: store.slice(0, 12), value }))

  const repeatItemInflation = base.recentMonthKeys.map((monthKey) => {
    const itemMonthPrices = new Map<string, number[]>()
    for (const line of base.receiptLines.filter((entry) => entry.monthKey === monthKey && repeatedItems.has(entry.item))) {
      const prices = itemMonthPrices.get(line.item) ?? []
      prices.push(line.pricePerUnit)
      itemMonthPrices.set(line.item, prices)
    }
    const normalized = [...itemMonthPrices.entries()].map(([item, prices]) => {
      const baseline = mean(base.receiptLines.filter((entry) => entry.item === item).map((entry) => entry.pricePerUnit)) || 1
      return (mean(prices) / baseline) * 100
    })
    return [toMonthLabel(monthKey), mean(normalized)] as [string, number]
  })

  const proteinBasketCost = base.recentMonthKeys.map((monthKey) => {
    const proteinBaskets = base.baskets.filter(
      (basket) => basket.monthKey === monthKey && basket.lines.some((line) => line.categoryType.toLowerCase().includes("protein")),
    )
    return [toMonthLabel(monthKey), mean(proteinBaskets.map((basket) => basket.spend))] as [string, number]
  })

  const categoryBreadth = base.recentMonthKeys.map((monthKey) => {
    const monthBaskets = base.baskets.filter((basket) => basket.monthKey === monthKey)
    return [toMonthLabel(monthKey), mean(monthBaskets.map((basket) => basket.uniqueCategories))] as [string, number]
  })

  const storeLoyaltyShare = base.recentMonthKeys.map((monthKey) => {
    const monthBaskets = base.baskets.filter((basket) => basket.monthKey === monthKey)
    const spendByStore = new Map<string, number>()
    for (const basket of monthBaskets) {
      spendByStore.set(basket.store, (spendByStore.get(basket.store) ?? 0) + basket.spend)
    }
    const total = sum([...spendByStore.values()])
    const top3 = sum([...spendByStore.values()].sort((a, b) => b - a).slice(0, 3))
    return [toMonthLabel(monthKey), total ? (top3 / total) * 100 : 0] as [string, number]
  })

  const basketRepeatRate = (() => {
    const seen = new Set<string>()
    return base.recentMonthKeys.map((monthKey) => {
      const monthBaskets = base.baskets
        .filter((basket) => basket.monthKey === monthKey)
        .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
      const rates = monthBaskets.map((basket) => {
        const uniqueItems = [...new Set(basket.lines.map((line) => line.item))]
        const repeatCount = uniqueItems.filter((item) => seen.has(item)).length
        uniqueItems.forEach((item) => seen.add(item))
        return uniqueItems.length ? (repeatCount / uniqueItems.length) * 100 : 0
      })
      return [toMonthLabel(monthKey), mean(rates)] as [string, number]
    })
  })()

  const pantryRefillGap = [...repeatedItems]
    .map((item) => {
      const dates = [...new Set(base.receiptLines.filter((line) => line.item === item).map((line) => line.dateKey))].sort()
      const gaps = dates.slice(1).map((date, index) => (parseIsoDate(date).getTime() - parseIsoDate(dates[index]).getTime()) / 86400000)
      return { label: item.slice(0, 12), value: median(gaps) }
    })
    .filter((entry) => Number.isFinite(entry.value) && entry.value > 0)
    .sort((a, b) => a.value - b.value)
    .slice(0, 6)

  const storeBasketConsistency = topEntries(
    new Map(
      [...new Set(base.baskets.map((basket) => basket.store))].map((store) => {
        const spends = base.baskets.filter((basket) => basket.store === store).map((basket) => basket.spend)
        return [store, standardDeviation(spends)]
      }),
    ),
    6,
  ).map(([store, value]) => ({ label: store.slice(0, 12), value }))

  const priceSurpriseCount = base.recentMonthKeys.map((monthKey) => {
    const monthLines = base.receiptLines.filter((line) => line.monthKey === monthKey)
    let surprises = 0
    for (const line of monthLines) {
      const itemMedian = median(base.receiptLines.filter((entry) => entry.item === line.item).map((entry) => entry.pricePerUnit)) || line.pricePerUnit
      if (line.pricePerUnit > itemMedian * 1.2) surprises += 1
    }
    return [toMonthLabel(monthKey), surprises] as [string, number]
  })

  const costPerProteinLine = base.recentMonthKeys.map((monthKey) => {
    const proteinLines = base.receiptLines.filter(
      (line) => line.monthKey === monthKey && line.categoryType.toLowerCase().includes("protein"),
    )
    return [toMonthLabel(monthKey), mean(proteinLines.map((line) => line.pricePerUnit))] as [string, number]
  })

  const budgetFriendlyTripMix = base.recentMonthKeys.map((monthKey) => {
    const monthBaskets = base.baskets.filter((basket) => basket.monthKey === monthKey)
    const budgetFriendly = monthBaskets.filter((basket) => basket.spend <= medianBasketCost).length
    return [toMonthLabel(monthKey), monthBaskets.length ? (budgetFriendly / monthBaskets.length) * 100 : 0] as [string, number]
  })

  return [
    {
      id: "fridge-average-basket-cost",
      title: "Average Basket Cost Trend",
      eyebrow: "Trip Cost",
      question: "How expensive is the typical grocery trip becoming month to month?",
      insight: "This is one of the cleanest grocery control charts because it tracks the average trip, not just total grocery spend.",
      metricLabel: "Latest average basket",
      metricValue: formatCurrency(avgBasketCost.at(-1)?.[1] ?? 0, { maximumFractionDigits: 0 }),
      tags: ["Baskets", "Cost"],
      visual: { kind: "trend", points: toPointSeries(avgBasketCost), formatter: "currency" },
    },
    {
      id: "fridge-cost-per-item",
      title: "Cost per Item Trend",
      eyebrow: "Basket Efficiency",
      question: "Are baskets getting more expensive because they contain more items, or because each item costs more?",
      insight: "This normalizes grocery spend by basket size, which makes it much easier to separate inflation from stocking behavior.",
      metricLabel: "Latest cost per item",
      metricValue: formatCurrency(costPerItemTrend.at(-1)?.[1] ?? 0, { maximumFractionDigits: 2 }),
      tags: ["Efficiency", "Items"],
      visual: { kind: "trend", points: toPointSeries(costPerItemTrend), formatter: "currency" },
    },
    {
      id: "fridge-expensive-basket-count",
      title: "High-Cost Basket Frequency",
      eyebrow: "Expensive Trips",
      question: "How many baskets per month break into your own high-cost zone?",
      insight: "This turns grocery spikes into a count you can actually manage instead of treating them as random expensive weeks.",
      metricLabel: "Latest high-cost trips",
      metricValue: `${round(expensiveBasketCount.at(-1)?.[1] ?? 0, 0)} trips`,
      tags: ["Threshold", "Trips"],
      visual: { kind: "trend", points: toPointSeries(expensiveBasketCount), formatter: "number" },
    },
    {
      id: "fridge-stock-up-share",
      title: "Stock-Up Trip Share",
      eyebrow: "Trip Mix",
      question: "What share of grocery trips are true stock-up runs rather than quick refills?",
      insight: "Trip mix is important because monthly grocery totals can stay flat while the shopping style becomes more or less efficient.",
      metricLabel: "Latest stock-up share",
      metricValue: formatPercent(stockUpTripShare.at(-1)?.[1] ?? 0),
      tags: ["Trips", "Planning"],
      visual: { kind: "trend", points: toPointSeries(stockUpTripShare), formatter: "percent" },
    },
    {
      id: "fridge-top-up-share",
      title: "Quick Top-Up Share",
      eyebrow: "Trip Mix",
      question: "How much of your grocery rhythm is being driven by very small refill trips?",
      insight: "Small refill trips are often convenient but expensive. This chart makes that drift visible.",
      metricLabel: "Latest top-up share",
      metricValue: formatPercent(topUpTripShare.at(-1)?.[1] ?? 0),
      tags: ["Trips", "Refills"],
      visual: { kind: "trend", points: toPointSeries(topUpTripShare), formatter: "percent" },
    },
    {
      id: "fridge-basket-value-size",
      title: "Basket Value vs Basket Size",
      eyebrow: "Basket Diagnosis",
      question: "When baskets get expensive, is it because they are bigger or because each basket is pricier than expected?",
      insight: "This helps diagnose whether grocery pressure is coming from volume, price, or both.",
      metricLabel: "Tracked months",
      metricValue: `${basketValueVsSize.length}`,
      tags: ["Scatter", "Diagnosis"],
      visual: { kind: "scatter", points: basketValueVsSize, xLabel: "Unique items", yLabel: "Average basket" },
    },
    {
      id: "fridge-store-price-index",
      title: "Store Price Index",
      eyebrow: "Store Comparison",
      question: "Which stores are cheapest or priciest once you normalize for basket size?",
      insight: "This is much more useful than raw store spend because it compares the price profile of the stores themselves.",
      metricLabel: "Priciest normalized store",
      metricValue: formatCurrency(Math.max(0, ...storePriceIndex.map((entry) => entry.value)), { maximumFractionDigits: 0 }),
      tags: ["Stores", "Pricing"],
      visual: { kind: "bars", items: storePriceIndex, formatter: "currency" },
    },
    {
      id: "fridge-repeat-item-inflation",
      title: "Repeat Item Inflation Index",
      eyebrow: "Price Trend",
      question: "Across the items you buy repeatedly, is the typical price trending up or down versus its own baseline?",
      insight: "This turns receipt lines into a personalized grocery inflation gauge instead of relying on general market headlines.",
      metricLabel: "Latest repeat-item index",
      metricValue: formatPercent((repeatItemInflation.at(-1)?.[1] ?? 100) - 100, 0),
      tags: ["Inflation", "Repeat Items"],
      visual: { kind: "trend", points: toPointSeries(repeatItemInflation), formatter: "number" },
    },
    {
      id: "fridge-protein-basket-cost",
      title: "Protein Basket Cost",
      eyebrow: "Nutrition Cost",
      question: "How expensive are the baskets that include protein-tagged items?",
      insight: "This gives a more practical nutrition cost read than macro share alone because it ties nutrition directly to trip economics.",
      metricLabel: "Latest protein basket",
      metricValue: formatCurrency(proteinBasketCost.at(-1)?.[1] ?? 0, { maximumFractionDigits: 0 }),
      tags: ["Protein", "Cost"],
      visual: { kind: "trend", points: toPointSeries(proteinBasketCost), formatter: "currency" },
    },
    {
      id: "fridge-category-breadth",
      title: "Category Breadth per Basket",
      eyebrow: "Basket Completeness",
      question: "How broad is the typical grocery basket in terms of different food categories?",
      insight: "This is useful for spotting whether trips are staying balanced or becoming narrower and more reactive.",
      metricLabel: "Latest breadth",
      metricValue: `${round(categoryBreadth.at(-1)?.[1] ?? 0, 1)} categories`,
      tags: ["Categories", "Breadth"],
      visual: { kind: "trend", points: toPointSeries(categoryBreadth), formatter: "number" },
    },
    {
      id: "fridge-store-loyalty-share",
      title: "Top Store Loyalty Share",
      eyebrow: "Store Dependence",
      question: "How much of monthly grocery spend is concentrated in your top three stores?",
      insight: "This is a practical store dependence chart that helps judge whether grocery optimization is focused or too fragmented.",
      metricLabel: "Latest top-3 share",
      metricValue: formatPercent(storeLoyaltyShare.at(-1)?.[1] ?? 0),
      tags: ["Stores", "Dependence"],
      visual: { kind: "trend", points: toPointSeries(storeLoyaltyShare), formatter: "percent" },
    },
    {
      id: "fridge-basket-repeat-rate",
      title: "Basket Repeat Rate",
      eyebrow: "Routine Strength",
      question: "How much of each month's basket content is made of items you had already bought before?",
      insight: "This gives a direct read on grocery routine versus experimentation without being overly niche.",
      metricLabel: "Latest repeat rate",
      metricValue: formatPercent(basketRepeatRate.at(-1)?.[1] ?? 0),
      tags: ["Routine", "Repeat"],
      visual: { kind: "trend", points: toPointSeries(basketRepeatRate), formatter: "percent" },
    },
    {
      id: "fridge-pantry-refill-gap",
      title: "Pantry Refill Gap",
      eyebrow: "Repeat Cadence",
      question: "Which repeat items come back the fastest in your grocery cycle?",
      insight: "This is a good operational chart because it surfaces what is driving repeat trips and pantry pressure.",
      metricLabel: "Fastest refill cycle",
      metricValue: `${round(Math.min(...pantryRefillGap.map((entry) => entry.value), 0), 0)} days`,
      tags: ["Cadence", "Items"],
      visual: { kind: "bars", items: pantryRefillGap, formatter: "number" },
    },
    {
      id: "fridge-store-consistency",
      title: "Store Basket Consistency",
      eyebrow: "Price Reliability",
      question: "At which stores is basket cost the most stable versus the most unpredictable?",
      insight: "Price stability matters as much as average cost. A store can be cheap but hard to predict.",
      metricLabel: "Most volatile store",
      metricValue: formatCurrency(Math.max(0, ...storeBasketConsistency.map((entry) => entry.value)), { maximumFractionDigits: 0 }),
      tags: ["Stores", "Consistency"],
      visual: { kind: "bars", items: storeBasketConsistency, formatter: "currency" },
    },
    {
      id: "fridge-price-surprise-count",
      title: "Price Surprise Count",
      eyebrow: "Unexpected Cost",
      question: "How many line items each month were priced well above their own historical median?",
      insight: "This surfaces the moments where grocery inflation is felt as surprise rather than as a smooth trend.",
      metricLabel: "Latest surprises",
      metricValue: `${round(priceSurpriseCount.at(-1)?.[1] ?? 0, 0)} lines`,
      tags: ["Surprise", "Pricing"],
      visual: { kind: "trend", points: toPointSeries(priceSurpriseCount), formatter: "number" },
    },
    {
      id: "fridge-cost-per-protein-line",
      title: "Cost per Protein Line",
      eyebrow: "Nutrition Pricing",
      question: "How much does a typical protein-tagged line item cost over time?",
      insight: "This is a straightforward nutrition-cost chart that can actually influence basket decisions.",
      metricLabel: "Latest protein line cost",
      metricValue: formatCurrency(costPerProteinLine.at(-1)?.[1] ?? 0, { maximumFractionDigits: 2 }),
      tags: ["Protein", "Pricing"],
      visual: { kind: "trend", points: toPointSeries(costPerProteinLine), formatter: "currency" },
    },
    {
      id: "fridge-budget-friendly-trip-mix",
      title: "Budget-Friendly Trip Mix",
      eyebrow: "Trip Quality",
      question: "What share of grocery trips still lands below your own median basket cost?",
      insight: "This is a simple but useful quality-control metric for whether grocery trips are staying manageable.",
      metricLabel: "Latest budget-friendly share",
      metricValue: formatPercent(budgetFriendlyTripMix.at(-1)?.[1] ?? 0),
      tags: ["Trips", "Budget"],
      visual: { kind: "trend", points: toPointSeries(budgetFriendlyTripMix), formatter: "percent" },
    },
  ]
}

function buildMidLevelSavingsCards(base: BaseData, options: BuildOptions): PlaygroundCardModel[] {
  const { formatCurrency } = options
  const averageMonthlyBurn = mean(base.recentMonthKeys.map((monthKey) => base.monthExpenseTotals.get(monthKey) ?? 0))
  const safetyThreshold = averageMonthlyBurn / 2
  const primaryIncomeByMonth = new Map(
    base.recentMonthKeys.map((monthKey) => {
      const income = [...base.incomeTransactions]
        .filter((transaction) => transaction.monthKey === monthKey)
        .sort((a, b) => b.amount - a.amount || a.dateKey.localeCompare(b.dateKey))[0]
      return [monthKey, income] as const
    }),
  )

  const emergencyRunway = (() => {
    const latest = base.monthlyBalanceSnapshots.at(-1)?.closing ?? 0
    return averageMonthlyBurn > 0 ? latest / averageMonthlyBurn : 0
  })()

  const balanceFloorTrend = base.monthlyBalanceSnapshots.map((snapshot) => [toMonthLabel(snapshot.monthKey), snapshot.floor] as [string, number])

  const paycheckRetention = [7, 14, 21, 30].map((days) => {
    const values = base.recentMonthKeys.map((monthKey) => {
      const primaryIncome = primaryIncomeByMonth.get(monthKey)
      if (!primaryIncome) return 0
      const targetDate = new Date(primaryIncome.date)
      targetDate.setUTCDate(targetDate.getUTCDate() + days)
      const futureBalance =
        [...base.transactions]
          .filter((transaction) => transaction.date.getTime() <= targetDate.getTime())
          .at(-1)?.workingBalance ?? primaryIncome.workingBalance
      return primaryIncome.workingBalance ? (futureBalance / primaryIncome.workingBalance) * 100 : 0
    })
    return { label: `${days}d`, value: mean(values) }
  })

  const absorbencyDays = base.recentMonthKeys.map((monthKey) => {
    const mainIncome = Math.max(
      0,
      ...base.incomeTransactions.filter((transaction) => transaction.monthKey === monthKey).map((transaction) => transaction.amount),
    )
    const activeDays = (base.monthActiveExpenseDays.get(monthKey) ?? new Set()).size || 0
    const dailyBurn = activeDays ? (base.monthExpenseTotals.get(monthKey) ?? 0) / activeDays : 0
    return [toMonthLabel(monthKey), dailyBurn ? mainIncome / dailyBurn : 0] as [string, number]
  })

  const reserveSurvival = base.monthlyBalanceSnapshots.map((snapshot) => {
    const monthSpend = base.monthExpenseTotals.get(snapshot.monthKey) ?? 0
    return [toMonthLabel(snapshot.monthKey), monthSpend ? snapshot.floor / monthSpend : 0] as [string, number]
  })

  const closingLift = base.monthlyBalanceSnapshots.map((snapshot) => [toMonthLabel(snapshot.monthKey), snapshot.closing - snapshot.opening] as [string, number])

  const prePaydayCushion = base.recentMonthKeys.map((monthKey) => {
    const primaryIncome = primaryIncomeByMonth.get(monthKey)
    const monthTransactions = base.transactions.filter((transaction) => transaction.monthKey === monthKey)
    if (!primaryIncome || !monthTransactions.length) {
      return [toMonthLabel(monthKey), base.monthlyBalanceSnapshots.find((snapshot) => snapshot.monthKey === monthKey)?.floor ?? 0] as [string, number]
    }
    const incomeDay = primaryIncome.date.getTime()
    const balances = monthTransactions
      .filter((transaction) => incomeDay - transaction.date.getTime() <= 5 * 86400000 && transaction.date.getTime() < incomeDay)
      .map((transaction) => transaction.workingBalance)
    return [toMonthLabel(monthKey), balances.length ? Math.min(...balances) : primaryIncome.workingBalance] as [string, number]
  })

  const lowestSevenDayAverage = base.recentMonthKeys.map((monthKey) => {
    const dayKeys = [...new Set(base.transactions.filter((transaction) => transaction.monthKey === monthKey).map((transaction) => transaction.dateKey))].sort()
    const balances = dayKeys.map((dayKey) => base.dailyBalanceMap.get(dayKey) ?? 0)
    const windows = balances.map((_, index) => mean(balances.slice(index, index + 7))).filter((value) => Number.isFinite(value))
    return [toMonthLabel(monthKey), Math.min(...windows, balances[0] ?? 0)] as [string, number]
  })

  const safeDayRatio = base.recentMonthKeys.map((monthKey) => {
    const dayKeys = [...new Set(base.transactions.filter((transaction) => transaction.monthKey === monthKey).map((transaction) => transaction.dateKey))]
    const safeDays = dayKeys.filter((dayKey) => (base.dailyBalanceMap.get(dayKey) ?? 0) >= safetyThreshold).length
    return [toMonthLabel(monthKey), dayKeys.length ? (safeDays / dayKeys.length) * 100 : 0] as [string, number]
  })

  const shockExpenseImpact = base.recentMonthKeys.map((monthKey) => {
    const biggest = Math.max(
      0,
      ...base.expenseTransactions.filter((transaction) => transaction.monthKey === monthKey).map((transaction) => transaction.absAmount),
    )
    const floor = base.monthlyBalanceSnapshots.find((snapshot) => snapshot.monthKey === monthKey)?.floor ?? 0
    return [toMonthLabel(monthKey), floor ? (biggest / floor) * 100 : 0] as [string, number]
  })

  const openingToFloorDrop = base.monthlyBalanceSnapshots.map((snapshot) => [toMonthLabel(snapshot.monthKey), snapshot.opening - snapshot.floor] as [string, number])

  const postPaycheckLift = base.recentMonthKeys.map((monthKey) => {
    const primaryIncome = primaryIncomeByMonth.get(monthKey)
    if (!primaryIncome) return [toMonthLabel(monthKey), 0] as [string, number]
    const preIncomeBalances = base.transactions
      .filter((transaction) => transaction.monthKey === monthKey && transaction.date.getTime() < primaryIncome.date.getTime())
      .slice(-3)
      .map((transaction) => transaction.workingBalance)
    const baseline = preIncomeBalances.length ? Math.min(...preIncomeBalances) : primaryIncome.workingBalance
    return [toMonthLabel(monthKey), primaryIncome.workingBalance - baseline] as [string, number]
  })

  const lowBalanceStreak = base.recentMonthKeys.map((monthKey) => {
    const dayKeys = [...new Set(base.transactions.filter((transaction) => transaction.monthKey === monthKey).map((transaction) => transaction.dateKey))].sort()
    let current = 0
    let longest = 0
    for (const dayKey of dayKeys) {
      if ((base.dailyBalanceMap.get(dayKey) ?? 0) < safetyThreshold) {
        current += 1
        longest = Math.max(longest, current)
      } else {
        current = 0
      }
    }
    return [toMonthLabel(monthKey), longest] as [string, number]
  })

  const closingRetention = base.monthlyBalanceSnapshots.map((snapshot) => [toMonthLabel(snapshot.monthKey), snapshot.opening ? (snapshot.closing / snapshot.opening) * 100 : 0] as [string, number])

  const daysBelowSafety = base.recentMonthKeys.map((monthKey) => {
    const dayKeys = [...new Set(base.transactions.filter((transaction) => transaction.monthKey === monthKey).map((transaction) => transaction.dateKey))]
    const count = dayKeys.filter((dayKey) => (base.dailyBalanceMap.get(dayKey) ?? 0) < safetyThreshold).length
    return [toMonthLabel(monthKey), count] as [string, number]
  })

  const aftershockBuffer = base.recentMonthKeys.map((monthKey) => {
    const monthTransactions = base.transactions.filter((transaction) => transaction.monthKey === monthKey)
    const biggestExpense = [...monthTransactions]
      .filter((transaction) => transaction.amount < 0)
      .sort((a, b) => b.absAmount - a.absAmount)[0]
    const monthSpend = base.monthExpenseTotals.get(monthKey) ?? 0
    return [toMonthLabel(monthKey), monthSpend ? ((biggestExpense?.workingBalance ?? 0) / monthSpend) * 100 : 0] as [string, number]
  })

  return [
    {
      id: "savings-emergency-runway",
      title: "Emergency Runway Gauge",
      eyebrow: "Safety",
      question: "If income paused today, how many average months could the current balance cover?",
      insight: "This is one of the strongest summary charts because it turns a balance into time, which is much easier to reason about.",
      metricLabel: "Current runway",
      metricValue: `${round(emergencyRunway, 1)} months`,
      tags: ["Runway", "Safety"],
      visual: { kind: "gauge", value: clamp(emergencyRunway / 6, 0, 1), target: 0.66 },
    },
    {
      id: "savings-balance-floor-trend",
      title: "Balance Floor Trend",
      eyebrow: "Minimum Cushion",
      question: "Is the lowest point of each month getting safer or tighter?",
      insight: "Monthly floors reveal stress faster than closing balances because they show the worst point, not the final point.",
      metricLabel: "Latest monthly floor",
      metricValue: formatCurrency(balanceFloorTrend.at(-1)?.[1] ?? 0, { maximumFractionDigits: 0 }),
      tags: ["Balance", "Floor"],
      visual: { kind: "trend", points: toPointSeries(balanceFloorTrend), formatter: "currency" },
    },
    {
      id: "savings-paycheck-retention",
      title: "Paycheck Retention Curve",
      eyebrow: "Income Retention",
      question: "How much of the paycheck typically remains after one, two, three, and four weeks?",
      insight: "This is a very practical curve because it shows how durable income feels after it lands.",
      metricLabel: "14-day retention",
      metricValue: formatPercent(paycheckRetention[1]?.value ?? 0),
      tags: ["Income", "Retention"],
      visual: { kind: "bars", items: paycheckRetention, formatter: "percent" },
    },
    {
      id: "savings-income-absorbency",
      title: "Income Absorbency Days",
      eyebrow: "Coverage",
      question: "How many average spend days does the main income event usually fund?",
      insight: "This expresses paycheck strength in a very usable unit: days of normal life covered.",
      metricLabel: "Latest absorbency",
      metricValue: `${round(absorbencyDays.at(-1)?.[1] ?? 0, 1)} days`,
      tags: ["Income", "Coverage"],
      visual: { kind: "trend", points: toPointSeries(absorbencyDays), formatter: "number" },
    },
    {
      id: "savings-reserve-survival",
      title: "Reserve Survival Score",
      eyebrow: "Floor Strength",
      question: "How much of a month's spend could your monthly floor cover before money was replenished?",
      insight: "This is stricter than runway because it uses the weakest moment of the month, not the ending balance.",
      metricLabel: "Latest survival score",
      metricValue: `${round(reserveSurvival.at(-1)?.[1] ?? 0, 1)}x`,
      tags: ["Reserve", "Survival"],
      visual: { kind: "trend", points: toPointSeries(reserveSurvival), formatter: "number" },
    },
    {
      id: "savings-closing-balance-lift",
      title: "Closing Balance Lift",
      eyebrow: "Outcome",
      question: "How far above or below the month's opening level do you usually finish?",
      insight: "This compresses the whole month into one outcome number without pretending the path did not matter.",
      metricLabel: "Average lift",
      metricValue: formatCurrency(mean(closingLift.map(([, value]) => value)), { maximumFractionDigits: 0, showSign: true }),
      tags: ["Closing", "Outcome"],
      visual: { kind: "trend", points: toPointSeries(closingLift), formatter: "currency" },
    },
    {
      id: "savings-pre-payday-cushion",
      title: "Pre-Payday Cushion Trend",
      eyebrow: "Safety Window",
      question: "How much cash is usually left right before the main income arrives?",
      insight: "This is one of the most practical balance charts because it measures whether the current system lasts until the next refill.",
      metricLabel: "Latest cushion",
      metricValue: formatCurrency(prePaydayCushion.at(-1)?.[1] ?? 0, { maximumFractionDigits: 0 }),
      tags: ["Balance", "Payday"],
      visual: { kind: "trend", points: toPointSeries(prePaydayCushion), formatter: "currency" },
    },
    {
      id: "savings-lowest-seven-day-average",
      title: "Lowest 7-Day Average Balance",
      eyebrow: "Stress Smoothing",
      question: "What was the weakest rolling week of balance in each month?",
      insight: "This smooths out one-day noise and shows whether the system can survive a bad week, not just a bad day.",
      metricLabel: "Latest weakest week",
      metricValue: formatCurrency(lowestSevenDayAverage.at(-1)?.[1] ?? 0, { maximumFractionDigits: 0 }),
      tags: ["Balance", "Week View"],
      visual: { kind: "trend", points: toPointSeries(lowestSevenDayAverage), formatter: "currency" },
    },
    {
      id: "savings-safe-day-ratio",
      title: "Safe-Day Ratio",
      eyebrow: "Balance Stability",
      question: "What share of month-end balances stay above a practical safety threshold?",
      insight: "This turns abstract balance movement into a simple ratio of safe days versus exposed days.",
      metricLabel: "Latest safe-day share",
      metricValue: formatPercent(safeDayRatio.at(-1)?.[1] ?? 0),
      tags: ["Safety", "Days"],
      visual: { kind: "trend", points: toPointSeries(safeDayRatio), formatter: "percent" },
    },
    {
      id: "savings-shock-expense-impact",
      title: "Shock Expense Impact",
      eyebrow: "Single-Hit Risk",
      question: "How large is the biggest expense of the month relative to the monthly floor?",
      insight: "This is a direct way to measure whether one expense can overwhelm the weakest point in the system.",
      metricLabel: "Latest shock impact",
      metricValue: formatPercent(shockExpenseImpact.at(-1)?.[1] ?? 0),
      tags: ["Shock", "Floor"],
      visual: { kind: "trend", points: toPointSeries(shockExpenseImpact), formatter: "percent" },
    },
    {
      id: "savings-opening-to-floor-drop",
      title: "Opening-to-Floor Drop",
      eyebrow: "Monthly Draw",
      question: "How far does balance usually fall from the month opening to the lowest point?",
      insight: "This is a good structural chart because it captures how much pressure the month creates before it recovers.",
      metricLabel: "Latest opening-to-floor drop",
      metricValue: formatCurrency(openingToFloorDrop.at(-1)?.[1] ?? 0, { maximumFractionDigits: 0 }),
      tags: ["Drop", "Balance"],
      visual: { kind: "trend", points: toPointSeries(openingToFloorDrop), formatter: "currency" },
    },
    {
      id: "savings-post-paycheck-lift",
      title: "Post-Paycheck Lift",
      eyebrow: "Income Effect",
      question: "How much does the main income event lift balance relative to the tightest pre-income point?",
      insight: "This shows whether income creates real breathing room or only patches a shallow gap.",
      metricLabel: "Latest paycheck lift",
      metricValue: formatCurrency(postPaycheckLift.at(-1)?.[1] ?? 0, { maximumFractionDigits: 0 }),
      tags: ["Income", "Lift"],
      visual: { kind: "trend", points: toPointSeries(postPaycheckLift), formatter: "currency" },
    },
    {
      id: "savings-low-balance-streak",
      title: "Low-Balance Streak",
      eyebrow: "Stress Duration",
      question: "What is the longest consecutive run of days each month spent below the safety threshold?",
      insight: "Duration matters. A brief dip feels different from a full week of tight balance.",
      metricLabel: "Latest longest streak",
      metricValue: `${round(lowBalanceStreak.at(-1)?.[1] ?? 0, 0)} days`,
      tags: ["Streak", "Stress"],
      visual: { kind: "trend", points: toPointSeries(lowBalanceStreak), formatter: "number" },
    },
    {
      id: "savings-closing-retention",
      title: "Closing Balance Retention",
      eyebrow: "Carryover",
      question: "How much of the opening balance does the month usually preserve by the close?",
      insight: "This is a useful carryover metric because it tells you whether the month protects starting cash or erodes it.",
      metricLabel: "Latest retention",
      metricValue: formatPercent(closingRetention.at(-1)?.[1] ?? 0),
      tags: ["Carryover", "Closing"],
      visual: { kind: "trend", points: toPointSeries(closingRetention), formatter: "percent" },
    },
    {
      id: "savings-days-below-safety",
      title: "Days Below Safety Threshold",
      eyebrow: "Exposure",
      question: "How many days per month are spent under the practical balance threshold?",
      insight: "This is the inverse of safety and often easier to act on because it turns stress into a count you can reduce.",
      metricLabel: "Latest exposed days",
      metricValue: `${round(daysBelowSafety.at(-1)?.[1] ?? 0, 0)} days`,
      tags: ["Exposure", "Days"],
      visual: { kind: "trend", points: toPointSeries(daysBelowSafety), formatter: "number" },
    },
    {
      id: "savings-aftershock-buffer",
      title: "Aftershock Buffer",
      eyebrow: "Post-Expense Safety",
      question: "After the biggest expense lands, how much monthly spend-equivalent balance is still left?",
      insight: "This measures whether the system stays safe after the worst hit, not just before it.",
      metricLabel: "Latest aftershock buffer",
      metricValue: formatPercent(aftershockBuffer.at(-1)?.[1] ?? 0),
      tags: ["Shock", "Buffer"],
      visual: { kind: "trend", points: toPointSeries(aftershockBuffer), formatter: "percent" },
    },
  ]
}

function buildApprovedCards(base: BaseData, options: BuildOptions) {
  const { formatCurrency } = options
  const legacyApprovedTitles = {
    analytics: [
      "Pre-Payday Cushion Trend",
      "Largest Expense Share of Income",
      "Weekly Expense Load",
      "First Income Delay",
      "Expense Shock Coverage",
      "Merchant Ticket Benchmark",
      "Month-End Cushion Days",
    ],
    fridge: [
      "Average Basket Cost Trend",
      "Cost per Item Trend",
      "Quick Top-Up Share",
      "Store Price Index",
      "Repeat Item Inflation Index",
      "Category Breadth per Basket",
      "Store Basket Consistency",
    ],
    savings: [
      "Emergency Runway Gauge",
      "Balance Floor Trend",
      "Paycheck Retention Curve",
      "Income Absorbency Days",
      "Reserve Survival Score",
      "Closing Balance Lift",
      "Lowest 7-Day Average Balance",
      "Opening-to-Floor Drop",
      "Post-Paycheck Lift",
      "Closing Balance Retention",
    ],
  }
  const diverseApprovedTitles = {
    analytics: [
      "Income Days vs Spend Days",
      "Monthly Activity Funnel",
      "Latest Month Day Flow",
    ],
    fridge: [
      "Store Receipt Range",
      "Unit Price Distribution by Store",
    ],
    savings: [
      "Balance Zone Days",
      "Net Cash Ranking",
      "Latest Month Buffer Funnel",
      "Grocery Week Safety",
      "Latest Month Balance State Sunburst",
      "Low-Balance Days by Week of Month",
    ],
  }

  const analyticsCards = buildMidLevelAnalyticsCards(base, options).filter((card) =>
    legacyApprovedTitles.analytics.includes(card.title),
  )
  const fridgeCards = buildMidLevelFridgeCards(base, options).filter((card) =>
    legacyApprovedTitles.fridge.includes(card.title),
  )
  const savingsCards = buildMidLevelSavingsCards(base, options).filter((card) =>
    legacyApprovedTitles.savings.includes(card.title),
  )
  const diverseAnalyticsCards = buildDiverseAnalyticsCards(base, options).filter((card) =>
    diverseApprovedTitles.analytics.includes(card.title),
  )
  const diverseFridgeCards = buildDiverseFridgeCards(base, options).filter((card) =>
    diverseApprovedTitles.fridge.includes(card.title),
  )
  const diverseSavingsCards = buildDiverseSavingsCards(base, options).filter((card) =>
    diverseApprovedTitles.savings.includes(card.title),
  )

  const netPositiveDays = base.recentMonthKeys.map((monthKey) => {
    const dayKeys = new Set(base.transactions.filter((transaction) => transaction.monthKey === monthKey).map((transaction) => transaction.dateKey))
    let positiveDays = 0
    for (const dayKey of dayKeys) {
      const dayTransactions = base.transactions.filter((transaction) => transaction.dateKey === dayKey)
      if (sum(dayTransactions.map((transaction) => transaction.amount)) >= 0) positiveDays += 1
    }
    return [toMonthLabel(monthKey), positiveDays] as [string, number]
  })
  const positiveDayAverage = mean(netPositiveDays.map(([, value]) => value))
  const comparePositiveDays = netPositiveDays.map(([label]) => ({ label, value: positiveDayAverage }))

  const largestIncome = base.recentMonthKeys.map((monthKey) => {
    const values = base.incomeTransactions.filter((transaction) => transaction.monthKey === monthKey).map((transaction) => transaction.amount)
    return [toMonthLabel(monthKey), Math.max(0, ...values)] as [string, number]
  })
  const weekLabels = ["W1", "W2", "W3", "W4", "W5"]
  const groceryShareIncome = base.recentMonthKeys.map((monthKey) => {
    const grocerySpend = sum(base.baskets.filter((basket) => basket.monthKey === monthKey).map((basket) => basket.spend))
    const income = base.monthIncomeTotals.get(monthKey) ?? 0
    return [toMonthLabel(monthKey), income ? (grocerySpend / income) * 100 : 0] as [string, number]
  })

  const incomeEventCount = base.recentMonthKeys.map((monthKey) => {
    const count = base.incomeTransactions.filter((transaction) => transaction.monthKey === monthKey).length
    return [toMonthLabel(monthKey), count] as [string, number]
  })
  const monthlyNetCash = base.recentMonthKeys.map((monthKey) => [toMonthLabel(monthKey), base.monthNetTotals.get(monthKey) ?? 0] as [string, number])
  const netPerIncomeEvent = base.recentMonthKeys.map((monthKey, index) => {
    const incomeEvents = incomeEventCount[index]?.[1] ?? 0
    return [toMonthLabel(monthKey), (base.monthNetTotals.get(monthKey) ?? 0) / Math.max(1, incomeEvents)] as [string, number]
  })
  const groceryDaysFunded = base.recentMonthKeys.map((monthKey) => {
    const snapshot = base.monthlyBalanceSnapshots.find((entry) => entry.monthKey === monthKey)
    const monthBaskets = base.baskets.filter((basket) => basket.monthKey === monthKey)
    const groceryDays = new Set(monthBaskets.map((basket) => basket.dateKey)).size
    const groceryDaily = sum(monthBaskets.map((basket) => basket.spend)) / Math.max(1, groceryDays)
    return [toMonthLabel(monthKey), groceryDaily ? (snapshot?.closing ?? 0) / groceryDaily : 0] as [string, number]
  })
  const closingToBiggestExpense = base.recentMonthKeys.map((monthKey) => {
    const biggest = Math.max(0, ...base.expenseTransactions.filter((transaction) => transaction.monthKey === monthKey).map((transaction) => transaction.absAmount))
    const closing = base.monthlyBalanceSnapshots.find((entry) => entry.monthKey === monthKey)?.closing ?? 0
    return [toMonthLabel(monthKey), biggest ? closing / biggest : 0] as [string, number]
  })
  const closingToIncome = base.recentMonthKeys.map((monthKey) => {
    const closing = base.monthlyBalanceSnapshots.find((entry) => entry.monthKey === monthKey)?.closing ?? 0
    const income = base.monthIncomeTotals.get(monthKey) ?? 0
    return [toMonthLabel(monthKey), income ? (closing / income) * 100 : 0] as [string, number]
  })
  const expenseWeekHeatmapCells = base.recentMonthKeys.flatMap((monthKey) =>
    weekLabels.map((label, index) => {
      const week = index + 1
      const count = new Set(
        base.expenseTransactions
          .filter((transaction) => transaction.monthKey === monthKey && transaction.weekOfMonth === week)
          .map((transaction) => transaction.dateKey),
      ).size
      return { x: label, y: toMonthLabel(monthKey), value: count }
    }),
  )
  const repeatItemLineShare = base.recentMonthKeys.map((monthKey) => {
    const monthLines = base.receiptLines.filter((line) => line.monthKey === monthKey)
    const itemCounts = new Map<string, number>()
    for (const line of monthLines) itemCounts.set(line.item, (itemCounts.get(line.item) ?? 0) + 1)
    const repeated = monthLines.filter((line) => (itemCounts.get(line.item) ?? 0) >= 2).length
    return [toMonthLabel(monthKey), monthLines.length ? (repeated / monthLines.length) * 100 : 0] as [string, number]
  })
  const topStores = topEntries(
    new Map([...new Set(base.baskets.map((basket) => basket.store))].map((store) => [store, base.baskets.filter((basket) => basket.store === store).length])),
    5,
  ).map(([store]) => store)
  const storeWeekHeatmapCells = topStores.flatMap((store) =>
    weekLabels.map((label, index) => {
      const week = index + 1
      const trips = base.baskets.filter((basket) => basket.store === store && getWeekOfMonth(parseIsoDate(basket.dateKey)) === week).length
      return { x: label, y: store.slice(0, 12), value: trips }
    }),
  )
  const averageDailyBalance = base.recentMonthKeys.map((monthKey) => {
    const balances = [...new Set(base.transactions.filter((transaction) => transaction.monthKey === monthKey).map((transaction) => transaction.dateKey))]
      .map((dayKey) => base.dailyBalanceMap.get(dayKey) ?? 0)
    return [toMonthLabel(monthKey), mean(balances)] as [string, number]
  })

  const carryoverAnalytics: PlaygroundCardModel[] = [
    {
      id: "approved-net-positive-days-average",
      title: "Net-Positive Days vs Daily Average",
      eyebrow: "Daily Outcome",
      question: "How many days per month finish net positive, compared with the rolling average positive-day count?",
      insight: "This keeps the liked positive-days idea but adds the comparison context that makes it more actionable.",
      metricLabel: "Latest positive days",
      metricValue: `${round(netPositiveDays.at(-1)?.[1] ?? 0, 0)} days`,
      tags: ["Days", "Benchmark"],
      visual: { kind: "trend", points: toPointSeries(netPositiveDays), comparePoints: comparePositiveDays, formatter: "number" },
    },
    {
      id: "approved-largest-income-amount",
      title: "Largest Income Amount",
      eyebrow: "Biggest Deposit",
      question: "How large is the biggest income event in each month?",
      insight: "This is one of the clearest income reference charts because users immediately understand their top deposit.",
      metricLabel: "Latest biggest income",
      metricValue: formatCurrency(largestIncome.at(-1)?.[1] ?? 0, { maximumFractionDigits: 0 }),
      tags: ["Income", "Deposit"],
      visual: { kind: "bars", items: toPointSeries(largestIncome).map(({ label, value }) => ({ label, value })), formatter: "currency" },
    },
    {
      id: "approved-grocery-share-income",
      title: "Grocery Share of Income",
      eyebrow: "Cross-Signal",
      question: "How much of monthly income goes to grocery baskets?",
      insight: "This is a very readable bridge between groceries and the wider money story.",
      metricLabel: "Latest grocery share",
      metricValue: formatPercent(groceryShareIncome.at(-1)?.[1] ?? 0),
      tags: ["Groceries", "Income"],
      visual: { kind: "bars", items: toPointSeries(groceryShareIncome).map(({ label, value }) => ({ label, value })), formatter: "percent" },
    },
    {
      id: "approved-expense-days-by-week-of-month",
      title: "Expense Days by Week of Month",
      eyebrow: "Calendar Pattern",
      question: "In which week of the month do expense days usually cluster?",
      insight: "This is easy to scan and gives a clearer month-shape pattern than a single count.",
      metricLabel: "Tracked months",
      metricValue: `${base.recentMonthKeys.length} months`,
      tags: ["Heatmap", "Weeks"],
      visual: { kind: "heatmap", xLabels: weekLabels, yLabels: base.recentMonthKeys.map((monthKey) => toMonthLabel(monthKey)), cells: expenseWeekHeatmapCells },
    },
  ]

  const carryoverFridge: PlaygroundCardModel[] = [
    {
      id: "approved-repeat-item-line-share",
      title: "Repeat-Item Line Share",
      eyebrow: "Routine Mix",
      question: "What share of receipt lines comes from items that repeat within the month?",
      insight: "This quickly shows how much of grocery shopping is driven by recurring staples.",
      metricLabel: "Latest repeat share",
      metricValue: formatPercent(repeatItemLineShare.at(-1)?.[1] ?? 0),
      tags: ["Items", "Repeat"],
      visual: { kind: "bars", items: toPointSeries(repeatItemLineShare).map(({ label, value }) => ({ label, value })), formatter: "percent" },
    },
    {
      id: "approved-store-visits-by-week",
      title: "Store Visits by Week of Month",
      eyebrow: "Store Pattern",
      question: "Which usual stores are visited early or late in the month?",
      insight: "This makes store timing easy to understand without needing a full store-by-store trend view.",
      metricLabel: "Tracked stores",
      metricValue: `${topStores.length} stores`,
      tags: ["Heatmap", "Stores"],
      visual: { kind: "heatmap", xLabels: weekLabels, yLabels: topStores.map((store) => store.slice(0, 12)), cells: storeWeekHeatmapCells },
    },
  ]

  const carryoverSavings: PlaygroundCardModel[] = [
    {
      id: "approved-monthly-net-cash-flow",
      title: "Monthly Net Cash Flow",
      eyebrow: "Core Outcome",
      question: "Does each month finish net positive or net negative?",
      insight: "This remains one of the most useful savings charts because it says whether the month actually worked.",
      metricLabel: "Latest net cash",
      metricValue: formatCurrency(monthlyNetCash.at(-1)?.[1] ?? 0, { maximumFractionDigits: 0, showSign: true }),
      tags: ["Net", "Outcome"],
      visual: { kind: "bars", items: toPointSeries(monthlyNetCash).map(({ label, value }) => ({ label, value })), formatter: "currency" },
    },
    {
      id: "approved-net-cash-per-income-event",
      title: "Net Cash per Income Event",
      eyebrow: "Income Efficiency",
      question: "How much monthly net cash is created for each income event?",
      insight: "This is useful for users whose income arrives in several chunks instead of one fixed paycheck.",
      metricLabel: "Latest net per income",
      metricValue: formatCurrency(netPerIncomeEvent.at(-1)?.[1] ?? 0, { maximumFractionDigits: 0, showSign: true }),
      tags: ["Income", "Efficiency"],
      visual: { kind: "bars", items: toPointSeries(netPerIncomeEvent).map(({ label, value }) => ({ label, value })), formatter: "currency" },
    },
    {
      id: "approved-grocery-days-funded",
      title: "Grocery Days Funded by Closing Balance",
      eyebrow: "Closing Safety",
      question: "How many average grocery days could the closing balance cover?",
      insight: "This converts month-end balance into a household unit that people can act on quickly.",
      metricLabel: "Latest grocery days funded",
      metricValue: `${round(groceryDaysFunded.at(-1)?.[1] ?? 0, 1)} days`,
      tags: ["Groceries", "Safety"],
      visual: { kind: "trend", points: toPointSeries(groceryDaysFunded), formatter: "number" },
    },
    {
      id: "approved-closing-to-biggest-expense",
      title: "Closing Balance to Biggest Expense Ratio",
      eyebrow: "Shock Safety",
      question: "How many times does the month-end balance cover the biggest expense of that month?",
      insight: "This is a strong easy chart because it turns balance into a direct stress-test answer.",
      metricLabel: "Latest coverage",
      metricValue: `${round(closingToBiggestExpense.at(-1)?.[1] ?? 0, 1)}x`,
      tags: ["Balance", "Coverage"],
      visual: { kind: "trend", points: toPointSeries(closingToBiggestExpense), formatter: "number" },
    },
    {
      id: "approved-closing-to-income",
      title: "Closing Balance to Income Ratio",
      eyebrow: "Balance Strength",
      question: "What share of monthly income does the closing balance represent?",
      insight: "This makes the closing balance easier to interpret by tying it back to a familiar monthly reference.",
      metricLabel: "Latest ratio",
      metricValue: formatPercent(closingToIncome.at(-1)?.[1] ?? 0),
      tags: ["Balance", "Income"],
      visual: { kind: "bars", items: toPointSeries(closingToIncome).map(({ label, value }) => ({ label, value })), formatter: "percent" },
    },
    {
      id: "approved-average-daily-balance",
      title: "Average Daily Balance",
      eyebrow: "Balance Level",
      question: "What balance level does the month usually live at day to day?",
      insight: "This gives a more lived-in picture of balance than looking only at month-end snapshots.",
      metricLabel: "Latest average balance",
      metricValue: formatCurrency(averageDailyBalance.at(-1)?.[1] ?? 0, { maximumFractionDigits: 0 }),
      tags: ["Balance", "Daily"],
      visual: { kind: "bars", items: toPointSeries(averageDailyBalance).map(({ label, value }) => ({ label, value })), formatter: "currency" },
    },
  ]

  return {
    analyticsCards: [...analyticsCards, ...carryoverAnalytics, ...diverseAnalyticsCards],
    fridgeCards: [...fridgeCards, ...carryoverFridge, ...diverseFridgeCards],
    savingsCards: [...savingsCards, ...carryoverSavings, ...diverseSavingsCards],
  }
}

function buildEasyAnalyticsCards(base: BaseData, options: BuildOptions): PlaygroundCardModel[] {
  const { formatCurrency } = options
  const weekLabels = ["W1", "W2", "W3", "W4", "W5"]
  const incomeEventCount = base.recentMonthKeys.map((monthKey) => {
    const count = base.incomeTransactions.filter((entry) => entry.monthKey === monthKey).length
    return [toMonthLabel(monthKey), count] as [string, number]
  })
  const incomeDayCount = base.recentMonthKeys.map((monthKey) => {
    const days = new Set(base.incomeTransactions.filter((transaction) => transaction.monthKey === monthKey).map((transaction) => transaction.dateKey)).size
    return [toMonthLabel(monthKey), days] as [string, number]
  })
  const expenseTransactionCount = base.recentMonthKeys.map((monthKey) => {
    const count = base.expenseTransactions.filter((transaction) => transaction.monthKey === monthKey).length
    return [toMonthLabel(monthKey), count] as [string, number]
  })
  const expenseDayCount = base.recentMonthKeys.map((monthKey) => {
    const count = (base.monthActiveExpenseDays.get(monthKey) ?? new Set()).size
    return [toMonthLabel(monthKey), count] as [string, number]
  })
  const averageIncomePerIncomeDay = base.recentMonthKeys.map((monthKey, index) => {
    const income = base.monthIncomeTotals.get(monthKey) ?? 0
    const incomeDays = incomeDayCount[index]?.[1] ?? 0
    return [toMonthLabel(monthKey), income / Math.max(1, incomeDays)] as [string, number]
  })
  const expensePerActiveDay = base.recentMonthKeys.map((monthKey, index) => {
    const expenseDays = expenseDayCount[index]?.[1] ?? 0
    const expenseCount = expenseTransactionCount[index]?.[1] ?? 0
    return [toMonthLabel(monthKey), expenseCount / Math.max(1, expenseDays)] as [string, number]
  })
  const biggestExpense = base.recentMonthKeys.map((monthKey) => {
    const values = base.expenseTransactions.filter((transaction) => transaction.monthKey === monthKey).map((transaction) => transaction.absAmount)
    return [toMonthLabel(monthKey), Math.max(0, ...values)] as [string, number]
  })
  const biggestIncome = base.recentMonthKeys.map((monthKey) => {
    const values = base.incomeTransactions.filter((transaction) => transaction.monthKey === monthKey).map((transaction) => transaction.amount)
    return [toMonthLabel(monthKey), Math.max(0, ...values)] as [string, number]
  })
  const expenseFreeWeeks = base.recentMonthKeys.map((monthKey) => {
    const activeWeeks = new Set(
      base.expenseTransactions
        .filter((transaction) => transaction.monthKey === monthKey)
        .map((transaction) => transaction.weekOfMonth),
    )
    return [toMonthLabel(monthKey), weekLabels.length - activeWeeks.size] as [string, number]
  })
  const groceryTrips = base.recentMonthKeys.map((monthKey) => {
    const count = base.baskets.filter((basket) => basket.monthKey === monthKey).length
    return [toMonthLabel(monthKey), count] as [string, number]
  })
  const grocerySpend = base.recentMonthKeys.map((monthKey) => {
    const spend = sum(base.baskets.filter((basket) => basket.monthKey === monthKey).map((basket) => basket.spend))
    return [toMonthLabel(monthKey), spend] as [string, number]
  })
  const otherSpend = base.recentMonthKeys.map((monthKey, index) => {
    const totalExpense = base.monthExpenseTotals.get(monthKey) ?? 0
    return [toMonthLabel(monthKey), Math.max(0, totalExpense - (grocerySpend[index]?.[1] ?? 0))] as [string, number]
  })
  const firstHalfExpense = base.recentMonthKeys.map((monthKey) => {
    const spend = sum(
      base.expenseTransactions
        .filter((transaction) => transaction.monthKey === monthKey && Number(transaction.dateKey.slice(8, 10)) <= 15)
        .map((transaction) => transaction.absAmount),
    )
    return [toMonthLabel(monthKey), spend] as [string, number]
  })
  const secondHalfExpense = base.recentMonthKeys.map((monthKey) => {
    const spend = sum(
      base.expenseTransactions
        .filter((transaction) => transaction.monthKey === monthKey && Number(transaction.dateKey.slice(8, 10)) >= 16)
        .map((transaction) => transaction.absAmount),
    )
    return [toMonthLabel(monthKey), spend] as [string, number]
  })
  const biggestExpenseDay = base.recentMonthKeys.map((monthKey) => {
    const dayMap = base.monthDayExpenses.get(monthKey) ?? new Map<string, number>()
    return [toMonthLabel(monthKey), Math.max(0, ...dayMap.values())] as [string, number]
  })
  const averageExpenseDay = base.recentMonthKeys.map((monthKey) => {
    const dayMap = base.monthDayExpenses.get(monthKey) ?? new Map<string, number>()
    return [toMonthLabel(monthKey), mean([...dayMap.values()])] as [string, number]
  })
  const averageIncomeGap = base.recentMonthKeys.map((monthKey) => {
    const dates = [...new Set(base.incomeTransactions.filter((transaction) => transaction.monthKey === monthKey).map((transaction) => transaction.dateKey))].sort()
    const gaps = dates.slice(1).map((dateKey, index) => (parseIsoDate(dateKey).getTime() - parseIsoDate(dates[index]).getTime()) / 86400000)
    return [toMonthLabel(monthKey), mean(gaps)] as [string, number]
  })
  const expenseDaysBeforeFirstIncome = base.recentMonthKeys.map((monthKey) => {
    const firstIncomeDate = [...new Set(base.incomeTransactions.filter((transaction) => transaction.monthKey === monthKey).map((transaction) => transaction.dateKey))].sort()[0]
    const expenseDays = new Set(
      base.expenseTransactions
        .filter((transaction) => transaction.monthKey === monthKey && (!firstIncomeDate || transaction.dateKey < firstIncomeDate))
        .map((transaction) => transaction.dateKey),
    )
    return [toMonthLabel(monthKey), expenseDays.size] as [string, number]
  })
  const biggestExpenseShareBiggestIncome = base.recentMonthKeys.map((monthKey, index) => {
    const largestExpense = biggestExpense[index]?.[1] ?? 0
    const largestIncome = biggestIncome[index]?.[1] ?? 0
    return [toMonthLabel(monthKey), largestIncome ? (largestExpense / largestIncome) * 100 : 0] as [string, number]
  })
  const grocerySpendBeforeFirstIncome = base.recentMonthKeys.map((monthKey) => {
    const firstIncomeDate = [...new Set(base.incomeTransactions.filter((transaction) => transaction.monthKey === monthKey).map((transaction) => transaction.dateKey))].sort()[0]
    const spend = sum(
      base.baskets
        .filter((basket) => basket.monthKey === monthKey && (!firstIncomeDate || basket.dateKey < firstIncomeDate))
        .map((basket) => basket.spend),
    )
    return [toMonthLabel(monthKey), spend] as [string, number]
  })
  const monthEndExpenseShare = base.recentMonthKeys.map((monthKey) => {
    const total = base.monthExpenseTotals.get(monthKey) ?? 0
    const endSpend = sum(
      base.expenseTransactions
        .filter((transaction) => transaction.monthKey === monthKey && Number(transaction.dateKey.slice(8, 10)) >= 24)
        .map((transaction) => transaction.absAmount),
    )
    return [toMonthLabel(monthKey), total ? (endSpend / total) * 100 : 0] as [string, number]
  })
  const medianDailyNetFlow = base.recentMonthKeys.map((monthKey) => {
    const dailyValues = [...new Set(base.transactions.filter((transaction) => transaction.monthKey === monthKey).map((transaction) => transaction.dateKey))]
      .map((dayKey) => sum(base.transactions.filter((transaction) => transaction.dateKey === dayKey).map((transaction) => transaction.amount)))
    return [toMonthLabel(monthKey), median(dailyValues)] as [string, number]
  })
  const groceryTripWeeks = base.recentMonthKeys.map((monthKey) => {
    const weeks = new Set(base.baskets.filter((basket) => basket.monthKey === monthKey).map((basket) => getWeekOfMonth(parseIsoDate(basket.dateKey))))
    return [toMonthLabel(monthKey), weeks.size] as [string, number]
  })
  const expenseWeekHeatmapCells = base.recentMonthKeys.flatMap((monthKey) =>
    weekLabels.map((label, index) => {
      const week = index + 1
      const days = new Set(
        base.expenseTransactions
          .filter((transaction) => transaction.monthKey === monthKey && transaction.weekOfMonth === week)
          .map((transaction) => transaction.dateKey),
      ).size
      return { x: label, y: toMonthLabel(monthKey), value: days }
    }),
  )

  return [
    { id: "easy-analytics-biggest-income-vs-expense", title: "Biggest Income vs Biggest Expense", eyebrow: "Simple Comparison", question: "How does the biggest income event compare with the biggest expense each month?", insight: "This is an easy dumbbell chart because people instantly understand the gap between the biggest in and the biggest out.", metricLabel: "Latest gap", metricValue: formatCurrency((biggestIncome.at(-1)?.[1] ?? 0) - (biggestExpense.at(-1)?.[1] ?? 0), { maximumFractionDigits: 0, showSign: true }), tags: ["Income", "Expense"], visual: { kind: "dumbbell", items: base.recentMonthKeys.map((monthKey, index) => ({ label: toMonthLabel(monthKey), start: biggestExpense[index]?.[1] ?? 0, end: biggestIncome[index]?.[1] ?? 0 })), formatter: "currency" } },
    { id: "easy-analytics-average-income-per-day", title: "Average Income per Income Day", eyebrow: "Income Rhythm", question: "When income arrives, how much does a typical income day bring in?", insight: "This is easier to interpret than raw deposit counts because it answers what an income day is worth.", metricLabel: "Latest average income day", metricValue: formatCurrency(averageIncomePerIncomeDay.at(-1)?.[1] ?? 0, { maximumFractionDigits: 0 }), tags: ["Income", "Day"], visual: { kind: "bars", items: toPointSeries(averageIncomePerIncomeDay).map(({ label, value }) => ({ label, value })), formatter: "currency" } },
    { id: "easy-analytics-expense-transactions-per-day", title: "Expense Transactions per Expense Day", eyebrow: "Activity", question: "On days when spending happens, how many expense transactions usually appear?", insight: "This is a clear activity chart for whether spending days are focused or fragmented.", metricLabel: "Latest density", metricValue: `${round(expensePerActiveDay.at(-1)?.[1] ?? 0, 1)} tx/day`, tags: ["Expenses", "Density"], visual: { kind: "bars", items: toPointSeries(expensePerActiveDay).map(({ label, value }) => ({ label, value })), formatter: "number" } },
    { id: "easy-analytics-expense-free-weeks", title: "Expense-Free Weeks", eyebrow: "Calmer Months", question: "How many weeks in each month pass without any expense activity?", insight: "This is a very intuitive chart for whether the month has clean breathing spaces or constant spend.", metricLabel: "Latest quiet weeks", metricValue: `${round(expenseFreeWeeks.at(-1)?.[1] ?? 0, 0)} weeks`, tags: ["Weeks", "Control"], visual: { kind: "bars", items: toPointSeries(expenseFreeWeeks).map(({ label, value }) => ({ label, value })), formatter: "number" } },
    { id: "easy-analytics-trips-vs-income-events", title: "Grocery Trips vs Income Events", eyebrow: "Cross-Signal", question: "How do grocery trip counts compare with income event counts each month?", insight: "This is a simple month-by-month bridge between household shopping and how often money comes in.", metricLabel: "Latest counts", metricValue: `${round(groceryTrips.at(-1)?.[1] ?? 0, 0)} trips / ${round(incomeEventCount.at(-1)?.[1] ?? 0, 0)} income`, tags: ["Groceries", "Income"], visual: { kind: "dumbbell", items: base.recentMonthKeys.map((monthKey, index) => ({ label: toMonthLabel(monthKey), start: incomeEventCount[index]?.[1] ?? 0, end: groceryTrips[index]?.[1] ?? 0 })), formatter: "number" } },
    { id: "easy-analytics-grocery-vs-other-spend", title: "Grocery Spend vs Other Spend", eyebrow: "Cross-Signal", question: "How much monthly spending comes from groceries versus everything else?", insight: "This is easy to read because it frames groceries as one understandable slice against the rest of the month.", metricLabel: "Latest grocery spend", metricValue: formatCurrency(grocerySpend.at(-1)?.[1] ?? 0, { maximumFractionDigits: 0 }), tags: ["Groceries", "Spend"], visual: { kind: "dumbbell", items: base.recentMonthKeys.map((monthKey, index) => ({ label: toMonthLabel(monthKey), start: grocerySpend[index]?.[1] ?? 0, end: otherSpend[index]?.[1] ?? 0 })), formatter: "currency" } },
    { id: "easy-analytics-first-half-vs-second-half-expense", title: "First-Half vs Second-Half Expense", eyebrow: "Month Timing", question: "Is spending heavier in the first half or the second half of the month?", insight: "This is an easy timing comparison that avoids category complexity and still says something useful.", metricLabel: "Latest split", metricValue: formatCurrency((secondHalfExpense.at(-1)?.[1] ?? 0) - (firstHalfExpense.at(-1)?.[1] ?? 0), { maximumFractionDigits: 0, showSign: true }), tags: ["Timing", "Month"], visual: { kind: "dumbbell", items: base.recentMonthKeys.map((monthKey, index) => ({ label: toMonthLabel(monthKey), start: firstHalfExpense[index]?.[1] ?? 0, end: secondHalfExpense[index]?.[1] ?? 0 })), formatter: "currency" } },
    { id: "easy-analytics-largest-vs-average-expense-day", title: "Largest Expense Day vs Average Expense Day", eyebrow: "Day Stress", question: "How much larger is the heaviest expense day than a normal expense day?", insight: "This is a direct way to spot whether monthly pressure comes from one heavy day or from steady daily spend.", metricLabel: "Latest spread", metricValue: formatCurrency((biggestExpenseDay.at(-1)?.[1] ?? 0) - (averageExpenseDay.at(-1)?.[1] ?? 0), { maximumFractionDigits: 0, showSign: true }), tags: ["Days", "Stress"], visual: { kind: "dumbbell", items: base.recentMonthKeys.map((monthKey, index) => ({ label: toMonthLabel(monthKey), start: averageExpenseDay[index]?.[1] ?? 0, end: biggestExpenseDay[index]?.[1] ?? 0 })), formatter: "currency" } },
    { id: "easy-analytics-average-income-gap", title: "Average Income Gap", eyebrow: "Income Timing", question: "How many days usually pass between income dates?", insight: "This is a plain-language timing chart that helps irregular earners understand the rhythm of their inflows.", metricLabel: "Latest gap", metricValue: `${round(averageIncomeGap.at(-1)?.[1] ?? 0, 1)} days`, tags: ["Income", "Gap"], visual: { kind: "trend", points: toPointSeries(averageIncomeGap), formatter: "number" } },
    { id: "easy-analytics-expense-days-before-income", title: "Expense Days Before First Income", eyebrow: "Month Start Pressure", question: "How many expense days happen before the first income date each month?", insight: "This is a strong easy chart for month-start pressure because the answer is immediate.", metricLabel: "Latest pre-income days", metricValue: `${round(expenseDaysBeforeFirstIncome.at(-1)?.[1] ?? 0, 0)} days`, tags: ["Income", "Pressure"], visual: { kind: "bars", items: toPointSeries(expenseDaysBeforeFirstIncome).map(({ label, value }) => ({ label, value })), formatter: "number" } },
    { id: "easy-analytics-biggest-expense-share-biggest-income", title: "Biggest Expense vs Biggest Income Share", eyebrow: "Stress Test", question: "What share of the biggest income event would be consumed by the biggest expense?", insight: "This is easy to understand because it turns the biggest bill into a share of the biggest deposit.", metricLabel: "Latest share", metricValue: formatPercent(biggestExpenseShareBiggestIncome.at(-1)?.[1] ?? 0), tags: ["Income", "Expense"], visual: { kind: "trend", points: toPointSeries(biggestExpenseShareBiggestIncome), formatter: "percent" } },
    { id: "easy-analytics-expense-transaction-count", title: "Expense Transaction Count", eyebrow: "Basic Volume", question: "How many expense transactions happen each month?", insight: "This is a very mainstream chart that still matters because it shows whether the month is busy or quiet.", metricLabel: "Latest transactions", metricValue: `${round(expenseTransactionCount.at(-1)?.[1] ?? 0, 0)} tx`, tags: ["Expenses", "Count"], visual: { kind: "bars", items: toPointSeries(expenseTransactionCount).map(({ label, value }) => ({ label, value })), formatter: "number" } },
    { id: "easy-analytics-grocery-before-first-income", title: "Grocery Spend Before First Income", eyebrow: "Month Start Pressure", question: "How much grocery spend lands before the first income date of the month?", insight: "This is an easy household-pressure chart because it asks whether groceries hit before fresh income arrives.", metricLabel: "Latest early grocery", metricValue: formatCurrency(grocerySpendBeforeFirstIncome.at(-1)?.[1] ?? 0, { maximumFractionDigits: 0 }), tags: ["Groceries", "Income"], visual: { kind: "bars", items: toPointSeries(grocerySpendBeforeFirstIncome).map(({ label, value }) => ({ label, value })), formatter: "currency" } },
    { id: "easy-analytics-month-end-expense-share", title: "Month-End Expense Share", eyebrow: "Late-Month Load", question: "What share of monthly spending lands in the final week?", insight: "This is an easy way to see whether the month ends lightly or with a late surge of expenses.", metricLabel: "Latest month-end share", metricValue: formatPercent(monthEndExpenseShare.at(-1)?.[1] ?? 0), tags: ["Month End", "Share"], visual: { kind: "trend", points: toPointSeries(monthEndExpenseShare), formatter: "percent" } },
    { id: "easy-analytics-median-daily-net-flow", title: "Median Daily Net Flow", eyebrow: "Typical Day", question: "What does a typical transaction day net out to each month?", insight: "This gives a cleaner daily baseline than looking only at monthly totals.", metricLabel: "Latest median daily net", metricValue: formatCurrency(medianDailyNetFlow.at(-1)?.[1] ?? 0, { maximumFractionDigits: 0, showSign: true }), tags: ["Daily", "Net"], visual: { kind: "trend", points: toPointSeries(medianDailyNetFlow), formatter: "currency" } },
    { id: "easy-analytics-grocery-trip-weeks", title: "Grocery Trip Weeks", eyebrow: "Shopping Spread", question: "Across how many weeks of the month do grocery trips show up?", insight: "This is a simple rhythm chart for whether groceries are concentrated or spread through the month.", metricLabel: "Latest grocery weeks", metricValue: `${round(groceryTripWeeks.at(-1)?.[1] ?? 0, 0)} weeks`, tags: ["Groceries", "Weeks"], visual: { kind: "bars", items: toPointSeries(groceryTripWeeks).map(({ label, value }) => ({ label, value })), formatter: "number" } },
    { id: "easy-analytics-expense-days-week-heatmap", title: "Expense Days by Week of Month", eyebrow: "Calendar Pattern", question: "In which week of the month do expense days usually cluster?", insight: "A week-of-month heatmap is easy to scan and gives more structure than a plain count.", metricLabel: "Tracked months", metricValue: `${base.recentMonthKeys.length} months`, tags: ["Heatmap", "Weeks"], visual: { kind: "heatmap", xLabels: weekLabels, yLabels: base.recentMonthKeys.map((monthKey) => toMonthLabel(monthKey)), cells: expenseWeekHeatmapCells } },
  ]
}

function buildEasyFridgeCards(base: BaseData, options: BuildOptions): PlaygroundCardModel[] {
  const { formatCurrency } = options
  const weekLabels = ["W1", "W2", "W3", "W4", "W5"]
  const groceryDays = base.recentMonthKeys.map((monthKey) => {
    const days = new Set(base.baskets.filter((basket) => basket.monthKey === monthKey).map((basket) => basket.dateKey)).size
    return [toMonthLabel(monthKey), days] as [string, number]
  })
  const groceryTrips = base.recentMonthKeys.map((monthKey) => [toMonthLabel(monthKey), base.baskets.filter((basket) => basket.monthKey === monthKey).length] as [string, number])
  const grocerySpend = base.recentMonthKeys.map((monthKey) => [toMonthLabel(monthKey), sum(base.baskets.filter((basket) => basket.monthKey === monthKey).map((basket) => basket.spend))] as [string, number])
  const spendPerShoppingDay = base.recentMonthKeys.map((monthKey, index) => [toMonthLabel(monthKey), (grocerySpend[index]?.[1] ?? 0) / Math.max(1, groceryDays[index]?.[1] ?? 0)] as [string, number])
  const spendPerReceipt = base.recentMonthKeys.map((monthKey, index) => [toMonthLabel(monthKey), (grocerySpend[index]?.[1] ?? 0) / Math.max(1, groceryTrips[index]?.[1] ?? 0)] as [string, number])
  const lineCountPerReceipt = base.recentMonthKeys.map((monthKey) => [toMonthLabel(monthKey), mean(base.baskets.filter((basket) => basket.monthKey === monthKey).map((basket) => basket.lines.length))] as [string, number])
  const quantityPerReceipt = base.recentMonthKeys.map((monthKey) => [toMonthLabel(monthKey), mean(base.baskets.filter((basket) => basket.monthKey === monthKey).map((basket) => sum(basket.lines.map((line) => line.quantity))))] as [string, number])
  const pricePerQuantityUnit = base.recentMonthKeys.map((monthKey) => {
    const monthLines = base.receiptLines.filter((line) => line.monthKey === monthKey)
    const totalPrice = sum(monthLines.map((line) => line.totalPrice))
    const totalQuantity = sum(monthLines.map((line) => line.quantity))
    return [toMonthLabel(monthKey), totalPrice / Math.max(1, totalQuantity)] as [string, number]
  })
  const frequentStores = [...new Set(base.baskets.map((basket) => basket.store))]
    .map((store) => ({
      store,
      visits: base.baskets.filter((basket) => basket.store === store).length,
      averageSpend: mean(base.baskets.filter((basket) => basket.store === store).map((basket) => basket.spend)),
    }))
    .filter((entry) => entry.visits >= 2)
  const cheapestFrequentStores = [...frequentStores]
    .sort((a, b) => a.averageSpend - b.averageSpend)
    .slice(0, 6)
    .map((entry) => ({ label: entry.store.slice(0, 12), value: entry.averageSpend }))
  const mostExpensiveFrequentStores = [...frequentStores]
    .sort((a, b) => b.averageSpend - a.averageSpend)
    .slice(0, 6)
    .map((entry) => ({ label: entry.store.slice(0, 12), value: entry.averageSpend }))
  const highestQuantityReceipt = base.recentMonthKeys.map((monthKey) => {
    const values = base.baskets.filter((basket) => basket.monthKey === monthKey).map((basket) => sum(basket.lines.map((line) => line.quantity)))
    return [toMonthLabel(monthKey), Math.max(0, ...values)] as [string, number]
  })
  const highestLineCountReceipt = base.recentMonthKeys.map((monthKey) => {
    const values = base.baskets.filter((basket) => basket.monthKey === monthKey).map((basket) => basket.lines.length)
    return [toMonthLabel(monthKey), Math.max(0, ...values)] as [string, number]
  })
  const singleItemReceiptShare = base.recentMonthKeys.map((monthKey) => {
    const monthBaskets = base.baskets.filter((basket) => basket.monthKey === monthKey)
    const single = monthBaskets.filter((basket) => basket.uniqueItems <= 1).length
    return [toMonthLabel(monthKey), monthBaskets.length ? (single / monthBaskets.length) * 100 : 0] as [string, number]
  })
  const singleStoreMonthShare = base.recentMonthKeys.length
    ? base.recentMonthKeys.filter((monthKey) => new Set(base.baskets.filter((basket) => basket.monthKey === monthKey).map((basket) => basket.store)).size <= 1).length / base.recentMonthKeys.length
    : 0
  const firstHalfGrocery = base.recentMonthKeys.map((monthKey) => {
    const spend = sum(base.baskets.filter((basket) => basket.monthKey === monthKey && Number(basket.dateKey.slice(8, 10)) <= 15).map((basket) => basket.spend))
    return [toMonthLabel(monthKey), spend] as [string, number]
  })
  const secondHalfGrocery = base.recentMonthKeys.map((monthKey) => {
    const spend = sum(base.baskets.filter((basket) => basket.monthKey === monthKey && Number(basket.dateKey.slice(8, 10)) >= 16).map((basket) => basket.spend))
    return [toMonthLabel(monthKey), spend] as [string, number]
  })
  const receiptsPerActiveGroceryWeek = base.recentMonthKeys.map((monthKey, index) => {
    const weeks = new Set(base.baskets.filter((basket) => basket.monthKey === monthKey).map((basket) => getWeekOfMonth(parseIsoDate(basket.dateKey)))).size
    return [toMonthLabel(monthKey), (groceryTrips[index]?.[1] ?? 0) / Math.max(1, weeks)] as [string, number]
  })
  const repeatItemLineShare = base.recentMonthKeys.map((monthKey) => {
    const monthLines = base.receiptLines.filter((line) => line.monthKey === monthKey)
    const itemCounts = new Map<string, number>()
    for (const line of monthLines) itemCounts.set(line.item, (itemCounts.get(line.item) ?? 0) + 1)
    const repeatLines = monthLines.filter((line) => (itemCounts.get(line.item) ?? 0) >= 2).length
    return [toMonthLabel(monthKey), monthLines.length ? (repeatLines / monthLines.length) * 100 : 0] as [string, number]
  })
  const grocerySpendOnIncomeDays = base.recentMonthKeys.map((monthKey) => {
    const incomeDays = new Set(base.incomeTransactions.filter((transaction) => transaction.monthKey === monthKey).map((transaction) => transaction.dateKey))
    const onIncomeDays = sum(base.baskets.filter((basket) => basket.monthKey === monthKey && incomeDays.has(basket.dateKey)).map((basket) => basket.spend))
    const offIncomeDays = sum(base.baskets.filter((basket) => basket.monthKey === monthKey && !incomeDays.has(basket.dateKey)).map((basket) => basket.spend))
    return { label: toMonthLabel(monthKey), onIncomeDays, offIncomeDays }
  })
  const groceryTripsBeforeFirstIncome = base.recentMonthKeys.map((monthKey) => {
    const firstIncomeDate = [...new Set(base.incomeTransactions.filter((transaction) => transaction.monthKey === monthKey).map((transaction) => transaction.dateKey))].sort()[0]
    const count = base.baskets.filter((basket) => basket.monthKey === monthKey && (!firstIncomeDate || basket.dateKey < firstIncomeDate)).length
    return [toMonthLabel(monthKey), count] as [string, number]
  })
  const topStores = topEntries(
    new Map([...new Set(base.baskets.map((basket) => basket.store))].map((store) => [store, base.baskets.filter((basket) => basket.store === store).length])),
    5,
  ).map(([store]) => store)
  const storeWeekHeatmapCells = topStores.flatMap((store) =>
    weekLabels.map((label, index) => {
      const week = index + 1
      const trips = base.baskets.filter((basket) => basket.store === store && getWeekOfMonth(parseIsoDate(basket.dateKey)) === week).length
      return { x: label, y: store.slice(0, 12), value: trips }
    }),
  )

  return [
    { id: "easy-fridge-spend-per-shopping-day", title: "Grocery Spend per Shopping Day", eyebrow: "Trip Efficiency", question: "How much grocery spend happens on an average shopping day?", insight: "This is easier to reason about than raw monthly totals because it tells you what a shopping day costs.", metricLabel: "Latest spend/day", metricValue: formatCurrency(spendPerShoppingDay.at(-1)?.[1] ?? 0, { maximumFractionDigits: 0 }), tags: ["Groceries", "Day"], visual: { kind: "bars", items: toPointSeries(spendPerShoppingDay).map(({ label, value }) => ({ label, value })), formatter: "currency" } },
    { id: "easy-fridge-spend-per-receipt", title: "Grocery Spend per Receipt", eyebrow: "Receipt Cost", question: "What does a typical grocery receipt cost once monthly spend is spread across receipts?", insight: "This is a very mainstream grocery chart because most people naturally think in receipts and trips.", metricLabel: "Latest spend/receipt", metricValue: formatCurrency(spendPerReceipt.at(-1)?.[1] ?? 0, { maximumFractionDigits: 0 }), tags: ["Receipts", "Cost"], visual: { kind: "bars", items: toPointSeries(spendPerReceipt).map(({ label, value }) => ({ label, value })), formatter: "currency" } },
    { id: "easy-fridge-receipt-line-count", title: "Receipt Line Count", eyebrow: "Receipt Size", question: "How many lines does a typical receipt contain each month?", insight: "This is a simple receipt-size chart that avoids category complexity and still says something useful.", metricLabel: "Latest line count", metricValue: `${round(lineCountPerReceipt.at(-1)?.[1] ?? 0, 1)} lines`, tags: ["Receipts", "Lines"], visual: { kind: "bars", items: toPointSeries(lineCountPerReceipt).map(({ label, value }) => ({ label, value })), formatter: "number" } },
    { id: "easy-fridge-quantity-per-receipt", title: "Quantity per Receipt", eyebrow: "Receipt Size", question: "How much total quantity is usually bought per receipt?", insight: "This answers whether receipts are growing by quantity rather than just by price.", metricLabel: "Latest quantity/receipt", metricValue: `${round(quantityPerReceipt.at(-1)?.[1] ?? 0, 1)} units`, tags: ["Quantity", "Receipts"], visual: { kind: "bars", items: toPointSeries(quantityPerReceipt).map(({ label, value }) => ({ label, value })), formatter: "number" } },
    { id: "easy-fridge-price-per-quantity-unit", title: "Price per Quantity Unit", eyebrow: "Pricing", question: "How much is paid per unit of purchased quantity each month?", insight: "This is a straightforward inflation-style chart that stays easy because it uses one simple denominator.", metricLabel: "Latest unit price", metricValue: formatCurrency(pricePerQuantityUnit.at(-1)?.[1] ?? 0, { maximumFractionDigits: 2 }), tags: ["Pricing", "Quantity"], visual: { kind: "trend", points: toPointSeries(pricePerQuantityUnit), formatter: "currency" } },
    { id: "easy-fridge-cheapest-frequent-stores", title: "Cheapest Frequent Stores", eyebrow: "Store Benchmark", question: "Among stores you visit repeatedly, which ones have the lowest average receipt?", insight: "This is an easy benchmark chart that helps users quickly see where typical trips stay cheaper.", metricLabel: "Lowest average receipt", metricValue: formatCurrency(cheapestFrequentStores[0]?.value ?? 0, { maximumFractionDigits: 0 }), tags: ["Stores", "Benchmark"], visual: { kind: "bars", items: cheapestFrequentStores, formatter: "currency" } },
    { id: "easy-fridge-most-expensive-frequent-stores", title: "Most Expensive Frequent Stores", eyebrow: "Store Benchmark", question: "Among stores you visit repeatedly, which ones have the highest average receipt?", insight: "This pairs naturally with cheapest-store rankings and stays easy to understand.", metricLabel: "Highest average receipt", metricValue: formatCurrency(mostExpensiveFrequentStores[0]?.value ?? 0, { maximumFractionDigits: 0 }), tags: ["Stores", "Benchmark"], visual: { kind: "bars", items: mostExpensiveFrequentStores, formatter: "currency" } },
    { id: "easy-fridge-highest-quantity-receipt", title: "Highest Quantity Receipt", eyebrow: "Biggest Haul", question: "What is the largest quantity bought in a single receipt each month?", insight: "This is a clean way to spot stock-up hauls without relying on category detail.", metricLabel: "Latest largest quantity", metricValue: `${round(highestQuantityReceipt.at(-1)?.[1] ?? 0, 0)} units`, tags: ["Quantity", "Peak"], visual: { kind: "trend", points: toPointSeries(highestQuantityReceipt), formatter: "number" } },
    { id: "easy-fridge-highest-line-count-receipt", title: "Highest Line Count Receipt", eyebrow: "Biggest Basket", question: "How many line items are on the largest receipt of the month?", insight: "This is a very understandable big-basket chart because line count is intuitive for most users.", metricLabel: "Latest largest line count", metricValue: `${round(highestLineCountReceipt.at(-1)?.[1] ?? 0, 0)} lines`, tags: ["Receipts", "Peak"], visual: { kind: "trend", points: toPointSeries(highestLineCountReceipt), formatter: "number" } },
    { id: "easy-fridge-single-item-receipt-share", title: "Single-Item Receipt Share", eyebrow: "Quick Runs", question: "What share of grocery receipts contain only one item?", insight: "This is an easy behavioral chart for quick stop-ins and emergency pickups.", metricLabel: "Latest single-item share", metricValue: formatPercent(singleItemReceiptShare.at(-1)?.[1] ?? 0), tags: ["Receipts", "Share"], visual: { kind: "trend", points: toPointSeries(singleItemReceiptShare), formatter: "percent" } },
    { id: "easy-fridge-single-store-month-share", title: "Single-Store Month Share", eyebrow: "Shopping Focus", question: "How often does a month rely on just one grocery store?", insight: "This is a simple overall focus gauge that tells whether grocery shopping stays consolidated.", metricLabel: "Single-store months", metricValue: formatPercent(singleStoreMonthShare * 100), tags: ["Stores", "Gauge"], visual: { kind: "gauge", value: singleStoreMonthShare, target: 0.5 } },
    { id: "easy-fridge-first-half-vs-second-half-grocery", title: "First-Half vs Second-Half Grocery Spend", eyebrow: "Month Timing", question: "Is grocery spend heavier in the first half or second half of the month?", insight: "This is easy to read and helps identify whether grocery pressure is front-loaded or catch-up driven.", metricLabel: "Latest split", metricValue: formatCurrency((secondHalfGrocery.at(-1)?.[1] ?? 0) - (firstHalfGrocery.at(-1)?.[1] ?? 0), { maximumFractionDigits: 0, showSign: true }), tags: ["Timing", "Groceries"], visual: { kind: "dumbbell", items: base.recentMonthKeys.map((monthKey, index) => ({ label: toMonthLabel(monthKey), start: firstHalfGrocery[index]?.[1] ?? 0, end: secondHalfGrocery[index]?.[1] ?? 0 })), formatter: "currency" } },
    { id: "easy-fridge-receipts-per-active-week", title: "Receipts per Active Grocery Week", eyebrow: "Shopping Rhythm", question: "When grocery shopping happens in a week, how many receipts does that week usually contain?", insight: "This is an easy weekly rhythm chart that explains whether shopping is consolidated or repeated.", metricLabel: "Latest receipts/week", metricValue: `${round(receiptsPerActiveGroceryWeek.at(-1)?.[1] ?? 0, 1)} receipts`, tags: ["Weeks", "Receipts"], visual: { kind: "bars", items: toPointSeries(receiptsPerActiveGroceryWeek).map(({ label, value }) => ({ label, value })), formatter: "number" } },
    { id: "easy-fridge-repeat-item-line-share", title: "Repeat-Item Line Share", eyebrow: "Routine Mix", question: "What share of receipt lines comes from items that repeat within the month?", insight: "This is an easy way to see whether the monthly basket is driven by routine staples or one-off items.", metricLabel: "Latest repeat share", metricValue: formatPercent(repeatItemLineShare.at(-1)?.[1] ?? 0), tags: ["Items", "Repeat"], visual: { kind: "trend", points: toPointSeries(repeatItemLineShare), formatter: "percent" } },
    { id: "easy-fridge-income-day-vs-other-day-spend", title: "Grocery Spend on Income Days vs Other Days", eyebrow: "Cross-Signal", question: "How much grocery spend lands on income days compared with other days?", insight: "This creates a very easy bridge between paycheck rhythm and grocery behavior.", metricLabel: "Latest income-day grocery", metricValue: formatCurrency(grocerySpendOnIncomeDays.at(-1)?.onIncomeDays ?? 0, { maximumFractionDigits: 0 }), tags: ["Groceries", "Income"], visual: { kind: "dumbbell", items: grocerySpendOnIncomeDays.map(({ label, onIncomeDays, offIncomeDays }) => ({ label, start: onIncomeDays, end: offIncomeDays })), formatter: "currency" } },
    { id: "easy-fridge-trips-before-first-income", title: "Grocery Trips Before First Income", eyebrow: "Month Start Pressure", question: "How many grocery trips happen before the first income date of the month?", insight: "This is a simple count that tells whether groceries are hitting before the month gets funded.", metricLabel: "Latest early trips", metricValue: `${round(groceryTripsBeforeFirstIncome.at(-1)?.[1] ?? 0, 0)} trips`, tags: ["Groceries", "Income"], visual: { kind: "bars", items: toPointSeries(groceryTripsBeforeFirstIncome).map(({ label, value }) => ({ label, value })), formatter: "number" } },
    { id: "easy-fridge-store-visits-week-heatmap", title: "Store Visits by Week of Month", eyebrow: "Store Pattern", question: "Which usual stores are visited early or late in the month?", insight: "A week-of-month heatmap gives more structure than a simple top-stores ranking while staying easy to scan.", metricLabel: "Tracked stores", metricValue: `${topStores.length} stores`, tags: ["Heatmap", "Stores"], visual: { kind: "heatmap", xLabels: weekLabels, yLabels: topStores.map((store) => store.slice(0, 12)), cells: storeWeekHeatmapCells } },
  ]
}

function buildEasySavingsCards(base: BaseData, options: BuildOptions): PlaygroundCardModel[] {
  const { formatCurrency } = options
  const netCash = base.recentMonthKeys.map((monthKey) => [toMonthLabel(monthKey), base.monthNetTotals.get(monthKey) ?? 0] as [string, number])
  const closingBalance = base.monthlyBalanceSnapshots.map((snapshot) => [toMonthLabel(snapshot.monthKey), snapshot.closing] as [string, number])
  const positiveNetMonthShare =
    base.recentMonthKeys.length > 0 ? base.recentMonthKeys.filter((monthKey) => (base.monthNetTotals.get(monthKey) ?? 0) > 0).length / base.recentMonthKeys.length : 0
  const grocerySpend = base.recentMonthKeys.map((monthKey) => [toMonthLabel(monthKey), sum(base.baskets.filter((basket) => basket.monthKey === monthKey).map((basket) => basket.spend))] as [string, number])
  const largestReceipt = base.recentMonthKeys.map((monthKey) => [toMonthLabel(monthKey), Math.max(0, ...base.baskets.filter((basket) => basket.monthKey === monthKey).map((basket) => basket.spend))] as [string, number])
  const biggestExpense = base.recentMonthKeys.map((monthKey) => [toMonthLabel(monthKey), Math.max(0, ...base.expenseTransactions.filter((transaction) => transaction.monthKey === monthKey).map((transaction) => transaction.absAmount))] as [string, number])
  const incomeLeftAfterBiggestExpense = base.recentMonthKeys.map((monthKey, index) => [toMonthLabel(monthKey), (base.monthIncomeTotals.get(monthKey) ?? 0) - (biggestExpense[index]?.[1] ?? 0)] as [string, number])
  const expenseDayCount = base.recentMonthKeys.map((monthKey) => [toMonthLabel(monthKey), (base.monthActiveExpenseDays.get(monthKey) ?? new Set()).size] as [string, number])
  const groceryDayCount = base.recentMonthKeys.map((monthKey) => [toMonthLabel(monthKey), new Set(base.baskets.filter((basket) => basket.monthKey === monthKey).map((basket) => basket.dateKey)).size] as [string, number])
  const netCashPerExpenseDay = base.recentMonthKeys.map((monthKey, index) => [toMonthLabel(monthKey), (base.monthNetTotals.get(monthKey) ?? 0) / Math.max(1, expenseDayCount[index]?.[1] ?? 0)] as [string, number])
  const netCashPerGroceryDay = base.recentMonthKeys.map((monthKey, index) => [toMonthLabel(monthKey), (base.monthNetTotals.get(monthKey) ?? 0) / Math.max(1, groceryDayCount[index]?.[1] ?? 0)] as [string, number])
  const grocerySpendCoveredByNetCash = base.recentMonthKeys.map((monthKey, index) => {
    const grocery = grocerySpend[index]?.[1] ?? 0
    const net = base.monthNetTotals.get(monthKey) ?? 0
    return [toMonthLabel(monthKey), grocery ? (net / grocery) * 100 : 0] as [string, number]
  })
  const positiveVsNegativeMonths = [
    { label: "Positive", value: base.recentMonthKeys.filter((monthKey) => (base.monthNetTotals.get(monthKey) ?? 0) > 0).length },
    { label: "Negative", value: base.recentMonthKeys.filter((monthKey) => (base.monthNetTotals.get(monthKey) ?? 0) <= 0).length },
  ]
  const medianReceipt = base.recentMonthKeys.map((monthKey) => [toMonthLabel(monthKey), median(base.baskets.filter((basket) => basket.monthKey === monthKey).map((basket) => basket.spend))] as [string, number])
  const closingAboveMedianReceipt = base.recentMonthKeys.map((monthKey, index) => {
    const closing = base.monthlyBalanceSnapshots.find((entry) => entry.monthKey === monthKey)?.closing ?? 0
    const receipt = medianReceipt[index]?.[1] ?? 0
    return [toMonthLabel(monthKey), receipt ? closing / receipt : 0] as [string, number]
  })
  const closingAboveLargestReceipt = base.recentMonthKeys.map((monthKey, index) => {
    const closing = base.monthlyBalanceSnapshots.find((entry) => entry.monthKey === monthKey)?.closing ?? 0
    const receipt = largestReceipt[index]?.[1] ?? 0
    return [toMonthLabel(monthKey), receipt ? closing / receipt : 0] as [string, number]
  })
  const averageDailyBalance = base.recentMonthKeys.map((monthKey) => {
    const dayBalances = [...new Set(base.transactions.filter((transaction) => transaction.monthKey === monthKey).map((transaction) => transaction.dateKey))]
      .map((dayKey) => base.dailyBalanceMap.get(dayKey) ?? 0)
    return [toMonthLabel(monthKey), mean(dayBalances)] as [string, number]
  })
  const biggestExpenseCoveredByNet = base.recentMonthKeys.map((monthKey, index) => {
    const biggest = biggestExpense[index]?.[1] ?? 0
    const net = base.monthNetTotals.get(monthKey) ?? 0
    return [toMonthLabel(monthKey), biggest ? (net / biggest) * 100 : 0] as [string, number]
  })
  const cashLeftAfterGroceriesAndBiggestExpense = base.recentMonthKeys.map((monthKey, index) => {
    const income = base.monthIncomeTotals.get(monthKey) ?? 0
    return [toMonthLabel(monthKey), income - (grocerySpend[index]?.[1] ?? 0) - (biggestExpense[index]?.[1] ?? 0)] as [string, number]
  })
  const closingToGrocerySpend = base.recentMonthKeys.map((monthKey, index) => {
    const closing = base.monthlyBalanceSnapshots.find((entry) => entry.monthKey === monthKey)?.closing ?? 0
    const grocery = grocerySpend[index]?.[1] ?? 0
    return [toMonthLabel(monthKey), grocery ? (closing / grocery) * 100 : 0] as [string, number]
  })
  const netCashAfterBiggestGroceryReceipt = base.recentMonthKeys.map((monthKey, index) => [toMonthLabel(monthKey), (base.monthNetTotals.get(monthKey) ?? 0) - (largestReceipt[index]?.[1] ?? 0)] as [string, number])

  return [
    { id: "easy-savings-positive-net-share", title: "Positive Net Month Share", eyebrow: "Overall Outcome", question: "Across the current window, what share of months finish net positive?", insight: "This is a very easy gauge because it summarizes month quality in one number.", metricLabel: "Positive month share", metricValue: formatPercent(positiveNetMonthShare * 100), tags: ["Net", "Gauge"], visual: { kind: "gauge", value: positiveNetMonthShare, target: 0.66 } },
    { id: "easy-savings-closing-vs-grocery-spend", title: "Closing Balance vs Grocery Spend", eyebrow: "Cross-Signal", question: "How does the month-end balance compare with total grocery spend each month?", insight: "This is easy to read because it compares two household-scale numbers people already recognize.", metricLabel: "Latest gap", metricValue: formatCurrency((closingBalance.at(-1)?.[1] ?? 0) - (grocerySpend.at(-1)?.[1] ?? 0), { maximumFractionDigits: 0, showSign: true }), tags: ["Balance", "Groceries"], visual: { kind: "dumbbell", items: base.recentMonthKeys.map((monthKey, index) => ({ label: toMonthLabel(monthKey), start: grocerySpend[index]?.[1] ?? 0, end: closingBalance[index]?.[1] ?? 0 })), formatter: "currency" } },
    { id: "easy-savings-closing-vs-largest-receipt", title: "Closing Balance vs Largest Grocery Receipt", eyebrow: "Closing Safety", question: "How does the month-end balance compare with the biggest grocery receipt?", insight: "This stays easy because it turns the closing balance into a very concrete grocery comparison.", metricLabel: "Latest gap", metricValue: formatCurrency((closingBalance.at(-1)?.[1] ?? 0) - (largestReceipt.at(-1)?.[1] ?? 0), { maximumFractionDigits: 0, showSign: true }), tags: ["Balance", "Receipts"], visual: { kind: "dumbbell", items: base.recentMonthKeys.map((monthKey, index) => ({ label: toMonthLabel(monthKey), start: largestReceipt[index]?.[1] ?? 0, end: closingBalance[index]?.[1] ?? 0 })), formatter: "currency" } },
    { id: "easy-savings-income-left-after-biggest-expense", title: "Income Left After Biggest Expense", eyebrow: "Stress Test", question: "After the biggest expense lands, how much monthly income is still left?", insight: "This is a very readable stress chart because it asks what the largest bill leaves behind.", metricLabel: "Latest remainder", metricValue: formatCurrency(incomeLeftAfterBiggestExpense.at(-1)?.[1] ?? 0, { maximumFractionDigits: 0, showSign: true }), tags: ["Income", "Expense"], visual: { kind: "trend", points: toPointSeries(incomeLeftAfterBiggestExpense), formatter: "currency" } },
    { id: "easy-savings-net-cash-per-expense-day", title: "Net Cash per Expense Day", eyebrow: "Efficiency", question: "How much net cash does the month produce for each day that spending happens?", insight: "This is an easy way to connect monthly outcome with how often the money was actually in motion.", metricLabel: "Latest net/expense day", metricValue: formatCurrency(netCashPerExpenseDay.at(-1)?.[1] ?? 0, { maximumFractionDigits: 0, showSign: true }), tags: ["Net", "Days"], visual: { kind: "bars", items: toPointSeries(netCashPerExpenseDay).map(({ label, value }) => ({ label, value })), formatter: "currency" } },
    { id: "easy-savings-net-cash-per-grocery-day", title: "Net Cash per Grocery Day", eyebrow: "Cross-Signal", question: "How much net cash does the month produce for each day groceries are bought?", insight: "This is a simple way to connect grocery behavior with monthly financial headroom.", metricLabel: "Latest net/grocery day", metricValue: formatCurrency(netCashPerGroceryDay.at(-1)?.[1] ?? 0, { maximumFractionDigits: 0, showSign: true }), tags: ["Net", "Groceries"], visual: { kind: "bars", items: toPointSeries(netCashPerGroceryDay).map(({ label, value }) => ({ label, value })), formatter: "currency" } },
    { id: "easy-savings-grocery-covered-by-net-cash", title: "Grocery Spend Covered by Net Cash", eyebrow: "Cross-Signal", question: "What share of grocery spending is covered by monthly net cash?", insight: "This is a very understandable percent chart for whether groceries are being absorbed or amplified by the month.", metricLabel: "Latest coverage", metricValue: formatPercent(grocerySpendCoveredByNetCash.at(-1)?.[1] ?? 0), tags: ["Groceries", "Coverage"], visual: { kind: "trend", points: toPointSeries(grocerySpendCoveredByNetCash), formatter: "percent" } },
    { id: "easy-savings-positive-vs-negative-months", title: "Positive vs Negative Net Months", eyebrow: "Window Summary", question: "How many months in the window finish positive versus negative?", insight: "This is a very easy scoreboard chart that most users grasp immediately.", metricLabel: "Positive months", metricValue: `${positiveVsNegativeMonths[0]?.value ?? 0} months`, tags: ["Net", "Summary"], visual: { kind: "bars", items: positiveVsNegativeMonths, formatter: "number" } },
    { id: "easy-savings-closing-above-median-receipt", title: "Closing Balance Above Median Receipt Count", eyebrow: "Receipt Safety", question: "How many median grocery receipts could the closing balance cover?", insight: "This is an easy safety conversion because people can picture average grocery receipts more easily than abstract balances.", metricLabel: "Latest receipt count", metricValue: `${round(closingAboveMedianReceipt.at(-1)?.[1] ?? 0, 1)} receipts`, tags: ["Balance", "Receipts"], visual: { kind: "trend", points: toPointSeries(closingAboveMedianReceipt), formatter: "number" } },
    { id: "easy-savings-closing-above-largest-receipt", title: "Closing Balance Above Largest Receipt Count", eyebrow: "Receipt Safety", question: "How many largest-type grocery receipts could the closing balance cover?", insight: "This complements the median receipt view with a more demanding grocery stress test.", metricLabel: "Latest large receipt count", metricValue: `${round(closingAboveLargestReceipt.at(-1)?.[1] ?? 0, 1)} receipts`, tags: ["Balance", "Receipts"], visual: { kind: "trend", points: toPointSeries(closingAboveLargestReceipt), formatter: "number" } },
    { id: "easy-savings-average-daily-balance", title: "Average Daily Balance", eyebrow: "Balance Level", question: "What balance level does the month usually live at day to day?", insight: "This is an easy complement to month-end balance because it captures the balance people actually lived with.", metricLabel: "Latest average balance", metricValue: formatCurrency(averageDailyBalance.at(-1)?.[1] ?? 0, { maximumFractionDigits: 0 }), tags: ["Balance", "Daily"], visual: { kind: "trend", points: toPointSeries(averageDailyBalance), formatter: "currency" } },
    { id: "easy-savings-biggest-expense-covered-by-net", title: "Biggest Expense Covered by Net Cash", eyebrow: "Stress Test", question: "What share of the biggest expense is covered by monthly net cash?", insight: "This gives a very direct answer to whether the month is generating enough surplus to absorb a major hit.", metricLabel: "Latest coverage", metricValue: formatPercent(biggestExpenseCoveredByNet.at(-1)?.[1] ?? 0), tags: ["Expense", "Coverage"], visual: { kind: "trend", points: toPointSeries(biggestExpenseCoveredByNet), formatter: "percent" } },
    { id: "easy-savings-cash-left-after-groceries-and-biggest-expense", title: "Cash Left After Groceries and Biggest Expense", eyebrow: "Household Stress", question: "After groceries and the biggest expense, how much income is still left?", insight: "This is easy to understand because it combines one core household cost and one big stress event.", metricLabel: "Latest cash left", metricValue: formatCurrency(cashLeftAfterGroceriesAndBiggestExpense.at(-1)?.[1] ?? 0, { maximumFractionDigits: 0, showSign: true }), tags: ["Income", "Groceries"], visual: { kind: "trend", points: toPointSeries(cashLeftAfterGroceriesAndBiggestExpense), formatter: "currency" } },
    { id: "easy-savings-closing-to-grocery-spend-ratio", title: "Closing Balance to Grocery Spend Ratio", eyebrow: "Household Buffer", question: "What share of monthly grocery spend does the closing balance represent?", insight: "This is an easy household-strength chart because it ties the close directly to a familiar monthly cost.", metricLabel: "Latest ratio", metricValue: formatPercent(closingToGrocerySpend.at(-1)?.[1] ?? 0), tags: ["Balance", "Groceries"], visual: { kind: "trend", points: toPointSeries(closingToGrocerySpend), formatter: "percent" } },
    { id: "easy-savings-net-after-largest-grocery-receipt", title: "Net Cash After Biggest Grocery Receipt", eyebrow: "Receipt Stress", question: "What would monthly net cash look like after subtracting the biggest grocery receipt?", insight: "This is a useful everyday stress test because grocery spikes are relatable and common.", metricLabel: "Latest adjusted net", metricValue: formatCurrency(netCashAfterBiggestGroceryReceipt.at(-1)?.[1] ?? 0, { maximumFractionDigits: 0, showSign: true }), tags: ["Net", "Receipts"], visual: { kind: "trend", points: toPointSeries(netCashAfterBiggestGroceryReceipt), formatter: "currency" } },
    { id: "easy-savings-month-end-vs-average-balance", title: "Month-End Balance vs Average Daily Balance", eyebrow: "Balance Shape", question: "Is the month-end balance above or below the balance level usually lived at during the month?", insight: "This dumbbell makes month-end balance more interpretable by comparing it with the month’s average lived balance.", metricLabel: "Latest difference", metricValue: formatCurrency((closingBalance.at(-1)?.[1] ?? 0) - (averageDailyBalance.at(-1)?.[1] ?? 0), { maximumFractionDigits: 0, showSign: true }), tags: ["Balance", "Shape"], visual: { kind: "dumbbell", items: base.recentMonthKeys.map((monthKey, index) => ({ label: toMonthLabel(monthKey), start: averageDailyBalance[index]?.[1] ?? 0, end: closingBalance[index]?.[1] ?? 0 })), formatter: "currency" } },
  ]
}

function buildDiverseAnalyticsCards(base: BaseData, options: BuildOptions): PlaygroundCardModel[] {
  const { formatCurrency } = options
  const weekLabels = ["W1", "W2", "W3", "W4", "W5"]
  const allDailyBalances = [...base.dailyBalanceMap.values()]
  const lowBalanceCut = percentile(allDailyBalances, 0.33)
  const highBalanceCut = percentile(allDailyBalances, 0.66)

  const incomeDayCount = base.recentMonthKeys.map((monthKey) => [toMonthLabel(monthKey), new Set(base.incomeTransactions.filter((transaction) => transaction.monthKey === monthKey).map((transaction) => transaction.dateKey)).size] as [string, number])
  const spendDayCount = base.recentMonthKeys.map((monthKey) => [toMonthLabel(monthKey), (base.monthActiveExpenseDays.get(monthKey) ?? new Set()).size] as [string, number])
  const groceryTripCount = base.recentMonthKeys.map((monthKey) => [toMonthLabel(monthKey), base.baskets.filter((basket) => basket.monthKey === monthKey).length] as [string, number])
  const groceryDayCount = base.recentMonthKeys.map((monthKey) => [toMonthLabel(monthKey), new Set(base.baskets.filter((basket) => basket.monthKey === monthKey).map((basket) => basket.dateKey)).size] as [string, number])
  const biggestExpenseShare = base.recentMonthKeys.map((monthKey) => {
    const biggest = Math.max(0, ...base.expenseTransactions.filter((transaction) => transaction.monthKey === monthKey).map((transaction) => transaction.absAmount))
    const spend = base.monthExpenseTotals.get(monthKey) ?? 0
    return [toMonthLabel(monthKey), spend ? (biggest / spend) * 100 : 0] as [string, number]
  })
  const prePostIncomeSpend = base.recentMonthKeys.map((monthKey) => {
    const firstIncomeDate = [...new Set(base.incomeTransactions.filter((transaction) => transaction.monthKey === monthKey).map((transaction) => transaction.dateKey))].sort()[0]
    const before = sum(base.expenseTransactions.filter((transaction) => transaction.monthKey === monthKey && (!firstIncomeDate || transaction.dateKey < firstIncomeDate)).map((transaction) => transaction.absAmount))
    const after = sum(base.expenseTransactions.filter((transaction) => transaction.monthKey === monthKey && (!firstIncomeDate || transaction.dateKey >= firstIncomeDate)).map((transaction) => transaction.absAmount))
    return { label: toMonthLabel(monthKey), before, after }
  })
  const incomeSpan = base.recentMonthKeys.map((monthKey) => {
    const dates = [...new Set(base.incomeTransactions.filter((transaction) => transaction.monthKey === monthKey).map((transaction) => Number(transaction.dateKey.slice(8, 10))))].sort((a, b) => a - b)
    return { label: toMonthLabel(monthKey), start: dates[0] ?? 0, end: dates.at(-1) ?? 0 }
  })
  const expenseSpan = base.recentMonthKeys.map((monthKey) => {
    const dates = [...new Set(base.expenseTransactions.filter((transaction) => transaction.monthKey === monthKey).map((transaction) => Number(transaction.dateKey.slice(8, 10))))].sort((a, b) => a - b)
    return { label: toMonthLabel(monthKey), start: dates[0] ?? 0, end: dates.at(-1) ?? 0 }
  })
  const expenseDayBalanceBoxes = base.recentMonthKeys.map((monthKey) => {
    const balances = [...new Set(base.expenseTransactions.filter((transaction) => transaction.monthKey === monthKey).map((transaction) => transaction.dateKey))].map((dayKey) => base.dailyBalanceMap.get(dayKey) ?? 0)
    return { label: toMonthLabel(monthKey), ...boxStats(balances) }
  })
  const groceryDayShareItems = base.recentMonthKeys.map((monthKey, index) => {
    const spendDays = spendDayCount[index]?.[1] ?? 0
    const groceryDays = groceryDayCount[index]?.[1] ?? 0
    return { label: toMonthLabel(monthKey), value: spendDays ? (groceryDays / spendDays) * 100 : 0, target: 35, max: 100 }
  })
  const grocerySpendOnIncomeDay = base.recentMonthKeys.map((monthKey) => {
    const incomeDays = new Set(base.incomeTransactions.filter((transaction) => transaction.monthKey === monthKey).map((transaction) => transaction.dateKey))
    const onIncomeDays = sum(base.baskets.filter((basket) => basket.monthKey === monthKey && incomeDays.has(basket.dateKey)).map((basket) => basket.spend))
    const offIncomeDays = sum(base.baskets.filter((basket) => basket.monthKey === monthKey && !incomeDays.has(basket.dateKey)).map((basket) => basket.spend))
    return { label: toMonthLabel(monthKey), start: onIncomeDays, end: offIncomeDays }
  })
  const tripsBeforeAfterIncome = base.recentMonthKeys.map((monthKey) => {
    const firstIncomeDate = [...new Set(base.incomeTransactions.filter((transaction) => transaction.monthKey === monthKey).map((transaction) => transaction.dateKey))].sort()[0]
    const before = base.baskets.filter((basket) => basket.monthKey === monthKey && (!firstIncomeDate || basket.dateKey < firstIncomeDate)).length
    const after = base.baskets.filter((basket) => basket.monthKey === monthKey && (!firstIncomeDate || basket.dateKey >= firstIncomeDate)).length
    return { label: toMonthLabel(monthKey), values: [{ key: "Before", value: before }, { key: "After", value: after }] }
  })
  const fingerprintLines = base.recentMonthKeys.slice(-6).map((monthKey, index) => ({
    label: toMonthLabel(monthKey),
    values: [
      incomeDayCount.find(([label]) => label === toMonthLabel(monthKey))?.[1] ?? 0,
      spendDayCount.find(([label]) => label === toMonthLabel(monthKey))?.[1] ?? 0,
      groceryTripCount.find(([label]) => label === toMonthLabel(monthKey))?.[1] ?? 0,
      biggestExpenseShare.find(([label]) => label === toMonthLabel(monthKey))?.[1] ?? 0,
    ],
  }))
  const latestMonthKey = base.recentMonthKeys.at(-1) ?? ""
  const [year, month] = latestMonthKey.split("-").map(Number)
  const daysInLatestMonth = latestMonthKey ? new Date(Date.UTC(year, month, 0)).getUTCDate() : 0
  const activeDaysLatest = new Set(base.transactions.filter((transaction) => transaction.monthKey === latestMonthKey).map((transaction) => transaction.dateKey))
  const spendDaysLatest = new Set(base.expenseTransactions.filter((transaction) => transaction.monthKey === latestMonthKey).map((transaction) => transaction.dateKey))
  const groceryDaysLatest = new Set(base.baskets.filter((basket) => basket.monthKey === latestMonthKey).map((basket) => basket.dateKey))
  const firstIncomeLatest = [...new Set(base.incomeTransactions.filter((transaction) => transaction.monthKey === latestMonthKey).map((transaction) => transaction.dateKey))].sort()[0]
  const groceryBeforeIncomeLatest = base.baskets.filter((basket) => basket.monthKey === latestMonthKey && (!firstIncomeLatest || basket.dateKey < firstIncomeLatest)).length
  const expenseBalanceZones = base.recentMonthKeys.map((monthKey) => {
    const dayKeys = [...new Set(base.expenseTransactions.filter((transaction) => transaction.monthKey === monthKey).map((transaction) => transaction.dateKey))]
    let low = 0
    let mid = 0
    let high = 0
    for (const dayKey of dayKeys) {
      const balance = base.dailyBalanceMap.get(dayKey) ?? 0
      if (balance <= lowBalanceCut) low += 1
      else if (balance >= highBalanceCut) high += 1
      else mid += 1
    }
    return { label: toMonthLabel(monthKey), segments: [{ key: "Low", value: low }, { key: "Mid", value: mid }, { key: "High", value: high }] }
  })
  const groceryVsOtherExpenseDays = base.recentMonthKeys.map((monthKey, index) => {
    const groceryDays = new Set(base.baskets.filter((basket) => basket.monthKey === monthKey).map((basket) => basket.dateKey))
    const spendDays = new Set(base.expenseTransactions.filter((transaction) => transaction.monthKey === monthKey).map((transaction) => transaction.dateKey))
    const otherOnly = [...spendDays].filter((dayKey) => !groceryDays.has(dayKey)).length
    return { label: toMonthLabel(monthKey), values: [{ key: "Grocery", value: groceryDays.size }, { key: "Other", value: otherOnly }] }
  })
  const expenseTicketBoxes = base.recentMonthKeys.map((monthKey) => {
    const values = base.expenseTransactions.filter((transaction) => transaction.monthKey === monthKey).map((transaction) => transaction.absAmount)
    return { label: toMonthLabel(monthKey), ...boxStats(values) }
  })
  const latestWeekSpendTreemap = weekLabels.map((label, index) => {
    const week = index + 1
    const value = sum(base.expenseTransactions.filter((transaction) => transaction.monthKey === latestMonthKey && transaction.weekOfMonth === week).map((transaction) => transaction.absAmount))
    return { label, value }
  })
  const expenseDayDensity = base.recentMonthKeys.map((monthKey, index) => {
    const txCount = base.expenseTransactions.filter((transaction) => transaction.monthKey === monthKey).length
    const dayCount = spendDayCount[index]?.[1] ?? 0
    return { label: toMonthLabel(monthKey), value: dayCount ? txCount / dayCount : 0, max: 6 }
  })
  const incomeGapDots = base.recentMonthKeys.map((monthKey) => {
    const dates = [...new Set(base.incomeTransactions.filter((transaction) => transaction.monthKey === monthKey).map((transaction) => transaction.dateKey))].sort()
    const gaps = dates.slice(1).map((dateKey, index) => (parseIsoDate(dateKey).getTime() - parseIsoDate(dates[index]).getTime()) / 86400000)
    return { label: toMonthLabel(monthKey), value: mean(gaps), reference: 7 }
  }).sort((a, b) => b.value - a.value)
  const incomeDaysLatest = new Set(base.incomeTransactions.filter((transaction) => transaction.monthKey === latestMonthKey).map((transaction) => transaction.dateKey))
  const spendOnlyLatest = [...spendDaysLatest].filter((dayKey) => !groceryDaysLatest.has(dayKey)).length
  const incomeOnlyLatest = [...incomeDaysLatest].filter((dayKey) => !spendDaysLatest.has(dayKey)).length
  const groceryLatest = groceryDaysLatest.size
  const mixedLatest = Math.max(0, activeDaysLatest.size - groceryLatest - spendOnlyLatest - incomeOnlyLatest)

  return [
    { id: "diverse-analytics-income-vs-spend-days", title: "Income Days vs Spend Days", eyebrow: "Month Rhythm", question: "Does each month contain more days with income activity or more days with expense activity?", insight: "This is a very readable split view of whether money enters in bursts but exits constantly.", metricLabel: "Latest split", metricValue: `${incomeDayCount.at(-1)?.[1] ?? 0} / ${spendDayCount.at(-1)?.[1] ?? 0} days`, tags: ["Split", "Days"], visual: { kind: "splitBars", items: base.recentMonthKeys.map((monthKey, index) => ({ label: toMonthLabel(monthKey), left: incomeDayCount[index]?.[1] ?? 0, right: spendDayCount[index]?.[1] ?? 0 })) , formatter: "number" } },
    { id: "diverse-analytics-pre-vs-post-income-spend", title: "Pre-Income vs Post-Income Spend Share", eyebrow: "Month Start Pressure", question: "How much of monthly spending happens before the first income date versus after it?", insight: "This makes month-start pressure visible without relying on a single balance number.", metricLabel: "Latest pre-income share", metricValue: formatPercent(((prePostIncomeSpend.at(-1)?.before ?? 0) / Math.max(1, (prePostIncomeSpend.at(-1)?.before ?? 0) + (prePostIncomeSpend.at(-1)?.after ?? 0))) * 100), tags: ["Stacked", "Pressure"], visual: { kind: "stackedBars", keys: ["Before", "After"], items: prePostIncomeSpend.map((entry) => ({ label: entry.label, segments: [{ key: "Before", value: entry.before }, { key: "After", value: entry.after }] })), formatter: "currency" } },
    { id: "diverse-analytics-income-span", title: "Income Span Inside Month", eyebrow: "Timing Window", question: "How much of the month is covered by the span between the first and last income day?", insight: "This helps users see whether income is compressed into one moment or spread through the month.", metricLabel: "Latest income span", metricValue: `${round((incomeSpan.at(-1)?.end ?? 0) - (incomeSpan.at(-1)?.start ?? 0), 0)} days`, tags: ["Range", "Income"], visual: { kind: "rangePlot", items: incomeSpan, formatter: "number" } },
    { id: "diverse-analytics-expense-span", title: "Expense Span Inside Month", eyebrow: "Timing Window", question: "How much of the month is covered by the span between the first and last expense day?", insight: "This shows whether spending is concentrated in a short burst or spread across nearly the whole month.", metricLabel: "Latest expense span", metricValue: `${round((expenseSpan.at(-1)?.end ?? 0) - (expenseSpan.at(-1)?.start ?? 0), 0)} days`, tags: ["Range", "Expenses"], visual: { kind: "rangePlot", items: expenseSpan, formatter: "number" } },
    { id: "diverse-analytics-expense-day-balance-distribution", title: "Expense-Day Balance Distribution", eyebrow: "Balance Context", question: "What balance range do expense days usually happen at?", insight: "This is a medium-level chart that turns spending into a balance-context question instead of only a spend-total question.", metricLabel: "Latest median expense-day balance", metricValue: formatCurrency(expenseDayBalanceBoxes.at(-1)?.median ?? 0, { maximumFractionDigits: 0 }), tags: ["Boxplot", "Balance"], visual: { kind: "boxplot", items: expenseDayBalanceBoxes, formatter: "currency" } },
    { id: "diverse-analytics-grocery-day-share", title: "Grocery-Day Share of Spend Days", eyebrow: "Cross-Signal", question: "What share of monthly spend days includes grocery activity?", insight: "This answers how often groceries are participating in the month’s active spending pattern.", metricLabel: "Latest grocery-day share", metricValue: formatPercent(groceryDayShareItems.at(-1)?.value ?? 0), tags: ["Bullet", "Groceries"], visual: { kind: "bullet", items: groceryDayShareItems, formatter: "percent" } },
    { id: "diverse-analytics-grocery-on-income-days", title: "Grocery Spend on Income Days vs Other Days", eyebrow: "Cross-Signal", question: "Does grocery spending tend to land on income days or away from them?", insight: "This shows whether grocery behavior clusters around funding moments.", metricLabel: "Latest shift", metricValue: formatCurrency((grocerySpendOnIncomeDay.at(-1)?.end ?? 0) - (grocerySpendOnIncomeDay.at(-1)?.start ?? 0), { maximumFractionDigits: 0, showSign: true }), tags: ["Arrow", "Groceries"], visual: { kind: "arrowPlot", items: grocerySpendOnIncomeDay, formatter: "currency" } },
    { id: "diverse-analytics-trips-before-after-income", title: "Grocery Trips Before vs After First Income", eyebrow: "Cross-Signal", question: "How many grocery trips happen before the first income date versus after it?", insight: "This is a clean behavioral bridge between receipts and transaction timing.", metricLabel: "Latest pre-income trips", metricValue: `${tripsBeforeAfterIncome.at(-1)?.values[0]?.value ?? 0} trips`, tags: ["Grouped", "Groceries"], visual: { kind: "groupedBars", keys: ["Before", "After"], groups: tripsBeforeAfterIncome, formatter: "number" } },
    { id: "diverse-analytics-month-fingerprint", title: "Monthly Money Fingerprint", eyebrow: "Month Shape", question: "How do recent months compare when income days, spend days, grocery trips, and biggest-expense share are viewed together?", insight: "Parallel coordinates make month shape easier to compare when one metric alone is not enough.", metricLabel: "Months compared", metricValue: `${fingerprintLines.length} months`, tags: ["Parallel", "Fingerprint"], visual: { kind: "parallel", axes: ["Income Days", "Spend Days", "Grocery Trips", "Big Expense %"], lines: fingerprintLines } },
    { id: "diverse-analytics-activity-funnel", title: "Monthly Activity Funnel", eyebrow: "Activity Structure", question: "How does the latest month narrow from total calendar days to active, spend, grocery, and early-grocery days?", insight: "This is an easy funnel for understanding how much of the month is actually financially active.", metricLabel: "Latest month days", metricValue: `${daysInLatestMonth} days`, tags: ["Funnel", "Month"], visual: { kind: "funnel", steps: [{ label: "Month days", value: daysInLatestMonth }, { label: "Transaction days", value: activeDaysLatest.size }, { label: "Spend days", value: spendDaysLatest.size }, { label: "Grocery days", value: groceryDaysLatest.size }, { label: "Grocery before income", value: groceryBeforeIncomeLatest }], formatter: "number" } },
    { id: "diverse-analytics-balance-zones-on-spend-days", title: "Balance Zones on Spend Days", eyebrow: "Balance Context", question: "When spending happens, how often does it happen in low, mid, or high balance territory?", insight: "This shows whether activity tends to happen while balances are healthy or already under pressure.", metricLabel: "Latest low-zone days", metricValue: `${expenseBalanceZones.at(-1)?.segments[0]?.value ?? 0} days`, tags: ["Stacked", "Balance"], visual: { kind: "stackedBars", keys: ["Low", "Mid", "High"], items: expenseBalanceZones, formatter: "number" } },
    { id: "diverse-analytics-grocery-vs-other-expense-days", title: "Grocery vs Other Expense Days", eyebrow: "Cross-Signal", question: "Across spend days, how many belong to grocery activity versus other expense activity only?", insight: "This is an easy count-based way to see how much groceries shape the month’s activity footprint.", metricLabel: "Latest grocery days", metricValue: `${groceryVsOtherExpenseDays.at(-1)?.values[0]?.value ?? 0} days`, tags: ["Grouped", "Days"], visual: { kind: "groupedBars", keys: ["Grocery", "Other"], groups: groceryVsOtherExpenseDays, formatter: "number" } },
    { id: "diverse-analytics-expense-ticket-distribution", title: "Expense Ticket Distribution", eyebrow: "Spend Spread", question: "How wide is the monthly spread between small, typical, and very large expense transactions?", insight: "Boxplots are useful here because the shape of expense sizes matters more than a single average.", metricLabel: "Latest median expense", metricValue: formatCurrency(expenseTicketBoxes.at(-1)?.median ?? 0, { maximumFractionDigits: 0 }), tags: ["Boxplot", "Expenses"], visual: { kind: "boxplot", items: expenseTicketBoxes, formatter: "currency" } },
    { id: "diverse-analytics-week-spend-treemap", title: "Latest Month Spend by Week", eyebrow: "Month Shape", question: "Which week of the latest month consumed the most spending weight?", insight: "A treemap turns week-of-month share into something immediately scannable.", metricLabel: "Largest week", metricValue: formatCurrency(Math.max(...latestWeekSpendTreemap.map((item) => item.value), 0), { maximumFractionDigits: 0 }), tags: ["Treemap", "Weeks"], visual: { kind: "treemap", items: latestWeekSpendTreemap, formatter: "currency" } },
    { id: "diverse-analytics-expense-day-density", title: "Expense-Day Density", eyebrow: "Activity Density", question: "When spending days happen, how crowded with transactions are they?", insight: "This separates calm spend days from chaotic ones without needing category detail.", metricLabel: "Latest tx per spend day", metricValue: `${round(expenseDayDensity.at(-1)?.value ?? 0, 1)} tx/day`, tags: ["Pictorial", "Density"], visual: { kind: "pictorialBar", items: expenseDayDensity, formatter: "number" } },
    { id: "diverse-analytics-income-gap-ranking", title: "Income Gap Ranking", eyebrow: "Income Rhythm", question: "Which months have the longest average gap between income days?", insight: "A ranked dot plot makes timing irregularity easier to compare than a month-by-month line.", metricLabel: "Longest average gap", metricValue: `${round(incomeGapDots[0]?.value ?? 0, 1)} days`, tags: ["Dot Plot", "Income"], visual: { kind: "dotPlot", items: incomeGapDots, formatter: "number" } },
    { id: "diverse-analytics-day-flow", title: "Latest Month Day Flow", eyebrow: "Activity Flow", question: "How do calendar days in the latest month split into quiet days, grocery days, spend-only days, income-only days, and mixed days?", insight: "This is a simple sankey that treats the month like a finite pool of day-slots.", metricLabel: "Active days", metricValue: `${activeDaysLatest.size} days`, tags: ["Sankey", "Days"], visual: { kind: "sankey", nodes: [{ id: "all", label: "All days", column: 0 }, { id: "active", label: "Active", column: 1 }, { id: "quiet", label: "Quiet", column: 1 }, { id: "grocery", label: "Grocery", column: 2 }, { id: "mixed", label: "Mixed", column: 2 }, { id: "spend", label: "Spend only", column: 2 }, { id: "income", label: "Income only", column: 2 }], links: [{ source: "all", target: "active", value: activeDaysLatest.size }, { source: "all", target: "quiet", value: Math.max(0, daysInLatestMonth - activeDaysLatest.size) }, { source: "active", target: "grocery", value: groceryLatest }, { source: "active", target: "mixed", value: mixedLatest }, { source: "active", target: "spend", value: spendOnlyLatest }, { source: "active", target: "income", value: incomeOnlyLatest }], formatter: "number" } },
  ]
}

function buildDiverseFridgeCards(base: BaseData, options: BuildOptions): PlaygroundCardModel[] {
  const { formatCurrency } = options
  const weekLabels = ["W1", "W2", "W3", "W4", "W5"]
  const topStores = topEntries(
    new Map([...new Set(base.baskets.map((basket) => basket.store))].map((store) => [store, base.baskets.filter((basket) => basket.store === store).length])),
    5,
  ).map(([store]) => store)
  const recentTopStores = topStores.length ? topStores : ["unknown store"]
  const latestMonthKey = base.recentMonthKeys.at(-1) ?? ""
  const storeReceiptRange = recentTopStores.map((store) => {
    const values = base.baskets.filter((basket) => basket.store === store).map((basket) => basket.spend)
    return { label: store.slice(0, 12), start: Math.min(...values, 0), end: Math.max(...values, 0), marker: median(values) }
  })
  const storeReceiptBoxes = recentTopStores.map((store) => ({ label: store.slice(0, 12), ...boxStats(base.baskets.filter((basket) => basket.store === store).map((basket) => basket.spend)) }))
  const unitPriceBoxes = recentTopStores.map((store) => ({ label: store.slice(0, 12), ...boxStats(base.receiptLines.filter((line) => line.store === store).map((line) => line.pricePerUnit)) }))
  const latestReceipts = base.baskets.filter((basket) => basket.monthKey === latestMonthKey)
  const receiptScatter = latestReceipts.slice(0, 24).map((basket) => ({ label: basket.store.slice(0, 12), x: basket.lines.length, y: basket.spend }))
  const singleVsMulti = base.recentMonthKeys.map((monthKey) => {
    const monthBaskets = base.baskets.filter((basket) => basket.monthKey === monthKey)
    const single = monthBaskets.filter((basket) => basket.uniqueItems <= 1).length
    return { label: toMonthLabel(monthKey), left: single, right: Math.max(0, monthBaskets.length - single) }
  })
  const multiStoreShare = base.recentMonthKeys.map((monthKey) => {
    const dayStores = new Map<string, Set<string>>()
    for (const basket of base.baskets.filter((entry) => entry.monthKey === monthKey)) {
      const stores = dayStores.get(basket.dateKey) ?? new Set<string>()
      stores.add(basket.store)
      dayStores.set(basket.dateKey, stores)
    }
    const groceryDays = dayStores.size
    const multiStoreDays = [...dayStores.values()].filter((stores) => stores.size > 1).length
    return { label: toMonthLabel(monthKey), value: groceryDays ? (multiStoreDays / groceryDays) * 100 : 0, target: 15, max: 100 }
  })
  const storeIncomeSplit = recentTopStores.map((store) => {
    const incomeDays = new Set(base.incomeTransactions.map((transaction) => transaction.dateKey))
    const incomeSpend = sum(base.baskets.filter((basket) => basket.store === store && incomeDays.has(basket.dateKey)).map((basket) => basket.spend))
    const otherSpend = sum(base.baskets.filter((basket) => basket.store === store && !incomeDays.has(basket.dateKey)).map((basket) => basket.spend))
    return { label: store.slice(0, 12), segments: [{ key: "Income day", value: incomeSpend }, { key: "Other day", value: otherSpend }] }
  })
  const complexityFunnel = [
    { label: "Receipts", value: latestReceipts.length },
    { label: "3+ lines", value: latestReceipts.filter((basket) => basket.lines.length >= 3).length },
    { label: "5+ lines", value: latestReceipts.filter((basket) => basket.lines.length >= 5).length },
    { label: "8+ lines", value: latestReceipts.filter((basket) => basket.lines.length >= 8).length },
    { label: "12+ lines", value: latestReceipts.filter((basket) => basket.lines.length >= 12).length },
  ]
  const storeTimingSunburst = recentTopStores.slice(0, 4).map((store) => {
    const firstHalf = sum(base.baskets.filter((basket) => basket.store === store && Number(basket.dateKey.slice(8, 10)) <= 15).map((basket) => basket.spend))
    const secondHalf = sum(base.baskets.filter((basket) => basket.store === store && Number(basket.dateKey.slice(8, 10)) >= 16).map((basket) => basket.spend))
    return { label: store.slice(0, 12), value: firstHalf + secondHalf, children: [{ label: "First half", value: firstHalf }, { label: "Second half", value: secondHalf }] }
  })
  const latestStoreSpendTreemap = recentTopStores.map((store) => ({ label: store.slice(0, 12), value: sum(base.baskets.filter((basket) => basket.monthKey === latestMonthKey && basket.store === store).map((basket) => basket.spend)) }))
  const firstHalfSecondHalfStore = recentTopStores.map((store) => ({
    label: store.slice(0, 12),
    values: [
      { key: "First half", value: sum(base.baskets.filter((basket) => basket.store === store && Number(basket.dateKey.slice(8, 10)) <= 15).map((basket) => basket.spend)) },
      { key: "Second half", value: sum(base.baskets.filter((basket) => basket.store === store && Number(basket.dateKey.slice(8, 10)) >= 16).map((basket) => basket.spend)) },
    ],
  }))
  const tripGapBoxes = base.recentMonthKeys.map((monthKey) => {
    const dates = [...new Set(base.baskets.filter((basket) => basket.monthKey === monthKey).map((basket) => basket.dateKey))].sort()
    const gaps = dates.slice(1).map((dateKey, index) => (parseIsoDate(dateKey).getTime() - parseIsoDate(dates[index]).getTime()) / 86400000)
    return { label: toMonthLabel(monthKey), ...boxStats(gaps) }
  })
  const incomeDayAvgReceipt = base.recentMonthKeys.map((monthKey) => {
    const incomeDays = new Set(base.incomeTransactions.filter((transaction) => transaction.monthKey === monthKey).map((transaction) => transaction.dateKey))
    const onIncome = mean(base.baskets.filter((basket) => basket.monthKey === monthKey && incomeDays.has(basket.dateKey)).map((basket) => basket.spend))
    const offIncome = mean(base.baskets.filter((basket) => basket.monthKey === monthKey && !incomeDays.has(basket.dateKey)).map((basket) => basket.spend))
    return { label: toMonthLabel(monthKey), start: onIncome, end: offIncome }
  })
  const tripsIncomeVsOther = base.recentMonthKeys.map((monthKey) => {
    const incomeDays = new Set(base.incomeTransactions.filter((transaction) => transaction.monthKey === monthKey).map((transaction) => transaction.dateKey))
    const onIncome = base.baskets.filter((basket) => basket.monthKey === monthKey && incomeDays.has(basket.dateKey)).length
    const offIncome = base.baskets.filter((basket) => basket.monthKey === monthKey && !incomeDays.has(basket.dateKey)).length
    return { label: toMonthLabel(monthKey), left: onIncome, right: offIncome }
  })
  const repeatShareByStore = recentTopStores.map((store) => {
    const storeLines = base.receiptLines.filter((line) => line.store === store)
    const itemCounts = new Map<string, number>()
    for (const line of storeLines) itemCounts.set(line.item, (itemCounts.get(line.item) ?? 0) + 1)
    const repeated = storeLines.filter((line) => (itemCounts.get(line.item) ?? 0) >= 2).length
    return { label: store.slice(0, 12), values: [{ key: "Repeat share", value: storeLines.length ? (repeated / storeLines.length) * 100 : 0 }] }
  })
  const storeReceiptDensity = recentTopStores.map((store) => {
    const months = new Set(base.baskets.filter((basket) => basket.store === store).map((basket) => basket.monthKey)).size
    const receipts = base.baskets.filter((basket) => basket.store === store).length
    return { label: store.slice(0, 12), value: receipts / Math.max(1, months), max: 10 }
  })
  const latestMonthReceipts = base.baskets.filter((basket) => basket.monthKey === latestMonthKey)
  const incomeDaySetLatest = new Set(base.incomeTransactions.filter((transaction) => transaction.monthKey === latestMonthKey).map((transaction) => transaction.dateKey))
  const singleIncomeReceipts = latestMonthReceipts.filter((basket) => basket.uniqueItems <= 1 && incomeDaySetLatest.has(basket.dateKey)).length
  const singleOtherReceipts = latestMonthReceipts.filter((basket) => basket.uniqueItems <= 1 && !incomeDaySetLatest.has(basket.dateKey)).length
  const multiIncomeReceipts = latestMonthReceipts.filter((basket) => basket.uniqueItems > 1 && incomeDaySetLatest.has(basket.dateKey)).length
  const multiOtherReceipts = latestMonthReceipts.filter((basket) => basket.uniqueItems > 1 && !incomeDaySetLatest.has(basket.dateKey)).length
  return [
    { id: "diverse-fridge-store-receipt-range", title: "Store Receipt Range", eyebrow: "Store Benchmark", question: "How wide is the receipt-total range at the stores used most often?", insight: "A range plot makes each store’s cheap-to-expensive trip window easy to compare.", metricLabel: "Top store median", metricValue: formatCurrency(storeReceiptRange[0]?.marker ?? 0, { maximumFractionDigits: 0 }), tags: ["Range", "Stores"], visual: { kind: "rangePlot", items: storeReceiptRange, formatter: "currency" } },
    { id: "diverse-fridge-store-receipt-distribution", title: "Store Receipt Distribution", eyebrow: "Store Benchmark", question: "Which frequent stores have tight receipt totals and which ones are more volatile?", insight: "This is more useful than just a simple average because it reveals how predictable each store feels.", metricLabel: "Top store median", metricValue: formatCurrency(storeReceiptBoxes[0]?.median ?? 0, { maximumFractionDigits: 0 }), tags: ["Boxplot", "Stores"], visual: { kind: "boxplot", items: storeReceiptBoxes, formatter: "currency" } },
    { id: "diverse-fridge-unit-price-distribution", title: "Unit Price Distribution by Store", eyebrow: "Store Benchmark", question: "How do unit-price spreads differ between the stores visited most often?", insight: "This turns pricing into a distribution question instead of just a single index.", metricLabel: "Top store median unit", metricValue: formatCurrency(unitPriceBoxes[0]?.median ?? 0, { maximumFractionDigits: 2 }), tags: ["Boxplot", "Pricing"], visual: { kind: "boxplot", items: unitPriceBoxes, formatter: "currency" } },
    { id: "diverse-fridge-receipt-lines-vs-total", title: "Receipt Lines vs Receipt Total", eyebrow: "Receipt Shape", question: "Do more line items reliably lead to higher grocery receipts in the latest month?", insight: "This is an easy scatter because both axes are household-native concepts.", metricLabel: "Latest receipts", metricValue: `${receiptScatter.length} receipts`, tags: ["Scatter", "Receipts"], visual: { kind: "scatter", points: receiptScatter, xLabel: "Receipt lines", yLabel: "Receipt total" } },
    { id: "diverse-fridge-single-vs-multi-item-share", title: "Single-Item vs Multi-Item Receipt Share", eyebrow: "Quick Runs", question: "How much of monthly receipt activity comes from one-item runs versus fuller baskets?", insight: "This is a clear split between true quick stops and broader shopping trips.", metricLabel: "Latest single-item receipts", metricValue: `${singleVsMulti.at(-1)?.left ?? 0} receipts`, tags: ["Split", "Receipts"], visual: { kind: "splitBars", items: singleVsMulti, formatter: "number" } },
    { id: "diverse-fridge-multi-store-day-share", title: "Same-Day Multi-Store Share", eyebrow: "Store Hopping", question: "How often does one grocery day include more than one store?", insight: "This is a simple but revealing chart for how fragmented grocery runs are.", metricLabel: "Latest multi-store share", metricValue: formatPercent(multiStoreShare.at(-1)?.value ?? 0), tags: ["Bullet", "Stores"], visual: { kind: "bullet", items: multiStoreShare, formatter: "percent" } },
    { id: "diverse-fridge-income-day-store-spend", title: "Income-Day vs Other-Day Grocery Spend by Store", eyebrow: "Cross-Signal", question: "Which frequent stores capture more grocery spend on income days versus other days?", insight: "This shows where paycheck-timed shopping actually lands.", metricLabel: "Stores compared", metricValue: `${storeIncomeSplit.length} stores`, tags: ["Stacked", "Income"], visual: { kind: "stackedBars", keys: ["Income day", "Other day"], items: storeIncomeSplit, formatter: "currency" } },
    { id: "diverse-fridge-receipt-complexity-funnel", title: "Receipt Complexity Funnel", eyebrow: "Receipt Shape", question: "How quickly does the latest month thin out as receipts move from simple to more complex?", insight: "This is an easy funnel for understanding how common bigger, denser receipts really are.", metricLabel: "Latest receipts", metricValue: `${latestReceipts.length} receipts`, tags: ["Funnel", "Receipts"], visual: { kind: "funnel", steps: complexityFunnel, formatter: "number" } },
    { id: "diverse-fridge-store-timing-sunburst", title: "Store Timing Sunburst", eyebrow: "Store Pattern", question: "Which frequent stores pull grocery spend into the first half versus the second half of the month?", insight: "Sunburst works well here because timing sits inside store behavior.", metricLabel: "Stores mapped", metricValue: `${storeTimingSunburst.length} stores`, tags: ["Sunburst", "Timing"], visual: { kind: "sunburst", nodes: storeTimingSunburst, formatter: "currency" } },
    { id: "diverse-fridge-store-spend-treemap", title: "Latest Month Store Spend Treemap", eyebrow: "Store Weight", question: "How much of the latest month’s grocery cost is carried by each usual store?", insight: "Treemap gives a fast visual read on where the money concentrated.", metricLabel: "Largest store spend", metricValue: formatCurrency(Math.max(...latestStoreSpendTreemap.map((item) => item.value), 0), { maximumFractionDigits: 0 }), tags: ["Treemap", "Stores"], visual: { kind: "treemap", items: latestStoreSpendTreemap, formatter: "currency" } },
    { id: "diverse-fridge-half-month-store-spend", title: "First-Half vs Second-Half Grocery Spend by Store", eyebrow: "Month Timing", question: "Which stores are used early in the month and which ones show up later?", insight: "This creates a more useful store ranking by adding timing to spend.", metricLabel: "Stores compared", metricValue: `${firstHalfSecondHalfStore.length} stores`, tags: ["Grouped", "Timing"], visual: { kind: "groupedBars", keys: ["First half", "Second half"], groups: firstHalfSecondHalfStore, formatter: "currency" } },
    { id: "diverse-fridge-trip-gap-distribution", title: "Trip Gap Distribution", eyebrow: "Shopping Rhythm", question: "How variable is the number of days between grocery trips each month?", insight: "This is more revealing than an average gap because the spread tells whether routines are consistent.", metricLabel: "Latest median gap", metricValue: `${round(tripGapBoxes.at(-1)?.median ?? 0, 1)} days`, tags: ["Boxplot", "Cadence"], visual: { kind: "boxplot", items: tripGapBoxes, formatter: "number" } },
    { id: "diverse-fridge-income-day-average-receipt", title: "Income-Day vs Other-Day Average Receipt", eyebrow: "Cross-Signal", question: "Are receipts larger on income days or away from them?", insight: "This is an easy arrow chart for whether grocery receipts inflate around funding moments.", metricLabel: "Latest shift", metricValue: formatCurrency((incomeDayAvgReceipt.at(-1)?.end ?? 0) - (incomeDayAvgReceipt.at(-1)?.start ?? 0), { maximumFractionDigits: 0, showSign: true }), tags: ["Arrow", "Receipts"], visual: { kind: "arrowPlot", items: incomeDayAvgReceipt, formatter: "currency" } },
    { id: "diverse-fridge-trips-on-income-days", title: "Grocery Trips on Income Days vs Other Days", eyebrow: "Cross-Signal", question: "How much grocery trip volume lands on income days versus other days?", insight: "This is a clean way to see whether grocery activity clusters around deposits or not.", metricLabel: "Latest income-day trips", metricValue: `${tripsIncomeVsOther.at(-1)?.left ?? 0} trips`, tags: ["Split", "Income"], visual: { kind: "splitBars", items: tripsIncomeVsOther, formatter: "number" } },
    { id: "diverse-fridge-repeat-share-by-store", title: "Repeat-Item Share by Store", eyebrow: "Routine Mix", question: "Which frequent stores carry more repeat-item behavior versus one-off buying?", insight: "This shifts repeat-item analysis from the month level down to the store level.", metricLabel: "Stores compared", metricValue: `${repeatShareByStore.length} stores`, tags: ["Grouped", "Repeat"], visual: { kind: "groupedBars", keys: ["Repeat share"], groups: repeatShareByStore, formatter: "percent" } },
    { id: "diverse-fridge-store-receipt-density", title: "Store Receipt Density", eyebrow: "Store Habit", question: "When a store is active, how many receipts per month does it usually attract?", insight: "Pictorial bars keep this simple and easier to scan than a raw table.", metricLabel: "Top store density", metricValue: `${round(storeReceiptDensity[0]?.value ?? 0, 1)} receipts/month`, tags: ["Pictorial", "Stores"], visual: { kind: "pictorialBar", items: storeReceiptDensity, formatter: "number" } },
    { id: "diverse-fridge-receipt-flow", title: "Latest Month Receipt Flow", eyebrow: "Receipt Structure", question: "How do latest-month receipts split from single-item versus multi-item into income-day versus other-day shopping?", insight: "This sankey gives one compact structure for the latest month’s grocery receipt flow.", metricLabel: "Latest receipts", metricValue: `${latestMonthReceipts.length} receipts`, tags: ["Sankey", "Receipts"], visual: { kind: "sankey", nodes: [{ id: "receipts", label: "Receipts", column: 0 }, { id: "single", label: "Single item", column: 1 }, { id: "multi", label: "Multi item", column: 1 }, { id: "single-income", label: "Single on income day", column: 2 }, { id: "single-other", label: "Single on other day", column: 2 }, { id: "multi-income", label: "Multi on income day", column: 2 }, { id: "multi-other", label: "Multi on other day", column: 2 }], links: [{ source: "receipts", target: "single", value: singleIncomeReceipts + singleOtherReceipts }, { source: "receipts", target: "multi", value: multiIncomeReceipts + multiOtherReceipts }, { source: "single", target: "single-income", value: singleIncomeReceipts }, { source: "single", target: "single-other", value: singleOtherReceipts }, { source: "multi", target: "multi-income", value: multiIncomeReceipts }, { source: "multi", target: "multi-other", value: multiOtherReceipts }], formatter: "number" } },
  ]
}

function buildDiverseSavingsCards(base: BaseData, options: BuildOptions): PlaygroundCardModel[] {
  const { formatCurrency } = options
  const weekLabels = ["W1", "W2", "W3", "W4", "W5"]
  const closings = base.monthlyBalanceSnapshots.map((snapshot) => snapshot.closing)
  const latestClosing = closings.at(-1) ?? 0
  const closingPercentile = closings.length ? closings.filter((value) => value <= latestClosing).length / closings.length : 0
  const allDailyBalances = [...base.dailyBalanceMap.values()]
  const lowCut = percentile(allDailyBalances, 0.33)
  const highCut = percentile(allDailyBalances, 0.66)
  const dailyBalanceBoxes = base.recentMonthKeys.map((monthKey) => {
    const balances = [...new Set(base.transactions.filter((transaction) => transaction.monthKey === monthKey).map((transaction) => transaction.dateKey))].map((dayKey) => base.dailyBalanceMap.get(dayKey) ?? 0)
    return { label: toMonthLabel(monthKey), ...boxStats(balances) }
  })
  const medianGroceryDayCost = base.recentMonthKeys.map((monthKey) => {
    const values = [...new Set(base.baskets.filter((basket) => basket.monthKey === monthKey).map((basket) => basket.dateKey))]
      .map((dayKey) => sum(base.baskets.filter((basket) => basket.monthKey === monthKey && basket.dateKey === dayKey).map((basket) => basket.spend)))
    return [toMonthLabel(monthKey), median(values)] as [string, number]
  })
  const closingVsMedianGroceryDay = base.recentMonthKeys.map((monthKey, index) => {
    const closing = base.monthlyBalanceSnapshots.find((snapshot) => snapshot.monthKey === monthKey)?.closing ?? 0
    return { label: toMonthLabel(monthKey), value: closing, target: medianGroceryDayCost[index]?.[1] ?? 0, max: Math.max(closing, medianGroceryDayCost[index]?.[1] ?? 0) * 1.15 }
  })
  const biggestGroceryWeek = base.recentMonthKeys.map((monthKey) => {
    const weekSpend = weekLabels.map((_, index) => {
      const week = index + 1
      return sum(base.baskets.filter((basket) => basket.monthKey === monthKey && getWeekOfMonth(parseIsoDate(basket.dateKey)) === week).map((basket) => basket.spend))
    })
    return [toMonthLabel(monthKey), Math.max(...weekSpend, 0)] as [string, number]
  })
  const netCashVsBiggestGroceryWeek = base.recentMonthKeys.map((monthKey, index) => {
    const netCash = base.monthNetTotals.get(monthKey) ?? 0
    const target = biggestGroceryWeek[index]?.[1] ?? 0
    return {
      label: toMonthLabel(monthKey),
      value: Math.max(0, netCash),
      target,
      max: Math.max(Math.abs(netCash), target, 1) * 1.15,
    }
  })
  const balanceZoneDays = base.recentMonthKeys.map((monthKey) => {
    const days = [...new Set(base.transactions.filter((transaction) => transaction.monthKey === monthKey).map((transaction) => transaction.dateKey))]
    let low = 0
    let mid = 0
    let high = 0
    for (const dayKey of days) {
      const balance = base.dailyBalanceMap.get(dayKey) ?? 0
      if (balance <= lowCut) low += 1
      else if (balance >= highCut) high += 1
      else mid += 1
    }
    return { label: toMonthLabel(monthKey), segments: [{ key: "Low", value: low }, { key: "Mid", value: mid }, { key: "High", value: high }] }
  })
  const netCashRanking = base.recentMonthKeys.map((monthKey) => ({ label: toMonthLabel(monthKey), value: base.monthNetTotals.get(monthKey) ?? 0, reference: 0 })).sort((a, b) => b.value - a.value)
  const groceryVsLowBalanceDays = base.recentMonthKeys.map((monthKey) => {
    const groceryDays = new Set(base.baskets.filter((basket) => basket.monthKey === monthKey).map((basket) => basket.dateKey)).size
    const lowDays = [...new Set(base.transactions.filter((transaction) => transaction.monthKey === monthKey).map((transaction) => transaction.dateKey))].filter((dayKey) => (base.dailyBalanceMap.get(dayKey) ?? 0) <= lowCut).length
    return { label: toMonthLabel(monthKey), values: [{ key: "Grocery days", value: groceryDays }, { key: "Low-balance days", value: lowDays }] }
  })
  const averageDailyBalance = base.recentMonthKeys.map((monthKey) => {
    const balances = [...new Set(base.transactions.filter((transaction) => transaction.monthKey === monthKey).map((transaction) => transaction.dateKey))].map((dayKey) => base.dailyBalanceMap.get(dayKey) ?? 0)
    return [toMonthLabel(monthKey), mean(balances)] as [string, number]
  })
  const closingVsAverage = base.recentMonthKeys.map((monthKey, index) => ({
    label: toMonthLabel(monthKey),
    start: averageDailyBalance[index]?.[1] ?? 0,
    end: base.monthlyBalanceSnapshots.find((snapshot) => snapshot.monthKey === monthKey)?.closing ?? 0,
  }))
  const groceryDayBalanceBoxes = base.recentMonthKeys.map((monthKey) => {
    const balances = [...new Set(base.baskets.filter((basket) => basket.monthKey === monthKey).map((basket) => basket.dateKey))].map((dayKey) => base.dailyBalanceMap.get(dayKey) ?? 0)
    return { label: toMonthLabel(monthKey), ...boxStats(balances) }
  })
  const latestMonthKey = base.recentMonthKeys.at(-1) ?? ""
  const latestClosingBalance = base.monthlyBalanceSnapshots.find((snapshot) => snapshot.monthKey === latestMonthKey)?.closing ?? 0
  const latestMedianReceipt = median(base.baskets.filter((basket) => basket.monthKey === latestMonthKey).map((basket) => basket.spend))
  const latestLargestReceipt = Math.max(0, ...base.baskets.filter((basket) => basket.monthKey === latestMonthKey).map((basket) => basket.spend))
  const latestBiggestExpense = Math.max(0, ...base.expenseTransactions.filter((transaction) => transaction.monthKey === latestMonthKey).map((transaction) => transaction.absAmount))
  const latestMedianGroceryDay = medianGroceryDayCost.at(-1)?.[1] ?? 0
  const bufferFunnel = [
    { label: "Closing balance", value: Math.max(0, latestClosingBalance) },
    { label: "After median receipt", value: Math.max(0, latestClosingBalance - latestMedianReceipt) },
    { label: "After largest receipt", value: Math.max(0, latestClosingBalance - latestMedianReceipt - latestLargestReceipt) },
    { label: "After biggest expense", value: Math.max(0, latestClosingBalance - latestMedianReceipt - latestLargestReceipt - latestBiggestExpense) },
    { label: "After median grocery day", value: Math.max(0, latestClosingBalance - latestMedianReceipt - latestLargestReceipt - latestBiggestExpense - latestMedianGroceryDay) },
  ]
  const groceryWeekSafety = base.recentMonthKeys.map((monthKey, index) => {
    const closing = base.monthlyBalanceSnapshots.find((snapshot) => snapshot.monthKey === monthKey)?.closing ?? 0
    return { label: toMonthLabel(monthKey), value: closing / Math.max(1, biggestGroceryWeek[index]?.[1] ?? 1), max: 8 }
  })
  const lowBalanceDayCount = base.recentMonthKeys.map((monthKey) => [...new Set(base.transactions.filter((transaction) => transaction.monthKey === monthKey).map((transaction) => transaction.dateKey))].filter((dayKey) => (base.dailyBalanceMap.get(dayKey) ?? 0) <= lowCut).length)
  const fingerprintLines = base.recentMonthKeys.slice(-6).map((monthKey, index) => ({
    label: toMonthLabel(monthKey),
    values: [
      base.monthlyBalanceSnapshots.find((snapshot) => snapshot.monthKey === monthKey)?.closing ?? 0,
      averageDailyBalance.find(([label]) => label === toMonthLabel(monthKey))?.[1] ?? 0,
      lowBalanceDayCount[base.recentMonthKeys.indexOf(monthKey)] ?? 0,
      new Set(base.baskets.filter((basket) => basket.monthKey === monthKey).map((basket) => basket.dateKey)).size,
    ],
  }))
  const latestGrocerySpend = sum(base.baskets.filter((basket) => basket.monthKey === latestMonthKey).map((basket) => basket.spend))
  const latestOtherExpense = Math.max(0, (base.monthExpenseTotals.get(latestMonthKey) ?? 0) - latestGrocerySpend)
  const latestCashLoadTreemap = [
    { label: "Closing", value: Math.max(0, latestClosingBalance) },
    { label: "Groceries", value: latestGrocerySpend },
    { label: "Biggest expense", value: latestBiggestExpense },
    { label: "Other expense", value: latestOtherExpense },
  ]
  const receiptCoverageRanges = base.recentMonthKeys.map((monthKey, index) => {
    const closing = base.monthlyBalanceSnapshots.find((snapshot) => snapshot.monthKey === monthKey)?.closing ?? 0
    const medianReceipt = median(base.baskets.filter((basket) => basket.monthKey === monthKey).map((basket) => basket.spend))
    const largestReceipt = Math.max(0, ...base.baskets.filter((basket) => basket.monthKey === monthKey).map((basket) => basket.spend))
    const groceryDay = medianGroceryDayCost[index]?.[1] ?? 0
    return { label: toMonthLabel(monthKey), start: largestReceipt ? closing / largestReceipt : 0, end: medianReceipt ? closing / medianReceipt : 0, marker: groceryDay ? closing / groceryDay : 0 }
  })
  const latestGroceryDaySet = new Set(base.baskets.filter((basket) => basket.monthKey === latestMonthKey).map((basket) => basket.dateKey))
  const latestMonthDays = [...new Set(base.transactions.filter((transaction) => transaction.monthKey === latestMonthKey).map((transaction) => transaction.dateKey))]
  const balanceStateSunburst = [
    {
      label: "Low",
      value: latestMonthDays.filter((dayKey) => (base.dailyBalanceMap.get(dayKey) ?? 0) <= lowCut).length,
      children: [
        { label: "Grocery", value: latestMonthDays.filter((dayKey) => (base.dailyBalanceMap.get(dayKey) ?? 0) <= lowCut && latestGroceryDaySet.has(dayKey)).length },
        { label: "Other", value: latestMonthDays.filter((dayKey) => (base.dailyBalanceMap.get(dayKey) ?? 0) <= lowCut && !latestGroceryDaySet.has(dayKey)).length },
      ],
    },
    {
      label: "Mid",
      value: latestMonthDays.filter((dayKey) => (base.dailyBalanceMap.get(dayKey) ?? 0) > lowCut && (base.dailyBalanceMap.get(dayKey) ?? 0) < highCut).length,
      children: [
        { label: "Grocery", value: latestMonthDays.filter((dayKey) => (base.dailyBalanceMap.get(dayKey) ?? 0) > lowCut && (base.dailyBalanceMap.get(dayKey) ?? 0) < highCut && latestGroceryDaySet.has(dayKey)).length },
        { label: "Other", value: latestMonthDays.filter((dayKey) => (base.dailyBalanceMap.get(dayKey) ?? 0) > lowCut && (base.dailyBalanceMap.get(dayKey) ?? 0) < highCut && !latestGroceryDaySet.has(dayKey)).length },
      ],
    },
    {
      label: "High",
      value: latestMonthDays.filter((dayKey) => (base.dailyBalanceMap.get(dayKey) ?? 0) >= highCut).length,
      children: [
        { label: "Grocery", value: latestMonthDays.filter((dayKey) => (base.dailyBalanceMap.get(dayKey) ?? 0) >= highCut && latestGroceryDaySet.has(dayKey)).length },
        { label: "Other", value: latestMonthDays.filter((dayKey) => (base.dailyBalanceMap.get(dayKey) ?? 0) >= highCut && !latestGroceryDaySet.has(dayKey)).length },
      ],
    },
  ]
  const lowBalanceWeekHeatmap = base.recentMonthKeys.flatMap((monthKey) =>
    weekLabels.map((label, index) => {
      const week = index + 1
      const count = [...new Set(base.transactions.filter((transaction) => transaction.monthKey === monthKey && transaction.weekOfMonth === week).map((transaction) => transaction.dateKey))]
        .filter((dayKey) => (base.dailyBalanceMap.get(dayKey) ?? 0) <= lowCut).length
      return { x: label, y: toMonthLabel(monthKey), value: count }
    }),
  )

  return [
    { id: "diverse-savings-closing-percentile", title: "Closing Balance Percentile", eyebrow: "History Context", question: "How strong is the latest closing balance compared with the rest of the closing balances in view?", insight: "A percentile gauge gives instant historical context without requiring the user to inspect a full time series.", metricLabel: "Latest closing percentile", metricValue: formatPercent(closingPercentile * 100), tags: ["Gauge", "Balance"], visual: { kind: "gauge", value: closingPercentile, target: 0.6 } },
    { id: "diverse-savings-daily-balance-distribution", title: "Daily Balance Distribution", eyebrow: "Balance Shape", question: "How wide is the spread between low, typical, and high daily balances each month?", insight: "This shows how the month actually felt day to day, not just how it ended.", metricLabel: "Latest median daily balance", metricValue: formatCurrency(dailyBalanceBoxes.at(-1)?.median ?? 0, { maximumFractionDigits: 0 }), tags: ["Boxplot", "Balance"], visual: { kind: "boxplot", items: dailyBalanceBoxes, formatter: "currency" } },
    { id: "diverse-savings-closing-vs-grocery-day", title: "Closing Balance vs Median Grocery Day Cost", eyebrow: "Household Buffer", question: "How does month-end balance compare with a typical grocery day cost?", insight: "This translates closing balance into a unit that is easier for households to judge quickly.", metricLabel: "Latest closing balance", metricValue: formatCurrency(closingVsMedianGroceryDay.at(-1)?.value ?? 0, { maximumFractionDigits: 0 }), tags: ["Bullet", "Groceries"], visual: { kind: "bullet", items: closingVsMedianGroceryDay, formatter: "currency" } },
    { id: "diverse-savings-net-vs-biggest-grocery-week", title: "Net Cash vs Biggest Grocery Week", eyebrow: "Household Stress", question: "Does monthly net cash comfortably absorb the heaviest grocery week?", insight: "This is an easy stress test for how much margin exists after routine household load spikes.", metricLabel: "Latest net cash", metricValue: formatCurrency(netCashVsBiggestGroceryWeek.at(-1)?.value ?? 0, { maximumFractionDigits: 0, showSign: true }), tags: ["Bullet", "Net"], visual: { kind: "bullet", items: netCashVsBiggestGroceryWeek, formatter: "currency" } },
    { id: "diverse-savings-balance-zone-days", title: "Balance Zone Days", eyebrow: "Balance State", question: "How many days per month live in low, mid, or high balance territory?", insight: "This is easy to understand because it turns balances into clear state counts.", metricLabel: "Latest low-balance days", metricValue: `${balanceZoneDays.at(-1)?.segments[0]?.value ?? 0} days`, tags: ["Stacked", "Balance"], visual: { kind: "stackedBars", keys: ["Low", "Mid", "High"], items: balanceZoneDays, formatter: "number" } },
    { id: "diverse-savings-net-cash-ranking", title: "Net Cash Ranking", eyebrow: "Window Ranking", question: "Which months rank best and worst by net cash result?", insight: "A ranked dot plot is easier to scan than a line when the question is simply which months won.", metricLabel: "Best month", metricValue: formatCurrency(netCashRanking[0]?.value ?? 0, { maximumFractionDigits: 0, showSign: true }), tags: ["Dot Plot", "Net"], visual: { kind: "dotPlot", items: netCashRanking, formatter: "currency" } },
    { id: "diverse-savings-grocery-vs-low-balance-days", title: "Grocery Days vs Low-Balance Days", eyebrow: "Cross-Signal", question: "Do months with more grocery days also tend to be the months with more low-balance days?", insight: "This is a straightforward count comparison between household activity and pressure days.", metricLabel: "Latest low-balance days", metricValue: `${groceryVsLowBalanceDays.at(-1)?.values[1]?.value ?? 0} days`, tags: ["Grouped", "Days"], visual: { kind: "groupedBars", keys: ["Grocery days", "Low-balance days"], groups: groceryVsLowBalanceDays, formatter: "number" } },
    { id: "diverse-savings-closing-vs-average", title: "Closing Balance vs Average Daily Balance", eyebrow: "Balance Shape", question: "Does the month-end balance finish above or below the level usually lived at during the month?", insight: "This arrow view helps users see whether the close flatters or understates the month’s lived balance.", metricLabel: "Latest difference", metricValue: formatCurrency((closingVsAverage.at(-1)?.end ?? 0) - (closingVsAverage.at(-1)?.start ?? 0), { maximumFractionDigits: 0, showSign: true }), tags: ["Arrow", "Balance"], visual: { kind: "arrowPlot", items: closingVsAverage, formatter: "currency" } },
    { id: "diverse-savings-grocery-day-balance-distribution", title: "Grocery-Day Balance Distribution", eyebrow: "Cross-Signal", question: "What balance range do grocery days usually happen at?", insight: "This adds balance context directly to grocery behavior instead of looking at groceries in isolation.", metricLabel: "Latest median grocery-day balance", metricValue: formatCurrency(groceryDayBalanceBoxes.at(-1)?.median ?? 0, { maximumFractionDigits: 0 }), tags: ["Boxplot", "Groceries"], visual: { kind: "boxplot", items: groceryDayBalanceBoxes, formatter: "currency" } },
    { id: "diverse-savings-latest-buffer-funnel", title: "Latest Month Buffer Funnel", eyebrow: "Buffer Stress", question: "How quickly does the latest closing balance thin out after representative grocery and expense hits are applied?", insight: "This is a medium-level but still readable way to simulate multiple ordinary hits against the buffer.", metricLabel: "Latest closing balance", metricValue: formatCurrency(latestClosingBalance, { maximumFractionDigits: 0 }), tags: ["Funnel", "Buffer"], visual: { kind: "funnel", steps: bufferFunnel, formatter: "currency" } },
    { id: "diverse-savings-grocery-week-safety", title: "Grocery Week Safety", eyebrow: "Household Buffer", question: "How many biggest-type grocery weeks could the closing balance cover?", insight: "Pictorial bars make this safety question tangible and easy to compare across months.", metricLabel: "Latest week coverage", metricValue: `${round(groceryWeekSafety.at(-1)?.value ?? 0, 1)} weeks`, tags: ["Pictorial", "Groceries"], visual: { kind: "pictorialBar", items: groceryWeekSafety, formatter: "number" } },
    { id: "diverse-savings-buffer-fingerprint", title: "Monthly Buffer Fingerprint", eyebrow: "Month Shape", question: "How do recent months compare when closing balance, average balance, low days, and grocery days are read together?", insight: "Parallel coordinates work well here because buffer quality is multi-dimensional.", metricLabel: "Months compared", metricValue: `${fingerprintLines.length} months`, tags: ["Parallel", "Balance"], visual: { kind: "parallel", axes: ["Closing", "Avg Balance", "Low Days", "Grocery Days"], lines: fingerprintLines } },
    { id: "diverse-savings-cash-load-treemap", title: "Latest Month Cash Load Treemap", eyebrow: "Money Weight", question: "How large are groceries, other expenses, biggest expense, and closing balance relative to one another in the latest month?", insight: "This makes the month’s money weight visible without turning it into another line chart.", metricLabel: "Largest block", metricValue: formatCurrency(Math.max(...latestCashLoadTreemap.map((item) => item.value), 0), { maximumFractionDigits: 0 }), tags: ["Treemap", "Cash"], visual: { kind: "treemap", items: latestCashLoadTreemap, formatter: "currency" } },
    { id: "diverse-savings-receipt-coverage-range", title: "Receipt Coverage Range", eyebrow: "Receipt Safety", question: "How many median-type versus largest-type grocery receipts could the closing balance cover?", insight: "A range view is useful here because the safest and most stressful receipt sizes are both meaningful.", metricLabel: "Latest median receipt coverage", metricValue: `${round(receiptCoverageRanges.at(-1)?.end ?? 0, 1)} receipts`, tags: ["Range", "Receipts"], visual: { kind: "rangePlot", items: receiptCoverageRanges, formatter: "number" } },
    { id: "diverse-savings-balance-state-sunburst", title: "Latest Month Balance State Sunburst", eyebrow: "Balance Context", question: "How do low, mid, and high balance days split into grocery and non-grocery days in the latest month?", insight: "This is a more creative but still readable way to connect balance state and household behavior.", metricLabel: "Latest month days", metricValue: `${latestMonthDays.length} days`, tags: ["Sunburst", "Balance"], visual: { kind: "sunburst", nodes: balanceStateSunburst, formatter: "number" } },
    { id: "diverse-savings-low-balance-week-heatmap", title: "Low-Balance Days by Week of Month", eyebrow: "Calendar Pattern", question: "In which week of the month do low-balance days tend to accumulate?", insight: "This makes recurring late-month pressure easier to spot at a glance.", metricLabel: "Tracked months", metricValue: `${base.recentMonthKeys.length} months`, tags: ["Heatmap", "Balance"], visual: { kind: "heatmap", xLabels: weekLabels, yLabels: base.recentMonthKeys.map((monthKey) => toMonthLabel(monthKey)), cells: lowBalanceWeekHeatmap } },
  ]
}

export function buildInsightPlaygroundSections(bundle: BundleInput, options: BuildOptions): PlaygroundSection[] {
  const base = buildBaseData(bundle)
  const { analyticsCards: approvedAnalytics, fridgeCards: approvedFridge, savingsCards: approvedSavings } = buildApprovedCards(base, options)

  return [
    buildSection(
      "toImplement",
      "To Be Implemented",
      "Approved concepts live here so they do not need to be re-selected during future ideation rounds.",
      "47 approved concepts",
      [
        {
          id: "approved-analytics",
          title: "Approved Analytics",
          description: "The analytics concepts already picked for future implementation.",
          cards: approvedAnalytics,
        },
        {
          id: "approved-fridge",
          title: "Approved Fridge",
          description: "The grocery and receipt concepts already approved.",
          cards: approvedFridge,
        },
        {
          id: "approved-savings",
          title: "Approved Savings",
          description: "The balance and reserve concepts already approved.",
          cards: approvedSavings,
        },
      ],
    ),
  ]
}
