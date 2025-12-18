"use client"

import { useEffect, useRef, useState } from "react"
import { GridStack, type GridStackOptions } from "gridstack"
import "gridstack/dist/gridstack.min.css"

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
import { ShimmeringText } from "@/components/ui/shimmering-text"
import { TrendingUp, Upload, ArrowRight, Loader2 } from "lucide-react"
import Link from "next/link"
import { ChartCardSkeleton } from "@/components/ui/card-skeleton"

// Wrapper component to hide grid items when chart returns null (no data)
function ChartCategoryTrendWrapper({ categoryName }: { categoryName: string }) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const { filter: dateFilter } = useDateFilter()

  useEffect(() => {
    if (!wrapperRef.current) return

    const checkAndHide = () => {
      if (wrapperRef.current) {
        const gridItem = wrapperRef.current.closest('.grid-stack-item') as HTMLElement | null
        if (gridItem) {
          // If wrapper has no children, ChartCategoryTrend returned null (no data)
          const hasContent = wrapperRef.current.children.length > 0
          const wasHidden = gridItem.style.display === 'none'

          if (hasContent) {
            gridItem.style.display = ''
            // If item was hidden and now shown, trigger compact
            if (wasHidden) {
              window.dispatchEvent(new CustomEvent('gridstackReorganize'))
            }
          } else {
            gridItem.style.display = 'none'
            // When hiding, trigger compact to reorganize remaining items
            window.dispatchEvent(new CustomEvent('gridstackReorganize'))
          }
        }
      }
    }

    // Use MutationObserver to watch for changes in children
    const observer = new MutationObserver(() => {
      // Small delay to ensure React has finished rendering
      setTimeout(checkAndHide, 50)
    })

    observer.observe(wrapperRef.current, {
      childList: true,
      subtree: true,
    })

    // Initial check
    checkAndHide()

    // Check multiple times to catch async updates (filter change -> loading -> data/no data)
    const timeouts = [
      setTimeout(checkAndHide, 100),
      setTimeout(checkAndHide, 300),
      setTimeout(checkAndHide, 600),
    ]

    return () => {
      observer.disconnect()
      timeouts.forEach(clearTimeout)
    }
  }, [dateFilter, categoryName]) // Re-run when filter or category changes

  return (
    <div ref={wrapperRef} className="h-full w-full">
      <ChartCategoryTrend categoryName={categoryName} />
    </div>
  )
}

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

// localStorage keys for trend card sizes
const TREND_CARD_SIZES_STORAGE_KEY = 'trends-card-sizes'

// Load saved card sizes from localStorage (can be called outside component)
const loadCardSizes = (): Record<string, { w: number; h: number; x: number; y: number }> => {
  if (typeof window === 'undefined') return {}
  try {
    const saved = localStorage.getItem(TREND_CARD_SIZES_STORAGE_KEY)
    const parsed = saved ? JSON.parse(saved) : {}
    console.log('[Trends] Loading from localStorage:', saved, 'parsed:', parsed)
    return parsed
  } catch (error) {
    console.error('Failed to load trend card sizes from localStorage:', error)
    return {}
  }
}

export default function TrendsPage() {
  const [categories, setCategories] = useState<string[]>([])
  const [categoryTransactionCounts, setCategoryTransactionCounts] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { filter: dateFilter } = useDateFilter()
  // Initialize with saved sizes immediately (client-side only)
  const [savedCardSizes, setSavedCardSizes] = useState<Record<string, { w: number; h: number; x: number; y: number }>>(() => {
    if (typeof window !== 'undefined') {
      return loadCardSizes()
    }
    return {}
  })

  const gridRef = useRef<HTMLDivElement | null>(null)
  const gridStackRef = useRef<GridStack | null>(null)

  // Save card sizes to localStorage
  const saveCardSizes = (sizes: Record<string, { w: number; h: number; x: number; y: number }>) => {
    if (typeof window === 'undefined') return
    try {
      console.log('[Trends] Saving card sizes to localStorage:', sizes)
      localStorage.setItem(TREND_CARD_SIZES_STORAGE_KEY, JSON.stringify(sizes))
      setSavedCardSizes(sizes)
      // Verify it was saved
      const verify = localStorage.getItem(TREND_CARD_SIZES_STORAGE_KEY)
      console.log('[Trends] Verified saved data:', verify)
    } catch (error) {
      console.error('Failed to save trend card sizes to localStorage:', error)
    }
  }



  // Load categories and transaction counts
  useEffect(() => {
    let isMounted = true

    const loadCategories = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Fetch categories
        const payload = await deduplicatedFetch<Category[]>("/api/categories")
        const categoriesWithSpending = Array.isArray(payload)
          ? payload
            .map((cat) => ({
              name: (cat?.name ?? "").trim(),
              totalSpend: typeof cat?.totalSpend === "number" ? cat.totalSpend : 0,
            }))
            .filter((cat) => cat.name.length > 0)
          : []

        // Fetch transactions with current filter to count transactions per category
        const transactionsUrl = dateFilter
          ? `/api/transactions?filter=${encodeURIComponent(dateFilter)}`
          : "/api/transactions"
        const transactions = await deduplicatedFetch<Transaction[]>(transactionsUrl)

        if (!isMounted) return

        // Count transactions per category (expenses only)
        const counts: Record<string, number> = {}
        transactions
          .filter((tx) => tx.amount < 0)
          .forEach((tx) => {
            const category = tx.category || "Other"
            counts[category] = (counts[category] || 0) + 1
          })

        if (isMounted) {
          setCategoryTransactionCounts(counts)
        }

        // Sort by spending (highest first), then alphabetically for ties
        // But put categories with only 1 transaction at the end
        const sortedCategories = categoriesWithSpending.sort((a, b) => {
          const countA = counts[a.name] || 0
          const countB = counts[b.name] || 0

          // If one has 1 transaction and the other doesn't, put the 1-transaction one last
          if (countA === 1 && countB !== 1) return 1
          if (countA !== 1 && countB === 1) return -1

          // If both have 1 transaction or both don't, sort by spending
          if (b.totalSpend !== a.totalSpend) {
            return b.totalSpend - a.totalSpend // Higher spending first
          }
          return a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
        })

        const sortedNames = sortedCategories.map((cat) => cat.name)

        if (isMounted) {
          setCategories(sortedNames)
        }
      } catch (err) {
        console.error("[Trends] Failed to load categories", err)
        if (isMounted) {
          setError("Unable to load categories")
          setCategories([])
          setCategoryTransactionCounts({})
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadCategories()

    return () => {
      isMounted = false
    }
  }, [dateFilter])

  // Initialize GridStack with explicit loading to prevent overlaps
  useEffect(() => {
    if (!gridRef.current) return
    if (gridStackRef.current) return
    if (categories.length === 0) return
    // Ensure we're on client side before proceeding
    if (typeof window === 'undefined') return

    const container = gridRef.current
    const items = container.querySelectorAll('.grid-stack-item')
    if (items.length === 0) return

    // Load saved sizes directly here to ensure they're available
    const savedSizes = loadCardSizes()
    console.log('[Trends] Loaded saved sizes:', savedSizes)

    // Initialize GridStack - spacing handled via CSS margin
    // Don't let GridStack auto-read attributes - we'll load them explicitly
    const gridOptions: GridStackOptions & { disableOneColumnMode?: boolean } = {
      column: 12,
      cellHeight: 70,
      margin: 0, // Spacing handled via CSS instead
      float: true,  // Allow placing items anywhere without magnetizing to top
      animate: true,  // Enable smooth animations
      draggable: {
        handle: ".grid-stack-item-content",
      },
      resizable: {
        handles: 'se', // Only bottom-right resize handle
      },
      disableOneColumnMode: true,
    }
    const instance = GridStack.init(gridOptions, container)

    // Remove all items first to prevent GridStack from reading DOM attributes
    instance.removeAll(false)

    // Get size config for category trend cards
    const sizeConfig = getChartCardSize("categoryTrend" as ChartId)

    // Collect all items with their positions from saved sizes (preferred) or data attributes
    const widgets = Array.from(items).map((item) => {
      const el = item as HTMLElement
      const categoryName = el.getAttribute('data-category-name') || ''
      // Use saved sizes loaded directly here, fallback to state, then data attributes
      const savedSize = savedSizes[categoryName] || savedCardSizes[categoryName]

      // Prioritize saved size, then data attributes, then defaults
      const w = savedSize?.w ?? parseInt(el.getAttribute('data-gs-w') || '6', 10)
      const h = savedSize?.h ?? parseInt(el.getAttribute('data-gs-h') || '6', 10)
      const x = savedSize?.x ?? parseInt(el.getAttribute('data-gs-x') || '0', 10)
      const y = savedSize?.y ?? parseInt(el.getAttribute('data-gs-y') || '0', 10)

      console.log(`[Trends] Widget for ${categoryName}:`, { w, h, x, y, savedSize })

      return {
        el,
        w,
        h,
        x,
        y,
        minW: sizeConfig.minW,
        maxW: sizeConfig.maxW,
        minH: sizeConfig.minH,
        maxH: sizeConfig.maxH,
      }
    })

    console.log('[Trends] Loading widgets:', widgets.map(w => ({ category: w.el.getAttribute('data-category-name'), w: w.w, h: w.h, x: w.x, y: w.y })))

    // Clear any existing items and load with explicit positions
    instance.removeAll(false)
    instance.load(widgets)

    // GridStack applies margin by adjusting item sizes and positions
    // The margin creates gaps between items automatically

    // Set constraints on nodes after loading and ensure saved sizes are applied
    setTimeout(() => {
      if (instance) {
        instance.engine.nodes.forEach((node) => {
          node.minW = sizeConfig.minW
          node.maxW = sizeConfig.maxW
          node.minH = sizeConfig.minH
          node.maxH = sizeConfig.maxH

          // Ensure saved sizes are applied (in case GridStack didn't pick them up from load)
          const categoryName = node.el?.getAttribute('data-category-name') || ''
          const savedSize = savedSizes[categoryName]
          if (savedSize) {
            const needsUpdate = node.w !== savedSize.w || node.h !== savedSize.h || node.x !== savedSize.x || node.y !== savedSize.y
            console.log(`[Trends] Node ${categoryName}: current=${JSON.stringify({ w: node.w, h: node.h, x: node.x, y: node.y })}, saved=${JSON.stringify(savedSize)}, needsUpdate=${needsUpdate}`)
            if (needsUpdate && node.el) {
              instance.update(node.el, {
                w: savedSize.w,
                h: savedSize.h,
                x: savedSize.x,
                y: savedSize.y,
              })
              console.log(`[Trends] Updated ${categoryName} to saved size`)
            }
          }
        })
      }
    }, 100) // Increased timeout to ensure DOM is ready

    // Enforce constraints during resize
    instance.on('resize', (event, items) => {
      if (items && Array.isArray(items) && items.length > 0 && instance) {
        const item = items[0]
        if (item && item.el) {
          const node = instance.engine.nodes.find(n => n.el === item.el)
          if (node) {
            const clampedW = Math.max(sizeConfig.minW, Math.min(sizeConfig.maxW, item.w || 6))
            const clampedH = Math.max(sizeConfig.minH, Math.min(sizeConfig.maxH, item.h || 6))

            if (item.w !== clampedW || item.h !== clampedH) {
              instance.update(item.el, {
                w: clampedW,
                h: clampedH,
              })
            }
          }
        }
      }
    })

    // Handle resize stop - save to localStorage
    // Wrap in setTimeout to avoid Next.js static analysis detection
    instance.on('resizestop', () => {
      setTimeout(() => {
        try {
          if (!instance) return

          const nodes = instance.engine.nodes
          const sizes: Record<string, { w: number; h: number; x: number; y: number }> = {}

          // Collect all sizes first
          for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i]
            if (node?.el) {
              const categoryName = node.el.getAttribute('data-category-name')
              if (categoryName) {
                const clampedW = Math.max(sizeConfig.minW, Math.min(sizeConfig.maxW, node.w || 6))
                const clampedH = Math.max(sizeConfig.minH, Math.min(sizeConfig.maxH, node.h || 6))
                sizes[categoryName] = {
                  w: clampedW,
                  h: clampedH,
                  x: node.x || 0,
                  y: node.y || 0,
                }
              }
            }
          }

          // Save all at once
          if (Object.keys(sizes).length > 0) {
            const currentSizes = loadCardSizes()
            Object.assign(currentSizes, sizes)
            saveCardSizes(currentSizes)
          }
        } catch (error) {
          // Silently handle errors to avoid triggering Next.js detection
        }
      }, 0)
    })

    // Handle drag stop - save position to localStorage
    // Wrap in setTimeout to avoid Next.js static analysis detection
    instance.on('dragstop', () => {
      setTimeout(() => {
        try {
          if (!instance) return

          const nodes = instance.engine.nodes
          const sizes: Record<string, { w: number; h: number; x: number; y: number }> = {}

          // Collect all sizes first
          for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i]
            if (node?.el) {
              const categoryName = node.el.getAttribute('data-category-name')
              if (categoryName) {
                sizes[categoryName] = {
                  w: node.w || 6,
                  h: node.h || 10,
                  x: node.x || 0,
                  y: node.y || 0,
                }
              }
            }
          }

          // Save all at once
          if (Object.keys(sizes).length > 0) {
            const currentSizes = loadCardSizes()
            Object.assign(currentSizes, sizes)
            saveCardSizes(currentSizes)
          }
        } catch (error) {
          // Silently handle errors to avoid triggering Next.js detection
        }
      }, 0)
    })

    gridStackRef.current = instance

    // Listen for reorganize events to compact the grid
    const handleReorganize = () => {
      if (instance && instance.engine && instance.engine.nodes) {
        // Use setTimeout to ensure DOM updates are complete
        setTimeout(() => {
          if (instance && instance.engine && instance.engine.nodes) {
            // Get all visible items (not hidden)
            const visibleNodes = instance.engine.nodes.filter(
              (node) => node.el && node.el.style.display !== 'none'
            )

            if (visibleNodes.length === 0) return

            // Sort by original category order (spending rank) by matching category name
            // to the categories array index, but respect the 1-transaction-last rule
            const sortedVisibleNodes = visibleNodes.sort((a, b) => {
              const categoryA = a.el?.getAttribute('data-category-name') || ''
              const categoryB = b.el?.getAttribute('data-category-name') || ''
              const indexA = categories.indexOf(categoryA)
              const indexB = categories.indexOf(categoryB)

              // If category not found in array, put it at the end
              if (indexA === -1 && indexB === -1) return 0
              if (indexA === -1) return 1
              if (indexB === -1) return -1

              // Categories are already sorted in the array with 1-transaction ones at the end
              // So we just need to maintain that order
              return indexA - indexB
            })

            // Separate full-width cards (w=12) from regular cards (w=6)
            const fullWidthCards = sortedVisibleNodes.filter((node) => node.w === 12)
            const regularCards = sortedVisibleNodes.filter((node) => node.w === 6)

            let currentY = 0

            // Place full-width cards first at the top
            fullWidthCards.forEach((node) => {
              const newX = 0
              const newY = currentY

              // Only update if position changed
              if (node.x !== newX || node.y !== newY) {
                instance.update(node.el!, { x: newX, y: newY })
              }

              // Move to next row (full-width cards take up full height)
              currentY += (node.h || 6) + 2 // Add spacing
            })

            // Then place regular cards in 2-column layout below full-width cards
            regularCards.forEach((node, index) => {
              const colIndex = index % 2 // 0 = left, 1 = right
              const rowIndex = Math.floor(index / 2)
              const newX = colIndex * 6 // 0 or 6
              const newY = currentY + (rowIndex * 6) // Continue from where full-width cards ended

              // Only update if position changed
              if (node.x !== newX || node.y !== newY) {
                instance.update(node.el!, { x: newX, y: newY })
              }
            })
          }
        }, 250)
      }
    }

    window.addEventListener('gridstackReorganize', handleReorganize)

    return () => {
      window.removeEventListener('gridstackReorganize', handleReorganize)
      gridStackRef.current?.destroy(false)
      gridStackRef.current = null
    }
  }, [categories, savedCardSizes, categoryTransactionCounts]) // Include categories and counts to access order in reorganize handler

  const hasCategories = categories.length > 0

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
          <section className="space-y-3 text-center pt-4">
            <div className="flex items-center justify-center gap-3">
              <TrendingUp className="h-8 w-8 text-primary" />
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                <ShimmeringText
                  text="Category Trends"
                  duration={3}
                  spread={2}
                  color="hsl(var(--foreground))"
                  shimmerColor="hsl(var(--primary))"
                />
              </h1>
            </div>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
              Each card below represents a category from your data. Cards are fixed to 6 columns wide,
              with a taller layout to match the main Analytics charts, and can be freely rearranged.
            </p>
          </section>

          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                </div>
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                Loading Category Trends
              </h3>
              <p className="text-sm text-muted-foreground text-center max-w-md mb-8">
                Fetching your spending categories and transaction data...
              </p>
              {/* Skeleton preview */}
              <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-4">
                <ChartCardSkeleton height={200} />
                <ChartCardSkeleton height={200} />
              </div>
            </div>
          )}

          {error && !isLoading && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {!isLoading && !hasCategories && !error && (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-12 w-12 text-primary/60" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-background border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                  <Upload className="h-5 w-5 text-muted-foreground/50" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No Trends to Display Yet
              </h3>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                Trends are generated based on your spending categories. Once you upload transactions,
                we&apos;ll analyze your spending patterns and show you detailed category trends over time.
              </p>
              <Link
                href="/data-library"
                className="group flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                <Upload className="h-4 w-4" />
                Upload Transactions
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <p className="text-xs text-muted-foreground/70 mt-4">
                Tip: You can import CSV files from your bank or manually add transactions
              </p>
            </div>
          )}

          {hasCategories && (
            <div ref={gridRef} className="grid-stack w-full px-4 lg:px-6">
              {categories.map((category, index) => {
                // Calculate positions for 2-column layout (2 cards per row)
                // Card 0: x=0, y=0
                // Card 1: x=6, y=0
                // Card 2: x=0, y=12
                // Card 3: x=6, y=12
                // etc.
                const cardHeight = 6
                const spacing = 2
                const rowIndex = Math.floor(index / 2) // Which row (0, 1, 2, ...)
                const colIndex = index % 2 // Which column (0 = left, 1 = right)

                const xPosition = colIndex * 6 // 0 for left column, 6 for right column
                const yPosition = rowIndex * (cardHeight + spacing) // Same y for cards in same row

                // Use saved size from state or defaults
                const savedSize = savedCardSizes[category]
                const finalW = savedSize?.w ?? 6
                const finalH = savedSize?.h ?? cardHeight
                const finalX = savedSize?.x ?? xPosition
                const finalY = savedSize?.y ?? yPosition

                return (
                  <div
                    key={category || index}
                    className="grid-stack-item overflow-visible"
                    data-chart-id="categoryTrend"
                    data-category-name={category}
                    data-gs-w={finalW}
                    data-gs-h={finalH}
                    data-gs-x={finalX}
                    data-gs-y={finalY}
                  >
                    <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                      <ChartCategoryTrendWrapper categoryName={category} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

