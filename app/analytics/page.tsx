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
import { toast } from "sonner"

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

  // Date filter state
  const [dateFilter, setDateFilter] = useState<string | null>(null)
  
  // Budget update state to trigger re-render
  const [budgetUpdateKey, setBudgetUpdateKey] = useState(0)

  // Fetch transactions from Neon database
  const fetchTransactions = useCallback(async () => {
    try {
      const url = dateFilter 
        ? `/api/transactions?filter=${encodeURIComponent(dateFilter)}`
        : "/api/transactions"
      console.log("[Analytics] Fetching transactions from:", url)
      const response = await fetch(url)
      const data = await response.json()
      
      if (response.ok) {
        if (Array.isArray(data)) {
          console.log(`[Analytics] Setting ${data.length} transactions`)
          setTransactions(data)
        } else {
          console.error("[Analytics] Response is not an array:", data)
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
  
  // Listen for budget updates
  useEffect(() => {
    const handleBudgetUpdate = () => {
      setBudgetUpdateKey(prev => prev + 1)
    }
    window.addEventListener("budgetUpdated", handleBudgetUpdate)
    return () => {
      window.removeEventListener("budgetUpdated", handleBudgetUpdate)
    }
  }, [])

  // Calculate stats directly from transactions data (like dashboard)
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

    // Filter out savings category from expenses (as per previous requirement)
    const filteredTransactions = transactions.filter(tx => {
      const category = (tx.category || "").toLowerCase()
      return category !== "savings"
    })

    // Calculate current period stats (all transactions when no filter, or filtered)
    const currentIncome = filteredTransactions
      .filter(tx => Number(tx.amount) > 0)
      .reduce((sum, tx) => sum + Number(tx.amount), 0)

    const currentExpenses = Math.abs(filteredTransactions
      .filter(tx => Number(tx.amount) < 0)
      .reduce((sum, tx) => sum + Number(tx.amount), 0))

    const currentSavingsRate = currentIncome > 0 
      ? ((currentIncome - currentExpenses) / currentIncome) * 100 
      : 0

    // Get net worth from latest transaction balance
    const sortedByDate = [...transactions].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    const netWorth = sortedByDate.length > 0 && sortedByDate[0].balance !== null
      ? sortedByDate[0].balance 
      : 0

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
    const previousTransactions = filteredTransactions.filter(tx => {
      const txDate = tx.date.split('T')[0]
      return txDate >= sixMonthsAgoStr && txDate < threeMonthsAgoStr
    })

    const previousIncome = previousTransactions
      .filter(tx => Number(tx.amount) > 0)
      .reduce((sum, tx) => sum + Number(tx.amount), 0)

    const previousExpenses = Math.abs(previousTransactions
      .filter(tx => Number(tx.amount) < 0)
      .reduce((sum, tx) => sum + Number(tx.amount), 0))

    const previousSavingsRate = previousIncome > 0 
      ? ((previousIncome - previousExpenses) / previousIncome) * 100 
      : 0

    // Get previous period net worth
    const previousSorted = previousTransactions.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    const previousNetWorth = previousSorted.length > 0 && previousSorted[0].balance !== null
      ? previousSorted[0].balance 
      : 0

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
              />
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive data={useMemo(() => {
                  const grouped = transactions.reduce((acc, tx) => {
                    const date = tx.date.split('T')[0]
                    if (!acc[date]) {
                      acc[date] = { date, desktop: 0, mobile: 0 }
                    }
                    const amount = Number(tx.amount) || 0
                    if (amount > 0) {
                      acc[date].desktop += amount
                    } else {
                      acc[date].mobile += Math.abs(amount)
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
                  // Only process expenses (negative amounts)
                  transactions.filter(tx => Number(tx.amount) < 0).forEach(tx => {
                    const category = tx.category || "Other"
                    const date = new Date(tx.date)
                    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
                    allMonths.add(monthKey)
                    if (!categoryMap.has(category)) {
                      categoryMap.set(category, new Map())
                    }
                    const monthMap = categoryMap.get(category)!
                    const current = monthMap.get(monthKey) || 0
                    monthMap.set(monthKey, current + Math.abs(Number(tx.amount)))
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
                  if (!transactions || transactions.length === 0) {
                    return []
                  }
                  
                  const totalIncome = transactions
                    .filter(tx => tx.amount > 0)
                    .reduce((sum, tx) => sum + Number(tx.amount), 0)
                  
                  // Group expenses by category
                  const categoryMap = new Map<string, number>()
                  transactions
                    .filter(tx => tx.amount < 0)
                    .forEach(tx => {
                      const category = tx.category || "Other"
                      const current = categoryMap.get(category) || 0
                      const amount = Math.abs(Number(tx.amount)) || 0
                      categoryMap.set(category, current + amount)
                    })
                  
                  // Calculate total expenses and savings first
                  const totalExpenses = Array.from(categoryMap.values())
                    .reduce((sum, amount) => sum + Number(amount), 0)
                  const savings = totalIncome - totalExpenses
                  
                  // Filter categories to only include those larger than savings
                  // Sort categories by amount (descending) and filter
                  const maxCategories = 5
                  const sortedCategories = Array.from(categoryMap.entries())
                    .map(([category, amount]) => ({ category, amount: Number(amount) }))
                    .sort((a, b) => b.amount - a.amount)
                    .filter(cat => cat.amount > savings) // Only show categories larger than savings
                    .slice(0, maxCategories)
                  
                  // Calculate remaining expenses (if we're not showing all categories)
                  const shownExpenses = sortedCategories.reduce((sum, cat) => sum + cat.amount, 0)
                  const remainingExpenses = totalExpenses - shownExpenses
                  
                  // Build the funnel data: Income -> Top Categories -> (Other if needed) -> Savings
                  const funnelData: Array<{ id: string; value: number; label: string }> = []
                  
                  // Add Income
                  if (totalIncome > 0) {
                    funnelData.push({ id: "income", value: totalIncome, label: "Income" })
                  }
                  
                  // Add top expense categories (only those larger than savings)
                  sortedCategories.forEach(cat => {
                    funnelData.push({
                      id: cat.category.toLowerCase().replace(/\s+/g, '-'),
                      value: cat.amount,
                      label: cat.category
                    })
                  })
                  
                  // Add "Other" category if there are remaining expenses and it's larger than savings
                  if (remainingExpenses > 0 && remainingExpenses > savings) {
                    funnelData.push({
                      id: "other",
                      value: remainingExpenses,
                      label: "Other"
                    })
                  }
                  
                  // Add Savings (always last)
                  if (savings > 0) {
                    funnelData.push({ id: "savings", value: savings, label: "Savings" })
                  }
                  
                  return funnelData.filter(item => item.value > 0)
                }, [transactions])} />
                <ChartExpensesPie data={useMemo(() => {
                  const categoryMap = new Map<string, number>()
                  transactions.filter(tx => Number(tx.amount) < 0).forEach(tx => {
                    const category = tx.category || "Other"
                    const current = categoryMap.get(category) || 0
                    categoryMap.set(category, current + Math.abs(Number(tx.amount)))
                  })
                  return Array.from(categoryMap.entries())
                    .map(([id, value]) => ({ id, label: id, value: Number(value) }))
                    .sort((a, b) => b.value - a.value)
                }, [transactions])} />
              </div>
              <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @3xl/main:grid-cols-2">
                <ChartCirclePacking data={useMemo(() => {
                  if (!transactions || transactions.length === 0) {
                    return { name: "Expenses", children: [] }
                  }
                  
                  // Categories to exclude
                  const excludedCategories = ["Income", "Transfers", "Transfer", "income", "transfers", "transfer"]
                  
                  // Group transactions by category (only expenses, excluding Income and Transfers)
                  // Use a Map with normalized keys to handle case-insensitive duplicates
                  const categoryMap = new Map<string, { displayName: string; total: number }>()
                  
                  transactions
                    .filter(tx => {
                      const amount = Number(tx.amount) || 0
                      if (amount >= 0) return false // Only expenses
                      const category = (tx.category || "Other").trim()
                      // Case-insensitive exclusion check
                      const isExcluded = excludedCategories.some(ex => 
                        ex.toLowerCase() === category.toLowerCase()
                      )
                      return !isExcluded
                    })
                    .forEach(tx => {
                      // Normalize category: trim and lowercase for key, but preserve original for display
                      const category = (tx.category || "Other").trim()
                      // Use a more aggressive normalization: lowercase and remove extra spaces
                      const normalizedKey = category.toLowerCase().replace(/\s+/g, ' ').trim()
                      const existing = categoryMap.get(normalizedKey)
                      const amount = Math.abs(Number(tx.amount)) || 0
                      
                      if (existing) {
                        existing.total += amount
                        // Keep the most common capitalization (first non-empty one, or longest)
                        if (category.length > existing.displayName.length || 
                            (category.length === existing.displayName.length && category < existing.displayName)) {
                          existing.displayName = category
                        }
                      } else {
                        categoryMap.set(normalizedKey, {
                          displayName: category,
                          total: amount
                        })
                      }
                    })
                  
                  // Build hierarchical structure for the chart
                  // Ensure ALL node names are unique across the entire tree
                  const categoryEntries = Array.from(categoryMap.values())
                    .filter(item => item.total > 0)
                    .sort((a, b) => b.total - a.total)
                  
                  // Track used names to ensure absolute uniqueness
                  const usedNames = new Set<string>()
                  usedNames.add("Expenses") // Reserve root name
                  
                  return {
                    name: "Expenses",
                    children: categoryEntries.map((item, index) => {
                      // Generate unique parent name
                      let parentName = item.displayName
                      let parentCounter = 0
                      while (usedNames.has(parentName)) {
                        parentCounter++
                        parentName = `${item.displayName}-${index}-${parentCounter}`
                      }
                      usedNames.add(parentName)
                      
                      // Generate unique child name (must be different from parent)
                      let childName = `${item.displayName}-val-${index}`
                      let childCounter = 0
                      while (usedNames.has(childName)) {
                        childCounter++
                        childName = `${item.displayName}-val-${index}-${childCounter}`
                      }
                      usedNames.add(childName)
                      
                      return {
                        name: parentName,
                        children: [{ name: childName, value: item.total }]
                      }
                    })
                  }
                }, [transactions])} />
                <ChartPolarBar data={useMemo(() => {
                  if (!transactions || transactions.length === 0) return []
                  
                  // Categories to exclude
                  const excludedCategories = ["Income", "Transfers", "Transfer", "income", "transfers", "transfer"]
                  
                  // Get all unique categories from expenses, excluding Income and Transfers
                  const categoryTotals = new Map<string, number>()
                  transactions
                    .filter(tx => {
                      const amount = Number(tx.amount) || 0
                      if (amount >= 0) return false // Only expenses
                      const category = (tx.category || "Other").trim()
                      return !excludedCategories.includes(category)
                    })
                    .forEach(tx => {
                      const category = tx.category || "Other"
                      const current = categoryTotals.get(category) || 0
                      const amount = Math.abs(Number(tx.amount)) || 0
                      categoryTotals.set(category, current + amount)
                    })
                  
                  // Get top 5 categories by total amount (or all if less than 5)
                  const topCategories = Array.from(categoryTotals.entries())
                    .filter(([category]) => !excludedCategories.includes(category))
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([category]) => category)
                  
                  if (topCategories.length === 0) return []
                  
                  const monthMap = new Map<string, Record<string, number>>()
                  
                  // Initialize all months with all categories
                  transactions
                    .filter(tx => {
                      const amount = Number(tx.amount) || 0
                      if (amount >= 0) return false // Only expenses
                      const category = (tx.category || "Other").trim()
                      return !excludedCategories.includes(category)
                    })
                    .forEach(tx => {
                      try {
                        const date = new Date(tx.date)
                        if (isNaN(date.getTime())) return
                        
                        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
                        
                        if (!monthMap.has(monthKey)) {
                          const initialData: Record<string, number> = {}
                          topCategories.forEach(cat => {
                            initialData[cat] = 0
                          })
                          monthMap.set(monthKey, initialData)
                        }
                      } catch (error) {
                        // Skip invalid dates
                      }
                    })
                  
                  // Process expenses and group by month and category (excluding Income and Transfers)
                  transactions
                    .filter(tx => {
                      const amount = Number(tx.amount) || 0
                      if (amount >= 0) return false // Only expenses
                      const category = (tx.category || "Other").trim()
                      return !excludedCategories.includes(category)
                    })
                    .forEach(tx => {
                      try {
                        const date = new Date(tx.date)
                        if (isNaN(date.getTime())) return
                        
                        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
                        const category = tx.category || "Other"
                        
                        if (topCategories.includes(category) && monthMap.has(monthKey)) {
                          const monthData = monthMap.get(monthKey)!
                          const amount = Math.abs(Number(tx.amount)) || 0
                          monthData[category] = (monthData[category] || 0) + amount
                        }
                      } catch (error) {
                        console.warn("[Analytics] Error processing transaction:", tx, error)
                      }
                    })
                  
                  const result = Array.from(monthMap.entries())
                    .map(([month, data]) => {
                      const row: Record<string, string | number> = { month }
                      topCategories.forEach(cat => {
                        row[cat] = Number(data[cat]) || 0
                      })
                      return row
                    })
                    .sort((a, b) => (a.month as string).localeCompare(b.month as string))
                  
                  console.log("[Analytics] ChartPolarBar categories:", topCategories)
                  console.log("[Analytics] ChartPolarBar data:", result)
                  return result
                }, [transactions])} 
                keys={useMemo(() => {
                  if (!transactions || transactions.length === 0) return []
                  const excludedCategories = ["Income", "Transfers", "Transfer", "income", "transfers", "transfer"]
                  const categoryTotals = new Map<string, number>()
                  transactions
                    .filter(tx => {
                      const amount = Number(tx.amount) || 0
                      if (amount >= 0) return false // Only expenses
                      const category = (tx.category || "Other").trim()
                      return !excludedCategories.includes(category)
                    })
                    .forEach(tx => {
                      const category = tx.category || "Other"
                      const current = categoryTotals.get(category) || 0
                      const amount = Math.abs(Number(tx.amount)) || 0
                      categoryTotals.set(category, current + amount)
                    })
                  return Array.from(categoryTotals.entries())
                    .filter(([category]) => !excludedCategories.includes(category))
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([category]) => category)
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
                      const income = txs.filter(tx => Number(tx.amount) > 0).reduce((sum, tx) => sum + Number(tx.amount), 0)
                      return Math.min(100, (income / 10000) * 100)
                    } else if (type === 'expenses') {
                      const expenses = txs.filter(tx => Number(tx.amount) < 0).reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0)
                      return Math.min(100, (expenses / 5000) * 100)
                    } else {
                      const income = txs.filter(tx => Number(tx.amount) > 0).reduce((sum, tx) => sum + Number(tx.amount), 0)
                      const expenses = txs.filter(tx => Number(tx.amount) < 0).reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0)
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
                <ChartRadialBar 
                  data={useMemo(() => {
                    if (!transactions || transactions.length === 0) return []
                    
                    // Categories to exclude
                    const excludedCategories = ["Income", "Transfers", "Transfer", "income", "transfers", "transfer"]
                    
                    const categoryMap = new Map<string, number>()
                    transactions
                      .filter(tx => {
                        const amount = Number(tx.amount) || 0
                        if (amount >= 0) return false // Only expenses
                        const category = (tx.category || "Other").trim()
                        return !excludedCategories.includes(category)
                      })
                      .forEach(tx => {
                        const category = tx.category || "Other"
                        const current = categoryMap.get(category) || 0
                        const amount = Math.abs(Number(tx.amount)) || 0
                        categoryMap.set(category, current + amount)
                      })
                    
                    // Get top 5 categories only
                    return Array.from(categoryMap.entries())
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 5)
                      .map(([name, value]) => ({
                        name,
                        uv: Number(value.toFixed(2)), // Spent (2 decimals)
                        pv: Number((value * 1.2).toFixed(2)) // Default budget (2 decimals)
                      }))
                  }, [transactions])}
                  budgets={useMemo(() => {
                    // Load budgets from localStorage
                    if (typeof window === 'undefined') return {}
                    const stored = localStorage.getItem('categoryBudgets')
                    return stored ? JSON.parse(stored) : {}
                  }, [budgetUpdateKey])}
                  onBudgetChange={(category, budget) => {
                    // Save budget to localStorage
                    if (typeof window === 'undefined') return
                    const current = JSON.parse(localStorage.getItem('categoryBudgets') || '{}')
                    current[category] = budget
                    localStorage.setItem('categoryBudgets', JSON.stringify(current))
                    // Force re-render by updating a state (we'll use a simple approach)
                    window.dispatchEvent(new Event('budgetUpdated'))
                  }}
                />
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
                    const amount = Number(tx.amount) || 0
                    if (amount > 0) {
                      // Categorize income
                      const category = tx.category?.toLowerCase() || ""
                      if (category.includes("salary") || category.includes("work")) {
                        monthData.Salary += amount
                      } else if (category.includes("freelance") || category.includes("gig")) {
                        monthData.Freelance += amount
                      } else if (category.includes("dividend") || category.includes("investment")) {
                        monthData.Dividends += amount
                      } else if (category.includes("interest")) {
                        monthData.Interest += amount
                      } else {
                        monthData.Other += amount
                      }
                    } else {
                      monthData.Expenses += Math.abs(amount)
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
                    .filter(tx => Number(tx.amount) < 0)
                    .slice(0, 100)
                    .map((tx, idx) => {
                      const category = tx.category || "Other"
                      const group = Object.entries(categoryGroups).find(([_, cats]) => 
                        cats.some(c => category.toLowerCase().includes(c.toLowerCase()))
                      )?.[0] || "Essentials"
                      return {
                        id: `tx-${tx.id}`,
                        group,
                        price: Math.abs(Number(tx.amount)),
                        volume: 1
                      }
                    })
                }, [transactions])} />
              </div>
              <div className="px-4 lg:px-6">
                <ChartSankey data={useMemo(() => {
                  if (!transactions || transactions.length === 0) {
                    return { nodes: [{ id: "Income" }], links: [] }
                  }
                  
                  // Calculate total income from positive amounts
                  const totalIncome = transactions
                    .filter(tx => tx.amount > 0)
                    .reduce((sum, tx) => sum + Number(tx.amount), 0)
                  
                  // Calculate expenses by category from negative amounts
                  const categoryMap = new Map<string, number>()
                  transactions
                    .filter(tx => tx.amount < 0)
                    .forEach(tx => {
                      const category = tx.category || "Other"
                      const current = categoryMap.get(category) || 0
                      const amount = Math.abs(Number(tx.amount))
                      categoryMap.set(category, current + amount)
                    })
                  
                  // Calculate total expenses
                  const totalExpenses = Array.from(categoryMap.values())
                    .reduce((sum, value) => sum + value, 0)
                  
                  // Calculate savings (income - expenses)
                  const savings = totalIncome - totalExpenses
                  
                  // Build nodes: Income, Expense Categories, and Savings
                  const nodes = [
                    { id: "Income" },
                    ...Array.from(categoryMap.keys()).map(cat => ({ id: cat })),
                    ...(savings > 0 ? [{ id: "Savings" }] : [])
                  ]
                  
                  // Build links: Income -> Categories, and Income -> Savings
                  const links = [
                    // Income to expense categories
                    ...Array.from(categoryMap.entries()).map(([target, value]) => ({
                      source: "Income",
                      target,
                      value: Number(value)
                    })),
                    // Income to savings (if positive)
                    ...(savings > 0 ? [{
                      source: "Income",
                      target: "Savings",
                      value: Number(savings)
                    }] : [])
                  ]
                  
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





