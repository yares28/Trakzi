"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import {
  ChartCirclePacking,
  ChartPolarBar,
  ChartRadar,
  ChartRadialBar,
  ChartSankey,
  ChartStream,
  ChartSwarmPlot,
} from "@/components/analytics-advanced-charts"
import { ChartCategoryFlow } from "@/components/chart-category-flow"
import { ChartExpensesPie } from "@/components/chart-expenses-pie"
import { ChartSpendingFunnel } from "@/components/chart-spending-funnel"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default function AnalyticsPage() {
  // Transactions state
  const [transactions, setTransactions] = useState<Array<{
    id: number
    date: string
    description: string
    amount: number
    balance: number | null
    category: string
  }>>([])

  // Stats state
  const [stats, setStats] = useState<{
    totalIncome: number
    totalExpenses: number
    savingsRate: number
    netWorth: number
    incomeChange: number
    expensesChange: number
    savingsRateChange: number
    netWorthChange: number
  } | null>(null)

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch("/api/stats")
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.warn("Error fetching stats:", error)
    }
  }, [])

  // Fetch transactions
  const fetchTransactions = useCallback(async () => {
    try {
      const response = await fetch("/api/transactions")
      if (response.ok) {
        const data = await response.json()
        setTransactions(data)
      }
    } catch (error) {
      console.warn("Error fetching transactions:", error)
    }
  }, [])

  // Fetch on mount
  useEffect(() => {
    fetchStats()
    fetchTransactions()
  }, [fetchStats, fetchTransactions])
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
                totalIncome={stats?.totalIncome}
                totalExpenses={stats?.totalExpenses}
                savingsRate={stats?.savingsRate}
                netWorth={stats?.netWorth}
                incomeChange={stats?.incomeChange}
                expensesChange={stats?.expensesChange}
                savingsRateChange={stats?.savingsRateChange}
                netWorthChange={stats?.netWorthChange}
              />
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive data={useMemo(() => {
                  const grouped = transactions.reduce((acc, tx) => {
                    const date = tx.date.split('T')[0]
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
                  return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date))
                }, [transactions])} />
              </div>
              <div className="px-4 lg:px-6">
                <ChartCategoryFlow data={useMemo(() => {
                  if (!transactions || transactions.length === 0) return []
                  const categoryMap = new Map<string, Map<string, number>>()
                  const allMonths = new Set<string>()
                  transactions.forEach(tx => {
                    const category = tx.category || "Other"
                    const date = new Date(tx.date)
                    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
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
                  sortedMonths.forEach(month => {
                    let total = 0
                    categoryMap.forEach((months) => {
                      total += months.get(month) || 0
                    })
                    monthTotals.set(month, total)
                  })
                  return Array.from(categoryMap.entries())
                    .map(([category, months]) => ({
                      id: category,
                      data: sortedMonths.map(month => {
                        const value = months.get(month) || 0
                        const total = monthTotals.get(month) || 1
                        const percentage = total > 0 ? (value / total) * 100 : 0
                        return { x: month, y: Math.max(percentage, 0.1) }
                      })
                    }))
                    .filter(series => series.data.some(d => {
                      const month = series.data.find(d => d.y > 0.1)?.x
                      if (!month) return false
                      const originalValue = categoryMap.get(series.id)?.get(month) || 0
                      return originalValue > 0
                    }))
                }, [transactions])} />
              </div>
              <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @3xl/main:grid-cols-2">
                <ChartSpendingFunnel data={useMemo(() => {
                  const totalIncome = transactions.filter(tx => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0)
                  const totalExpenses = transactions.filter(tx => tx.amount < 0).reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
                  const savings = totalIncome - totalExpenses
                  return [
                    { id: "income", value: totalIncome, label: "Income" },
                    { id: "expenses", value: totalExpenses, label: "Expenses" },
                    { id: "savings", value: savings, label: "Savings" }
                  ].filter(item => item.value > 0)
                }, [transactions])} />
                <ChartExpensesPie data={useMemo(() => {
                  const categoryMap = new Map<string, number>()
                  transactions.filter(tx => tx.amount < 0).forEach(tx => {
                    const category = tx.category || "Other"
                    const current = categoryMap.get(category) || 0
                    categoryMap.set(category, current + Math.abs(tx.amount))
                  })
                  return Array.from(categoryMap.entries())
                    .map(([id, value]) => ({ id, label: id, value }))
                    .sort((a, b) => b.value - a.value)
                }, [transactions])} />
              </div>
              <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @3xl/main:grid-cols-2">
                <ChartCirclePacking data={useMemo(() => {
                  const categoryMap = new Map<string, number>()
                  transactions.filter(tx => tx.amount < 0).forEach(tx => {
                    const category = tx.category || "Other"
                    const current = categoryMap.get(category) || 0
                    categoryMap.set(category, current + Math.abs(tx.amount))
                  })
                  return {
                    name: "Expenses",
                    children: Array.from(categoryMap.entries())
                      .map(([name, value]) => ({
                        name,
                        children: [{ name, value }]
                      }))
                      .sort((a, b) => (b.children[0]?.value || 0) - (a.children[0]?.value || 0))
                  }
                }, [transactions])} />
                <ChartPolarBar data={useMemo(() => {
                  const categoryGroups: Record<string, string[]> = {
                    "Essentials": ["Utilities", "Insurance", "Taxes"],
                    "Lifestyle": ["Shopping", "Travel", "Entertainment"],
                    "Transport": ["Transport", "Car", "Fuel"],
                    "Financial": ["Transfers", "Fees", "Banking"],
                    "Utilities": ["Utilities", "Electricity", "Water", "Internet"]
                  }
                  const monthMap = new Map<string, Record<string, number>>()
                  transactions.filter(tx => tx.amount < 0).forEach(tx => {
                    const date = new Date(tx.date)
                    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
                    if (!monthMap.has(monthKey)) {
                      monthMap.set(monthKey, { Essentials: 0, Lifestyle: 0, Transport: 0, Financial: 0, Utilities: 0 })
                    }
                    const category = tx.category || "Other"
                    const group = Object.entries(categoryGroups).find(([_, cats]) => 
                      cats.some(c => category.toLowerCase().includes(c.toLowerCase()))
                    )?.[0] || "Essentials"
                    const monthData = monthMap.get(monthKey)!
                    monthData[group as keyof typeof monthData] += Math.abs(tx.amount)
                  })
                  return Array.from(monthMap.entries())
                    .map(([month, data]) => ({ month, ...data }))
                    .sort((a, b) => a.month.localeCompare(b.month))
                }, [transactions])} />
              </div>
              <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @3xl/main:grid-cols-2">
                <ChartRadar data={useMemo(() => {
                  const currentYear = new Date().getFullYear()
                  const lastYear = currentYear - 1
                  const currentYearTxs = transactions.filter(tx => new Date(tx.date).getFullYear() === currentYear)
                  const lastYearTxs = transactions.filter(tx => new Date(tx.date).getFullYear() === lastYear)
                  
                  const calculateScore = (txs: typeof transactions, type: 'income' | 'expenses' | 'savings') => {
                    if (type === 'income') {
                      const income = txs.filter(tx => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0)
                      return Math.min(100, (income / 10000) * 100)
                    } else if (type === 'expenses') {
                      const expenses = txs.filter(tx => tx.amount < 0).reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
                      return Math.min(100, (expenses / 5000) * 100)
                    } else {
                      const income = txs.filter(tx => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0)
                      const expenses = txs.filter(tx => tx.amount < 0).reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
                      const savings = income - expenses
                      return Math.min(100, Math.max(0, (savings / income) * 100))
                    }
                  }
                  
                  return [
                    { capability: "Income", "This Year": calculateScore(currentYearTxs, 'income'), "Last Year": calculateScore(lastYearTxs, 'income'), "Target": 80 },
                    { capability: "Expenses", "This Year": calculateScore(currentYearTxs, 'expenses'), "Last Year": calculateScore(lastYearTxs, 'expenses'), "Target": 60 },
                    { capability: "Savings", "This Year": calculateScore(currentYearTxs, 'savings'), "Last Year": calculateScore(lastYearTxs, 'savings'), "Target": 30 },
                    { capability: "Growth", "This Year": 70, "Last Year": 65, "Target": 85 },
                    { capability: "Stability", "This Year": 75, "Last Year": 70, "Target": 90 }
                  ]
                }, [transactions])} />
                <ChartRadialBar data={useMemo(() => {
                  const categoryMap = new Map<string, number>()
                  transactions.filter(tx => tx.amount < 0).forEach(tx => {
                    const category = tx.category || "Other"
                    const current = categoryMap.get(category) || 0
                    categoryMap.set(category, current + Math.abs(tx.amount))
                  })
                  return Array.from(categoryMap.entries())
                    .slice(0, 8)
                    .map(([name, value]) => ({
                      name,
                      uv: value,
                      pv: value * 0.8
                    }))
                    .sort((a, b) => b.uv - a.uv)
                }, [transactions])} />
              </div>
              <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @3xl/main:grid-cols-2">
                <ChartStream data={useMemo(() => {
                  const monthMap = new Map<string, Record<string, number>>()
                  transactions.forEach(tx => {
                    const date = new Date(tx.date)
                    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
                    if (!monthMap.has(monthKey)) {
                      monthMap.set(monthKey, { Salary: 0, Freelance: 0, Dividends: 0, Interest: 0, Other: 0, Expenses: 0 })
                    }
                    const monthData = monthMap.get(monthKey)!
                    if (tx.amount > 0) {
                      // Categorize income
                      const category = tx.category?.toLowerCase() || ""
                      if (category.includes("salary") || category.includes("work")) {
                        monthData.Salary += tx.amount
                      } else if (category.includes("freelance") || category.includes("gig")) {
                        monthData.Freelance += tx.amount
                      } else if (category.includes("dividend") || category.includes("investment")) {
                        monthData.Dividends += tx.amount
                      } else if (category.includes("interest")) {
                        monthData.Interest += tx.amount
                      } else {
                        monthData.Other += tx.amount
                      }
                    } else {
                      monthData.Expenses += Math.abs(tx.amount)
                    }
                  })
                  return Array.from(monthMap.entries())
                    .map(([month, data]) => ({ month, ...data }))
                    .sort((a, b) => a.month.localeCompare(b.month))
                }, [transactions])} />
              </div>
              <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @3xl/main:grid-cols-2">
                <ChartSwarmPlot data={useMemo(() => {
                  const categoryGroups: Record<string, string[]> = {
                    "Essentials": ["Utilities", "Insurance", "Taxes"],
                    "Lifestyle": ["Shopping", "Travel", "Entertainment"],
                    "Transport": ["Transport", "Car", "Fuel"],
                    "Financial": ["Transfers", "Fees", "Banking"]
                  }
                  return transactions
                    .filter(tx => tx.amount < 0)
                    .slice(0, 100)
                    .map((tx, idx) => {
                      const category = tx.category || "Other"
                      const group = Object.entries(categoryGroups).find(([_, cats]) => 
                        cats.some(c => category.toLowerCase().includes(c.toLowerCase()))
                      )?.[0] || "Essentials"
                      return {
                        id: `tx-${tx.id}`,
                        group,
                        price: Math.abs(tx.amount),
                        volume: 1
                      }
                    })
                }, [transactions])} />
              </div>
              <div className="px-4 lg:px-6">
                <ChartSankey data={useMemo(() => {
                  const totalIncome = transactions.filter(tx => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0)
                  const categoryMap = new Map<string, number>()
                  transactions.filter(tx => tx.amount < 0).forEach(tx => {
                    const category = tx.category || "Other"
                    const current = categoryMap.get(category) || 0
                    categoryMap.set(category, current + Math.abs(tx.amount))
                  })
                  const nodes = [
                    { id: "Income" },
                    ...Array.from(categoryMap.keys()).map(cat => ({ id: cat }))
                  ]
                  const links = Array.from(categoryMap.entries()).map(([target, value]) => ({
                    source: "Income",
                    target,
                    value
                  }))
                  return { nodes, links }
                }, [transactions])} />
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}





