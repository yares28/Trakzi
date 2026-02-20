import { useCallback, useEffect, useMemo, useState } from "react"
import type { Dispatch, SetStateAction } from "react"
import { useTheme } from "next-themes"

import { useColorScheme } from "@/components/color-scheme-provider"
import { useChartCategoryVisibility } from "@/hooks/use-chart-category-visibility"

import type {
  ActivityRingsConfig,
  ActivityRingsData,
  HomeTransaction,
} from "../types"
import { getSubCategoryLabel, normalizeCategoryName } from "../utils/categories"

type StreamgraphData = {
  data: Array<Record<string, string | number>>
  keys: string[]
  categories: string[]
}

export type HomeChartData = {
  chartTransactions: HomeTransaction[]
  incomeExpenseControls: ReturnType<
    ReturnType<typeof useChartCategoryVisibility>["buildCategoryControls"]
  >
  categoryFlowControls: ReturnType<
    ReturnType<typeof useChartCategoryVisibility>["buildCategoryControls"]
  >
  spendingFunnelControls: ReturnType<
    ReturnType<typeof useChartCategoryVisibility>["buildCategoryControls"]
  >
  expensesPieControls: ReturnType<
    ReturnType<typeof useChartCategoryVisibility>["buildCategoryControls"]
  >
  treeMapControls: ReturnType<
    ReturnType<typeof useChartCategoryVisibility>["buildCategoryControls"]
  >
  streamgraphControls: ReturnType<
    ReturnType<typeof useChartCategoryVisibility>["buildCategoryControls"]
  >
  sankeyControls: ReturnType<
    ReturnType<typeof useChartCategoryVisibility>["buildCategoryControls"]
  >
  incomeExpensesChartData: Array<{ date: string; desktop: number; mobile: number }>
  categoryFlowChartData: Array<{ id: string; data: Array<{ x: string; y: number }> }>
  spendingFunnelChartData: Array<{ id: string; value: number; label: string }>
  expensesPieChartData: Array<{ id: string; label: string; value: number }>
  polarBarChartData: { data: Array<Record<string, string | number>>; keys: string[] }
  spendingStreamData: StreamgraphData
  sankeyData: {
    graph: {
      nodes: Array<{ id: string; label?: string }>
      links: Array<{ source: string; target: string; value: number }>
    }
    categories: string[]
  }
  treeMapChartData: {
    name: string
    children: Array<{ name: string; children: Array<{ name: string; loc: number; fullDescription: string }> }>
  }
  activityData: ActivityRingsData
  activityConfig: ActivityRingsConfig
  activityTheme: "light" | "dark"
  ringLimits: Record<string, number>
  setRingLimits: Dispatch<SetStateAction<Record<string, number>>>
  ringCategories: string[]
  setRingCategories: Dispatch<SetStateAction<string[]>>
  allExpenseCategories: string[]
  getDefaultRingLimit: (filter: string | null) => number
}

type UseHomeChartDataOptions = {
  transactions: HomeTransaction[]
  dateFilter: string | null
}

export function useHomeChartData({
  transactions,
  dateFilter,
}: UseHomeChartDataOptions): HomeChartData {
  const chartTransactions = transactions
  const { resolvedTheme } = useTheme()
  const { getPalette } = useColorScheme()
  const palette = getPalette()

  const [ringLimits, setRingLimits] = useState<Record<string, number>>({})
  const [ringCategories, setRingCategories] = useState<string[]>([])

  const allExpenseCategories = useMemo(() => {
    const categories = new Set<string>()
    chartTransactions
      .filter((tx) => tx.amount < 0)
      .forEach((tx) => {
        const category = normalizeCategoryName(tx.category)
        categories.add(category)
      })
    return Array.from(categories).sort((a, b) => a.localeCompare(b))
  }, [chartTransactions])

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("activityRingLimits")
        if (saved) {
          setRingLimits(JSON.parse(saved))
        }
      } catch (error) {
        console.error("Failed to load ring limits:", error)
      }
    }
  }, [])

  const getDefaultRingLimit = useCallback((filter: string | null) => {
    const isYearLike =
      !filter || filter === "lastyear" || /^\d{4}$/.test(filter)
    return isYearLike ? 5000 : 2000
  }, [])

  const activityData: ActivityRingsData = useMemo(() => {
    if (!chartTransactions || chartTransactions.length === 0) {
      return []
    }

    const categoryTotals = new Map<string, number>()
    chartTransactions
      .filter((tx) => tx.amount < 0)
      .forEach((tx) => {
        const category = normalizeCategoryName(tx.category)
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

    const defaultTopCategories = Array.from(categoryTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([category]) => category)

    const categoriesToUse =
      ringCategories && ringCategories.length > 0
        ? ringCategories
        : defaultTopCategories.slice(0, 5)

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
      const pct = ratioToLimit !== null ? (ratioToLimit * 100).toFixed(1) : "0"

      return {
        label:
          ratioToLimit !== null
            ? `Category: ${category}\nUsed: ${pct}%\nSpent: $${amount.toFixed(
              2
            )}\nBudget: $${effectiveLimit.toFixed(2)}${exceeded ? "\nExceeded" : ""
            }`
            : `Category: ${category}\nSpent: $${amount.toFixed(
              2
            )}\nNo budget set`,
        category,
        spent: amount,
        value,
        color,
      }
    })
  }, [chartTransactions, palette, ringCategories, ringLimits, dateFilter, getDefaultRingLimit])

  const activityConfig: ActivityRingsConfig = useMemo(
    () => ({
      width: 400,
      height: 400,
      radius: 32,
      ringSize: 12,
    }),
    []
  )

  const activityTheme = resolvedTheme === "dark" ? "dark" : "light"

  const incomeExpenseVisibility = useChartCategoryVisibility({
    chartId: "home:income-expense",
    storageScope: "home",
    normalizeCategory: normalizeCategoryName,
  })

  const categoryFlowVisibility = useChartCategoryVisibility({
    chartId: "home:category-flow",
    storageScope: "home",
    normalizeCategory: normalizeCategoryName,
  })

  const spendingFunnelVisibility = useChartCategoryVisibility({
    chartId: "home:spending-funnel",
    storageScope: "home",
    normalizeCategory: normalizeCategoryName,
  })

  const expensesPieVisibility = useChartCategoryVisibility({
    chartId: "home:expenses-pie",
    storageScope: "home",
    normalizeCategory: normalizeCategoryName,
  })

  const treeMapVisibility = useChartCategoryVisibility({
    chartId: "home:treemap",
    storageScope: "home",
    normalizeCategory: normalizeCategoryName,
  })

  const streamgraphVisibility = useChartCategoryVisibility({
    chartId: "home:streamgraph",
    storageScope: "home",
    normalizeCategory: normalizeCategoryName,
  })

  const sankeyVisibility = useChartCategoryVisibility({
    chartId: "home:sankey",
    storageScope: "home",
    normalizeCategory: normalizeCategoryName,
  })

  const incomeExpenseCategories = useMemo(() => {
    const categories = new Set<string>()
    chartTransactions.forEach((tx) => {
      categories.add(normalizeCategoryName(tx.category))
    })
    return Array.from(categories).sort((a, b) => a.localeCompare(b))
  }, [chartTransactions])

  const incomeExpenseControls = incomeExpenseVisibility.buildCategoryControls(
    incomeExpenseCategories,
    {
      description: "Hide a category to remove its transactions from this cash-flow chart.",
    }
  )

  const categoryFlowCategories = useMemo(() => {
    const categories = new Set<string>()
    chartTransactions.forEach((tx) => {
      if (tx.amount < 0) {
        categories.add(normalizeCategoryName(tx.category))
      }
    })
    return Array.from(categories).sort((a, b) => a.localeCompare(b))
  }, [chartTransactions])

  const categoryFlowControls = categoryFlowVisibility.buildCategoryControls(
    categoryFlowCategories,
    {
      description: "Hide a spending category to remove it from the ranking stream.",
    }
  )

  const spendingFunnelCategories = useMemo(() => {
    const categories = new Set<string>()
    chartTransactions
      .filter((tx) => tx.amount < 0)
      .forEach((tx) => {
        categories.add(normalizeCategoryName(tx.category))
      })
    return Array.from(categories).sort((a, b) => a.localeCompare(b))
  }, [chartTransactions])

  const spendingFunnelControls = spendingFunnelVisibility.buildCategoryControls(
    spendingFunnelCategories,
    {
      description: "Hide a category to keep it out of this funnel view only.",
    }
  )

  const expensesPieCategories = useMemo(() => {
    const categories = new Set<string>()
    chartTransactions
      .filter((tx) => tx.amount < 0)
      .forEach((tx) => {
        categories.add(normalizeCategoryName(tx.category))
      })
    return Array.from(categories).sort((a, b) => a.localeCompare(b))
  }, [chartTransactions])

  const expensesPieControls = expensesPieVisibility.buildCategoryControls(
    expensesPieCategories,
    {
      description: "Choose which expense categories appear in this pie chart.",
    }
  )

  const incomeExpensesChartData = useMemo(() => {
    const transactionsByDate = new Map<string, Array<{ amount: number }>>()
    chartTransactions.forEach((tx) => {
      const date = tx.date.split("T")[0]
      if (!transactionsByDate.has(date)) {
        transactionsByDate.set(date, [])
      }
      transactionsByDate.get(date)!.push({ amount: tx.amount })
    })

    const sortedDates = Array.from(transactionsByDate.keys()).sort((a, b) =>
      a.localeCompare(b)
    )

    const incomeByDate = new Map<string, number>()
    sortedDates.forEach((date) => {
      const dayTransactions = transactionsByDate.get(date)!
      const dayIncome = dayTransactions
        .filter((tx) => tx.amount > 0)
        .reduce((sum, tx) => sum + tx.amount, 0)
      if (dayIncome > 0) {
        incomeByDate.set(date, dayIncome)
      }
    })

    let cumulativeExpenses = 0
    const cumulativeExpensesByDate = new Map<string, number>()
    sortedDates.forEach((date) => {
      const dayTransactions = transactionsByDate.get(date)!
      dayTransactions.forEach((tx) => {
        if (tx.amount < 0) {
          cumulativeExpenses += Math.abs(tx.amount)
        } else if (tx.amount > 0) {
          cumulativeExpenses = Math.max(0, cumulativeExpenses - tx.amount)
        }
      })
      cumulativeExpensesByDate.set(date, cumulativeExpenses)
    })

    return sortedDates.map((date) => ({
      date,
      desktop: incomeByDate.get(date) || 0,
      mobile: cumulativeExpensesByDate.get(date) || 0,
    }))
  }, [chartTransactions])

  const categoryFlowChartData = useMemo(() => {
    if (!chartTransactions || chartTransactions.length === 0) return []
    const categoryMap = new Map<string, Map<string, number>>()
    const allMonths = new Set<string>()
    // Only include expenses (negative amounts) — no income categories
    chartTransactions.filter((tx) => tx.amount < 0).forEach((tx) => {
      const category = tx.category || "Other"
      const normalizedCategory = normalizeCategoryName(category)
      if (categoryFlowVisibility.hiddenCategorySet.has(normalizedCategory)) return
      const date = new Date(tx.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      allMonths.add(monthKey)
      if (!categoryMap.has(category)) {
        categoryMap.set(category, new Map())
      }
      const monthMap = categoryMap.get(category)!
      const current = monthMap.get(monthKey) || 0
      monthMap.set(monthKey, current + Math.abs(tx.amount))
    })
    const sortedMonths = Array.from(allMonths).sort((a, b) => a.localeCompare(b))
    const monthTotals = new Map<string, number>()
    sortedMonths.forEach((month) => {
      let total = 0
      categoryMap.forEach((months) => {
        total += months.get(month) || 0
      })
      monthTotals.set(month, total)
    })
    return Array.from(categoryMap.entries())
      .map(([category, months]) => ({
        id: category,
        data: sortedMonths.map((month) => {
          const value = months.get(month) || 0
          const total = monthTotals.get(month) || 1
          const percentage = total > 0 ? (value / total) * 100 : 0
          return {
            x: month,
            y: Math.max(percentage, 0.1),
          }
        }),
      }))
      .filter((series) =>
        series.data.some((d) => {
          const month = d.x
          const originalValue = categoryMap.get(series.id)?.get(month) || 0
          return originalValue > 0
        })
      )
  }, [chartTransactions, categoryFlowVisibility.hiddenCategorySet])

  const spendingFunnelChartData = useMemo(() => {
    const totalIncome = chartTransactions
      .filter((tx) => tx.amount > 0)
      .reduce((sum, tx) => sum + tx.amount, 0)
    const categoryMap = new Map<string, number>()
    chartTransactions
      .filter((tx) => tx.amount < 0)
      .forEach((tx) => {
        const category = tx.category || "Other"
        const current = categoryMap.get(category) || 0
        categoryMap.set(category, current + Math.abs(tx.amount))
      })
    const totalExpenses = Array.from(categoryMap.values()).reduce(
      (sum, amount) => sum + amount,
      0
    )
    const savings = totalIncome - totalExpenses
    const sortedCategories = Array.from(categoryMap.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
    const top2Categories = sortedCategories.slice(0, 2)
    const shownExpenses = top2Categories.reduce((sum, cat) => sum + cat.amount, 0)
    const remainingExpenses = totalExpenses - shownExpenses
    const expenseCategories: Array<{ id: string; value: number; label: string }> = []
    top2Categories.forEach((cat) => {
      expenseCategories.push({
        id: cat.category.toLowerCase().replace(/\s+/g, "-"),
        value: cat.amount,
        label: cat.category,
      })
    })
    if (remainingExpenses > 0) {
      expenseCategories.push({
        id: "others",
        value: remainingExpenses,
        label: "Others",
      })
    }
    expenseCategories.sort((a, b) => b.value - a.value)
    const funnelData: Array<{ id: string; value: number; label: string }> = []
    if (totalIncome > 0) {
      funnelData.push({ id: "income", value: totalIncome, label: "Income" })
    }
    funnelData.push(...expenseCategories)
    if (savings > 0) {
      funnelData.push({ id: "savings", value: savings, label: "Savings" })
    }
    return funnelData.filter((item) => item.value > 0)
  }, [chartTransactions])

  const expensesPieChartData = useMemo(() => {
    const categoryMap = new Map<string, number>()
    chartTransactions
      .filter((tx) => tx.amount < 0)
      .forEach((tx) => {
        const category = tx.category || "Other"
        const current = categoryMap.get(category) || 0
        categoryMap.set(category, current + Math.abs(tx.amount))
      })
    return Array.from(categoryMap.entries())
      .map(([id, value]) => ({ id, label: id, value }))
      .sort((a, b) => b.value - a.value)
  }, [chartTransactions])

  const polarBarChartData = useMemo(() => {
    if (!expensesPieChartData.length) {
      return { data: [] as Array<Record<string, string | number>>, keys: [] as string[] }
    }

    const row: Record<string, string | number> = { month: "All" }
    const uniqueKeys = new Set<string>()

    expensesPieChartData.forEach(({ label, value }) => {
      const safeLabel = (label ?? "Other").toString().trim() || "Other"
      if (uniqueKeys.has(safeLabel)) return
      uniqueKeys.add(safeLabel)
      row[safeLabel] = value ?? 0
    })

    return { data: [row], keys: Array.from(uniqueKeys) }
  }, [expensesPieChartData])

  const spendingStreamData = useMemo<StreamgraphData>(() => {
    if (!chartTransactions || chartTransactions.length === 0) {
      return { data: [], keys: [], categories: [] }
    }

    const monthMap = new Map<string, Map<string, number>>()
    const categoryTotals = new Map<string, number>()
    const categorySet = new Set<string>()

    chartTransactions
      .filter((tx) => tx.amount < 0)
      .forEach((tx) => {
        const date = new Date(tx.date)
        if (isNaN(date.getTime())) return

        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        const rawCategory = normalizeCategoryName(tx.category)
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
  }, [chartTransactions, streamgraphVisibility.hiddenCategorySet])

  const streamgraphControls = streamgraphVisibility.buildCategoryControls(
    spendingStreamData.categories,
    {
      description: "Select which categories flow through this streamgraph.",
    }
  )

  // Sankey data computation from transactions
  // Uses 3-layer model: Income Sources → Total Cash → Expenses/Savings
  const sankeyData = useMemo(() => {
    if (!chartTransactions || chartTransactions.length === 0) {
      return {
        graph: { nodes: [], links: [] as Array<{ source: string; target: string; value: number }> },
        categories: [] as string[]
      }
    }

    // Group income by category (source)
    const incomeByCategoryMap = new Map<string, number>()
    chartTransactions
      .filter((tx) => tx.amount > 0)
      .forEach((tx) => {
        const category = normalizeCategoryName(tx.category) || "Income"
        const current = incomeByCategoryMap.get(category) || 0
        incomeByCategoryMap.set(category, current + tx.amount)
      })

    // Group expenses by category
    const expenseByCategoryMap = new Map<string, number>()
    chartTransactions
      .filter((tx) => tx.amount < 0)
      .forEach((tx) => {
        const category = normalizeCategoryName(tx.category)
        if (sankeyVisibility.hiddenCategorySet.has(category)) return
        const current = expenseByCategoryMap.get(category) || 0
        expenseByCategoryMap.set(category, current + Math.abs(tx.amount))
      })

    // Calculate totals
    const totalIncome = Array.from(incomeByCategoryMap.values()).reduce((sum, v) => sum + v, 0)
    const totalExpenses = Array.from(expenseByCategoryMap.values()).reduce((sum, v) => sum + v, 0)
    const savings = Math.max(0, totalIncome - totalExpenses)

    // Build nodes and links using 3-layer flow model
    const nodes: Array<{ id: string; label?: string }> = []
    const links: Array<{ source: string; target: string; value: number }> = []

    // Layer 1: Income sources (left side) - top 5
    const sortedIncomeSources = Array.from(incomeByCategoryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    for (const [category, amount] of sortedIncomeSources) {
      if (amount > 0) {
        nodes.push({ id: `income-${category}`, label: category })
        // Connect income source to "Total Cash" central node
        links.push({
          source: `income-${category}`,
          target: "total-cash",
          value: Math.round(amount * 100) / 100,
        })
      }
    }

    // Layer 2: Central node - Total Cash (middle)
    nodes.push({ id: "total-cash", label: "Total Cash" })

    // Layer 3: Expenses (right side) - top 8
    const sortedExpenses = Array.from(expenseByCategoryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)

    for (const [category, amount] of sortedExpenses) {
      if (amount > 0) {
        nodes.push({ id: `expense-${category}`, label: category })
        // Connect "Total Cash" to each expense category
        links.push({
          source: "total-cash",
          target: `expense-${category}`,
          value: Math.round(amount * 100) / 100,
        })
      }
    }

    // Add savings if positive
    if (savings > 0) {
      nodes.push({ id: "savings", label: "Savings" })
      links.push({
        source: "total-cash",
        target: "savings",
        value: Math.round(savings * 100) / 100,
      })
    }

    const categories = Array.from(expenseByCategoryMap.keys())

    return { graph: { nodes, links }, categories }
  }, [chartTransactions, sankeyVisibility.hiddenCategorySet, normalizeCategoryName])

  const sankeyControls = sankeyVisibility.buildCategoryControls(sankeyData.categories, {
    description: "Hide categories to remove them from the cash flow Sankey.",
  })

  const treeMapChartData = useMemo(() => {
    const categoryMap = new Map<
      string,
      { total: number; subcategories: Map<string, { amount: number; fullDescription: string }> }
    >()

    chartTransactions
      .filter((tx) => tx.amount < 0)
      .forEach((tx) => {
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
          const sortedSubs = Array.from(subcategories.entries()).sort(
            (a, b) => b[1].amount - a[1].amount
          )
          const topSubs = sortedSubs.slice(0, maxSubCategories)
          const remainingTotal = sortedSubs
            .slice(maxSubCategories)
            .reduce((sum, [, value]) => sum + value.amount, 0)
          const children = topSubs.map(([subName, { amount: loc, fullDescription }]) => ({
            name: subName,
            loc,
            fullDescription,
          }))
          if (remainingTotal > 0) {
            children.push({
              name: "Other",
              loc: remainingTotal,
              fullDescription: "Other transactions",
            })
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
  }, [chartTransactions])

  const treeMapCategories = useMemo(() => {
    const categories = new Set<string>()
    chartTransactions
      .filter((tx) => tx.amount < 0)
      .forEach((tx) => {
        categories.add(normalizeCategoryName(tx.category))
      })
    return Array.from(categories).sort((a, b) => a.localeCompare(b))
  }, [chartTransactions])

  const treeMapControls = treeMapVisibility.buildCategoryControls(
    treeMapCategories,
    {
      description: "Hide categories to remove them from this treemap view.",
    }
  )

  return {
    chartTransactions,
    incomeExpenseControls,
    categoryFlowControls,
    spendingFunnelControls,
    expensesPieControls,
    treeMapControls,
    streamgraphControls,
    sankeyControls,
    incomeExpensesChartData,
    categoryFlowChartData,
    spendingFunnelChartData,
    expensesPieChartData,
    polarBarChartData,
    spendingStreamData,
    sankeyData,
    treeMapChartData,
    activityData,
    activityConfig,
    activityTheme,
    ringLimits,
    setRingLimits,
    ringCategories,
    setRingCategories,
    allExpenseCategories,
    getDefaultRingLimit,
  }
}
