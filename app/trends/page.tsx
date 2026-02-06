"use client"

import { useEffect, useState, useCallback, useMemo, memo } from "react"
// @dnd-kit for drag-and-drop with auto-scroll
import { SortableGridProvider, SortableGridItem } from "@/components/sortable-grid"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { useTrendsData, useGroceriesTrendsBundleData } from "@/hooks/use-dashboard-data"
import { getChartCardSize, type ChartId } from "@/lib/chart-card-sizes.config"
import { ChartCategoryTrend } from "@/components/chart-category-trend"
import { ChartCardSkeleton } from "@/components/chart-loading-state"
import { ShimmeringText } from "@/components/ui/shimmering-text"
import { TrendingUp, Upload, ArrowRight } from "lucide-react"
import { IconChartLine, IconChartBar, IconFridge } from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { cn } from "@/lib/utils"

// localStorage keys
const SPENDING_CATEGORY_ORDER_STORAGE_KEY = 'trends-category-order'
const GROCERIES_CATEGORY_ORDER_STORAGE_KEY = 'trends-groceries-category-order'
const VIEW_MODE_STORAGE_KEY = 'trends-view-mode'

type ViewMode = 'spending' | 'groceries'

export default function TrendsPage() {
  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>('spending')

  // Load view mode from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY)
      if (saved === 'spending' || saved === 'groceries') {
        setViewMode(saved)
      }
    } catch (e) {
      console.error("Failed to load view mode:", e)
    }
  }, [])

  // Use TanStack Query hooks - only fetch when needed
  const spendingData = useTrendsData()
  const groceriesData = useGroceriesTrendsBundleData()

  // Select data based on view mode
  const { categoryTrends, isLoading, error } = useMemo(() => {
    if (viewMode === 'groceries') {
      return {
        categoryTrends: groceriesData.data?.categoryTrends ?? {},
        isLoading: groceriesData.isLoading,
        error: groceriesData.error
      }
    }
    return {
      categoryTrends: spendingData.categoryTrends,
      isLoading: spendingData.isLoading,
      error: spendingData.error
    }
  }, [viewMode, spendingData, groceriesData])

  // Derive categories from categoryTrends (bundled from server)
  const { categories, categoryTransactionCounts } = useMemo(() => {
    if (!categoryTrends || Object.keys(categoryTrends).length === 0) {
      return { categories: [], categoryTransactionCounts: {} }
    }

    // Build category -> data point count map from bundled trends
    const categoryCountMap: Record<string, number> = {}
    for (const category of Object.keys(categoryTrends)) {
      // Use the number of data points as a proxy for transaction count
      categoryCountMap[category] = categoryTrends[category]?.length || 0
    }

    // Get categories, sorted by data point count (most data first)
    const categoriesWithData = Object.keys(categoryCountMap)
      .filter(cat => categoryCountMap[cat] > 0)
      .sort((a, b) => categoryCountMap[b] - categoryCountMap[a])

    return {
      categories: categoriesWithData,
      categoryTransactionCounts: categoryCountMap
    }
  }, [categoryTrends])

  // @dnd-kit: Category order state (separate for each view)
  const [spendingCategoryOrder, setSpendingCategoryOrder] = useState<string[]>([])
  const [groceriesCategoryOrder, setGroceriesCategoryOrder] = useState<string[]>([])

  // Get current order based on view mode
  const categoryOrder = viewMode === 'groceries' ? groceriesCategoryOrder : spendingCategoryOrder
  const setCategoryOrder = viewMode === 'groceries' ? setGroceriesCategoryOrder : setSpendingCategoryOrder
  const storageKey = viewMode === 'groceries' ? GROCERIES_CATEGORY_ORDER_STORAGE_KEY : SPENDING_CATEGORY_ORDER_STORAGE_KEY

  // Load category orders from localStorage on mount
  useEffect(() => {
    try {
      const savedSpending = localStorage.getItem(SPENDING_CATEGORY_ORDER_STORAGE_KEY)
      if (savedSpending) {
        const parsed = JSON.parse(savedSpending)
        if (Array.isArray(parsed)) {
          setSpendingCategoryOrder(parsed)
        }
      }
      const savedGroceries = localStorage.getItem(GROCERIES_CATEGORY_ORDER_STORAGE_KEY)
      if (savedGroceries) {
        const parsed = JSON.parse(savedGroceries)
        if (Array.isArray(parsed)) {
          setGroceriesCategoryOrder(parsed)
        }
      }
    } catch (e) {
      console.error("Failed to load category order:", e)
    }
  }, [])

  // Sync category order with categories when categories load
  useEffect(() => {
    if (categories.length > 0 && categoryOrder.length === 0) {
      setCategoryOrder(categories)
    } else if (categories.length > 0 && categoryOrder.length > 0) {
      const existingInOrder = categoryOrder.filter(c => categories.includes(c))
      const newCategories = categories.filter(c => !categoryOrder.includes(c))

      if (newCategories.length > 0 || existingInOrder.length !== categoryOrder.length) {
        setCategoryOrder([...existingInOrder, ...newCategories])
      }
    }
  }, [categories, categoryOrder.length, setCategoryOrder])

  // Handle category order change from drag-and-drop
  const handleCategoryOrderChange = useCallback((newOrder: string[]) => {
    setCategoryOrder(newOrder)
    try {
      localStorage.setItem(storageKey, JSON.stringify(newOrder))
    } catch (e) {
      console.error("Failed to save category order:", e)
    }
  }, [setCategoryOrder, storageKey])

  // Handle view mode change
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode)
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode)
    } catch (e) {
      console.error("Failed to save view mode:", e)
    }
  }, [])

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
                  {viewMode === 'spending'
                    ? 'Visualize spending patterns across all your bank transaction categories over time.'
                    : 'Visualize spending patterns across your grocery broad categories over time.'}
                </p>
              </div>
            </div>
          </section>

          {/* Toggle Switch */}
          <section className="px-4 lg:px-6">
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-1 p-1 rounded-full bg-muted/50 border">
                <button
                  onClick={() => handleViewModeChange('spending')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                    viewMode === 'spending'
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <IconChartBar className="h-4 w-4" />
                  Spending
                </button>
                <button
                  onClick={() => handleViewModeChange('groceries')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                    viewMode === 'groceries'
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <IconFridge className="h-4 w-4" />
                  Groceries
                </button>
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
                  {viewMode === 'spending'
                    ? "We couldn't load your spending categories. This usually happens when there's no transaction data yet."
                    : "We couldn't load your grocery categories. This usually happens when there's no receipt data yet."}
                </p>
                <Link
                  href="/data-library"
                  className="group flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  {viewMode === 'spending' ? 'Add Transactions' : 'Add Receipts'}
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
                      {viewMode === 'spending'
                        ? 'Your spending trends will appear here once you have transaction data. Each category in your transactions will get its own trend chart.'
                        : 'Your grocery trends will appear here once you have receipt data. Each broad category will get its own trend chart.'}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-2">
                      {viewMode === 'spending'
                        ? 'Upload your bank statements or add transactions to start seeing patterns.'
                        : 'Upload your grocery receipts to start seeing patterns.'}
                    </p>
                  </div>
                </div>
                <Link
                  href="/data-library"
                  className="group flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors shrink-0"
                >
                  <Upload className="h-4 w-4" />
                  {viewMode === 'spending' ? 'Upload Transactions' : 'Upload Receipts'}
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
                    key={`${viewMode}-${category}`}
                    id={category}
                    w={6}
                    h={sizeConfig.minH || 6}
                  >
                    {/* Pass pre-computed trend data to avoid per-chart fetching */}
                    <ChartCategoryTrend
                      categoryName={category}
                      data={categoryTrends[category]}
                    />
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

