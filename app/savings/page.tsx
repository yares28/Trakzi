"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
// @dnd-kit for drag-and-drop with auto-scroll (for future charts)
import { SortableGridProvider, SortableGridItem } from "@/components/sortable-grid"
import { AppSidebar } from "@/components/app-sidebar"
import { ChartSavingsAccumulation } from "@/components/chart-savings-accumulation"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { toast } from "sonner"
import { normalizeTransactions } from "@/lib/utils"
import { getChartCardSize, type ChartId } from "@/lib/chart-card-sizes.config"

// Persistence keys
const SAVINGS_ORDER_STORAGE_KEY = "savings-chart-order"
const SAVINGS_SIZES_STORAGE_KEY = "savings-chart-sizes"
const DEFAULT_SAVINGS_ORDER = ["savingsAccumulation"]

export default function Page() {
  // Transactions state
  const [transactions, setTransactions] = useState<Array<{
    id: number
    date: string
    description: string
    amount: number
    balance: number | null
    category: string
  }>>([])

  // Date filter state
  const [dateFilter, setDateFilter] = useState<string | null>(null)

  // @dnd-kit: Chart order and sizes state
  const [chartOrder, setChartOrder] = useState<string[]>(DEFAULT_SAVINGS_ORDER)
  const [savedChartSizes, setSavedChartSizes] = useState<Record<string, { w: number; h: number }>>({})

  // Load saved order and sizes on mount
  useEffect(() => {
    try {
      const savedOrder = localStorage.getItem(SAVINGS_ORDER_STORAGE_KEY)
      if (savedOrder) {
        setChartOrder(JSON.parse(savedOrder))
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

  // Fetch transactions for charts - filter for savings category only
  const fetchTransactions = useCallback(async () => {
    try {
      // Build URL with both date filter and category filter for savings
      const params = new URLSearchParams()
      params.append("all", "true")  // Fetch all for charts
      if (dateFilter) {
        params.append("filter", dateFilter)
      }
      params.append("category", "Savings") // Only show savings category transactions

      const url = `/api/transactions?${params.toString()}`
      console.log("[Savings] Fetching transactions from:", url)
      const response = await fetch(url)
      const data = await response.json()

      if (response.ok) {
        // API always returns {data: [], pagination: {}} format
        const txArray = data?.data ?? []
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
        console.error("Failed to fetch transactions: HTTP", response.status, data)
        if (response.status === 401) {
          toast.error("Authentication Error", {
            description: "Please configure DEMO_USER_ID in .env.local",
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

  // Fetch transactions on mount and when filter changes
  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  // Listen for date filter changes from SiteHeader
  useEffect(() => {
    const handleFilterChange = (event: CustomEvent) => {
      setDateFilter(event.detail)
    }

    window.addEventListener("dateFilterChanged", handleFilterChange as EventListener)

    // Load initial filter from localStorage
    const savedFilter = localStorage.getItem("dateFilter")
    if (savedFilter) {
      setDateFilter(savedFilter)
    }

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

    // Calculate current period stats (all transactions when no filter, or filtered)
    const currentIncome = transactions
      .filter(tx => tx.amount > 0)
      .reduce((sum, tx) => sum + tx.amount, 0)

    const currentExpenses = Math.abs(transactions
      .filter(tx => tx.amount < 0)
      .reduce((sum, tx) => sum + tx.amount, 0))

    const currentSavingsRate = currentIncome > 0
      ? ((currentIncome - currentExpenses) / currentIncome) * 100
      : 0

    // Net worth is calculated as income minus expenses
    const netWorth = currentIncome - currentExpenses

    // Calculate previous period for comparison (last 3 months vs previous 3 months)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const threeMonthsAgo = new Date(today)
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    const sixMonthsAgo = new Date(threeMonthsAgo)
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 3)

    const formatDate = (date: Date) => date.toISOString().split('T')[0]
    const threeMonthsAgoStr = formatDate(threeMonthsAgo)
    const sixMonthsAgoStr = formatDate(sixMonthsAgo)

    // Previous period transactions (3-6 months ago)
    const previousTransactions = transactions.filter(tx => {
      const txDate = tx.date.split('T')[0]
      return txDate >= sixMonthsAgoStr && txDate < threeMonthsAgoStr
    })

    const previousIncome = previousTransactions
      .filter(tx => tx.amount > 0)
      .reduce((sum, tx) => sum + tx.amount, 0)

    const previousExpenses = Math.abs(previousTransactions
      .filter(tx => tx.amount < 0)
      .reduce((sum, tx) => sum + tx.amount, 0))

    const previousSavingsRate = previousIncome > 0
      ? ((previousIncome - previousExpenses) / previousIncome) * 100
      : 0

    // Previous net worth is also calculated as income minus expenses
    const previousNetWorth = previousIncome - previousExpenses

    // Calculate percentage changes
    const incomeChange = previousIncome > 0
      ? ((currentIncome - previousIncome) / previousIncome) * 100
      : (currentIncome > 0 ? 100 : 0)

    const expensesChange = previousExpenses > 0
      ? ((currentExpenses - previousExpenses) / previousExpenses) * 100
      : (currentExpenses > 0 ? 100 : 0)

    const savingsRateChange = previousSavingsRate !== 0
      ? currentSavingsRate - previousSavingsRate
      : (currentSavingsRate > 0 ? 100 : 0)

    const netWorthChange = previousNetWorth > 0
      ? ((netWorth - previousNetWorth) / previousNetWorth) * 100
      : (netWorth > 0 ? 100 : 0)

    return {
      totalIncome: currentIncome,
      totalExpenses: currentExpenses,
      savingsRate: currentSavingsRate,
      netWorth: netWorth,
      incomeChange: incomeChange,
      expensesChange: expensesChange,
      savingsRateChange: savingsRateChange,
      netWorthChange: netWorthChange
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

  // Transform transactions into chart data format (daily aggregates)
  const chartData = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return []
    }

    // Group transactions by date
    const dailyData = transactions.reduce((acc, tx) => {
      const date = tx.date.split('T')[0] // Get YYYY-MM-DD format
      if (!acc[date]) {
        acc[date] = { date, income: 0, expenses: 0, savings: 0 }
      }

      if (tx.amount > 0) {
        acc[date].income += tx.amount
      } else {
        acc[date].expenses += Math.abs(tx.amount)
      }

      return acc
    }, {} as Record<string, { date: string; income: number; expenses: number; savings: number }>)

    // Convert to array and calculate cumulative savings
    const sortedDates = Object.keys(dailyData).sort()
    let cumulativeSavings = 0

    return sortedDates.map(date => {
      const day = dailyData[date]
      cumulativeSavings += day.income - day.expenses
      return {
        date: day.date,
        income: day.income,
        expenses: day.expenses,
        savings: cumulativeSavings
      }
    })
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
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
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
              />
              {/* @dnd-kit chart grid */}
              <div className="px-4 lg:px-6">
                <SortableGridProvider
                  chartOrder={chartOrder}
                  onOrderChange={handleOrderChange}
                >
                  {chartOrder.map((chartId) => {
                    const sizeConfig = getChartCardSize(chartId as ChartId)
                    const savedSize = savedChartSizes[chartId]
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
                        {chartId === 'savingsAccumulation' && (
                          <ChartSavingsAccumulation data={chartData} />
                        )}
                      </SortableGridItem>
                    )
                  })}
                </SortableGridProvider>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}


