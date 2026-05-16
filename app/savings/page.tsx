"use client"

import { useState, useCallback, useEffect, useMemo, useRef } from "react"
// @dnd-kit for drag-and-drop with auto-scroll (for future charts)
import { SortableGridProvider, SortableGridItem } from "@/components/sortable-grid"
import { AppSidebar } from "@/components/app-sidebar"
import { ChartSavingsAccumulation } from "@/components/chart-savings-accumulation"
import { DebtManagerPanel } from "@/components/debt-manager-panel"
import { ChartSavingsRateTrend } from "@/components/test-charts/chart-savings-rate-trend"
import { ChartNetWorthTrend } from "@/components/test-charts/chart-net-worth-trend"
import { NetWorthCalculatorPanel } from "@/components/net-worth-calculator-panel"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { normalizeTransactions } from "@/lib/utils"
import { demoFetch } from "@/lib/demo/demo-fetch"
import { cn } from "@/lib/utils"
import { getChartCardSize, type ChartId } from "@/lib/chart-card-sizes.config"
import { MortgageCalculator } from "./_page/mortgage/MortgageCalculator"
import {
  FALLBACK_DATE_FILTER,
  getPeriodDaysFromFilter,
  isValidDateFilterValue,
  normalizeDateFilterValue,
} from "@/lib/date-filter"
import { useDebtAccountsData, useHomeBundleData, usePocketsBundleData, useSavingsBundleData } from "@/hooks/use-dashboard-data"
import { PageEmptyState, SAVINGS_EMPTY_STATE } from "@/components/page-empty-state"
import { CollapsedChartCard } from "@/components/collapsed-chart-card"
import { computeSavingsScore } from "@/lib/savings-score"
import { GoalWizardCard } from "@/components/chat/goal-wizard-card"
import { SavingsGoalsPanel } from "@/components/savings-goals-panel"
import { BudgetsPanel } from "@/components/budgets/BudgetsPanel"
import { AnimatePresence, m } from "framer-motion"
import { summarizeGoals, type GoalContext } from "@/lib/goals"
import { computeDefaultNetWorth } from "@/lib/net-worth"
import type { GoalRecord } from "@/lib/types/goals"
import type { GoalComposerDefaults, GoalFinancialProfile } from "@/components/chat/goal-wizard-card"

type SavingsViewMode = "savings" | "netWorth" | "debt" | "calculator" | "goals" | "budgets"

// Persistence keys
const SAVINGS_ORDER_STORAGE_KEY = "savings-chart-order"
const SAVINGS_SIZES_STORAGE_KEY = "savings-chart-sizes"
const SAVINGS_VIEW_MODE_STORAGE_KEY = "savings-view-mode"
const DEFAULT_SAVINGS_ORDER = ["savingsAccumulation", "savingsRateTrend"]

export default function Page() {
  const [viewMode, setViewMode] = useState<SavingsViewMode>("savings")
  // Transactions state
  const [transactions, setTransactions] = useState<Array<{
    id: number
    date: string
    description: string
    amount: number
    balance: number | null
    category: string
  }>>([])
  const [goalTransactions, setGoalTransactions] = useState<Array<{
    id: number
    date: string
    description: string
    amount: number
    category: string
  }>>([])
  const [goalTransactionsLoading, setGoalTransactionsLoading] = useState(false)
  const [goalTransactionsError, setGoalTransactionsError] = useState<string | null>(null)

  // Date filter state
  const [dateFilter, setDateFilter] = useState<string | null>(null)

  // @dnd-kit: Chart order and sizes state
  const [chartOrder, setChartOrder] = useState<string[]>(DEFAULT_SAVINGS_ORDER)
  const [savedChartSizes, setSavedChartSizes] = useState<Record<string, { w: number; h: number }>>({})

  // Load saved view mode from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SAVINGS_VIEW_MODE_STORAGE_KEY)
      if (saved === "savings" || saved === "netWorth" || saved === "debt" || saved === "calculator" || saved === "goals" || saved === "budgets") {
        setViewMode(saved)
      }
    } catch (e) {
      console.error("[Savings] Failed to load view mode from localStorage:", e)
    }
  }, [])

  // Load saved order and sizes on mount
  useEffect(() => {
    try {
      const savedOrder = localStorage.getItem(SAVINGS_ORDER_STORAGE_KEY)
      if (savedOrder) {
        const parsed = JSON.parse(savedOrder)
        if (Array.isArray(parsed)) {
          const validCharts = parsed.filter((id): id is string => DEFAULT_SAVINGS_ORDER.includes(id))
          const missingCharts = DEFAULT_SAVINGS_ORDER.filter((id) => !validCharts.includes(id))
          setChartOrder([...validCharts, ...missingCharts])
        }
      }

      const savedSizes = localStorage.getItem(SAVINGS_SIZES_STORAGE_KEY)
      if (savedSizes) {
        setSavedChartSizes(JSON.parse(savedSizes))
      }
    } catch (e) {
      console.error("[Savings] Failed to load layout from localStorage:", e)
    }
  }, [])

  // Handlers for persistence
  const handleOrderChange = useCallback((newOrder: string[]) => {
    setChartOrder(newOrder)
    try {
      localStorage.setItem(SAVINGS_ORDER_STORAGE_KEY, JSON.stringify(newOrder))
    } catch (e) {
      console.error("[Savings] Failed to save chart order:", e)
    }
  }, [])

  const handleResize = useCallback((id: string, w: number, h: number) => {
    setSavedChartSizes(prev => {
      const next = { ...prev, [id]: { w, h } }
      try {
        localStorage.setItem(SAVINGS_SIZES_STORAGE_KEY, JSON.stringify(next))
      } catch (e) {
        console.error("[Savings] Failed to save chart sizes:", e)
      }
      return next
    })
  }, [])

  const handleViewModeChange = useCallback((mode: SavingsViewMode) => {
    setViewMode(mode)
    try {
      localStorage.setItem(SAVINGS_VIEW_MODE_STORAGE_KEY, mode)
    } catch (e) {
      console.error("[Savings] Failed to save view mode:", e)
    }
  }, [])

  // Goals state
  const [goals, setGoals] = useState<GoalRecord[]>([])
  const [goalsLoading, setGoalsLoading] = useState(false)
  const [goalWizardOpen, setGoalWizardOpen] = useState(false)
  const [goalWizardDefaults, setGoalWizardDefaults] = useState<GoalComposerDefaults | null>(null)
  const goalsFetchedRef = useRef(false)

  const fetchGoals = useCallback(async () => {
    setGoalsLoading(true)
    try {
      const res = await fetch("/api/chat/goals")
      if (res.ok) {
        const data = await res.json() as { goals: GoalRecord[] }
        setGoals(data.goals)
      }
    } catch { /* ignore */ }
    finally { setGoalsLoading(false) }
  }, [])

  const deleteGoal = useCallback(async (id: number) => {
    try {
      await fetch("/api/chat/goals", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      setGoals((prev) => prev.filter((g) => g.id !== id))
    } catch { /* ignore */ }
  }, [])

  const updateGoalStatus = useCallback(async (id: number, status: "active" | "completed" | "archived") => {
    try {
      const res = await fetch("/api/chat/goals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      })

      if (!res.ok) return

      setGoals((prev) => prev.map((goal) => (goal.id === id ? { ...goal, status } : goal)))
    } catch { /* ignore */ }
  }, [])

  const openGoalWizard = useCallback((defaults?: GoalComposerDefaults | null) => {
    setGoalWizardDefaults(defaults ?? null)
    setGoalWizardOpen(true)
  }, [])

  useEffect(() => {
    if ((viewMode === "goals" || viewMode === "netWorth" || viewMode === "debt") && !goalsFetchedRef.current) {
      goalsFetchedRef.current = true
      fetchGoals()
    }
  }, [viewMode, fetchGoals])

  const createGoalEntry = useCallback(async (
    goalId: number,
    draft: {
      entryType: "contribution" | "withdrawal" | "adjustment"
      amount: string
      entryDate: string
      note: string
      transactionId?: number | null
    }
  ) => {
    const amount = Number.parseFloat(draft.amount)
    if (!Number.isFinite(amount) || amount <= 0) return

    try {
      const response = await fetch(`/api/chat/goals/${goalId}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryType: draft.entryType,
          amount,
          entryDate: draft.entryDate,
          note: draft.note.trim() || null,
          transactionId: draft.transactionId ?? null,
        }),
      })

      if (!response.ok) return
      goalsFetchedRef.current = false
      fetchGoals()
    } catch {
      // ignore
    }
  }, [fetchGoals])

  // Fetch transactions for charts - filter for savings category only
  const fetchTransactions = useCallback(async () => {
    try {
      // Build URL with both date filter, category filter, and all=true for full data
      const params = new URLSearchParams()
      params.append("all", "true") // Fetch all transactions for charts
      if (dateFilter) {
        params.append("filter", dateFilter)
      }
      params.append("category", "Savings") // Only show savings category transactions

      const url = `/api/transactions?${params.toString()}`
      console.log("[Savings] Fetching transactions from:", url)
      const response = await demoFetch(url)
      const data = await response.json()

      if (response.ok) {
        // Handle paginated response {data: [], pagination: {}} or direct array
        const txArray = Array.isArray(data) ? data : (data?.data ?? [])
        if (Array.isArray(txArray)) {
          console.log(`[Savings] Setting ${txArray.length} savings transactions`)
          setTransactions(normalizeTransactions(txArray) as Array<{
            id: number
            date: string
            description: string
            amount: number
            balance: number | null
            category: string
          }>)
        } else {
          console.error("[Savings] Response is not an array:", data)
          if (data.error) {
            toast.error("API Error", {
              description: data.error,
              duration: 10000,
            })
          }
        }
      } else {
        console.error("Failed to fetch transactions: HTTP", response.status, data)
        if (response.status === 401) {
          toast.error("Authentication Error", {
            description: "Please sign in to continue.",
            duration: 10000,
          })
        } else {
          toast.error("API Error", {
            description: data.error || `HTTP ${response.status}`,
            duration: 8000,
          })
        }
      }
    } catch (error) {
      console.error("Error fetching transactions:", error)
      toast.error("Network Error", {
        description: "Failed to fetch transactions. Check your database connection.",
        duration: 8000,
      })
    }
  }, [dateFilter])

  const fetchGoalTransactions = useCallback(async () => {
    if (!dateFilter) return

    setGoalTransactionsLoading(true)
    setGoalTransactionsError(null)

    try {
      const params = new URLSearchParams()
      params.append("all", "true")
      params.append("filter", dateFilter)

      const response = await demoFetch(`/api/transactions?${params.toString()}`)
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        setGoalTransactions([])
        setGoalTransactionsError(
          typeof data?.error === "string" ? data.error : "Failed to fetch transactions"
        )
        return
      }

      const txArray = Array.isArray(data) ? data : (data?.data ?? [])
      if (!Array.isArray(txArray)) {
        setGoalTransactions([])
        setGoalTransactionsError("Unexpected transactions response")
        return
      }

      setGoalTransactions(
        normalizeTransactions(txArray).map((tx) => ({
          id: Number(tx.id),
          date: typeof tx.date === "string" ? tx.date.slice(0, 10) : "",
          description:
            typeof tx.description === "string" && tx.description.trim().length > 0
              ? tx.description
              : "Transaction",
          amount: Number(tx.amount),
          category: tx.category,
        }))
      )
    } catch {
      setGoalTransactions([])
      setGoalTransactionsError("Failed to fetch transactions")
    } finally {
      setGoalTransactionsLoading(false)
    }
  }, [dateFilter])

  // Savings bundle (savings category aggregation) for accumulation chart
  const { data: savingsBundle, isLoading: savingsBundleLoading } = useSavingsBundleData()
  const { data: homeBundle } = useHomeBundleData()
  const { data: pocketsBundle, isLoading: pocketsBundleLoading } = usePocketsBundleData()
  const { data: debtsData, isLoading: debtsLoading, refetch: refetchDebts } = useDebtAccountsData()

  const goalFinancialProfile = useMemo<GoalFinancialProfile | null>(() => {
    const totalIncome = homeBundle?.kpis.totalIncome ?? 0
    const totalExpenses = homeBundle?.kpis.totalExpense ?? 0
    if (totalIncome <= 0 && totalExpenses <= 0) return null

    const periodDays = Math.max(1, getPeriodDaysFromFilter(dateFilter ?? FALLBACK_DATE_FILTER) || 30)
    const monthlyFactor = 30.4375 / periodDays
    const monthlyIncome = totalIncome * monthlyFactor
    const monthlyExpenses = totalExpenses * monthlyFactor
    const monthlyNet = monthlyIncome - monthlyExpenses
    const savingsRate =
      totalIncome > 0
        ? (Math.max(0, totalIncome - totalExpenses) / totalIncome) * 100
        : (savingsBundle?.kpis.savingsRate ?? 0)

    return {
      monthlyIncome,
      monthlyExpenses,
      monthlyNet,
      savingsRate,
      periodDays,
    }
  }, [
    dateFilter,
    homeBundle?.kpis.totalExpense,
    homeBundle?.kpis.totalIncome,
    savingsBundle?.kpis.savingsRate,
  ])

  const netWorthSnapshot = useMemo(() => {
    return computeDefaultNetWorth({
      transactions,
      savingsTotal: savingsBundle?.kpis.totalSaved ?? 0,
      pocketsData: pocketsBundle,
      debts: debtsData?.debts ?? [],
    })
  }, [debtsData?.debts, pocketsBundle, savingsBundle?.kpis.totalSaved, transactions])

  const goalContext = useMemo<GoalContext>(() => {
    const pocketNameByKey = new Map<string, string>()
    for (const pocket of pocketsBundle?.properties ?? []) {
      pocketNameByKey.set(`property:${pocket.id}`, pocket.name)
    }
    for (const pocket of pocketsBundle?.vehicles ?? []) {
      pocketNameByKey.set(`vehicle:${pocket.id}`, pocket.name)
    }

    return {
      debtsById: new Map((debtsData?.debts ?? []).map((debt) => [debt.id, debt])),
      currentNetWorth: netWorthSnapshot.total,
      pocketNameByKey,
    }
  }, [debtsData?.debts, netWorthSnapshot.total, pocketsBundle?.properties, pocketsBundle?.vehicles])

  const goalsSummary = useMemo(() => summarizeGoals(goals, goalContext), [goalContext, goals])

  // Fetch transactions on mount and when filter changes
  useEffect(() => {
    if (!dateFilter) return
    fetchTransactions()
  }, [fetchTransactions, dateFilter])

  useEffect(() => {
    if (viewMode !== "goals" || !dateFilter) return
    void fetchGoalTransactions()
  }, [dateFilter, fetchGoalTransactions, viewMode])

  // Listen for date filter changes from SiteHeader
  useEffect(() => {
    const handleFilterChange = (event: CustomEvent) => {
      setDateFilter(normalizeDateFilterValue(event.detail))
    }

    window.addEventListener("dateFilterChanged", handleFilterChange as EventListener)

    // Load initial filter from localStorage
    const savedFilter = localStorage.getItem("dateFilter")
    const resolvedFilter = isValidDateFilterValue(savedFilter)
      ? savedFilter
      : FALLBACK_DATE_FILTER
    setDateFilter(resolvedFilter)

    return () => {
      window.removeEventListener("dateFilterChanged", handleFilterChange as EventListener)
    }
  }, [])

  // Calculate stats directly from transactions data
  const stats = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return {
        totalIncome: 0,
        totalExpenses: 0,
        savingsRate: 0,
        netWorth: 0,
        incomeChange: 0,
        expensesChange: 0,
        savingsRateChange: 0,
        netWorthChange: 0
      }
    }

    const sumPositive = (txs: typeof transactions) =>
      txs.filter(tx => tx.amount > 0).reduce((s, tx) => s + tx.amount, 0)
    const sumNegative = (txs: typeof transactions) =>
      Math.abs(txs.filter(tx => tx.amount < 0).reduce((s, tx) => s + tx.amount, 0))

    // Full-period values shown on card faces
    const totalIncome = sumPositive(transactions)
    const totalExpenses = sumNegative(transactions)
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0
    const netWorth = totalIncome - totalExpenses

    // Split transactions chronologically: first half = "previous", second half = "current"
    // This gives a within-period trend regardless of which date filter is selected.
    const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date))
    const mid = Math.floor(sorted.length / 2)
    const prevHalf = sorted.slice(0, mid)
    const currHalf = sorted.slice(mid)

    const prevIncome = sumPositive(prevHalf)
    const prevExpenses = sumNegative(prevHalf)
    const prevSavingsRate = prevIncome > 0 ? ((prevIncome - prevExpenses) / prevIncome) * 100 : 0
    const prevNetWorth = prevIncome - prevExpenses

    const currIncome = sumPositive(currHalf)
    const currExpenses = sumNegative(currHalf)
    const currSavingsRate = currIncome > 0 ? ((currIncome - currExpenses) / currIncome) * 100 : 0
    const currNetWorth = currIncome - currExpenses

    const pct = (current: number, previous: number) =>
      previous !== 0 ? ((current - previous) / Math.abs(previous)) * 100 : (current > 0 ? 100 : 0)

    return {
      totalIncome,
      totalExpenses,
      savingsRate,
      netWorth,
      incomeChange: pct(currIncome, prevIncome),
      expensesChange: pct(currExpenses, prevExpenses),
      savingsRateChange: pct(currSavingsRate, prevSavingsRate),
      netWorthChange: pct(currNetWorth, prevNetWorth),
    }
  }, [transactions])

  // Calculate trend data for stat cards (daily cumulative values)
  const statsTrends = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return {
        incomeTrend: [],
        expensesTrend: [],
        netWorthTrend: [],
      }
    }

    // Group transactions by date
    const dateData = new Map<string, { income: number; expenses: number; balance: number | null }>()

    transactions.forEach((tx) => {
      const date = tx.date.split("T")[0]
      if (!dateData.has(date)) {
        dateData.set(date, { income: 0, expenses: 0, balance: null })
      }
      const dayData = dateData.get(date)!
      if (tx.amount > 0) {
        dayData.income += tx.amount
      } else {
        dayData.expenses += Math.abs(tx.amount)
      }
      // Keep the last balance for the day
      if (tx.balance !== null && tx.balance !== undefined) {
        dayData.balance = tx.balance
      }
    })

    // Sort dates
    const sortedDates = Array.from(dateData.keys()).sort()

    // Cumulative income trend
    let cumulativeIncome = 0
    const incomeTrend = sortedDates.map(date => {
      cumulativeIncome += dateData.get(date)!.income
      return { date, value: cumulativeIncome }
    })

    // Cumulative expenses trend
    let cumulativeExpenses = 0
    const expensesTrend = sortedDates.map(date => {
      cumulativeExpenses += dateData.get(date)!.expenses
      return { date, value: cumulativeExpenses }
    })

    // Net worth trend (use balance if available, otherwise cumulative income - expenses)
    let runningBalance = 0
    const netWorthTrend = sortedDates.map(date => {
      const dayData = dateData.get(date)!
      if (dayData.balance !== null) {
        runningBalance = dayData.balance
      } else {
        runningBalance += dayData.income - dayData.expenses
      }
      return { date, value: runningBalance }
    })

    return {
      incomeTrend,
      expensesTrend,
      netWorthTrend,
    }
  }, [transactions])

  // Accumulation chart: use savings-bundle (savings category data from DB)
  const accumulationChartData = useMemo(() => {
    const chartData = savingsBundle?.chartData
    if (!chartData || chartData.length === 0) return []
    return chartData.map((point) => ({
      date: point.date,
      savings: point.cumulative,
      income: 0,
      expenses: 0,
    }))
  }, [savingsBundle?.chartData])

  const { score: savingsScore, grade: savingsGrade, trendDirection: savingsScoreTrend, scoreTrendData: savingsScoreTrendData } = useMemo(() => {
    return computeSavingsScore(transactions.map(t => ({
      date: t.date,
      amount: t.amount,
      category: t.category
    })))
  }, [transactions])

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72 - 15px)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="@container/main flex flex-1 flex-col gap-2 pt-[72px] md:pt-0 overflow-y-auto overflow-x-hidden min-w-0">
            <div className="flex flex-col gap-4 pb-4 md:gap-6 md:pb-6 min-w-0 w-full">
              {/* Top summary cards – shared layout for all modes */}
              <SectionCards
                totalIncome={stats.totalIncome}
                totalExpenses={stats.totalExpenses}
                savingsRate={stats.savingsRate}
                netWorth={stats.netWorth}
                incomeChange={stats.incomeChange}
                expensesChange={stats.expensesChange}
                savingsRateChange={stats.savingsRateChange}
                netWorthChange={stats.netWorthChange}
                incomeTrend={statsTrends.incomeTrend}
                expensesTrend={statsTrends.expensesTrend}
                netWorthTrend={statsTrends.netWorthTrend}
                savingsScore={savingsScore}
                savingsGrade={savingsGrade}
                savingsScoreTrend={savingsScoreTrend}
                savingsScoreTrendData={savingsScoreTrendData}
                savingsScoreEnabled={true}
              />

              {/* Savings / Net Worth / Debt / Calculator switch - Horizontal scroll on mobile */}
              <section>
                <div className="overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden -mx-4 px-4 lg:mx-0 lg:px-0">
                  <div className="flex justify-center">
                    <div className="inline-flex items-center gap-1 p-1 rounded-full bg-muted/50 border w-max min-w-0">
                      <button
                        type="button"
                        onClick={() => handleViewModeChange("savings")}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap shrink-0",
                          viewMode === "savings"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Savings
                      </button>
                      <button
                        type="button"
                        onClick={() => handleViewModeChange("netWorth")}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap shrink-0",
                          viewMode === "netWorth"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Net Worth
                      </button>
                      <button
                        type="button"
                        onClick={() => handleViewModeChange("debt")}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap shrink-0",
                          viewMode === "debt"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Debt
                      </button>
                      <button
                        type="button"
                        onClick={() => handleViewModeChange("calculator")}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap shrink-0",
                          viewMode === "calculator"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Calculator
                      </button>
                      <button
                        type="button"
                        onClick={() => handleViewModeChange("goals")}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap shrink-0",
                          viewMode === "goals"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Goals
                      </button>
                      <button
                        type="button"
                        onClick={() => handleViewModeChange("budgets")}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap shrink-0",
                          viewMode === "budgets"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Budgets
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {viewMode === "savings" && (
                <div className="px-4 lg:px-6 min-w-0">
                  {goalsSummary.nextGoalToFund ? (
                    <div className="mb-4 rounded-[28px] border border-border/60 bg-card/80 px-5 py-5 shadow-sm">
                      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/65">Next goal to fund</p>
                          <h3 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                            {goalsSummary.nextGoalToFund.displayLabel}
                          </h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {goalsSummary.nextGoalToFund.nextBestAction}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-full"
                          onClick={() => handleViewModeChange("goals")}
                        >
                          Open Goals
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  {!savingsBundleLoading && accumulationChartData.length === 0 && (
                    <PageEmptyState
                      icon={SAVINGS_EMPTY_STATE.icon}
                      title={SAVINGS_EMPTY_STATE.title}
                      description={SAVINGS_EMPTY_STATE.description}
                    />
                  )}

                  <SortableGridProvider
                    chartOrder={chartOrder}
                    onOrderChange={handleOrderChange}
                  >
                    {chartOrder.map((chartId) => {
                      const sizeConfig = getChartCardSize(chartId as ChartId)
                      const savedSize = savedChartSizes[chartId]

                      // Collapsed card when chart has no data
                      if (!savingsBundleLoading && accumulationChartData.length === 0) {
                        return (
                          <SortableGridItem key={chartId} id={chartId} w={6} h={1}>
                            <CollapsedChartCard
                              chartId={chartId}
                              chartTitle="Savings Accumulation"
                            />
                          </SortableGridItem>
                        )
                      }

                      return (
                        <SortableGridItem
                          key={chartId}
                          id={chartId}
                          w={(savedSize?.w ?? 12) as any}
                          h={savedSize?.h ?? sizeConfig.minH}
                          resizable
                          minW={sizeConfig.minW}
                          maxW={sizeConfig.maxW}
                          minH={sizeConfig.minH}
                          maxH={sizeConfig.maxH}
                          onResize={handleResize}
                        >
                          {chartId === "savingsAccumulation" && (
                            <ChartSavingsAccumulation
                              data={accumulationChartData}
                              isLoading={savingsBundleLoading}
                            />
                          )}
                          {chartId === "savingsRateTrend" && (
                            <ChartSavingsRateTrend data={transactions} isLoading={savingsBundleLoading} />
                          )}
                        </SortableGridItem>
                      )
                    })}
                  </SortableGridProvider>
                </div>
              )}

              {viewMode === "netWorth" && (
                <section className="px-4 lg:px-6">
                  <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-1">
                    {goalsSummary.netWorthGoal ? (
                      <div className="rounded-[28px] border border-border/60 bg-card/80 px-5 py-5 shadow-sm">
                        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/65">Net Worth Goal</p>
                            <h3 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                              {goalsSummary.netWorthGoal.displayLabel}
                            </h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {goalsSummary.netWorthGoal.nextBestAction}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-full"
                            onClick={() =>
                              openGoalWizard({
                                goalKind: "net_worth_target",
                                category: "Net Worth",
                                label: goalsSummary.netWorthGoal?.displayLabel ?? "Net Worth Goal",
                                startingAmount: netWorthSnapshot.total,
                              })
                            }
                          >
                            Update Goal
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-[28px] border border-dashed border-border/60 bg-muted/15 px-5 py-5">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/65">Net Worth Goal</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Turn your current net worth into a target and track the gap here.
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            className="rounded-full"
                            onClick={() =>
                              openGoalWizard({
                                goalKind: "net_worth_target",
                                category: "Net Worth",
                                label: "Net Worth Goal",
                                startingAmount: netWorthSnapshot.total,
                              })
                            }
                          >
                            Create Net Worth Goal
                          </Button>
                        </div>
                      </div>
                    )}
                    <NetWorthCalculatorPanel
                      transactions={transactions}
                      savingsTotal={savingsBundle?.kpis.totalSaved ?? 0}
                      pocketsData={pocketsBundle}
                      debts={debtsData?.debts ?? []}
                      onCreatePocketGoal={(goalDefaults) => openGoalWizard(goalDefaults)}
                      isLoading={savingsBundleLoading || pocketsBundleLoading || debtsLoading}
                    />
                    <ChartNetWorthTrend data={transactions} isLoading={savingsBundleLoading} />
                  </div>
                </section>
              )}

              {viewMode === "debt" && (
                <section className="px-4 lg:px-6">
                  <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-1">
                    <DebtManagerPanel
                      debts={debtsData?.debts ?? []}
                      goals={goalsSummary.debtPayoffGoals}
                      isLoading={debtsLoading}
                      onCreatePayoffGoal={(defaults) => openGoalWizard(defaults)}
                      onRefresh={() => { void refetchDebts() }}
                    />
                  </div>
                </section>
              )}

              {viewMode === "calculator" && (
                <MortgageCalculator />
              )}

              {viewMode === "budgets" && (
                <section className="px-4 lg:px-6">
                  <BudgetsPanel />
                </section>
              )}

              {viewMode === "goals" && (
                <section className="px-4 lg:px-6">
                  <SavingsGoalsPanel
                    goals={goals}
                    goalContext={goalContext}
                    isLoading={goalsLoading}
                    isComposerOpen={goalWizardOpen}
                    onAddGoal={(defaults) => openGoalWizard(defaults)}
                    onDeleteGoal={deleteGoal}
                    onUpdateStatus={updateGoalStatus}
                    onCreateEntry={createGoalEntry}
                    transactions={goalTransactions}
                    transactionsLoading={goalTransactionsLoading}
                    transactionsError={goalTransactionsError}
                    composer={
                      <AnimatePresence mode="wait" initial={false}>
                        {goalWizardOpen ? (
                          <m.div
                            key={`goal-composer-${goalWizardDefaults?.goalKind ?? "default"}-${goalWizardDefaults?.label ?? "base"}`}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                          >
                            <GoalWizardCard
                              defaults={goalWizardDefaults ?? undefined}
                              debts={debtsData?.debts ?? []}
                              pocketsData={pocketsBundle}
                              currentNetWorth={netWorthSnapshot.total}
                              financialProfile={goalFinancialProfile ?? undefined}
                              onDismiss={() => {
                                setGoalWizardOpen(false)
                                setGoalWizardDefaults(null)
                              }}
                              onSaved={() => {
                                goalsFetchedRef.current = false
                                fetchGoals()
                              }}
                            />
                          </m.div>
                        ) : null}
                      </AnimatePresence>
                    }
                  />
                </section>
              )}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
