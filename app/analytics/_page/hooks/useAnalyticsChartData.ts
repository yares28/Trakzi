import { useMemo, useState } from "react"

import { getChartCardSize, type ChartId } from "@/lib/chart-card-sizes.config"
import { useChartCategoryVisibility } from "@/hooks/use-chart-category-visibility"

import type { ActivityRingsConfig, ActivityRingsData, AnalyticsTransaction } from "../types"
import { getDefaultRingLimit, normalizeCategoryName } from "../utils/categories"

type BundleDailySpending = {
  date: string
  income?: number
  expense?: number
}

type BundleCategorySpending = {
  category: string
  total: number
}

type BundleMonthlyCategory = {
  category: string
  month: string | number
  total: number
}

type BundleNeedsWants = {
  classification: string
  total: number
}

type BundleMonthlyByCategory = {
  category: string
  month: string
  total: number
}

type BundleCashFlowNode = {
  id: string
}

type BundleCashFlowLink = {
  source: string
  target: string
  value: number
}

type BundleCashFlow = {
  nodes: BundleCashFlowNode[]
  links: BundleCashFlowLink[]
}

type BundleKpis = {
  totalIncome: number
  totalExpense: number
}

type BundleTransaction = {
  id?: string | number
  category?: string
  amount: number
  date: string
  description: string
  color?: string | null
}

type BundleData = {
  dailySpending?: BundleDailySpending[]
  categorySpending?: BundleCategorySpending[]
  monthlyCategories?: BundleMonthlyCategory[]
  needsWants?: BundleNeedsWants[]
  monthlyByCategory?: BundleMonthlyByCategory[]
  cashFlow?: BundleCashFlow
  kpis?: BundleKpis
  transactionHistory?: BundleTransaction[]
}

type UseAnalyticsChartDataParams = {
  rawTransactions: AnalyticsTransaction[]
  bundleData: BundleData | null
  dateFilter: string | null
  palette: string[] | undefined
  ringLimits: Record<string, number>
  savedChartSizes: Record<string, { w: number; h: number; x?: number; y?: number }>
  resolvedTheme?: string
}

export function useAnalyticsChartData({
  rawTransactions,
  bundleData,
  dateFilter,
  palette,
  ringLimits,
  savedChartSizes,
  resolvedTheme,
}: UseAnalyticsChartDataParams) {
  const [ringCategories, setRingCategories] = useState<string[]>([])

  const allExpenseCategories = useMemo(() => {
    if (!rawTransactions || rawTransactions.length === 0) {
      return []
    }

    const categorySet = new Set<string>()
    rawTransactions
      .filter((tx) => tx.amount < 0)
      .forEach((tx) => {
        const rawCategory = (tx.category || "Other").trim()
        const category = rawCategory || "Other"
        categorySet.add(category)
      })

    return Array.from(categorySet).sort((a, b) => a.localeCompare(b))
  }, [rawTransactions])

  const incomeExpenseVisibility = useChartCategoryVisibility({
    chartId: "analytics:income-expense",
    storageScope: "analytics",
    normalizeCategory: normalizeCategoryName,
  })
  const incomeExpenseTopVisibility = useChartCategoryVisibility({
    chartId: "analytics:income-expense-top",
    storageScope: "analytics",
    normalizeCategory: normalizeCategoryName,
  })
  const categoryFlowVisibility = useChartCategoryVisibility({
    chartId: "analytics:category-flow",
    storageScope: "analytics",
    normalizeCategory: normalizeCategoryName,
  })
  const spendingFunnelVisibility = useChartCategoryVisibility({
    chartId: "analytics:spending-funnel",
    storageScope: "analytics",
    normalizeCategory: normalizeCategoryName,
  })
  const expensesPieVisibility = useChartCategoryVisibility({
    chartId: "analytics:expenses-pie",
    storageScope: "analytics",
    normalizeCategory: normalizeCategoryName,
  })
  const needsWantsVisibility = useChartCategoryVisibility({
    chartId: "analytics:needs-wants-pie",
    storageScope: "analytics",
    normalizeCategory: normalizeCategoryName,
  })
  const circlePackingVisibility = useChartCategoryVisibility({
    chartId: "analytics:circle-packing",
    storageScope: "analytics",
    normalizeCategory: normalizeCategoryName,
  })
  const polarBarVisibility = useChartCategoryVisibility({
    chartId: "analytics:polar-bar",
    storageScope: "analytics",
    normalizeCategory: normalizeCategoryName,
  })
  const streamgraphVisibility = useChartCategoryVisibility({
    chartId: "analytics:streamgraph",
    storageScope: "analytics",
    normalizeCategory: normalizeCategoryName,
  })
  const treeMapVisibility = useChartCategoryVisibility({
    chartId: "analytics:treemap",
    storageScope: "analytics",
    normalizeCategory: normalizeCategoryName,
  })
  const sankeyVisibility = useChartCategoryVisibility({
    chartId: "analytics:sankey",
    storageScope: "analytics",
    normalizeCategory: normalizeCategoryName,
  })
  const dayOfWeekSpendingVisibility = useChartCategoryVisibility({
    chartId: "analytics:day-of-week-spending",
    storageScope: "analytics",
    normalizeCategory: normalizeCategoryName,
  })
  const monthOfYearSpendingVisibility = useChartCategoryVisibility({
    chartId: "analytics:month-of-year-spending",
    storageScope: "analytics",
    normalizeCategory: normalizeCategoryName,
  })

  // Memoized Popover content component with local state for responsive input
  const activityData: ActivityRingsData = useMemo(() => {
    if (!rawTransactions || rawTransactions.length === 0) {
      return []
    }

    // Use real Neon categories from expenses
    const categoryTotals = new Map<string, number>()
    rawTransactions
      .filter((tx) => tx.amount < 0)
      .forEach((tx) => {
        const rawCategory = (tx.category || "Other").trim()
        const category = rawCategory || "Other"
        const current = categoryTotals.get(category) || 0
        const amount = Math.abs(Number(tx.amount)) || 0
        categoryTotals.set(category, current + amount)
      })

    const totalExpenses = Array.from(categoryTotals.values()).reduce(
      (sum, value) => sum + value,
      0
    )

    if (totalExpenses <= 0) {
      return []
    }

    // Top spending categories by default
    const defaultTopCategories = Array.from(categoryTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([category]) => category)

    const categoriesToUse =
      ringCategories && ringCategories.length > 0
        ? ringCategories
        : defaultTopCategories.slice(0, 5)

    // Build [category, amount] pairs for the chosen categories
    const selectedCategories = categoriesToUse
      .map((category) => {
        const amount = categoryTotals.get(category) || 0
        return [category, amount] as [string, number]
      })
      .filter(([, amount]) => amount > 0)

    return selectedCategories.map(([category, amount], index) => {
      const storedLimit = ringLimits[category]
      const effectiveLimit =
        typeof storedLimit === "number" && storedLimit > 0
          ? storedLimit
          : getDefaultRingLimit(dateFilter)

      const ratioToLimit =
        effectiveLimit && effectiveLimit > 0
          ? Math.min(amount / effectiveLimit, 1)
          : null

      const value = ratioToLimit !== null ? ratioToLimit : 0

      const color =
        (Array.isArray(palette) && palette.length > 0
          ? palette[index % palette.length]
          : undefined) || "#a1a1aa"

      const exceeded = ratioToLimit !== null && amount > effectiveLimit
      const pct = ratioToLimit !== null ? (ratioToLimit * 100).toFixed(1) : '0'

      return {
        // Label is used by the ActivityRings tooltip on hover
        label:
          ratioToLimit !== null
            ? `Category: ${category}\nUsed: ${pct}%\nSpent: $${amount.toFixed(2)}\nBudget: $${effectiveLimit.toFixed(2)}${exceeded ? '\n⚠ Exceeded' : ''}`
            : `Category: ${category}\nSpent: $${amount.toFixed(2)}\nNo budget set`,
        // Store the raw category name separately for our own legend
        // (extra fields are ignored by the library)
        category,
        spent: amount,
        value,
        color,
      }
    })
  }, [rawTransactions, palette, ringCategories, ringLimits, dateFilter])

  const incomeExpenseChart = useMemo(() => {
    // Use bundle data if available (pre-computed by server)
    if (bundleData?.dailySpending && bundleData.dailySpending.length > 0) {
      const categorySet = new Set<string>(bundleData.categorySpending?.map(c => c.category) || [])
      const data = bundleData.dailySpending
        .map(d => ({ date: d.date, desktop: d.income || 0, mobile: d.expense || 0 }))
        .sort((a, b) => a.date.localeCompare(b.date))
      return { data, categories: Array.from(categorySet) }
    }

    // Fallback to rawTransactions
    if (!rawTransactions || rawTransactions.length === 0) {
      return { data: [] as Array<{ date: string; desktop: number; mobile: number }>, categories: [] as string[] }
    }

    const categorySet = new Set<string>()
    rawTransactions.forEach((tx) => {
      categorySet.add(normalizeCategoryName(tx.category))
    })

    const filteredSource =
      incomeExpenseVisibility.hiddenCategorySet.size === 0
        ? rawTransactions
        : rawTransactions.filter((tx) => {
          const category = normalizeCategoryName(tx.category)
          return !incomeExpenseVisibility.hiddenCategorySet.has(category)
        })

    const grouped = filteredSource.reduce((acc, tx) => {
      const date = tx.date.split("T")[0]
      if (!acc[date]) {
        acc[date] = { date, desktop: 0, mobile: 0 }
      }
      if (tx.amount > 0) {
        acc[date].desktop += tx.amount
      } else {
        acc[date].mobile += Math.abs(tx.amount)
      }
      return acc
    }, {} as Record<string, { date: string; desktop: number; mobile: number }>)

    return {
      data: Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date)),
      categories: Array.from(categorySet),
    }
  }, [bundleData?.dailySpending, bundleData?.categorySpending, rawTransactions, incomeExpenseVisibility.hiddenCategorySet, dateFilter])

  const incomeExpenseControls = incomeExpenseVisibility.buildCategoryControls(
    incomeExpenseChart.categories,
    {
      description: "Hide a category to remove its transactions from this cash-flow chart.",
    }
  )

  // Build categories for the top chart (same as incomeExpenseChart but independent visibility)
  const incomeExpenseTopCategories = useMemo(() => {
    // Use bundle data if available
    if (bundleData?.categorySpending && bundleData.categorySpending.length > 0) {
      return bundleData.categorySpending.map(c => c.category)
    }

    // Fallback to rawTransactions
    const categorySet = new Set<string>()
    rawTransactions.forEach((tx) => {
      categorySet.add(normalizeCategoryName(tx.category))
    })
    return Array.from(categorySet)
  }, [bundleData?.categorySpending, rawTransactions, normalizeCategoryName])

  const incomeExpenseTopControls = incomeExpenseTopVisibility.buildCategoryControls(
    incomeExpenseTopCategories,
    {
      description: "Hide a category to remove its transactions from this cash-flow chart.",
    }
  )

  const categoryFlowChart = useMemo(() => {
    const monthNameToIndex: Record<string, number> = {
      jan: 0,
      january: 0,
      feb: 1,
      february: 1,
      mar: 2,
      march: 2,
      apr: 3,
      april: 3,
      may: 4,
      jun: 5,
      june: 5,
      jul: 6,
      july: 6,
      aug: 7,
      august: 7,
      sep: 8,
      sept: 8,
      september: 8,
      oct: 9,
      october: 9,
      nov: 10,
      november: 10,
      dec: 11,
      december: 11,
    }

    const parsePeriodKeyToTime = (key: string): number | null => {
      const trimmed = (key ?? "").trim()
      if (!trimmed) return null

      // YYYY-MM (or YYYY-M)
      const yyyyMm = trimmed.match(/^(\d{4})-(\d{1,2})$/)
      if (yyyyMm) {
        const year = Number(yyyyMm[1])
        const month = Number(yyyyMm[2]) - 1
        const dt = new Date(year, month, 1)
        return Number.isNaN(dt.getTime()) ? null : dt.getTime()
      }

      // YYYY-MM-DD (weekly buckets may use this)
      const yyyyMmDd = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
      if (yyyyMmDd) {
        const year = Number(yyyyMmDd[1])
        const month = Number(yyyyMmDd[2]) - 1
        const day = Number(yyyyMmDd[3])
        const dt = new Date(year, month, day)
        return Number.isNaN(dt.getTime()) ? null : dt.getTime()
      }

      // Mon'YY (e.g. "Dec'25")
      const monAposYear = trimmed.match(/^([A-Za-z]{3,9})'(\d{2})$/)
      if (monAposYear) {
        const mon = monAposYear[1].toLowerCase()
        const year = 2000 + Number(monAposYear[2])
        const monthIndex = monthNameToIndex[mon]
        if (typeof monthIndex === "number") {
          const dt = new Date(year, monthIndex, 1)
          return Number.isNaN(dt.getTime()) ? null : dt.getTime()
        }
      }

      // Month name with 4-digit year (e.g. "November 2025", "Nov 2025")
      const monthYear = trimmed.match(/^([A-Za-z]{3,9})\s+(\d{4})$/)
      if (monthYear) {
        const mon = monthYear[1].toLowerCase()
        const year = Number(monthYear[2])
        const monthIndex = monthNameToIndex[mon]
        if (typeof monthIndex === "number") {
          const dt = new Date(year, monthIndex, 1)
          return Number.isNaN(dt.getTime()) ? null : dt.getTime()
        }
      }

      // Plain month number "01".."12" (no year available)
      const mmOnly = trimmed.match(/^(\d{1,2})$/)
      if (mmOnly) {
        const month = Number(mmOnly[1])
        if (month >= 1 && month <= 12) {
          // Use a synthetic year so relative month ordering is stable
          return new Date(2000, month - 1, 1).getTime()
        }
      }

      return null
    }

    const sortPeriodKeys = (a: string, b: string) => {
      const ta = parsePeriodKeyToTime(a)
      const tb = parsePeriodKeyToTime(b)
      if (ta !== null && tb !== null) return ta - tb
      if (ta !== null) return -1
      if (tb !== null) return 1
      return a.localeCompare(b)
    }

    // Use bundle data if available for monthly data
    if (bundleData?.monthlyCategories && bundleData.monthlyCategories.length > 0) {
      const categorySet = new Set<string>(bundleData.monthlyCategories.map(m => m.category))

      // Group by month
      const monthTotals = new Map<string, Map<string, number>>()
      const periodTotals = new Map<string, number>()

      bundleData.monthlyCategories.forEach(m => {
        const monthKey = String(m.month).padStart(2, '0')
        if (!monthTotals.has(monthKey)) monthTotals.set(monthKey, new Map())
        monthTotals.get(monthKey)!.set(m.category, m.total)
        periodTotals.set(monthKey, (periodTotals.get(monthKey) || 0) + m.total)
      })

      const sortedPeriods = Array.from(monthTotals.keys()).sort(sortPeriodKeys)
      const data = Array.from(categorySet)
        .filter(c => !categoryFlowVisibility.hiddenCategorySet.has(c))
        .map(category => ({
          id: category,
          data: sortedPeriods.map(period => {
            const value = monthTotals.get(period)?.get(category) || 0
            const total = periodTotals.get(period) || 1
            const percentage = total > 0 ? (value / total) * 100 : 0
            return { x: period, y: Math.max(percentage, 0.1) }
          })
        }))
        .filter(series => series.data.some(p => p.y > 0.1))

      return { data, categories: Array.from(categorySet) }
    }

    // Fallback to rawTransactions
    if (!rawTransactions || rawTransactions.length === 0) {
      return { data: [] as Array<{ id: string; data: Array<{ x: string; y: number }> }>, categories: [] as string[] }
    }

    const categoryMap = new Map<string, Map<string, number>>()
    const allTimePeriods = new Set<string>()
    const categorySet = new Set<string>()

    // Determine time granularity based on date filter
    const getTimeKey = (date: Date): string => {
      if (!dateFilter) {
        // All time: use months
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      }

      switch (dateFilter) {
        case "last7days":
        case "last30days":
          // For short periods, use weeks
          const weekStart = new Date(date)
          weekStart.setDate(date.getDate() - date.getDay()) // Start of week (Sunday)
          return `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, "0")}-${String(weekStart.getDate()).padStart(2, "0")}`
        case "last3months":
        case "last6months":
        case "lastyear":
          // For medium periods, use months
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        default:
          // For specific years or other filters, use months
          if (/^\d{4}$/.test(dateFilter)) {
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
          }
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      }
    }

    rawTransactions.forEach((tx) => {
      if (tx.amount >= 0) return
      const rawCategory = (tx.category || "Other").trim()
      const category = normalizeCategoryName(rawCategory)
      categorySet.add(category)
      if (categoryFlowVisibility.hiddenCategorySet.has(category)) return

      const date = new Date(tx.date)
      if (Number.isNaN(date.getTime())) return
      const timeKey = getTimeKey(date)
      allTimePeriods.add(timeKey)
      if (!categoryMap.has(category)) {
        categoryMap.set(category, new Map())
      }
      const timeMap = categoryMap.get(category)!
      const current = timeMap.get(timeKey) || 0
      timeMap.set(timeKey, current + Math.abs(tx.amount))
    })

    if (!categoryMap.size) {
      return { data: [], categories: Array.from(categorySet) }
    }

    const sortedTimePeriods = Array.from(allTimePeriods).sort(sortPeriodKeys)
    const periodTotals = new Map<string, number>()
    sortedTimePeriods.forEach((period) => {
      let total = 0
      categoryMap.forEach((periods) => {
        total += periods.get(period) || 0
      })
      periodTotals.set(period, total)
    })

    const data = Array.from(categoryMap.entries())
      .map(([category, periods]) => ({
        id: category,
        data: sortedTimePeriods.map((period) => {
          const value = periods.get(period) || 0
          const total = periodTotals.get(period) || 1
          const percentage = total > 0 ? (value / total) * 100 : 0
          return { x: period, y: Math.max(percentage, 0.1) }
        }),
      }))
      .filter((series) => {
        return series.data.some((point) => point.y > 0.1)
      })

    return {
      data,
      categories: Array.from(categorySet),
    }
  }, [bundleData?.monthlyCategories, rawTransactions, categoryFlowVisibility.hiddenCategorySet, normalizeCategoryName, dateFilter])

  const categoryFlowControls = categoryFlowVisibility.buildCategoryControls(
    categoryFlowChart.categories,
    {
      description: "Hide a spending category to remove it from the ranking stream.",
    }
  )

  const treeMapCategories = useMemo(() => {
    // Use bundle data if available
    if (bundleData?.categorySpending && bundleData.categorySpending.length > 0) {
      return bundleData.categorySpending.map(c => c.category).sort((a, b) => a.localeCompare(b))
    }

    // Fallback to rawTransactions
    const categories = new Set<string>()
    rawTransactions.filter(tx => tx.amount < 0).forEach(tx => {
      categories.add(normalizeCategoryName(tx.category))
    })
    return Array.from(categories).sort((a, b) => a.localeCompare(b))
  }, [bundleData?.categorySpending, rawTransactions, normalizeCategoryName, dateFilter])

  const treeMapControls = treeMapVisibility.buildCategoryControls(treeMapCategories, {
    description: "Hide categories to remove them from this treemap view.",
  })

  // Money Flow: derive how many expense categories to show from chart height.
  // Use the chart's configured minH as the baseline, so every +2 grid units of height adds 1 more category.
  const moneyFlowSizeConfig = getChartCardSize("moneyFlow" as ChartId)
  const baseMoneyFlowHeight = moneyFlowSizeConfig.minH
  const moneyFlowHeight = savedChartSizes["moneyFlow"]?.h ?? baseMoneyFlowHeight
  const moneyFlowExtraSteps = Math.max(0, Math.floor((moneyFlowHeight - baseMoneyFlowHeight) / 2))
  const moneyFlowMaxExpenseCategories = 2 + moneyFlowExtraSteps

  const spendingFunnelChart = useMemo(() => {
    // Use bundle data if available (pre-computed by server)
    const categorySpending = bundleData?.categorySpending
    if (bundleData?.kpis && categorySpending && categorySpending.length > 0) {
      const totalIncome = bundleData.kpis.totalIncome
      const totalExpenses = bundleData.kpis.totalExpense
      const savings = Math.max(0, totalIncome - totalExpenses)

      const categorySet = new Set<string>(categorySpending.map((c) => c.category))
      const topCategories = categorySpending
        .slice(0, moneyFlowMaxExpenseCategories)
        .map((c) => ({ id: c.category.toLowerCase().replace(/\s+/g, "_"), value: c.total, label: c.category }))

      const topTotal = topCategories.reduce((sum, c) => sum + c.value, 0)
      const remainingExpenses = totalExpenses - topTotal

      const expenseCategories = [...topCategories]
      if (remainingExpenses > 0) {
        expenseCategories.push({ id: "others", value: remainingExpenses, label: "Others" })
      }
      expenseCategories.sort((a, b) => b.value - a.value)

      const funnelData: Array<{ id: string; value: number; label: string }> = []
      if (totalIncome > 0) funnelData.push({ id: "income", value: totalIncome, label: "Income" })
      funnelData.push(...expenseCategories)
      if (savings > 0) funnelData.push({ id: "savings", value: savings, label: "Savings" })

      return { data: funnelData, categories: Array.from(categorySet) }
    }

    // Fallback to rawTransactions
    if (!rawTransactions || rawTransactions.length === 0) {
      return { data: [] as Array<{ id: string; value: number; label: string }>, categories: [] as string[] }
    }

    const categorySet = new Set<string>()
    rawTransactions.forEach((tx) => {
      if (tx.amount < 0) {
        categorySet.add(normalizeCategoryName(tx.category))
      }
    })

    const filteredSource =
      spendingFunnelVisibility.hiddenCategorySet.size === 0
        ? rawTransactions
        : rawTransactions.filter((tx) => {
          const category = normalizeCategoryName(tx.category)
          return !spendingFunnelVisibility.hiddenCategorySet.has(category)
        })

    if (!filteredSource.length) {
      return { data: [], categories: Array.from(categorySet) }
    }

    const totalIncome = filteredSource
      .filter((tx) => tx.amount > 0)
      .reduce((sum, tx) => sum + Number(tx.amount), 0)

    const categoryMap = new Map<string, number>()
    filteredSource
      .filter((tx) => tx.amount < 0)
      .forEach((tx) => {
        const category = normalizeCategoryName(tx.category)
        const current = categoryMap.get(category) || 0
        const amount = Math.abs(Number(tx.amount)) || 0
        categoryMap.set(category, current + amount)
      })

    if (categoryMap.size === 0) {
      return { data: [], categories: Array.from(categorySet) }
    }

    const totalExpenses = Array.from(categoryMap.values()).reduce((sum, amount) => sum + Number(amount), 0)
    const savings = totalIncome - totalExpenses

    // Sort categories by amount (descending) to get spending order
    const sortedCategories = Array.from(categoryMap.entries())
      .map(([category, amount]) => ({ category, amount: Number(amount) }))
      .sort((a, b) => b.amount - a.amount)

    // Determine how many top categories to show individually based on chart height
    const maxExpenseCategories = Math.max(1, moneyFlowMaxExpenseCategories)
    const topCategories = sortedCategories.slice(0, maxExpenseCategories)

    // Calculate remaining expenses (all categories beyond the top N)
    const shownExpenses = topCategories.reduce((sum, cat) => sum + cat.amount, 0)
    const remainingExpenses = totalExpenses - shownExpenses

    // Build expense categories array
    const expenseCategories: Array<{ id: string; value: number; label: string }> = []

    // Add top N categories (highest spending)
    topCategories.forEach((cat) => {
      expenseCategories.push({
        id: cat.category.toLowerCase().replace(/\s+/g, "-"),
        value: cat.amount,
        label: cat.category,
      })
    })

    // Add "Others" category (remaining categories, which are less significant)
    if (remainingExpenses > 0) {
      expenseCategories.push({
        id: "others",
        value: remainingExpenses,
        label: "Others",
      })
    }

    // Sort expense categories by value (descending) to ensure proper order
    expenseCategories.sort((a, b) => b.value - a.value)

    // Build the funnel data in order: Income -> Categories (highest to lowest spending) -> Savings
    const funnelData: Array<{ id: string; value: number; label: string }> = []

    // Add Income first
    if (totalIncome > 0) {
      funnelData.push({ id: "income", value: totalIncome, label: "Income" })
    }

    // Add expense categories in descending order of spending
    funnelData.push(...expenseCategories)

    // Add Savings at the end
    if (savings > 0) {
      funnelData.push({
        id: "savings",
        value: savings,
        label: "Savings",
      })
    }

    return {
      data: funnelData,
      categories: Array.from(categorySet),
    }
  }, [bundleData?.kpis, bundleData?.categorySpending, rawTransactions, spendingFunnelVisibility.hiddenCategorySet, normalizeCategoryName, moneyFlowMaxExpenseCategories])

  const spendingFunnelControls = spendingFunnelVisibility.buildCategoryControls(
    spendingFunnelChart.categories,
    {
      description: "Hide a category to keep it out of this funnel view only.",
    }
  )

  const expensesPieData = useMemo(() => {
    // Use bundle data if available (pre-computed by server)
    if (bundleData?.categorySpending && bundleData.categorySpending.length > 0) {
      const categorySet = new Set<string>(bundleData.categorySpending.map(c => c.category))
      const filteredSpending = expensesPieVisibility.hiddenCategorySet.size === 0
        ? bundleData.categorySpending
        : bundleData.categorySpending.filter(c => !expensesPieVisibility.hiddenCategorySet.has(c.category))
      const slices = filteredSpending
        .map(c => ({ id: c.category, label: c.category, value: c.total }))
        .sort((a, b) => b.value - a.value)
      return { slices, categories: Array.from(categorySet) }
    }

    // Fallback to rawTransactions
    if (!rawTransactions || rawTransactions.length === 0) {
      return { slices: [] as Array<{ id: string; label: string; value: number }>, categories: [] as string[] }
    }

    const categorySet = new Set<string>()
    rawTransactions.forEach((tx) => {
      if (tx.amount < 0) {
        categorySet.add(normalizeCategoryName(tx.category))
      }
    })

    const filteredSource =
      expensesPieVisibility.hiddenCategorySet.size === 0
        ? rawTransactions
        : rawTransactions.filter((tx) => {
          const category = normalizeCategoryName(tx.category)
          return !expensesPieVisibility.hiddenCategorySet.has(category)
        })

    const categoryMap = new Map<string, number>()
    filteredSource
      .filter((tx) => tx.amount < 0)
      .forEach((tx) => {
        const category = normalizeCategoryName(tx.category)
        const current = categoryMap.get(category) || 0
        categoryMap.set(category, current + Math.abs(tx.amount))
      })

    const slices = Array.from(categoryMap.entries())
      .map(([id, value]) => ({ id, label: id, value }))
      .sort((a, b) => b.value - a.value)

    return { slices, categories: Array.from(categorySet) }
  }, [bundleData?.categorySpending, rawTransactions, expensesPieVisibility.hiddenCategorySet, normalizeCategoryName])

  const expensesPieControls = expensesPieVisibility.buildCategoryControls(expensesPieData.categories, {
    description: "Choose which expense categories appear in this pie chart.",
  })

  type SpendingTier = "Essentials" | "Mandatory" | "Wants"

  const needsWantsPieData = useMemo(() => {
    // Bundle-only mode: Use pre-computed data from Redis cache
    // No fallback to rawTransactions to avoid race conditions
    if (!bundleData?.needsWants || bundleData.needsWants.length === 0) {
      return {
        slices: [] as Array<{ id: string; label: string; value: number }>,
        categories: [] as string[],
      }
    }

    const slices = bundleData.needsWants
      .map(item => ({ id: item.classification, label: item.classification, value: item.total }))
      .filter(slice => slice.value > 0)

    return { slices, categories: bundleData.needsWants.map(n => n.classification) }
  }, [bundleData?.needsWants])

  const needsWantsControls = needsWantsVisibility.buildCategoryControls(needsWantsPieData.categories, {
    description: "Hide a category to exclude it from the Needs vs Wants grouping.",
  })

  const circlePackingData = useMemo(() => {
    // Use bundle data if available (pre-computed by server)
    if (bundleData?.categorySpending && bundleData.categorySpending.length > 0) {
      const categorySet = new Set<string>(bundleData.categorySpending.map(c => c.category))
      const filteredSpending = circlePackingVisibility.hiddenCategorySet.size === 0
        ? bundleData.categorySpending
        : bundleData.categorySpending.filter(c => !circlePackingVisibility.hiddenCategorySet.has(c.category))
      const children = filteredSpending
        .map(c => ({ name: c.category, value: c.total }))
        .filter(item => item.value > 0)
        .sort((a, b) => b.value - a.value)
      return { tree: { name: "Expenses", children }, categories: Array.from(categorySet) }
    }

    // Fallback to rawTransactions
    if (!rawTransactions || rawTransactions.length === 0) {
      return { tree: { name: "", children: [] as Array<{ name: string; value: number }> }, categories: [] as string[] }
    }

    const categoryMap = new Map<string, number>()
    const categorySet = new Set<string>()

    rawTransactions
      .filter((tx) => {
        const amount = Number(tx.amount) || 0
        return amount < 0
      })
      .forEach((tx) => {
        const rawCategory = (tx.category || "Other").trim()
        const category = normalizeCategoryName(rawCategory)
        categorySet.add(category)
        if (circlePackingVisibility.hiddenCategorySet.has(category)) return

        const current = categoryMap.get(category) || 0
        const amount = Math.abs(Number(tx.amount)) || 0
        categoryMap.set(category, current + amount)
      })

    const children = Array.from(categoryMap.entries())
      .map(([name, value]) => ({
        name,
        value: Number(value) || 0,
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)

    return {
      tree: {
        name: "Expenses",
        children,
      },
      categories: Array.from(categorySet),
    }
  }, [bundleData?.categorySpending, rawTransactions, circlePackingVisibility.hiddenCategorySet, normalizeCategoryName, dateFilter])

  const circlePackingControls = circlePackingVisibility.buildCategoryControls(
    circlePackingData.categories,
    {
      description: "Toggle categories to hide their bubbles in this packing chart.",
    }
  )

  const polarBarData = useMemo(() => {
    // Use bundle data if available for monthly category data
    if (bundleData?.monthlyCategories && bundleData.monthlyCategories.length > 0 && bundleData?.categorySpending) {
      const categorySet = new Set<string>(bundleData.categorySpending.map(c => c.category))
      const topCategories = bundleData.categorySpending
        .filter(c => !polarBarVisibility.hiddenCategorySet.has(c.category))
        .slice(0, 5)
        .map(c => c.category)

      // Group by month
      const timePeriodMap = new Map<string, Record<string, number>>()
      bundleData.monthlyCategories
        .filter(m => topCategories.includes(m.category))
        .forEach(m => {
          const monthKey = String(m.month).padStart(2, '0')
          if (!timePeriodMap.has(monthKey)) {
            const initialData: Record<string, number> = {}
            topCategories.forEach(cat => { initialData[cat] = 0 })
            timePeriodMap.set(monthKey, initialData)
          }
          timePeriodMap.get(monthKey)![m.category] = m.total
        })

      const data = Array.from(timePeriodMap.entries())
        .map(([period, values]) => ({ month: period, ...values }))
        .sort((a, b) => (a.month as string).localeCompare(b.month as string))

      return { data, keys: topCategories, categories: Array.from(categorySet) }
    }

    // Fallback to rawTransactions
    if (!rawTransactions || rawTransactions.length === 0) {
      return { data: [] as Array<Record<string, string | number>>, keys: [] as string[], categories: [] as string[] }
    }

    // Determine time granularity based on date filter
    const getTimeKey = (date: Date): string => {
      if (!dateFilter) {
        // All time: use months
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      }

      switch (dateFilter) {
        case "last7days":
          // Daily grouping for 7 days
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
        case "last30days":
          // Weekly grouping for 30 days
          const weekStart = new Date(date)
          weekStart.setDate(date.getDate() - date.getDay()) // Start of week (Sunday)
          return `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, "0")}-${String(weekStart.getDate()).padStart(2, "0")}`
        case "last3months":
        case "last6months":
          // Monthly grouping for 3 and 6 months
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        case "lastyear":
          // Monthly grouping for last year
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        default:
          // For specific years or other filters, use months
          if (/^\d{4}$/.test(dateFilter)) {
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
          }
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      }
    }

    const categoryTotals = new Map<string, number>()
    const categorySet = new Set<string>()

    rawTransactions
      .filter((tx) => {
        const amount = Number(tx.amount) || 0
        return amount < 0
      })
      .forEach((tx) => {
        const rawCategory = (tx.category || "Other").trim()
        const category = normalizeCategoryName(rawCategory)
        categorySet.add(category)
        if (polarBarVisibility.hiddenCategorySet.has(category)) return
        const current = categoryTotals.get(category) || 0
        const amount = Math.abs(Number(tx.amount)) || 0
        categoryTotals.set(category, current + amount)
      })

    if (!categoryTotals.size) {
      return { data: [], keys: [], categories: Array.from(categorySet) }
    }

    const topCategories = Array.from(categoryTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category]) => category)

    if (!topCategories.length) {
      return { data: [], keys: [], categories: Array.from(categorySet) }
    }

    const timePeriodMap = new Map<string, Record<string, number>>()

    rawTransactions
      .filter((tx) => {
        const amount = Number(tx.amount) || 0
        return amount < 0
      })
      .forEach((tx) => {
        const rawCategory = (tx.category || "Other").trim()
        const category = normalizeCategoryName(rawCategory)
        categorySet.add(category)
        if (polarBarVisibility.hiddenCategorySet.has(category)) return

        const date = new Date(tx.date)
        if (isNaN(date.getTime())) return
        const timeKey = getTimeKey(date)

        if (!timePeriodMap.has(timeKey)) {
          const initialData: Record<string, number> = {}
          topCategories.forEach((cat) => {
            initialData[cat] = 0
          })
          timePeriodMap.set(timeKey, initialData)
        }

        if (topCategories.includes(category)) {
          const periodData = timePeriodMap.get(timeKey)!
          periodData[category] = (periodData[category] || 0) + Math.abs(Number(tx.amount)) || 0
        }
      })

    const data = Array.from(timePeriodMap.entries())
      .map(([period, values]) => ({
        month: period, // Keep 'month' key for compatibility with chart component
        ...values,
      }))
      .sort((a, b) => (a.month as string).localeCompare(b.month as string))

    return {
      data,
      keys: topCategories,
      categories: Array.from(categorySet),
    }
  }, [bundleData?.monthlyCategories, bundleData?.categorySpending, rawTransactions, polarBarVisibility.hiddenCategorySet, normalizeCategoryName, dateFilter])

  const polarBarControls = polarBarVisibility.buildCategoryControls(polarBarData.categories, {
    description: "Hide categories to declutter this polar bar view.",
  })

  const spendingStreamData = useMemo(() => {
    // Use bundle data if available for monthly category data (pre-aggregated by SQL)
    if (bundleData?.monthlyByCategory && bundleData.monthlyByCategory.length > 0) {
      const categoryTotals = new Map<string, number>()
      const categorySet = new Set<string>()
      const monthMap = new Map<string, Map<string, number>>()

      bundleData.monthlyByCategory.forEach(d => {
        categorySet.add(d.category)
        categoryTotals.set(d.category, (categoryTotals.get(d.category) || 0) + d.total)
        if (!monthMap.has(d.month)) monthMap.set(d.month, new Map())
        monthMap.get(d.month)!.set(d.category, (monthMap.get(d.month)!.get(d.category) || 0) + d.total)
      })

      const topCategories = Array.from(categoryTotals.entries())
        .filter(([cat]) => !streamgraphVisibility.hiddenCategorySet.has(cat))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 7)
        .map(([cat]) => cat)

      const data = Array.from(monthMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, cats]) => {
          const row: Record<string, string | number> = { month }
          topCategories.forEach(cat => { row[cat] = cats.get(cat) || 0 })
          return row
        })

      return { data, keys: topCategories, categories: Array.from(categorySet) }
    }

    // Fallback to rawTransactions
    if (!rawTransactions || rawTransactions.length === 0) {
      return { data: [] as Array<Record<string, string | number>>, keys: [] as string[], categories: [] as string[] }
    }

    const normalizeCategory = (value: string | undefined | null) => {
      const cleaned = (value ?? "").trim()
      if (!cleaned) return "Other"
      return cleaned
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(" ")
    }

    const monthMap = new Map<string, Map<string, number>>()
    const categoryTotals = new Map<string, number>()
    const categorySet = new Set<string>()

    rawTransactions
      .filter((tx) => tx.amount < 0)
      .forEach((tx) => {
        const date = new Date(tx.date)
        if (isNaN(date.getTime())) return

        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        const rawCategory = normalizeCategory(tx.category)
        categorySet.add(rawCategory)
        if (streamgraphVisibility.hiddenCategorySet.has(rawCategory)) return
        const amount = Math.abs(Number(tx.amount)) || 0

        if (!monthMap.has(monthKey)) {
          monthMap.set(monthKey, new Map())
        }
        const monthData = monthMap.get(monthKey)!
        monthData.set(rawCategory, (monthData.get(rawCategory) || 0) + amount)

        categoryTotals.set(rawCategory, (categoryTotals.get(rawCategory) || 0) + amount)
      })

    if (!monthMap.size || !categoryTotals.size) {
      return { data: [], keys: [], categories: Array.from(categorySet) }
    }

    const sortedCategories = Array.from(categoryTotals.entries()).sort((a, b) => b[1] - a[1])
    const topCategories = sortedCategories.slice(0, 6).map(([category]) => category)
    const includeOther = sortedCategories.length > topCategories.length
    const keys = includeOther ? [...topCategories, "Other"] : topCategories

    const months = Array.from(monthMap.keys()).sort((a, b) => a.localeCompare(b))
    const data = months.map((month) => {
      const entry: Record<string, string | number> = { month }
      const monthData = monthMap.get(month)!
      let otherTotal = 0

      monthData.forEach((value, category) => {
        if (topCategories.includes(category)) {
          entry[category] = Number(value.toFixed(2))
        } else {
          otherTotal += value
        }
      })

      if (includeOther) {
        entry["Other"] = Number(otherTotal.toFixed(2))
      }

      keys.forEach((key) => {
        if (entry[key] === undefined) {
          entry[key] = 0
        }
      })

      return entry
    })

    return { data, keys, categories: Array.from(categorySet) }
  }, [bundleData?.monthlyByCategory, rawTransactions, streamgraphVisibility.hiddenCategorySet, dateFilter])

  const streamgraphControls = streamgraphVisibility.buildCategoryControls(spendingStreamData.categories, {
    description: "Select which categories flow through this streamgraph.",
  })


  const sankeyData = useMemo(() => {
    // Bundle-only mode: Use pre-computed data from Redis cache
    // No fallback to rawTransactions to avoid race conditions
    if (!bundleData?.cashFlow || bundleData.cashFlow.nodes.length === 0) {
      return {
        graph: { nodes: [], links: [] as Array<{ source: string; target: string; value: number }> },
        categories: [] as string[]
      }
    }

    const categorySet = new Set<string>(
      bundleData.cashFlow.nodes
        .filter(n => n.id !== 'income' && n.id !== 'savings' && n.id !== 'expenses')
        .map(n => n.id)
    )
    return { graph: bundleData.cashFlow, categories: Array.from(categorySet) }
  }, [bundleData?.cashFlow])

  const sankeyControls = sankeyVisibility.buildCategoryControls(sankeyData.categories, {
    description: "Hide sources to remove them from the cash-flow Sankey.",
  })

  const activityConfig: ActivityRingsConfig = useMemo(
    () => ({
      width: 360,
      height: 360,
      radius: 70,
      ringSize: 18,
    }),
    []
  )

  const activityTheme = resolvedTheme === "light" ? "light" : "dark"

  // --- Top Summary Card Data ---

  const incomeExpenseTopChartData = useMemo(() => {
    const filteredSource =
      incomeExpenseTopVisibility.hiddenCategorySet.size === 0
        ? rawTransactions
        : rawTransactions.filter((tx) => {
          const category = normalizeCategoryName(tx.category)
          return !incomeExpenseTopVisibility.hiddenCategorySet.has(category)
        })

    const transactionsByDate = new Map<string, Array<{ amount: number }>>()
    filteredSource.forEach(tx => {
      const date = tx.date.split("T")[0]
      if (!transactionsByDate.has(date)) {
        transactionsByDate.set(date, [])
      }
      transactionsByDate.get(date)!.push({ amount: tx.amount })
    })
    const sortedDates = Array.from(transactionsByDate.keys()).sort((a, b) => a.localeCompare(b))
    const incomeByDate = new Map<string, number>()
    sortedDates.forEach(date => {
      const dayTransactions = transactionsByDate.get(date)!
      const dayIncome = dayTransactions
        .filter(tx => tx.amount > 0)
        .reduce((sum, tx) => sum + tx.amount, 0)
      if (dayIncome > 0) {
        incomeByDate.set(date, dayIncome)
      }
    })
    let cumulativeExpenses = 0
    const cumulativeExpensesByDate = new Map<string, number>()
    sortedDates.forEach(date => {
      const dayTransactions = transactionsByDate.get(date)!
      dayTransactions.forEach(tx => {
        if (tx.amount < 0) {
          cumulativeExpenses += Math.abs(tx.amount)
        } else if (tx.amount > 0) {
          cumulativeExpenses = Math.max(0, cumulativeExpenses - tx.amount)
        }
      })
      cumulativeExpensesByDate.set(date, cumulativeExpenses)
    })
    return sortedDates.map(date => ({
      date,
      desktop: incomeByDate.get(date) || 0,
      mobile: cumulativeExpensesByDate.get(date) || 0,
    }))
  }, [rawTransactions, incomeExpenseTopVisibility.hiddenCategorySet, normalizeCategoryName, dateFilter])

  const treeMapData = useMemo(() => {
    const filteredSource =
      treeMapVisibility.hiddenCategorySet.size === 0
        ? rawTransactions
        : rawTransactions.filter((tx) => {
          const category = normalizeCategoryName(tx.category)
          return !treeMapVisibility.hiddenCategorySet.has(category)
        })

    const categoryMap = new Map<string, { total: number; subcategories: Map<string, { amount: number; fullDescription: string }> }>()
    const getSubCategoryLabel = (description?: string) => {
      if (!description) return "Misc"
      const delimiterSplit = description.split(/[-??"|]/)[0] ?? description
      const trimmed = delimiterSplit.trim()
      return trimmed.length > 24 ? `${trimmed.slice(0, 21)}???` : (trimmed || "Misc")
    }
    filteredSource
      .filter(tx => tx.amount < 0)
      .forEach(tx => {
        const category = tx.category || "Other"
        const amount = Math.abs(tx.amount)
        if (!categoryMap.has(category)) {
          categoryMap.set(category, { total: 0, subcategories: new Map() })
        }
        const categoryEntry = categoryMap.get(category)!
        categoryEntry.total += amount
        const subCategory = getSubCategoryLabel(tx.description)
        const existing = categoryEntry.subcategories.get(subCategory)
        if (existing) {
          existing.amount += amount
        } else {
          categoryEntry.subcategories.set(subCategory, {
            amount,
            fullDescription: tx.description || subCategory,
          })
        }
      })
    const maxSubCategories = 5
    return {
      name: "Expenses",
      children: Array.from(categoryMap.entries())
        .map(([name, { total, subcategories }]) => {
          const sortedSubs = Array.from(subcategories.entries()).sort((a, b) => b[1].amount - a[1].amount)
          const topSubs = sortedSubs.slice(0, maxSubCategories)
          const remainingTotal = sortedSubs.slice(maxSubCategories).reduce((sum, [, value]) => sum + value.amount, 0)
          const children = topSubs.map(([subName, { amount: loc, fullDescription }]) => ({
            name: subName,
            loc,
            fullDescription,
          }))
          if (remainingTotal > 0) {
            children.push({ name: "Other", loc: remainingTotal, fullDescription: "Other transactions" })
          }
          return {
            name,
            children: children.length > 0 ? children : [{ name, loc: total, fullDescription: name }],
          }
        })
        .sort((a, b) => {
          const aTotal = a.children.reduce((sum, child) => sum + (child.loc || 0), 0)
          const bTotal = b.children.reduce((sum, child) => sum + (child.loc || 0), 0)
          return bTotal - aTotal
        }),
    }
  }, [rawTransactions, treeMapVisibility.hiddenCategorySet, normalizeCategoryName, dateFilter])

  const dayOfWeekSpendingControls = useMemo(() => {
    const categories = Array.from(
      new Set(
        rawTransactions
          .filter((tx) => Number(tx.amount) < 0)
          .map((tx) => normalizeCategoryName(tx.category)),
      ),
    ).sort()
    return dayOfWeekSpendingVisibility.buildCategoryControls(categories)
  }, [rawTransactions, dayOfWeekSpendingVisibility, normalizeCategoryName])

  const monthOfYearSpendingControls = useMemo(() => {
    const categories = Array.from(
      new Set(
        rawTransactions
          .filter((tx) => Number(tx.amount) < 0)
          .map((tx) => normalizeCategoryName(tx.category)),
      ),
    ).sort()
    return monthOfYearSpendingVisibility.buildCategoryControls(categories)
  }, [rawTransactions, monthOfYearSpendingVisibility, normalizeCategoryName])

  const swarmPlotData = useMemo(() => {
    // Use bundle data if available (pre-computed by server)
    if (bundleData?.transactionHistory && bundleData.transactionHistory.length > 0) {
      return bundleData.transactionHistory.map((tx: BundleTransaction, index: number) => ({
        id: `tx-${tx.id || index}`,
        group: tx.category || "Other",
        price: Math.abs(tx.amount),
        volume: Math.max(4, Math.min(20, Math.round(Math.abs(tx.amount) / 50))),
        category: tx.category || "Other",
        color: tx.color,
        date: tx.date.split("T")[0],
        description: tx.description,
      }))
    }

    // Fallback to rawTransactions if bundle not available
    if (!rawTransactions || rawTransactions.length === 0) {
      return []
    }
    return rawTransactions
      .filter((tx) => tx.amount < 0)
      .map((tx, index) => ({
        id: tx.id ? `tx-${tx.id}` : `tx-${index}`,
        group: tx.category || "Other",
        price: Math.abs(tx.amount),
        volume: Math.max(4, Math.min(20, Math.round(Math.abs(tx.amount) / 50))),
        category: tx.category || "Other",
        color: null,
        date: tx.date.split("T")[0],
        description: tx.description,
      }))
  }, [bundleData?.transactionHistory, rawTransactions, dateFilter])

  return {
    activityConfig,
    activityData,
    activityTheme,
    allExpenseCategories,
    categoryFlowChart,
    categoryFlowControls,
    circlePackingControls,
    circlePackingData,
    dayOfWeekSpendingControls,
    expensesPieControls,
    expensesPieData,
    incomeExpenseChart,
    incomeExpenseControls,
    incomeExpenseTopChartData,
    incomeExpenseTopControls,
    moneyFlowMaxExpenseCategories,
    monthOfYearSpendingControls,
    needsWantsControls,
    needsWantsPieData,
    polarBarControls,
    polarBarData,
    sankeyControls,
    sankeyData,
    spendingFunnelChart,
    spendingFunnelControls,
    spendingStreamData,
    streamgraphControls,
    swarmPlotData,
    treeMapControls,
    treeMapData,
    ringCategories,
    setRingCategories,
  }
}
