"use client"

import { useCallback, useEffect, useState, useMemo } from "react"
import { useGroceriesTrendsBundleData } from "@/hooks/use-dashboard-data"
import { SortableGridProvider, SortableGridItem } from "@/components/sortable-grid"
import { ChartCategoryTrend } from "@/components/chart-category-trend"
import { ChartCardSkeleton } from "@/components/chart-loading-state"
import { ShimmeringText } from "@/components/ui/shimmering-text"
import { getChartCardSize, type ChartId } from "@/lib/chart-card-sizes.config"
import { TrendingUp, Upload, ArrowRight } from "lucide-react"
import Link from "next/link"

const FRIDGE_TRENDS_ORDER_KEY = "fridge-trends-category-order"

export function FridgeTrendsTab() {
  const groceriesData = useGroceriesTrendsBundleData()
  const categoryTrends = groceriesData.data?.categoryTrends ?? {}
  const isLoading = groceriesData.isLoading
  const error = groceriesData.error

  const categories = useMemo(() => {
    if (!categoryTrends || Object.keys(categoryTrends).length === 0) return []
    const countMap: Record<string, number> = {}
    for (const cat of Object.keys(categoryTrends)) {
      countMap[cat] = categoryTrends[cat]?.length || 0
    }
    return Object.keys(countMap)
      .filter((cat) => countMap[cat] > 0)
      .sort((a, b) => countMap[b] - countMap[a])
  }, [categoryTrends])

  const [categoryOrder, setCategoryOrder] = useState<string[]>([])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(FRIDGE_TRENDS_ORDER_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) setCategoryOrder(parsed)
      }
    } catch (e) {
      console.error("Failed to load fridge trends category order:", e)
    }
  }, [])

  useEffect(() => {
    if (categories.length > 0 && categoryOrder.length === 0) {
      setCategoryOrder(categories)
    } else if (categories.length > 0 && categoryOrder.length > 0) {
      const existing = categoryOrder.filter((c) => categories.includes(c))
      const added = categories.filter((c) => !categoryOrder.includes(c))
      if (added.length > 0 || existing.length !== categoryOrder.length) {
        setCategoryOrder([...existing, ...added])
      }
    }
  }, [categories, categoryOrder.length])

  const handleCategoryOrderChange = useCallback((newOrder: string[]) => {
    setCategoryOrder(newOrder)
    try {
      localStorage.setItem(FRIDGE_TRENDS_ORDER_KEY, JSON.stringify(newOrder))
    } catch (e) {
      console.error("Failed to save fridge trends category order:", e)
    }
  }, [])

  const hasCategories = categories.length > 0
  const sizeConfig = getChartCardSize("categoryTrend" as ChartId)

  return (
    <>
      {isLoading && (
        <section>
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
        <section>
          <div className="flex flex-col items-center justify-center text-center py-16 rounded-3xl border bg-muted/30">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <TrendingUp className="h-8 w-8 text-destructive/60" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Unable to Load Trends</h2>
            <p className="text-sm text-muted-foreground max-w-md mb-4">
              We couldn&apos;t load your grocery categories. This usually happens when there&apos;s no receipt data yet.
            </p>
            <Link
              href="/fridge"
              className="group flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              <Upload className="h-4 w-4" />
              Add Receipts
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </section>
      )}

      {!isLoading && !hasCategories && !error && (
        <section>
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
                <h2 className="text-lg font-semibold">No Grocery Trend Data Yet</h2>
                <p className="text-sm text-muted-foreground max-w-md">
                  Your grocery trends will appear here once you have receipt data. Each broad category will get its own trend chart.
                </p>
                <p className="text-xs text-muted-foreground/70 mt-2">
                  Upload your grocery receipts to start seeing patterns.
                </p>
              </div>
            </div>
            <Link
              href="/fridge"
              className="group flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors shrink-0"
            >
              <Upload className="h-4 w-4" />
              Upload Receipts
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </section>
      )}

      {hasCategories && (
        <section>
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
                <ChartCategoryTrend
                  categoryName={category}
                  data={categoryTrends[category]}
                />
              </SortableGridItem>
            ))}
          </SortableGridProvider>
        </section>
      )}
    </>
  )
}
