"use client"

import { useEffect, useState, useCallback } from "react"
// @dnd-kit for drag-and-drop with auto-scroll
import { SortableGridProvider, SortableGridItem } from "@/components/sortable-grid"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { deduplicatedFetch } from "@/lib/request-deduplication"
import { useDateFilter } from "@/components/date-filter-provider"
import { getChartCardSize, type ChartId } from "@/lib/chart-card-sizes.config"
import { ChartCategoryTrend } from "@/components/chart-category-trend"
import { ChartCardSkeleton } from "@/components/chart-loading-state"
import { ShimmeringText } from "@/components/ui/shimmering-text"
import { TrendingUp, Upload, ArrowRight } from "lucide-react"
import { IconChartLine } from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

interface Category {
  id?: number
  name?: string | null
  totalSpend?: number
  transactionCount?: number
}

interface Transaction {
  id: number
  date: string
  description: string
  amount: number
  balance: number | null
  category: string
}

// localStorage keys
const CATEGORY_ORDER_STORAGE_KEY = 'trends-category-order'

export default function TrendsPage() {
  const [categories, setCategories] = useState<string[]>([])
  const [categoryTransactionCounts, setCategoryTransactionCounts] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { filter: dateFilter } = useDateFilter()

  // @dnd-kit: Category order state
  const [categoryOrder, setCategoryOrder] = useState<string[]>([])

  // Load category order from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CATEGORY_ORDER_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          setCategoryOrder(parsed)
        }
      }
    } catch (e) {
      console.error("Failed to load category order:", e)
    }
  }, [])

  // Sync category order with categories when categories load
  // IMPORTANT: Don't reset to spending order if user has a saved order
  useEffect(() => {
    if (categories.length > 0 && categoryOrder.length === 0) {
      // No saved order - use categories (sorted by spending) as initial order
      setCategoryOrder(categories)
    } else if (categories.length > 0 && categoryOrder.length > 0) {
      // User has a saved order - preserve it!
      // Only update to include new categories and remove deleted ones
      const existingInOrder = categoryOrder.filter(c => categories.includes(c))
      const newCategories = categories.filter(c => !categoryOrder.includes(c))

      // Only update if there are changes
      if (newCategories.length > 0 || existingInOrder.length !== categoryOrder.length) {
        // Append new categories at the end (they'll be in spending order since categories is sorted)
        setCategoryOrder([...existingInOrder, ...newCategories])
      }
    }
  }, [categories, categoryOrder.length])

  // Handle category order change from drag-and-drop
  const handleCategoryOrderChange = useCallback((newOrder: string[]) => {
    setCategoryOrder(newOrder)
    try {
      localStorage.setItem(CATEGORY_ORDER_STORAGE_KEY, JSON.stringify(newOrder))
    } catch (e) {
      console.error("Failed to save category order:", e)
    }
  }, [])

  // Load categories and transaction counts
  useEffect(() => {
    let isMounted = true

    const loadCategories = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Fetch transactions and categories in parallel
        // Use limit=all to fetch all transactions for charts
        const [transactionsResponse, categoriesData] = await Promise.all([
          deduplicatedFetch<any>(
            dateFilter
              ? `/api/transactions?filter=${encodeURIComponent(dateFilter)}&limit=all`
              : "/api/transactions?limit=all"
          ),
          deduplicatedFetch<Category[]>("/api/categories"),
        ])

        if (!isMounted) return

        // Handle both old format (array) and new format (object with data property)
        const transactions: Transaction[] = Array.isArray(transactionsResponse)
          ? transactionsResponse
          : (transactionsResponse?.data || [])

        // If there are no transactions, show empty state
        if (!transactions || transactions.length === 0) {
          setCategories([])
          setCategoryTransactionCounts({})
          setIsLoading(false)
          return
        }

        // Build category -> transaction count map from actual transactions
        const categoryCountMap: Record<string, number> = {}
        for (const tx of transactions) {
          const category = tx.category || "Other"
          categoryCountMap[category] = (categoryCountMap[category] || 0) + 1
        }

        // Get list of categories that have transactions
        const categoriesWithTransactions = Object.keys(categoryCountMap).filter(
          (cat) => categoryCountMap[cat] > 0
        )

        // Sort by transaction count descending
        categoriesWithTransactions.sort(
          (a, b) => (categoryCountMap[b] || 0) - (categoryCountMap[a] || 0)
        )

        if (isMounted) {
          setCategories(categoriesWithTransactions)
          setCategoryTransactionCounts(categoryCountMap)
          setIsLoading(false)
        }
      } catch (err) {
        if (isMounted) {
          console.error("Failed to load categories:", err)
          setError("Failed to load categories")
          setIsLoading(false)
        }
      }
    }

    loadCategories()

    return () => {
      isMounted = false
    }
  }, [dateFilter])

  const hasCategories = categories.length > 0
  const sizeConfig = getChartCardSize("categoryTrend" as ChartId)

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
        <main className="flex-1 space-y-6 p-4 pt-0 lg:p-6 lg:pt-2">
          <section className="px-4 lg:px-6 pt-4">
            <div className="flex flex-col justify-between gap-4 rounded-3xl border bg-muted/30 px-6 py-6 lg:flex-row lg:items-center">
              <div className="space-y-2">
                <Badge variant="outline" className="gap-1 px-3 py-1 text-sm">
                  <IconChartLine className="size-4" />
                  Trend Analysis
                </Badge>
                <h1 className="text-3xl font-semibold tracking-tight">
                  Trends
                </h1>
                <p className="text-muted-foreground max-w-2xl">
                  Visualize spending patterns across all your categories over time.
                  Each card represents a category from your data, showing trends and insights
                  to help you understand where your money goes.
                </p>
              </div>
            </div>
          </section>

          {isLoading && (
            <section className="px-4 lg:px-6">
              <div className="flex items-center justify-between">
                <ShimmeringText
                  text="Loading trend charts"
                  className="text-sm font-medium text-muted-foreground"
                  duration={1.6}
                  repeatDelay={0.4}
                  spread={2.2}
                />
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <ChartCardSkeleton key={`trend-skeleton-${index}`} height="h-[260px]" />
                ))}
              </div>
            </section>
          )}

          {error && !isLoading && (
            <section className="px-4 lg:px-6">
              <div className="flex flex-col items-center justify-center text-center py-16 rounded-3xl border bg-muted/30">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                  <TrendingUp className="h-8 w-8 text-destructive/60" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Unable to Load Trends</h2>
                <p className="text-sm text-muted-foreground max-w-md mb-4">
                  We couldn't load your spending categories. This usually happens when there's no transaction data yet.
                </p>
                <Link
                  href="/data-library"
                  className="group flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  Add Transactions
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </section>
          )}

          {!isLoading && !hasCategories && !error && (
            <section className="px-4 lg:px-6">
              <div className="flex flex-col justify-between gap-6 rounded-3xl border bg-muted/30 px-6 py-6 lg:flex-row lg:items-center">
                <div className="flex items-start gap-4">
                  <div className="relative shrink-0">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <TrendingUp className="h-8 w-8 text-primary/60" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-background border-2 border-dashed border-primary/30 flex items-center justify-center">
                      <span className="text-xs text-primary/60">?</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold">No Trend Data Yet</h2>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Your spending trends will appear here once you have transaction data.
                      Each category in your transactions will get its own trend chart showing
                      how your spending changes over time.
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-2">
                      Upload your bank statements or add transactions to start seeing patterns.
                    </p>
                  </div>
                </div>
                <Link
                  href="/data-library"
                  className="group flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors shrink-0"
                >
                  <Upload className="h-4 w-4" />
                  Upload Transactions
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </section>
          )}

          {hasCategories && (
            <section className="px-4 lg:px-6">
              <SortableGridProvider
                chartOrder={categoryOrder}
                onOrderChange={handleCategoryOrderChange}
              >
                {categoryOrder.map((category) => (
                  <SortableGridItem
                    key={category}
                    id={category}
                    w={6}
                    h={sizeConfig.minH || 6}
                  >
                    <ChartCategoryTrend categoryName={category} />
                  </SortableGridItem>
                ))}
              </SortableGridProvider>
            </section>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
