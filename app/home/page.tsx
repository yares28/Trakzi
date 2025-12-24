"use client"

import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import { flushSync } from "react-dom"
import { useSearchParams, useRouter } from "next/navigation"
// @dnd-kit for drag-and-drop (replaces GridStack)
import { SortableGridProvider, SortableGridItem } from "@/components/sortable-grid"
import { AppSidebar } from "@/components/app-sidebar"
import { useTransactionDialog } from "@/components/transaction-dialog-provider"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { ChartCategoryFlow } from "@/components/chart-category-flow"
import { ChartSpendingFunnel } from "@/components/chart-spending-funnel"
import { ChartExpensesPie } from "@/components/chart-expenses-pie"
import { ChartTreeMap } from "@/components/chart-treemap"
import { ChartNeedsWantsPie } from "@/components/chart-needs-wants-pie"
import { ChartPolarBar } from "@/components/chart-polar-bar"
import { ChartCategoryBubble } from "@/components/chart-category-bubble"
import { ChartRadar } from "@/components/chart-radar"
import { ChartDayOfWeekCategory } from "@/components/chart-day-of-week-category"
import { ChartDayOfWeekSpending } from "@/components/chart-day-of-week-spending"
import { ChartAllMonthsCategorySpending } from "@/components/chart-all-months-category-spending"
import { ChartSingleMonthCategorySpending } from "@/components/chart-single-month-category-spending"
import { ChartSwarmPlot } from "@/components/chart-swarm-plot"
import { ChartSpendingStreamgraph } from "@/components/chart-spending-streamgraph"
import { ChartSankey } from "@/components/chart-sankey"
import { ChartTransactionCalendar } from "@/components/chart-transaction-calendar"
import { DataTable } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import { useCurrency } from "@/components/currency-provider"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { cn, normalizeTransactions } from "@/lib/utils"
import { IconUpload, IconFile, IconCircleCheck, IconLoader2, IconAlertCircle, IconTrash } from "@tabler/icons-react"
import { toast } from "sonner"
import { parseCsvToRows } from "@/lib/parsing/parseCsvToRows"
import { rowsToCanonicalCsv } from "@/lib/parsing/rowsToCanonicalCsv"
import { TxRow } from "@/lib/types/transactions"
import { CategorySelect } from "@/components/category-select"
import { DEFAULT_CATEGORIES } from "@/lib/categories"
import { Progress } from "@/components/ui/progress"
import { memo } from "react"
import { useChartCategoryVisibility } from "@/hooks/use-chart-category-visibility"
import { useFavorites } from "@/components/favorites-provider"
import { useDateFilter } from "@/components/date-filter-provider"
import { getChartMetadata } from "@/lib/chart-metadata"
import { getChartCardSize, type ChartId } from "@/lib/chart-card-sizes.config"
// @dnd-kit has built-in auto-scroll
import { useTheme } from "next-themes"
import { useColorScheme } from "@/components/color-scheme-provider"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { usePendingCheckout } from "@/hooks/use-pending-checkout"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

type ParsedRow = TxRow & { id: number }

// Types for Spending Activity Rings
type ActivityRingsDatum = {
  value: number
  label?: string
  color?: string
  backgroundColor?: string
  category?: string
  spent?: number
}

type ActivityRingsData = ActivityRingsDatum[]

type ActivityRingsConfig = {
  width: number
  height: number
  radius?: number
  ringSize?: number
}

interface SpendingActivityRingsProps {
  data: ActivityRingsData
  config: ActivityRingsConfig
  theme: "light" | "dark"
  ringLimits?: Record<string, number>
  getDefaultLimit?: () => number
}

// Custom concentric rings renderer
function SpendingActivityRings({ data, config, theme, ringLimits = {}, getDefaultLimit }: SpendingActivityRingsProps) {
  const rings = Array.isArray(data) ? data : []
  if (!rings.length) return null

  const [hoveredRing, setHoveredRing] = useState<number | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)
  const [isAnimating, setIsAnimating] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ width: config.width, height: config.height })

  // Reset animation state when data changes
  useEffect(() => {
    setIsAnimating(true)
    const timer = setTimeout(() => setIsAnimating(false), 800)
    return () => clearTimeout(timer)
  }, [data])

  // Observe container size changes
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateSize = () => {
      const rect = container.getBoundingClientRect()
      const padding = 40
      const availableWidth = rect.width - padding
      const availableHeight = rect.height - padding
      const size = Math.min(availableWidth, availableHeight)
      const minSize = 200
      const maxSize = 800
      const clampedSize = Math.max(minSize, Math.min(maxSize, size))

      setContainerSize(prev => {
        if (Math.abs(prev.width - clampedSize) > 1) {
          return { width: clampedSize, height: clampedSize }
        }
        return prev
      })
    }

    const timeoutId = setTimeout(updateSize, 0)
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(updateSize)
    })
    resizeObserver.observe(container)

    return () => {
      clearTimeout(timeoutId)
      resizeObserver.disconnect()
    }
  }, [])

  const width = containerSize.width
  const height = containerSize.height
  const centerX = width / 2
  const centerY = height / 2
  const sizeScale = width / config.width
  const ringSize = (config.ringSize ?? 12) * sizeScale
  const gap = 4 * sizeScale
  const baseRadius = (config.radius ?? 32) * sizeScale

  const trackBase = theme === "light" ? "#e5e7eb" : "#374151"
  const maxIndex = rings.length - 1

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>, index: number) => {
    if (!containerRef.current) return
    const containerRect = containerRef.current.getBoundingClientRect()
    setTooltipPosition({
      x: e.clientX - containerRect.left,
      y: e.clientY - containerRect.top,
    })
    setHoveredRing(index)
  }

  const handleMouseLeave = () => {
    setHoveredRing(null)
    setTooltipPosition(null)
  }

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center justify-center" style={{ minHeight: '200px', minWidth: '200px' }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Spending activity rings"
        onMouseLeave={handleMouseLeave}
        className={isAnimating ? "animate-in fade-in-0 zoom-in-95 duration-500" : ""}
        style={{ maxWidth: '100%', maxHeight: '100%' }}
      >
        {rings.map((item, index) => {
          const ringIndexFromOutside = index
          const radius = baseRadius + (maxIndex - ringIndexFromOutside) * (ringSize + gap)
          const circumference = 2 * Math.PI * radius
          const clampedValue = Math.max(0, Math.min(1, item.value ?? 0))
          const dashOffset = circumference * (1 - clampedValue)

          const strokeColor = item.color || "#6b7280"
          const trackColor = item.backgroundColor || `${trackBase}${theme === "light" ? "ff" : "cc"}`

          const _category = (item as { category?: string }).category ?? "Category"
          const _spent = typeof (item as { spent?: number }).spent === "number"
            ? (item as { spent?: number }).spent!
            : 0

          return (
            <g key={item.category ?? item.label ?? index}>
              <circle
                cx={centerX}
                cy={centerY}
                r={radius}
                fill="none"
                stroke={trackColor}
                strokeWidth={ringSize}
                strokeLinecap="round"
              />
              <circle
                cx={centerX}
                cy={centerY}
                r={radius}
                fill="none"
                stroke={strokeColor}
                strokeWidth={ringSize}
                strokeDasharray={circumference}
                strokeDashoffset={isAnimating ? circumference : dashOffset}
                strokeLinecap="round"
                transform={`rotate(-90 ${centerX} ${centerY})`}
                onMouseMove={(e) => {
                  const svg = e.currentTarget.ownerSVGElement
                  if (svg) {
                    handleMouseMove(e as unknown as React.MouseEvent<SVGSVGElement>, index)
                  }
                }}
                style={{
                  cursor: "pointer",
                  transition: "stroke-width 0.2s ease-in-out, opacity 0.2s ease-in-out, stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                  strokeWidth: hoveredRing === index ? ringSize + 2 : ringSize,
                  opacity: hoveredRing === null || hoveredRing === index ? 1 : 0.6,
                }}
              />
            </g>
          )
        })}
      </svg>
      {hoveredRing !== null && tooltipPosition && (
        <div
          className="border-border/50 bg-background grid min-w-[8rem] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl pointer-events-none absolute z-50 animate-in fade-in-0 zoom-in-95 duration-200"
          style={{
            left: `${tooltipPosition.x + 10}px`,
            top: `${tooltipPosition.y - 10}px`,
            transform: "translate(-50%, -100%)",
            width: "max-content",
          }}
        >
          {(() => {
            const item = rings[hoveredRing]
            const category = (item as { category?: string }).category ?? "Category"
            const spent = typeof (item as { spent?: number }).spent === "number"
              ? (item as { spent?: number }).spent!
              : 0

            const storedLimit = ringLimits[category]
            const budget = typeof storedLimit === "number" && storedLimit > 0
              ? storedLimit
              : (getDefaultLimit ? getDefaultLimit() : null)

            const pct = budget && budget > 0 ? ((spent / budget) * 100).toFixed(1) : '0'
            const exceeded = budget ? spent > budget : false

            return (
              <>
                <div className="font-medium">{category}</div>
                <div className="grid gap-1.5">
                  <div className="flex items-center gap-2">
                    <div className="shrink-0 h-2.5 w-2.5 rounded-[2px] border border-current"
                      style={{ backgroundColor: item.color || "#6b7280", borderColor: item.color || "#6b7280" }}
                    />
                    <div className="flex justify-between items-center leading-none gap-4">
                      <span className="text-muted-foreground">Used:</span>
                      <span className="text-foreground font-mono font-medium tabular-nums">{pct}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="shrink-0 h-2.5 w-2.5 rounded-[2px] border border-current"
                      style={{ backgroundColor: item.color || "#6b7280", borderColor: item.color || "#6b7280" }}
                    />
                    <div className="flex justify-between items-center leading-none gap-4">
                      <span className="text-muted-foreground">Spent:</span>
                      <span className="text-foreground font-mono font-medium tabular-nums" style={{ color: exceeded ? '#ef4444' : undefined }}>
                        ${spent.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  {budget && (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="shrink-0 h-2.5 w-2.5 rounded-[2px] border border-current"
                          style={{ backgroundColor: item.color || "#6b7280", borderColor: item.color || "#6b7280" }}
                        />
                        <div className="flex justify-between items-center leading-none gap-4">
                          <span className="text-muted-foreground">Budget:</span>
                          <span className="text-foreground font-mono font-medium tabular-nums">${Math.floor(budget)}</span>
                        </div>
                      </div>
                      {exceeded && (
                        <div className="flex items-center gap-2">
                          <div className="shrink-0 h-2.5 w-2.5 rounded-[2px] border border-current"
                            style={{ backgroundColor: item.color || "#6b7280", borderColor: item.color || "#6b7280" }}
                          />
                          <div className="flex justify-between items-center leading-none gap-4">
                            <span className="text-muted-foreground">Status:</span>
                            <span className="text-foreground font-mono font-medium tabular-nums" style={{ color: '#ef4444' }}>⚠ Exceeded</span>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )
          })()}
        </div>
      )}
    </div>
  )
}

// Memoized table row component to prevent unnecessary re-renders
const MemoizedTableRow = memo(function MemoizedTableRow({
  row,
  amount,
  category,
  isSelected,
  onSelectChange,
  onCategoryChange,
  onDelete
}: {
  row: ParsedRow
  amount: number
  category: string
  isSelected: boolean
  onSelectChange: (value: boolean) => void
  onCategoryChange: (value: string) => void
  onDelete: () => void
}) {
  const { formatCurrency } = useCurrency()
  return (
    <TableRow>
      <TableCell className="w-12">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelectChange(checked === true)}
          aria-label="Select transaction"
        />
      </TableCell>
      <TableCell className="w-28 flex-shrink-0">
        <div className="flex flex-col">
          <span>{row.date}</span>
          {row.time ? (
            <span className="text-xs text-muted-foreground">{row.time}</span>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="min-w-[350px] max-w-[600px]">
        <div className="truncate" title={row.description}>
          {row.description}
        </div>
      </TableCell>
      <TableCell className={cn("text-right font-medium w-24 flex-shrink-0", amount < 0 ? "text-red-500" : "text-green-500")}>
        {formatCurrency(amount)}
      </TableCell>
      <TableCell className="w-[140px] flex-shrink-0">
        <CategorySelect
          value={category}
          onValueChange={onCategoryChange}
        />
      </TableCell>
      <TableCell className="w-12 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={onDelete}
        >
          <IconTrash className="h-4 w-4" />
          <span className="sr-only">Delete</span>
        </Button>
      </TableCell>
    </TableRow>
  )
}, (prevProps, nextProps) => {
  // Only re-render if the category or row id actually changed
  return (
    prevProps.category === nextProps.category &&
    prevProps.row.id === nextProps.row.id &&
    prevProps.isSelected === nextProps.isSelected
  )
})

// Storage keys for persistence
const FAVORITES_ORDER_STORAGE_KEY = 'home-favorites-order'
const FAVORITE_SIZES_STORAGE_KEY = 'home-favorites-chart-sizes'

export default function Page() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { setRefreshCallback } = useTransactionDialog()
  const { favorites } = useFavorites()

  // Handle pending checkout after signup (if user selected a paid plan before signing up)
  const { isProcessing: isCheckoutProcessing } = usePendingCheckout()

  // @dnd-kit: Chart order state for favorites section
  const [favoritesOrder, setFavoritesOrder] = useState<string[]>([])

  // Sync favoritesOrder with favorites set
  useEffect(() => {
    const favoritesArray = Array.from(favorites)
    if (favoritesArray.length === 0) {
      setFavoritesOrder([])
      return
    }
    // Load saved order from localStorage
    try {
      const saved = localStorage.getItem(FAVORITES_ORDER_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        // Keep existing order, add new favorites at end, remove deleted ones
        const existingInOrder = parsed.filter((id: string) => favoritesArray.includes(id as ChartId))
        const newFavorites = favoritesArray.filter((id) => !parsed.includes(id))
        setFavoritesOrder([...existingInOrder, ...newFavorites])
      } else {
        setFavoritesOrder(favoritesArray)
      }
    } catch {
      setFavoritesOrder(favoritesArray)
    }
  }, [favorites])

  // Handle favorites order change from drag-and-drop
  const handleFavoritesOrderChange = useCallback((newOrder: string[]) => {
    setFavoritesOrder(newOrder)
    try {
      localStorage.setItem(FAVORITES_ORDER_STORAGE_KEY, JSON.stringify(newOrder))
    } catch (e) {
      console.error("Failed to save favorites order:", e)
    }
  }, [])

  // Handle favorites resize from drag
  const handleFavoritesResize = useCallback((chartId: string, w: number, h: number) => {
    setSavedFavoriteSizes(prev => {
      const next = { ...prev, [chartId]: { w, h } }
      try {
        localStorage.setItem(FAVORITE_SIZES_STORAGE_KEY, JSON.stringify(next))
      } catch (e) {
        console.error("Failed to save favorites size:", e)
      }
      return next
    })
  }, [FAVORITE_SIZES_STORAGE_KEY])

  // Saved chart sizes for favorites
  const [savedFavoriteSizes, setSavedFavoriteSizes] = useState<Record<string, { w: number; h: number; x?: number; y?: number }>>({})
  const savedFavoriteSizesRef = useRef<Record<string, { w: number; h: number; x?: number; y?: number }>>({})

  const [isDragging, setIsDragging] = useState(false)
  const [droppedFile, setDroppedFile] = useState<File | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [parsingProgress, setParsingProgress] = useState(0)
  const [parsedCsv, setParsedCsv] = useState<string | null>(null)
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [fileId, setFileId] = useState<string | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [isAiReparseOpen, setIsAiReparseOpen] = useState(false)
  const [aiReparseContext, setAiReparseContext] = useState("")
  const [isAiReparsing, setIsAiReparsing] = useState(false)
  const [selectedParsedRowIds, setSelectedParsedRowIds] = useState<Set<number>>(new Set())
  const [transactionCount, setTransactionCount] = useState<number>(0)
  const [hiddenCategories, setHiddenCategories] = useState<string[]>([])
  const dragCounterRef = useRef(0)

  const normalizeCategoryName = useCallback((value?: string | null) => {
    const trimmed = (value ?? "").trim()
    return trimmed || "Other"
  }, [])

  // Default sizes for favorite charts
  const DEFAULT_FAVORITE_SIZES: Record<string, { w: number; h: number; x?: number; y?: number }> = {
    "incomeExpensesTracking1": { w: 12, h: 6, x: 0, y: 0 },
    "incomeExpensesTracking2": { w: 12, h: 6, x: 0, y: 6 },
    "spendingCategoryRankings": { w: 12, h: 8, x: 0, y: 12 },
    "netWorthAllocation": { w: 12, h: 10, x: 0, y: 20 },
    "moneyFlow": { w: 6, h: 10, x: 0, y: 30 },
    "needsWantsBreakdown": { w: 6, h: 10, x: 6, y: 20 },
    "expenseBreakdown": { w: 6, h: 10, x: 6, y: 30 },
    "categoryBubbleMap": { w: 6, h: 10, x: 6, y: 40 },
    "householdSpendMix": { w: 6, h: 10, x: 0, y: 40 },
    "financialHealthScore": { w: 6, h: 10, x: 6, y: 30 },
    "spendingActivityRings": { w: 6, h: 8, x: 0, y: 50 },
    "spendingStreamgraph": { w: 12, h: 9, x: 0, y: 60 },
    "transactionHistory": { w: 12, h: 9, x: 0, y: 69 },
    "dailyTransactionActivity": { w: 12, h: 7, x: 0, y: 78 },
    "dayOfWeekSpending": { w: 6, h: 8, x: 6, y: 86 },
    "allMonthsCategorySpending": { w: 6, h: 8, x: 0, y: 94 },
    "singleMonthCategorySpending": { w: 6, h: 8, x: 6, y: 102 },
    "dayOfWeekCategory": { w: 6, h: 8, x: 0, y: 102 },
  }

  // Snap to allowed size (6 or 12 width)
  const snapToAllowedSize = useCallback((w: number, h: number) => {
    const widthDistanceToSmall = Math.abs(w - 6)
    const widthDistanceToLarge = Math.abs(w - 12)
    const snappedWidth = widthDistanceToSmall <= widthDistanceToLarge ? 6 : 12
    const clampedHeight = Math.max(4, Math.min(20, h))
    return { w: snappedWidth, h: clampedHeight }
  }, [])

  // Load saved favorite chart sizes
  const loadFavoriteSizes = useCallback((): Record<string, { w: number; h: number; x?: number; y?: number }> => {
    if (typeof window === 'undefined') return {}
    try {
      const saved = localStorage.getItem(FAVORITE_SIZES_STORAGE_KEY)
      return saved ? JSON.parse(saved) : {}
    } catch (error) {
      console.error('Failed to load favorite chart sizes:', error)
      return {}
    }
  }, [])

  // Save favorite chart sizes
  const saveFavoriteSizes = useCallback(
    (sizes: Record<string, { w: number; h: number; x?: number; y?: number }>) => {
      setSavedFavoriteSizes(sizes)
      savedFavoriteSizesRef.current = sizes
      if (typeof window === "undefined") return
      try {
        localStorage.setItem(FAVORITE_SIZES_STORAGE_KEY, JSON.stringify(sizes))
      } catch (error) {
        console.error("Failed to save favorite chart sizes:", error)
      }
    },
    [],
  )

  // Load saved sizes on mount
  useEffect(() => {
    const loaded = loadFavoriteSizes()
    setSavedFavoriteSizes(loaded)
    savedFavoriteSizesRef.current = loaded
  }, [loadFavoriteSizes])

  // NOTE: GridStack initialization removed - now using @dnd-kit for drag-and-drop
  // The SortableGridProvider handles all drag-and-drop functionality with built-in auto-scroll

  // Transactions state for DataTable (paginated, max 100)
  const [transactions, setTransactions] = useState<Array<{
    id: number
    date: string
    description: string
    amount: number
    balance: number | null
    category: string
  }>>([])

  // Chart transactions state (full data from /api/charts/transactions)
  const [chartTransactions, setChartTransactions] = useState<Array<{
    id: number
    date: string
    amount: number
    category: string
  }>>([])
  const [isLoadingChartTransactions, setIsLoadingChartTransactions] = useState(true)

  // Summary stats from aggregated API endpoint (for SectionCards)
  const [summaryStats, setSummaryStats] = useState<{
    totalIncome: number
    totalExpenses: number
    savingsRate: number
    netWorth: number
    incomeChange: number
    expensesChange: number
    savingsRateChange: number
    netWorthChange: number
    incomeTrend: Array<{ date: string; value: number }>
    expensesTrend: Array<{ date: string; value: number }>
    netWorthTrend: Array<{ date: string; value: number }>
    transactionCount: number
    transactionTimeSpan: string
    transactionTrend: Array<{ date: string; value: number }>
  } | null>(null)

  // Chart data from aggregated API endpoint
  const [chartData, setChartData] = useState<Array<{ date: string; desktop: number; mobile: number }>>([])
  const [isLoadingStats, setIsLoadingStats] = useState(true)
  const [isLoadingChartData, setIsLoadingChartData] = useState(true)

  // Date filter state
  const { filter: dateFilter } = useDateFilter()
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

  // Spending Activity Rings state
  const [ringLimits, setRingLimits] = useState<Record<string, number>>({})
  const [ringCategories, setRingCategories] = useState<string[]>([])
  const [allExpenseCategories, setAllExpenseCategories] = useState<string[]>([])
  const [ringCategoryPopoverIndex, setRingCategoryPopoverIndex] = useState<number | null>(null)
  const [ringCategoryPopoverValue, setRingCategoryPopoverValue] = useState<string | null>(null)
  const [ringLimitPopoverValue, setRingLimitPopoverValue] = useState<string>("")
  const { resolvedTheme } = useTheme()
  const { getPalette } = useColorScheme()
  const palette = getPalette()

  // Memoized Popover content component with local state for responsive input
  const RingPopoverContent = memo(function RingPopoverContent({
    initialCategory,
    initialLimit,
    allCategories,
    onSave,
    onCancel,
  }: {
    initialCategory: string
    initialLimit: number
    allCategories: string[]
    onSave: (category: string, limit: string) => void
    onCancel: () => void
  }) {
    const [localCategory, setLocalCategory] = useState(initialCategory)
    const [localLimit, setLocalLimit] = useState(initialLimit.toString())

    // Sync with props when they change (when popover opens)
    useEffect(() => {
      setLocalCategory(initialCategory)
      setLocalLimit(initialLimit.toString())
    }, [initialCategory, initialLimit])

    return (
      <div className="space-y-3">
        <div className="text-xs font-medium text-muted-foreground">
          Select category for this ring
        </div>
        <select
          className="w-full rounded-md border bg-background px-2 py-1 text-sm"
          value={localCategory}
          onChange={(e) => setLocalCategory(e.target.value)}
        >
          {allCategories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <div className="space-y-1 pt-1">
          <div className="text-xs font-medium text-muted-foreground">
            Limit for this category
          </div>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className="w-full rounded-md border bg-background px-2 py-1 text-sm"
            value={localLimit}
            onChange={(e) => {
              const value = e.target.value.replace(/[^\d]/g, '')
              setLocalLimit(value)
            }}
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => onSave(localCategory, localLimit)}
          >
            Save
          </Button>
        </div>
      </div>
    )
  })


  // chartTransactions is now a separate state fetched from /api/charts/transactions

  // Get default ring limit based on date filter
  const getDefaultRingLimit = (filter: string | null): number => {
    const isYearLike = !filter || filter === "lastyear" || (/^\d{4}$/.test(filter))
    return isYearLike ? 5000 : 2000
  }

  // Calculate all expense categories
  const allExpenseCategoriesMemo = useMemo(() => {
    const categories = new Set<string>()
    chartTransactions
      .filter((tx) => tx.amount < 0)
      .forEach((tx) => {
        const rawCategory = (tx.category || "Other").trim()
        const category = rawCategory || "Other"
        categories.add(category)
      })
    return Array.from(categories).sort((a, b) => a.localeCompare(b))
  }, [chartTransactions])

  useEffect(() => {
    setAllExpenseCategories(allExpenseCategoriesMemo)
  }, [allExpenseCategoriesMemo])

  // Load ring limits from localStorage
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

  // Prepare activity data for Spending Activity Rings
  const activityData: ActivityRingsData = useMemo(() => {
    if (!chartTransactions || chartTransactions.length === 0) {
      return []
    }

    const categoryTotals = new Map<string, number>()
    chartTransactions
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
        label: ratioToLimit !== null
          ? `Category: ${category}\nUsed: ${pct}%\nSpent: $${amount.toFixed(2)}\nBudget: $${effectiveLimit.toFixed(2)}${exceeded ? '\n⚠ Exceeded' : ''}`
          : `Category: ${category}\nSpent: $${amount.toFixed(2)}\nNo budget set`,
        category,
        spent: amount,
        value,
        color,
      }
    })
  }, [chartTransactions, palette, ringCategories, ringLimits, dateFilter])

  // Activity rings config and theme
  const activityConfig: ActivityRingsConfig = useMemo(() => ({
    width: 400,
    height: 400,
    radius: 32,
    ringSize: 12,
  }), [])

  const activityTheme = resolvedTheme === "dark" ? "dark" : "light"

  // Build category controls for each chart
  const incomeExpenseCategories = useMemo(() => {
    const categories = new Set<string>()
    chartTransactions.forEach(tx => {
      categories.add(normalizeCategoryName(tx.category))
    })
    return Array.from(categories).sort((a, b) => a.localeCompare(b))
  }, [chartTransactions])

  const incomeExpenseControls = incomeExpenseVisibility.buildCategoryControls(incomeExpenseCategories, {
    description: "Hide a category to remove its transactions from this cash-flow chart.",
  })

  const categoryFlowCategories = useMemo(() => {
    const categories = new Set<string>()
    chartTransactions.forEach(tx => {
      if (tx.amount < 0) {
        categories.add(normalizeCategoryName(tx.category))
      }
    })
    return Array.from(categories).sort((a, b) => a.localeCompare(b))
  }, [chartTransactions])

  const categoryFlowControls = categoryFlowVisibility.buildCategoryControls(categoryFlowCategories, {
    description: "Hide a spending category to remove it from the ranking stream.",
  })

  const spendingFunnelCategories = useMemo(() => {
    const categories = new Set<string>()
    chartTransactions.filter(tx => tx.amount < 0).forEach(tx => {
      categories.add(normalizeCategoryName(tx.category))
    })
    return Array.from(categories).sort((a, b) => a.localeCompare(b))
  }, [chartTransactions])

  const spendingFunnelControls = spendingFunnelVisibility.buildCategoryControls(spendingFunnelCategories, {
    description: "Hide a category to keep it out of this funnel view only.",
  })

  const expensesPieCategories = useMemo(() => {
    const categories = new Set<string>()
    chartTransactions.filter(tx => tx.amount < 0).forEach(tx => {
      categories.add(normalizeCategoryName(tx.category))
    })
    return Array.from(categories).sort((a, b) => a.localeCompare(b))
  }, [chartTransactions])

  const expensesPieControls = expensesPieVisibility.buildCategoryControls(expensesPieCategories, {
    description: "Choose which expense categories appear in this pie chart.",
  })

  // Pre-compute chart data at top level to avoid calling hooks inside map
  const incomeExpensesChartData = useMemo(() => {
    const transactionsByDate = new Map<string, Array<{ amount: number }>>()
    chartTransactions.forEach(tx => {
      const date = tx.date.split('T')[0]
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
      mobile: cumulativeExpensesByDate.get(date) || 0
    }))
  }, [chartTransactions])

  const categoryFlowChartData = useMemo(() => {
    if (!chartTransactions || chartTransactions.length === 0) return []
    const categoryMap = new Map<string, Map<string, number>>()
    const allMonths = new Set<string>()
    chartTransactions.forEach(tx => {
      const category = tx.category || "Other"
      const normalizedCategory = normalizeCategoryName(category)
      if (categoryFlowVisibility.hiddenCategorySet.has(normalizedCategory)) return
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
          return {
            x: month,
            y: Math.max(percentage, 0.1)
          }
        })
      }))
      .filter(series => series.data.some(d => {
        const month = d.x
        const originalValue = categoryMap.get(series.id)?.get(month) || 0
        return originalValue > 0
      }))
  }, [chartTransactions, categoryFlowVisibility, normalizeCategoryName])

  const spendingFunnelChartData = useMemo(() => {
    const totalIncome = chartTransactions.filter(tx => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0)
    const categoryMap = new Map<string, number>()
    chartTransactions.filter(tx => tx.amount < 0).forEach(tx => {
      const category = tx.category || "Other"
      const current = categoryMap.get(category) || 0
      categoryMap.set(category, current + Math.abs(tx.amount))
    })
    const totalExpenses = Array.from(categoryMap.values()).reduce((sum, amount) => sum + amount, 0)
    const savings = totalIncome - totalExpenses
    const sortedCategories = Array.from(categoryMap.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
    const top2Categories = sortedCategories.slice(0, 2)
    const shownExpenses = top2Categories.reduce((sum, cat) => sum + cat.amount, 0)
    const remainingExpenses = totalExpenses - shownExpenses
    const expenseCategories: Array<{ id: string; value: number; label: string }> = []
    top2Categories.forEach(cat => {
      expenseCategories.push({
        id: cat.category.toLowerCase().replace(/\s+/g, '-'),
        value: cat.amount,
        label: cat.category
      })
    })
    if (remainingExpenses > 0) {
      expenseCategories.push({
        id: "others",
        value: remainingExpenses,
        label: "Others"
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
    return funnelData.filter(item => item.value > 0)
  }, [chartTransactions])

  const expensesPieChartData = useMemo(() => {
    const categoryMap = new Map<string, number>()
    chartTransactions.filter(tx => tx.amount < 0).forEach(tx => {
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

  const spendingStreamData = useMemo(() => {
    if (!chartTransactions || chartTransactions.length === 0) {
      return { data: [] as Array<Record<string, string | number>>, keys: [] as string[], categories: [] as string[] }
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
  }, [chartTransactions, streamgraphVisibility.hiddenCategorySet, normalizeCategoryName])

  const streamgraphControls = streamgraphVisibility.buildCategoryControls(spendingStreamData.categories, {
    description: "Select which categories flow through this streamgraph.",
  })

  const treeMapChartData = useMemo(() => {
    const categoryMap = new Map<string, { total: number; subcategories: Map<string, { amount: number; fullDescription: string }> }>()
    const getSubCategoryLabel = (description?: string) => {
      if (!description) return "Misc"
      const delimiterSplit = description.split(/[-–|]/)[0] ?? description
      const trimmed = delimiterSplit.trim()
      return trimmed.length > 24 ? `${trimmed.slice(0, 21)}…` : (trimmed || "Misc")
    }
    chartTransactions
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
            fullDescription: tx.description || subCategory
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
            fullDescription
          }))
          if (remainingTotal > 0) {
            children.push({ name: "Other", loc: remainingTotal, fullDescription: "Other transactions" })
          }
          return {
            name,
            children: children.length > 0 ? children : [{ name, loc: total, fullDescription: name }]
          }
        })
        .sort((a, b) => {
          const aTotal = a.children.reduce((sum, child) => sum + (child.loc || 0), 0)
          const bTotal = b.children.reduce((sum, child) => sum + (child.loc || 0), 0)
          return bTotal - aTotal
        })
    }
  }, [chartTransactions])

  const treeMapCategories = useMemo(() => {
    const categories = new Set<string>()
    chartTransactions.filter(tx => tx.amount < 0).forEach(tx => {
      categories.add(normalizeCategoryName(tx.category))
    })
    return Array.from(categories).sort((a, b) => a.localeCompare(b))
  }, [chartTransactions])

  const treeMapControls = treeMapVisibility.buildCategoryControls(treeMapCategories, {
    description: "Hide categories to remove them from this treemap view.",
  })

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const stored = window.localStorage.getItem("analyticsHiddenCategories")
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setHiddenCategories(parsed.map((category) => normalizeCategoryName(category)))
        }
      }
    } catch {
      // ignore
    }
  }, [])

  const persistHiddenCategories = (next: string[]) => {
    if (typeof window === "undefined") return
    if (!next.length) {
      window.localStorage.removeItem("analyticsHiddenCategories")
    } else {
      window.localStorage.setItem("analyticsHiddenCategories", JSON.stringify(next))
    }
  }

  const toggleHiddenCategory = useCallback((category: string) => {
    const normalized = normalizeCategoryName(category)
    setHiddenCategories((prev) => {
      const exists = prev.includes(normalized)
      const next = exists ? prev.filter((item) => item !== normalized) : [...prev, normalized]
      persistHiddenCategories(next)
      return next
    })
  }, [])

  const clearHiddenCategories = useCallback(() => {
    setHiddenCategories([])
    persistHiddenCategories([])
  }, [])

  const categoryVisibilityOptions = useMemo(() => {
    const names = new Set<string>()
    DEFAULT_CATEGORIES.forEach((name) => {
      if (name) names.add(normalizeCategoryName(name))
    })
    transactions.forEach((tx) => {
      names.add(normalizeCategoryName(tx.category))
    })
    return Array.from(names).sort((a, b) => a.localeCompare(b))
  }, [transactions])

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
      : 0

    const expensesChange = previousExpenses > 0
      ? ((currentExpenses - previousExpenses) / previousExpenses) * 100
      : 0

    const savingsRateChange = previousSavingsRate !== 0
      ? currentSavingsRate - previousSavingsRate
      : 0

    const netWorthChange = previousNetWorth > 0
      ? ((netWorth - previousNetWorth) / previousNetWorth) * 100
      : 0

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

  const transactionSummary = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return { count: 0, timeSpan: "No data", trend: [] as { date: string; value: number }[] }
    }

    const count = transactions.length
    const dates = transactions
      .map((t) => new Date(t.date).getTime())
      .filter((t) => !isNaN(t))

    if (dates.length === 0) {
      return { count, timeSpan: "0 days", trend: [] as { date: string; value: number }[] }
    }

    const minDate = new Date(Math.min(...dates))
    const maxDate = new Date(Math.max(...dates))

    let years = maxDate.getFullYear() - minDate.getFullYear()
    let months = maxDate.getMonth() - minDate.getMonth()
    let days = maxDate.getDate() - minDate.getDate()

    if (days < 0) {
      months--
      days += 30
    }
    if (months < 0) {
      years--
      months += 12
    }

    let timeSpan = ""
    if (years > 0) {
      timeSpan = `${years} year${years > 1 ? "s" : ""}`
      if (months > 0) timeSpan += ` and ${months} month${months > 1 ? "s" : ""}`
    } else if (months > 0) {
      timeSpan = `${months} month${months > 1 ? "s" : ""}`
      if (days > 0) timeSpan += ` and ${days} day${days > 1 ? "s" : ""}`
    } else {
      timeSpan = `${days} day${days !== 1 ? "s" : ""}`
    }

    const monthCounts = new Map<string, number>()
    transactions.forEach((tx) => {
      const d = new Date(tx.date)
      if (isNaN(d.getTime())) return
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      monthCounts.set(key, (monthCounts.get(key) || 0) + 1)
    })

    const trend = Array.from(monthCounts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, value]) => ({ date, value }))

    return { count, timeSpan, trend }
  }, [transactions])

  // Fetch summary stats from aggregated endpoint (for SectionCards)
  const fetchSummaryStats = useCallback(async () => {
    try {
      setIsLoadingStats(true)
      const url = dateFilter
        ? `/api/charts/summary-stats?filter=${encodeURIComponent(dateFilter)}`
        : "/api/charts/summary-stats"
      console.log("[Home] Fetching summary stats from:", url)
      const response = await fetch(url)
      const data = await response.json()

      if (response.ok) {
        console.log("[Home] Summary stats received:", data)
        setSummaryStats(data)
      } else {
        console.error("[Home] Failed to fetch summary stats:", data)
      }
    } catch (error) {
      console.error("[Home] Error fetching summary stats:", error)
    } finally {
      setIsLoadingStats(false)
    }
  }, [dateFilter])

  // Fetch chart data from aggregated endpoint (for ChartAreaInteractive)
  const fetchChartData = useCallback(async () => {
    try {
      setIsLoadingChartData(true)
      const url = dateFilter
        ? `/api/charts/income-expenses?filter=${encodeURIComponent(dateFilter)}`
        : "/api/charts/income-expenses"
      console.log("[Home] Fetching chart data from:", url)
      const response = await fetch(url)
      const data = await response.json()

      if (response.ok && Array.isArray(data)) {
        console.log("[Home] Chart data received:", data.length, "data points")
        setChartData(data)
      } else {
        console.error("[Home] Failed to fetch chart data:", data)
      }
    } catch (error) {
      console.error("[Home] Error fetching chart data:", error)
    } finally {
      setIsLoadingChartData(false)
    }
  }, [dateFilter])

  // Fetch full transactions for charts (all data, no pagination limit)
  const fetchChartTransactions = useCallback(async () => {
    try {
      setIsLoadingChartTransactions(true)
      const url = dateFilter
        ? `/api/charts/transactions?filter=${encodeURIComponent(dateFilter)}`
        : "/api/charts/transactions"
      console.log("[Home] Fetching chart transactions from:", url)
      const response = await fetch(url)
      const data = await response.json()

      if (response.ok && Array.isArray(data)) {
        console.log("[Home] Chart transactions received:", data.length, "transactions")
        setChartTransactions(data)
      } else {
        console.error("[Home] Failed to fetch chart transactions:", data)
      }
    } catch (error) {
      console.error("[Home] Error fetching chart transactions:", error)
    } finally {
      setIsLoadingChartTransactions(false)
    }
  }, [dateFilter])

  // Fetch transactions for DataTable (paginated, NOT for charts)
  const fetchTransactions = useCallback(async (bypassCache = false) => {
    try {
      // Use pagination for the data table - charts use aggregated endpoints
      const url = dateFilter
        ? `/api/transactions?filter=${encodeURIComponent(dateFilter)}&limit=100`
        : "/api/transactions?limit=100"
      console.log("[Home] Fetching transactions from:", url)
      const response = await fetch(url, {
        cache: bypassCache ? 'no-store' : 'default',
        headers: bypassCache ? { 'Cache-Control': 'no-cache' } : undefined
      })
      const responseData = await response.json()
      console.log("[Home] Response status:", response.status)
      console.log("[Home] Response data:", responseData)

      // Handle both old format (array) and new format (object with data property)
      const data = Array.isArray(responseData) ? responseData : (responseData.data || [])
      console.log("[Home] Is array?", Array.isArray(data))
      console.log("[Home] Data length:", data.length)

      if (response.ok) {
        if (Array.isArray(data)) {
          console.log(`[Home] Setting ${data.length} transactions`)
          console.log("[Home] First transaction:", data[0])
          setTransactions(normalizeTransactions(data) as Array<{
            id: number
            date: string
            description: string
            amount: number
            balance: number | null
            category: string
          }>)
        } else {
          console.error("[Home] Response is not an array:", responseData)
          if (responseData.error) {
            toast.error("API Error", {
              description: responseData.error,
              duration: 10000,
            })
          }
        }
      } else {
        console.error("Failed to fetch transactions: HTTP", response.status, data)
        // Don't set empty array on error - keep previous data
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

  // Note: Transaction dialog is now handled globally via TransactionDialogProvider
  // This code is kept for backward compatibility with query parameters
  useEffect(() => {
    const openDialog = searchParams.get("openTransactionDialog")
    if (openDialog === "true") {
      setIsTransactionDialogOpen(true)
      // Remove the query parameter from URL without reloading
      const url = new URL(window.location.href)
      url.searchParams.delete("openTransactionDialog")
      router.replace(url.pathname + url.search, { scroll: false })
    }
  }, [searchParams, router])

  // Fetch transactions on mount and when filter changes
  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  // Fetch aggregated data for charts and cards
  useEffect(() => {
    fetchSummaryStats()
    fetchChartData()
    fetchChartTransactions()
  }, [fetchSummaryStats, fetchChartData, fetchChartTransactions])

  // Register refresh callback with the global transaction dialog provider
  // This ensures transactions are refreshed directly when a transaction is added
  useEffect(() => {
    setRefreshCallback(() => {
      console.log("[Home] Refresh callback called, fetching transactions...")
      // Small delay to ensure database transaction is committed
      setTimeout(() => {
        fetchTransactions(true)
      }, 300)
    })
  }, [fetchTransactions, setRefreshCallback])

  // Listen for transaction added event from global dialog (fallback)
  useEffect(() => {
    const handleTransactionAdded = () => {
      console.log("[Home] Transaction added event received, refreshing...")
      // Delay to ensure the database transaction is committed
      // Use a longer delay to account for network latency and DB commit time
      setTimeout(() => {
        console.log("[Home] Fetching transactions after delay...")
        fetchTransactions(true)
      }, 300)
    }

    // Use capture phase to ensure we catch the event
    window.addEventListener("transactionAdded", handleTransactionAdded, true)

    return () => {
      window.removeEventListener("transactionAdded", handleTransactionAdded, true)
    }
  }, [fetchTransactions])

  // Date filter is now handled globally via DateFilterProvider

  // Parse CSV when it changes
  useEffect(() => {
    if (parsedCsv) {
      const rows = parseCsvToRows(parsedCsv)
      // Add a unique ID to each row for the DataTable
      const rowsWithId: ParsedRow[] = rows.map((row, index) => ({
        ...row,
        id: index,
        // Ensure category is a string, not undefined
        category: row.category || undefined
      }))
      console.log(`[HOME] Parsed ${rowsWithId.length} rows with categories:`,
        rowsWithId.slice(0, 3).map(r => ({ desc: r.description.substring(0, 30), cat: r.category }))
      )
      setParsedRows(rowsWithId)
    } else {
      setParsedRows([])
    }
  }, [parsedCsv])

  // Debounce timer for CSV regeneration
  const csvRegenerationTimerRef = useRef<NodeJS.Timeout | null>(null)
  const latestParsedRowsRef = useRef<ParsedRow[]>(parsedRows)
  const preferenceUpdateTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pendingPreferenceEntriesRef = useRef<Array<{ description: string; category: string }>>([])

  // Keep ref in sync with parsedRows
  useEffect(() => {
    latestParsedRowsRef.current = parsedRows
  }, [parsedRows])

  useEffect(() => {
    return () => {
      if (preferenceUpdateTimerRef.current) {
        clearTimeout(preferenceUpdateTimerRef.current)
      }
    }
  }, [])

  const flushPreferenceUpdates = useCallback(async () => {
    const pending = pendingPreferenceEntriesRef.current
    if (pending.length === 0) return
    pendingPreferenceEntriesRef.current = []

    try {
      await fetch("/api/transactions/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: pending }),
      })
    } catch (error) {
      console.warn("[Home] Failed to store category preferences", error)
    }
  }, [])

  const schedulePreferenceUpdate = useCallback((entry: { description: string; category: string }) => {
    pendingPreferenceEntriesRef.current.push(entry)
    if (preferenceUpdateTimerRef.current) {
      clearTimeout(preferenceUpdateTimerRef.current)
    }
    preferenceUpdateTimerRef.current = setTimeout(() => {
      void flushPreferenceUpdates()
    }, 800)
  }, [flushPreferenceUpdates])

  const handleCategoryChange = useCallback((rowId: number, newCategory: string) => {
    // Use flushSync to force immediate DOM update for instant UI feedback
    flushSync(() => {
      setParsedRows((prevRows) => {
        const updatedRows = prevRows.map((row) => {
          if (row.id === rowId) {
            return { ...row, category: newCategory }
          }
          return row
        })
        // Update ref immediately
        latestParsedRowsRef.current = updatedRows
        return updatedRows
      })
    })

    const updatedRow = latestParsedRowsRef.current.find((row) => row.id === rowId)
    if (updatedRow && updatedRow.description.trim() && newCategory.trim()) {
      schedulePreferenceUpdate({ description: updatedRow.description, category: newCategory })
    }

    // Debounce CSV regeneration to avoid expensive operations on every change
    if (csvRegenerationTimerRef.current) {
      clearTimeout(csvRegenerationTimerRef.current)
    }

    csvRegenerationTimerRef.current = setTimeout(() => {
      // Update the CSV string so it's ready for import
      // Remove the 'id' field before converting back to CSV
      const rowsForCsv = latestParsedRowsRef.current.map((row) => {
        const { id: _ignored, ...rest } = row
        void _ignored
        return rest as TxRow
      })
      const newCsv = rowsToCanonicalCsv(rowsForCsv)
      setParsedCsv(newCsv)
    }, 300) // Wait 300ms after last change before regenerating CSV
  }, [])

  const handleToggleParsedRow = useCallback((rowId: number, value: boolean) => {
    setSelectedParsedRowIds((prev) => {
      const next = new Set(prev)
      if (value) {
        next.add(rowId)
      } else {
        next.delete(rowId)
      }
      return next
    })
  }, [])

  const handleSelectAllParsedRows = useCallback((value: boolean) => {
    if (!value) {
      setSelectedParsedRowIds(new Set())
      return
    }
    setSelectedParsedRowIds(new Set(parsedRows.map((row) => row.id)))
  }, [parsedRows])

  const handleDeleteRow = useCallback((rowId: number) => {
    flushSync(() => {
      setParsedRows((prevRows) => {
        const updatedRows = prevRows.filter((row) => row.id !== rowId)
        // Update ref immediately
        latestParsedRowsRef.current = updatedRows
        // Update transaction count
        setTransactionCount(updatedRows.length)
        return updatedRows
      })
    })
    setSelectedParsedRowIds((prev) => {
      const next = new Set(prev)
      next.delete(rowId)
      return next
    })

    // Regenerate CSV after deletion
    if (csvRegenerationTimerRef.current) {
      clearTimeout(csvRegenerationTimerRef.current)
    }

    csvRegenerationTimerRef.current = setTimeout(() => {
      const rowsForCsv = latestParsedRowsRef.current.map((row) => {
        const { id: _ignored, ...rest } = row
        void _ignored
        return rest as TxRow
      })
      const newCsv = rowsToCanonicalCsv(rowsForCsv)
      setParsedCsv(newCsv)
    }, 100) // Shorter delay for deletion
  }, [])

  const handleDeleteSelectedRows = useCallback(() => {
    if (selectedParsedRowIds.size === 0) return
    const selectedIds = new Set(selectedParsedRowIds)

    flushSync(() => {
      setParsedRows((prevRows) => {
        const updatedRows = prevRows.filter((row) => !selectedIds.has(row.id))
        latestParsedRowsRef.current = updatedRows
        setTransactionCount(updatedRows.length)
        return updatedRows
      })
      setSelectedParsedRowIds(new Set())
    })

    if (csvRegenerationTimerRef.current) {
      clearTimeout(csvRegenerationTimerRef.current)
    }

    csvRegenerationTimerRef.current = setTimeout(() => {
      const rowsForCsv = latestParsedRowsRef.current.map((row) => {
        const { id: _ignored, ...rest } = row
        void _ignored
        return rest as TxRow
      })
      const newCsv = rowsToCanonicalCsv(rowsForCsv)
      setParsedCsv(newCsv)
    }, 100)
  }, [selectedParsedRowIds])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current++
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const parseFile = useCallback(async (file: File, options?: { parseMode?: "auto" | "ai"; aiContext?: string }) => {
    const parseMode = options?.parseMode ?? "auto"
    const aiContext = options?.aiContext?.trim()

    setDroppedFile(file)
    setIsDialogOpen(true)
    setIsParsing(true)
    setParsingProgress(0)
    setParseError(null)
    setParsedCsv(null)
    setFileId(null)
    setTransactionCount(0)
    setSelectedParsedRowIds(new Set())
    pendingPreferenceEntriesRef.current = []
    if (preferenceUpdateTimerRef.current) {
      clearTimeout(preferenceUpdateTimerRef.current)
      preferenceUpdateTimerRef.current = null
    }

    // Track parsing progress based on actual CSV parsing stages
    // Stage 1: File upload (0-15%)
    setParsingProgress(5)

    try {
      // Parse the file
      const formData = new FormData()
      formData.append("file", file)
      formData.append("bankName", "Unknown")
      formData.append("parseMode", parseMode)
      if (aiContext) {
        formData.append("aiContext", aiContext)
      }

      // Get current categories to send to API (fallback to defaults)
      let currentCategories = DEFAULT_CATEGORIES
      try {
        const categoriesResponse = await fetch("/api/categories")
        if (categoriesResponse.ok) {
          const payload = await categoriesResponse.json()
          const categoriesArray: Array<{ name?: string }> = Array.isArray(payload) ? payload : []
          const names = categoriesArray
            .map((cat) => cat?.name)
            .filter((name): name is string => typeof name === "string" && name.trim().length > 0)
          if (names.length > 0) {
            currentCategories = names
          }
        }
      } catch (categoriesError) {
        console.warn("[HOME] Failed to load categories from API. Using defaults.", categoriesError)
      }

      // Stage 2: Uploading file (15-25%)
      setParsingProgress(20)

      const response = await fetch("/api/statements/parse", {
        method: "POST",
        headers: {
          "X-Custom-Categories": JSON.stringify(currentCategories),
        },
        body: formData,
      })

      // Check content type and headers first
      const contentType = response.headers.get("content-type") || ""
      const fileIdHeader = response.headers.get("X-File-Id")
      const categorizationError = response.headers.get("X-Categorization-Error")
      const categorizationWarning = response.headers.get("X-Categorization-Warning")

      if (!response.ok) {
        // Read response body once - try JSON first, fallback to text
        let errorMessage = `HTTP error! status: ${response.status}`
        const responseText = await response.text()

        try {
          const errorData = JSON.parse(responseText)
          errorMessage = errorData.error || errorMessage
        } catch {
          // If not JSON, use text as error message
          errorMessage = responseText || errorMessage
        }

        throw new Error(errorMessage)
      }

      // Stage 3: Server processing - track response stream progress (25-90%)
      // This reflects actual CSV parsing progress as data streams in
      let responseText = ""

      if (response.body) {
        const reader = response.body.getReader()
        const contentLength = response.headers.get("content-length")
        const total = contentLength ? parseInt(contentLength, 10) : 0
        let received = 0
        const decoder = new TextDecoder()
        const chunks: string[] = []

        // Read the stream and track progress based on actual bytes received
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          chunks.push(chunk)
          received += value.length

          // Update progress: 25% (upload) + 65% (processing/download) based on bytes received
          // This matches the actual CSV parsing progress as data streams in
          if (total > 0) {
            const downloadProgress = (received / total) * 65 // 65% of total progress
            setParsingProgress(25 + downloadProgress)
          } else {
            // If no content-length, estimate based on received bytes
            // Estimate total size based on file size (CSV output is usually similar to input)
            const estimatedTotal = file.size * 1.2 // CSV might be slightly larger
            const estimatedProgress = Math.min(25 + (received / estimatedTotal) * 65, 90)
            setParsingProgress(estimatedProgress)
          }
        }

        // Combine all chunks
        responseText = chunks.join("")
      } else {
        // Fallback: if no stream, read normally
        setParsingProgress(60)
        responseText = await response.text()
        setParsingProgress(90)
      }

      // Stage 4: Processing complete (90-100%)
      setParsingProgress(95)

      if (contentType.includes("application/json")) {
        // File is not parseable - it's a JSON response
        try {
          const data = JSON.parse(responseText)
          if (!data.parseable) {
            setParseError(data.message || "File format not supported for parsing")
            setIsParsing(false)
            setParsingProgress(0)
            return
          }
        } catch {
          // If JSON parsing fails, treat as parse error
          throw new Error("Invalid response from server")
        }
      }

      // File is parseable - use the CSV content we already read
      const csv = responseText
      setParsingProgress(100)

      // Debug: Log CSV to see if categories are present
      console.log("[HOME] Received CSV, length:", csv.length);
      const csvLines = csv.trim().split("\n");
      console.log("[HOME] CSV header:", csvLines[0]);
      console.log("[HOME] CSV first data row:", csvLines[1]);
      console.log("[HOME] CSV second data row:", csvLines[2]);

      // Check if category column exists
      const header = csvLines[0].toLowerCase();
      if (!header.includes('category')) {
        console.error("[HOME] ERROR: Category column missing from CSV header!");
      } else {
        console.log("[HOME] Category column found in CSV");
      }

      // Count transactions (lines minus header)
      const lines = csv.trim().split("\n")
      const count = lines.length > 1 ? lines.length - 1 : 0

      setParsedCsv(csv)
      setFileId(fileIdHeader)
      setTransactionCount(count)

      // Show warning if categorization failed
      if (categorizationWarning === "true" && categorizationError) {
        const decodedError = decodeURIComponent(categorizationError)
        console.warn("AI categorization failed:", decodedError)
        toast.warning("Categorization Warning", {
          description: `AI categorization failed. All transactions defaulted to "Other". Error: ${decodedError.substring(0, 100)}`,
          duration: 10000,
        })
      }
    } catch (error) {
      setParsingProgress(0)
      console.error("Parse error:", error)
      const errorMessage =
        error instanceof Error ? error.message : "Failed to parse file. Please try again."
      setParseError(errorMessage)

      // Show more specific error messages
      if (errorMessage.includes("DEMO_USER_ID") || errorMessage.includes("Authentication")) {
        toast.error("Configuration Error", {
          description: "Please configure DEMO_USER_ID in your environment variables.",
          duration: 10000,
        })
      } else if (errorMessage.includes("No transactions found")) {
        toast.error("No Transactions Found", {
          description: "The file was parsed but no transactions were detected. Please check the file format.",
          duration: 8000,
        })
      } else if (errorMessage.includes("Failed to parse") || errorMessage.includes("Parsing quality")) {
        toast.error("Parse Error", {
          description: errorMessage,
          duration: 8000,
        })
      } else {
        toast.error("Upload Error", {
          description: errorMessage,
          duration: 8000,
        })
      }
      setParsingProgress(0)
    } finally {
      setIsParsing(false)
    }
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    dragCounterRef.current = 0

    const files = Array.from(e.dataTransfer.files)
    if (files && files.length > 0) {
      await parseFile(files[0], { parseMode: "auto" })
    }
  }, [parseFile])

  const handleAiReparse = useCallback(async () => {
    if (!droppedFile) {
      toast.error("Missing file", {
        description: "Please drop a file before reparsing with AI.",
        duration: 6000,
      })
      return
    }

    setIsAiReparseOpen(false)
    setIsAiReparsing(true)
    try {
      await parseFile(droppedFile, { parseMode: "ai", aiContext: aiReparseContext })
    } finally {
      setIsAiReparsing(false)
    }
  }, [aiReparseContext, droppedFile, parseFile])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i]
  }

  const handleConfirm = async () => {
    if (!droppedFile || !parsedCsv || !fileId) {
      toast.error("Missing data", {
        description: "Please wait for the file to be parsed before confirming.",
      })
      return
    }

    setIsImporting(true)
    setImportProgress(0)

    // Simulate progress during import
    const progressInterval = setInterval(() => {
      setImportProgress((prev) => {
        if (prev >= 90) return prev // Don't go to 100 until import completes
        return prev + 10
      })
    }, 200)

    try {
      const extension = droppedFile.name.split(".").pop()?.toLowerCase() ?? "other"
      const rawFormat = extension === "pdf" ? "pdf" :
        extension === "csv" ? "csv" :
          (extension === "xls" || extension === "xlsx") ? "xlsx" : "other"

      const response = await fetch("/api/statements/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          csv: parsedCsv,
          statementMeta: {
            bankName: "Unknown",
            sourceFilename: droppedFile.name,
            rawFormat: rawFormat as "pdf" | "csv" | "xlsx" | "xls" | "other",
            fileId: fileId,
          },
        }),
      })

      clearInterval(progressInterval)
      setImportProgress(95)

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`
        const responseText = await response.text()
        try {
          const errorData = JSON.parse(responseText)
          errorMessage = errorData.error || errorMessage
        } catch {
          errorMessage = responseText || errorMessage
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      setImportProgress(100)

      toast.success("File Imported Successfully", {
        description: `${data.inserted} transactions imported from ${droppedFile.name}`,
      })
      if (data.skippedInvalidDates) {
        toast.warning("Some rows were skipped", {
          description: `${data.skippedInvalidDates} transaction(s) had missing or invalid dates and were not imported.`,
        })
      }

      // Reset state
      setIsDialogOpen(false)
      setDroppedFile(null)
      setParsedCsv(null)
      setFileId(null)
      setTransactionCount(0)
      setParseError(null)
      setImportProgress(0)

      // Refresh transactions after import (stats will be recalculated automatically)
      await fetchTransactions()
    } catch (error) {
      clearInterval(progressInterval)
      console.error("Import error:", error)
      toast.error("Import Failed", {
        description:
          error instanceof Error
            ? error.message
            : "Failed to import transactions. Please try again.",
      })
      setImportProgress(0)
    } finally {
      setIsImporting(false)
    }
  }

  const handleCancel = () => {
    // Clear any pending CSV regeneration
    if (csvRegenerationTimerRef.current) {
      clearTimeout(csvRegenerationTimerRef.current)
      csvRegenerationTimerRef.current = null
    }
    setIsDialogOpen(false)
    setDroppedFile(null)
    setParsedCsv(null)
    setFileId(null)
    setTransactionCount(0)
    setParseError(null)
  }

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (csvRegenerationTimerRef.current) {
        clearTimeout(csvRegenerationTimerRef.current)
      }
    }
  }, [])

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72 - 15px)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        variant="inset"
        onQuickCreate={() => setIsTransactionDialogOpen(true)}
      />
      <SidebarInset>
        <SiteHeader />
        <div
          className="flex flex-1 flex-col relative"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* Dark overlay when dragging */}
          {isDragging && (
            <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity duration-300 pointer-events-none" />
          )}

          {/* Modern drop indicator with Card */}
          {isDragging && (
            <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
              <Card className="w-full max-w-md mx-4 border-2 border-dashed border-primary/50 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-300">
                <CardHeader className="text-center pb-4">
                  <div className="flex justify-center mb-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                      <div className="relative bg-primary/10 p-6 rounded-full border-2 border-primary/30">
                        <IconUpload className="w-12 h-12 text-primary animate-bounce" />
                      </div>
                    </div>
                  </div>
                  <CardTitle className="text-2xl text-primary">Drop your file here</CardTitle>
                  <CardDescription className="text-base mt-2">
                    Release to upload your file
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    <span>Ready to receive file</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="@container/main flex flex-1 flex-col gap-2">
            <main className="flex-1 space-y-4 p-4 pt-0 lg:p-6 lg:pt-2">
              <SectionCards
                totalIncome={summaryStats?.totalIncome ?? stats.totalIncome}
                totalExpenses={summaryStats?.totalExpenses ?? stats.totalExpenses}
                savingsRate={summaryStats?.savingsRate ?? stats.savingsRate}
                netWorth={summaryStats?.netWorth ?? stats.netWorth}
                incomeChange={summaryStats?.incomeChange ?? stats.incomeChange}
                expensesChange={summaryStats?.expensesChange ?? stats.expensesChange}
                savingsRateChange={summaryStats?.savingsRateChange ?? stats.savingsRateChange}
                netWorthChange={summaryStats?.netWorthChange ?? stats.netWorthChange}
                incomeTrend={summaryStats?.incomeTrend ?? statsTrends.incomeTrend}
                expensesTrend={summaryStats?.expensesTrend ?? statsTrends.expensesTrend}
                netWorthTrend={summaryStats?.netWorthTrend ?? statsTrends.netWorthTrend}
                transactionCount={summaryStats?.transactionCount ?? transactionSummary.count}
                transactionTimeSpan={summaryStats?.transactionTimeSpan ?? transactionSummary.timeSpan}
                transactionTrend={summaryStats?.transactionTrend ?? transactionSummary.trend}
              />
              {/* Favorite Charts Section */}
              {Array.from(favorites).length > 0 && (
                <div className="space-y-6">
                  <div className="px-4 lg:px-6">
                    <div className="flex items-center gap-2 mb-4">
                      <h2 className="text-lg font-semibold">Favorite Charts</h2>
                      <Badge variant="secondary">{Array.from(favorites).length}</Badge>
                    </div>
                  </div>
                  <SortableGridProvider
                    chartOrder={favoritesOrder}
                    onOrderChange={handleFavoritesOrderChange}
                    className="w-full px-4 lg:px-6"
                  >
                    {favoritesOrder.length > 0 && favoritesOrder.map((chartId) => {
                      const sizeConfig = getChartCardSize(chartId as ChartId)
                      const savedSize = savedFavoriteSizes[chartId]
                      const defaultSize = DEFAULT_FAVORITE_SIZES[chartId] || { w: 12, h: 6, x: 0, y: 0 }
                      const initialW = savedSize?.w ?? defaultSize.w
                      const initialH = savedSize?.h ?? defaultSize.h

                      return (
                        <SortableGridItem
                          key={chartId}
                          id={chartId}
                          w={(savedFavoriteSizes[chartId]?.w ?? initialW) as any}
                          h={savedFavoriteSizes[chartId]?.h ?? initialH}
                          resizable
                          minW={sizeConfig.minW}
                          maxW={sizeConfig.maxW}
                          minH={sizeConfig.minH}
                          maxH={sizeConfig.maxH}
                          onResize={handleFavoritesResize}
                        >
                          {chartId === "financialHealthScore" ? (
                            // ChartRadar renders its own Card component, so render it directly
                            // without the data-slot wrapper (matching analytics page structure)
                            <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                              <ChartRadar />
                            </div>
                          ) : chartId === "spendingActivityRings" ? (
                            // SpendingActivityRings renders its own Card component with full UI
                            <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                              <Card className="relative h-full flex flex-col">
                                <ChartInfoPopover
                                  title="Spending Activity Rings"
                                  description="Top spending categories from your Neon transactions"
                                  details={[
                                    "Each ring shows how much a category has consumed relative to its budget.",
                                    "Budgets come from your saved limits or a default amount for the selected date filter.",
                                  ]}
                                  className="absolute top-3 right-3 z-30"
                                />
                                <CardHeader className="flex flex-row items-start justify-between gap-2 flex-1 min-h-[420px] pb-6">
                                  <div className="space-y-1 z-10">
                                    <div className="flex items-center gap-2">
                                      <ChartFavoriteButton
                                        chartId="spendingActivityRings"
                                        chartTitle="Spending Activity Rings"
                                        size="md"
                                      />
                                      <CardTitle className="mb-0">Spending Activity Rings</CardTitle>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 z-10">
                                    {activityData.length > 0 && (
                                      <div className="flex flex-col gap-1 z-10 w-[140px]">
                                        <span className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground text-right">
                                          Limits
                                        </span>
                                        <div className="flex flex-col gap-1">
                                          {activityData.map((item, idx) => {
                                            const category: string =
                                              (item as { category?: string }).category ??
                                              (item.label ?? "Other")
                                            const storedLimit = ringLimits[category]
                                            const limit =
                                              typeof storedLimit === "number" &&
                                                storedLimit > 0
                                                ? storedLimit
                                                : getDefaultRingLimit(dateFilter)
                                            const percent = (item.value * 100).toFixed(1)
                                            const spent =
                                              typeof (item as { spent?: number }).spent ===
                                                "number"
                                                ? (item as { spent?: number }).spent!
                                                : null
                                            return (
                                              <Popover
                                                key={`${category}-${idx}`}
                                                open={ringCategoryPopoverIndex === idx}
                                                onOpenChange={(open) => {
                                                  if (
                                                    open &&
                                                    allExpenseCategories &&
                                                    allExpenseCategories.length
                                                  ) {
                                                    const currentCategory =
                                                      (category as string) ||
                                                      allExpenseCategories[0]
                                                    setRingCategoryPopoverIndex(idx)
                                                    setRingCategoryPopoverValue(
                                                      currentCategory
                                                    )
                                                    const currentLimitRaw =
                                                      ringLimits[currentCategory]
                                                    const currentLimit =
                                                      typeof currentLimitRaw === "number" &&
                                                        currentLimitRaw > 0
                                                        ? currentLimitRaw
                                                        : getDefaultRingLimit(dateFilter)
                                                    setRingLimitPopoverValue(
                                                      currentLimit.toString()
                                                    )
                                                  } else {
                                                    setRingCategoryPopoverIndex(null)
                                                    setRingCategoryPopoverValue(null)
                                                    setRingLimitPopoverValue("")
                                                  }
                                                }}
                                              >
                                                <PopoverTrigger asChild>
                                                  <div className="flex items-center gap-1 bg-background/80 backdrop-blur-sm p-1 rounded border cursor-pointer">
                                                    <button
                                                      type="button"
                                                      className="px-1.5 py-0.5 text-[0.7rem] rounded w-full flex items-center justify-between gap-1.5 hover:bg-muted/80 bg-muted"
                                                      title={
                                                        limit
                                                          ? `${category} – ${percent}% of limit (${item.value} of 1.0)`
                                                          : `${category} – no limit set`
                                                      }
                                                    >
                                                      <span className="max-w-[170px] whitespace-normal">
                                                        {category}
                                                      </span>
                                                      <span className="text-[0.65rem] font-medium text-muted-foreground flex-shrink-0 text-right">
                                                        {spent !== null
                                                          ? `$${spent.toFixed(2)}`
                                                          : `${percent}%`}
                                                      </span>
                                                    </button>
                                                  </div>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-56" align="end">
                                                  <RingPopoverContent
                                                    initialCategory={ringCategoryPopoverValue ?? (category as string)}
                                                    initialLimit={
                                                      ringLimitPopoverValue
                                                        ? parseFloat(ringLimitPopoverValue) || limit
                                                        : limit
                                                    }
                                                    allCategories={allExpenseCategories}
                                                    onSave={async (savedCategory, savedLimit) => {
                                                      if (!savedCategory) {
                                                        setRingCategoryPopoverIndex(null)
                                                        setRingCategoryPopoverValue(null)
                                                        setRingLimitPopoverValue("")
                                                        return
                                                      }
                                                      setRingCategories((prev) => {
                                                        const base =
                                                          prev && prev.length
                                                            ? [...prev]
                                                            : activityData.map(
                                                              (ringItem) => {
                                                                const ringCategory =
                                                                  (ringItem as {
                                                                    category?: string
                                                                  }).category ??
                                                                  ringItem.label
                                                                return ringCategory as string
                                                              }
                                                            )
                                                        base[ringCategoryPopoverIndex ?? idx] = savedCategory
                                                        return base
                                                      })
                                                      if (savedLimit) {
                                                        const limitValue = parseFloat(savedLimit)
                                                        if (!isNaN(limitValue) && limitValue >= 0) {
                                                          setRingLimits((prev) => {
                                                            const updated = {
                                                              ...prev,
                                                              [savedCategory]: limitValue,
                                                            }
                                                            if (typeof window !== "undefined") {
                                                              localStorage.setItem(
                                                                "activityRingLimits",
                                                                JSON.stringify(updated)
                                                              )
                                                            }
                                                            return updated
                                                          })

                                                          // Save to database with current filter
                                                          try {
                                                            const res = await fetch("/api/budgets", {
                                                              method: "POST",
                                                              headers: {
                                                                "Content-Type": "application/json",
                                                              },
                                                              body: JSON.stringify({
                                                                categoryName: savedCategory,
                                                                budget: limitValue,
                                                                filter: dateFilter,
                                                              }),
                                                            })

                                                            if (!res.ok) {
                                                              console.error(
                                                                "[Home] Failed to save ring limit:",
                                                                await res.text()
                                                              )
                                                            }
                                                          } catch (error) {
                                                            console.error("[Home] Error saving ring limit:", error)
                                                          }
                                                        }
                                                      }
                                                      setRingCategoryPopoverIndex(null)
                                                      setRingCategoryPopoverValue(null)
                                                      setRingLimitPopoverValue("")
                                                    }}
                                                    onCancel={() => {
                                                      setRingCategoryPopoverIndex(null)
                                                      setRingCategoryPopoverValue(null)
                                                      setRingLimitPopoverValue("")
                                                    }}
                                                  />
                                                </PopoverContent>
                                              </Popover>
                                            )
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  {/* Chart overlay layer */}
                                  <div className="absolute inset-0 flex flex-col items-center justify-between pt-20 pb-4">
                                    {activityData.length === 0 ? (
                                      <span className="text-sm text-muted-foreground">
                                        No expense categories available yet.
                                      </span>
                                    ) : (
                                      <>
                                        <div className="flex items-center justify-center w-full flex-1 min-h-0">
                                          <SpendingActivityRings
                                            key={`rings-${dateFilter}-${ringCategories?.join(',') || ''}`}
                                            data={activityData}
                                            config={activityConfig}
                                            theme={activityTheme as "light" | "dark"}
                                            ringLimits={ringLimits}
                                            getDefaultLimit={() => getDefaultRingLimit(dateFilter)}
                                          />
                                        </div>
                                        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
                                          {activityData.map((item) => {
                                            const category =
                                              (item as { category?: string }).category ??
                                              item.label
                                            return (
                                              <div
                                                key={category}
                                                className="flex items-center gap-1.5"
                                              >
                                                <span
                                                  className="h-2 w-2 rounded-full"
                                                  style={{
                                                    backgroundColor:
                                                      (item as { color?: string }).color ||
                                                      "#a1a1aa",
                                                  }}
                                                />
                                                <span className="font-medium">
                                                  {category}
                                                </span>
                                                <span className="text-[0.7rem]">
                                                  {(item.value * 100).toFixed(0)}%
                                                </span>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </CardHeader>
                              </Card>
                            </div>
                          ) : (
                            <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                              {(() => {
                                if (chartId === "incomeExpensesTracking1" || chartId === "incomeExpensesTracking2") {
                                  return (
                                    <ChartAreaInteractive
                                      chartId={chartId}
                                      categoryControls={incomeExpenseControls}
                                      data={incomeExpensesChartData}
                                    />
                                  )
                                }
                                if (chartId === "spendingCategoryRankings") {
                                  return (
                                    <ChartCategoryFlow
                                      categoryControls={categoryFlowControls}
                                      data={categoryFlowChartData}
                                    />
                                  )
                                }
                                if (chartId === "moneyFlow") {
                                  return (
                                    <ChartSpendingFunnel
                                      categoryControls={spendingFunnelControls}
                                      data={spendingFunnelChartData}
                                    />
                                  )
                                }
                                if (chartId === "cashFlowSankey") {
                                  // Note: Sankey chart requires complex data transformation
                                  // Show empty state until data transformation is implemented
                                  return (
                                    <ChartSankey />
                                  )
                                }
                                if (chartId === "expenseBreakdown") {
                                  return (
                                    <ChartExpensesPie
                                      categoryControls={expensesPieControls}
                                      data={expensesPieChartData}
                                    />
                                  )
                                }
                                if (chartId === "netWorthAllocation") {
                                  return (
                                    <ChartTreeMap
                                      categoryControls={treeMapControls}
                                      data={treeMapChartData}
                                    />
                                  )
                                }
                                if (chartId === "needsWantsBreakdown") {
                                  return (
                                    <ChartNeedsWantsPie
                                      data={expensesPieChartData}
                                      categoryControls={expensesPieControls}
                                    />
                                  )
                                }
                                if (chartId === "categoryBubbleMap") {
                                  return (
                                    <ChartCategoryBubble
                                      data={chartTransactions}
                                    />
                                  )
                                }
                                if (chartId === "householdSpendMix") {
                                  return (
                                    <ChartPolarBar
                                      data={polarBarChartData}
                                      categoryControls={expensesPieControls}
                                    />
                                  )
                                }
                                // spendingActivityRings is handled above in the conditional structure
                                if (chartId === "spendingStreamgraph") {
                                  return (
                                    <ChartSpendingStreamgraph
                                      data={spendingStreamData.data}
                                      keys={spendingStreamData.keys}
                                      categoryControls={streamgraphControls}
                                    />
                                  )
                                }
                                if (chartId === "transactionHistory") {
                                  return (
                                    <ChartSwarmPlot
                                      data={chartTransactions.map((tx, idx) => ({
                                        id: `tx-${tx.id || idx}`,
                                        group: normalizeCategoryName(tx.category),
                                        price: Math.abs(tx.amount),
                                        volume: Math.min(Math.max(Math.abs(tx.amount) / 50, 4), 20),
                                        category: normalizeCategoryName(tx.category),
                                      })).filter(item => item.price > 0)}
                                    />
                                  )
                                }
                                if (chartId === "dailyTransactionActivity") {
                                  return (
                                    <ChartTransactionCalendar />
                                  )
                                }
                                if (chartId === "dayOfWeekSpending") {
                                  return (
                                    <ChartDayOfWeekSpending
                                      data={chartTransactions}
                                      categoryControls={expensesPieControls}
                                    />
                                  )
                                }
                                if (chartId === "allMonthsCategorySpending") {
                                  return (
                                    <ChartAllMonthsCategorySpending
                                      data={chartTransactions}
                                      categoryControls={expensesPieControls}
                                    />
                                  )
                                }
                                if (chartId === "singleMonthCategorySpending") {
                                  return (
                                    <ChartSingleMonthCategorySpending
                                      dateFilter={dateFilter}
                                    />
                                  )
                                }
                                if (chartId === "dayOfWeekCategory") {
                                  return (
                                    <ChartDayOfWeekCategory
                                      dateFilter={dateFilter}
                                    />
                                  )
                                }
                                return null
                              })()}
                            </div>
                          )}
                        </SortableGridItem>
                      )
                    })}
                  </SortableGridProvider>
                </div>
              )}
              {Array.from(favorites).length === 0 && (
                <div className="px-4 lg:px-6 mb-6">
                  <Card className="border-dashed border-2 bg-muted/30">
                    <CardHeader className="text-center py-10">
                      <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
                        <IconCircleCheck className="w-8 h-8 text-primary" />
                      </div>
                      <CardTitle className="text-xl">Customize Your Dashboard</CardTitle>
                      <CardDescription className="max-w-lg mx-auto mt-2 text-base">
                        You haven't favorited any charts yet. Visit Analytics or Trends pages and click the star icon on any chart to pin it here for quick access.
                      </CardDescription>
                      <div className="flex justify-center gap-4 mt-6">
                        <Button variant="outline" onClick={() => router.push('/analytics')}>
                          Go to Analytics
                        </Button>
                        <Button variant="outline" onClick={() => router.push('/trends')}>
                          Go to Trends
                        </Button>
                      </div>
                    </CardHeader>
                  </Card>
                </div>
              )}
              {/* Charts removed - keeping only SectionCards and DataTable */}
              {false && (
                <>
                  <div className="px-4 lg:px-6">
                    <ChartAreaInteractive
                      categoryControls={incomeExpenseControls}
                      data={useMemo(() => {
                        // Group transactions by date first
                        const transactionsByDate = new Map<string, Array<{ amount: number }>>()
                        chartTransactions.forEach(tx => {
                          const date = tx.date.split('T')[0]
                          if (!transactionsByDate.has(date)) {
                            transactionsByDate.set(date, [])
                          }
                          transactionsByDate.get(date)!.push({ amount: tx.amount })
                        })

                        // Sort dates chronologically
                        const sortedDates = Array.from(transactionsByDate.keys()).sort((a, b) => a.localeCompare(b))

                        // Calculate income by date (keep as is - daily income)
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

                        // Calculate cumulative expenses (accumulate over time, reduced by income)
                        let cumulativeExpenses = 0
                        const cumulativeExpensesByDate = new Map<string, number>()

                        sortedDates.forEach(date => {
                          const dayTransactions = transactionsByDate.get(date)!

                          // Process all transactions for this day
                          dayTransactions.forEach(tx => {
                            if (tx.amount < 0) {
                              // Add expense to cumulative total
                              cumulativeExpenses += Math.abs(tx.amount)
                            } else if (tx.amount > 0) {
                              // Reduce cumulative expenses by income amount
                              cumulativeExpenses = Math.max(0, cumulativeExpenses - tx.amount)
                            }
                          })

                          // Store the cumulative value at the end of this date
                          cumulativeExpensesByDate.set(date, cumulativeExpenses)
                        })

                        // Combine income and cumulative expenses by date
                        const result = sortedDates.map(date => ({
                          date,
                          desktop: incomeByDate.get(date) || 0,
                          mobile: cumulativeExpensesByDate.get(date) || 0
                        }))

                        return result
                      }, [chartTransactions])}
                    />
                  </div>
                  <div className="px-4 lg:px-6">
                    <ChartCategoryFlow categoryControls={categoryFlowControls} data={useMemo(() => {
                      if (!chartTransactions || chartTransactions.length === 0) {
                        return []
                      }

                      // Group by category and month
                      const categoryMap = new Map<string, Map<string, number>>()
                      const allMonths = new Set<string>()

                      chartTransactions.forEach(tx => {
                        const category = tx.category || "Other"
                        // Apply visibility filters
                        const normalizedCategory = normalizeCategoryName(category)
                        if (categoryFlowVisibility.hiddenCategorySet.has(normalizedCategory)) {
                          return
                        }
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

                      // Sort months chronologically
                      const sortedMonths = Array.from(allMonths).sort((a, b) => a.localeCompare(b))

                      // Calculate totals per month for normalization
                      const monthTotals = new Map<string, number>()
                      sortedMonths.forEach(month => {
                        let total = 0
                        categoryMap.forEach((months) => {
                          total += months.get(month) || 0
                        })
                        monthTotals.set(month, total)
                      })

                      // Normalize data: convert to percentages so each month sums to 100
                      // This ensures consistent bar widths across all time periods
                      return Array.from(categoryMap.entries())
                        .map(([category, months]) => ({
                          id: category,
                          data: sortedMonths.map(month => {
                            const value = months.get(month) || 0
                            const total = monthTotals.get(month) || 1
                            // Convert to percentage, with a minimum of 0.1% to ensure visibility
                            const percentage = total > 0 ? (value / total) * 100 : 0
                            return {
                              x: month,
                              y: Math.max(percentage, 0.1) // Minimum 0.1% to ensure thin bars are still visible
                            }
                          })
                        }))
                        .filter(series => series.data.some(() => {
                          // Check if the original value (before normalization) was > 0
                          const month = series.data.find(d => d.x === series.data.find(d => d.y > 0.1)?.x)?.x
                          if (!month) return false
                          const originalValue = categoryMap.get(series.id)?.get(month) || 0
                          return originalValue > 0
                        })) // Only include categories with at least one non-zero value
                    }, [chartTransactions])} />
                  </div>
                  {/* Funnel and Pie Charts Side by Side */}
                  <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @3xl/main:grid-cols-2">
                    <ChartSpendingFunnel categoryControls={spendingFunnelControls} data={useMemo(() => {
                      const totalIncome = chartTransactions.filter(tx => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0)

                      // Group expenses by category
                      const categoryMap = new Map<string, number>()
                      chartTransactions.filter(tx => tx.amount < 0).forEach(tx => {
                        const category = tx.category || "Other"
                        const current = categoryMap.get(category) || 0
                        categoryMap.set(category, current + Math.abs(tx.amount))
                      })

                      // Calculate total expenses and savings first
                      const totalExpenses = Array.from(categoryMap.values()).reduce((sum, amount) => sum + amount, 0)
                      const savings = totalIncome - totalExpenses

                      // Sort categories by amount (descending) to get spending order
                      const sortedCategories = Array.from(categoryMap.entries())
                        .map(([category, amount]) => ({ category, amount }))
                        .sort((a, b) => b.amount - a.amount)

                      const top2Categories = sortedCategories.slice(0, 2)

                      // Calculate remaining expenses (all categories beyond top 2)
                      const shownExpenses = top2Categories.reduce((sum, cat) => sum + cat.amount, 0)
                      const remainingExpenses = totalExpenses - shownExpenses

                      // Build expense categories array
                      const expenseCategories: Array<{ id: string; value: number; label: string }> = []

                      // Add top 2 categories (highest spending)
                      top2Categories.forEach(cat => {
                        expenseCategories.push({
                          id: cat.category.toLowerCase().replace(/\s+/g, '-'),
                          value: cat.amount,
                          label: cat.category
                        })
                      })

                      // Add "Others" category (remaining categories, which are less than top 2)
                      if (remainingExpenses > 0) {
                        expenseCategories.push({
                          id: "others",
                          value: remainingExpenses,
                          label: "Others"
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
                        funnelData.push({ id: "savings", value: savings, label: "Savings" })
                      }

                      return funnelData.filter(item => item.value > 0)
                    }, [chartTransactions])} />
                    <ChartExpensesPie categoryControls={expensesPieControls} data={useMemo(() => {
                      // Group expenses by category
                      const categoryMap = new Map<string, number>()
                      chartTransactions.filter(tx => tx.amount < 0).forEach(tx => {
                        const category = tx.category || "Other"
                        const current = categoryMap.get(category) || 0
                        categoryMap.set(category, current + Math.abs(tx.amount))
                      })

                      return Array.from(categoryMap.entries())
                        .map(([id, value]) => ({ id, label: id, value }))
                        .sort((a, b) => b.value - a.value)
                    }, [chartTransactions])} />
                  </div>
                  <div className="px-4 lg:px-6">
                    <ChartTreeMap
                      categoryControls={treeMapControls}
                      data={useMemo(() => {
                        const categoryMap = new Map<string, { total: number; subcategories: Map<string, { amount: number; fullDescription: string }> }>()

                        const getSubCategoryLabel = (description?: string) => {
                          if (!description) return "Misc"
                          // Use first meaningful chunk of the description as a subcategory label
                          const delimiterSplit = description.split(/[-–|]/)[0] ?? description
                          const trimmed = delimiterSplit.trim()
                          return trimmed.length > 24 ? `${trimmed.slice(0, 21)}…` : (trimmed || "Misc")
                        }

                        chartTransactions
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
                                fullDescription: tx.description || subCategory
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
                                fullDescription
                              }))
                              if (remainingTotal > 0) {
                                children.push({ name: "Other", loc: remainingTotal, fullDescription: "Other transactions" })
                              }
                              return {
                                name,
                                children: children.length > 0 ? children : [{ name, loc: total, fullDescription: name }]
                              }
                            })
                            .sort((a, b) => {
                              const aTotal = a.children.reduce((sum, child) => sum + (child.loc || 0), 0)
                              const bTotal = b.children.reduce((sum, child) => sum + (child.loc || 0), 0)
                              return bTotal - aTotal
                            })
                        }
                      }, [chartTransactions])}
                    />
                  </div>
                </>
              )}
              <DataTable
                data={[]}
                transactions={transactions}
                onTransactionAdded={fetchTransactions}
                transactionDialogOpen={isTransactionDialogOpen}
                onTransactionDialogOpenChange={setIsTransactionDialogOpen}
              />
            </main>
          </div>
        </div>
      </SidebarInset>

      {/* Modern Confirmation Dialog */}
      <Dialog open={isAiReparseOpen} onOpenChange={setIsAiReparseOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Reparse with AI</DialogTitle>
            <DialogDescription>
              Add any context that helps the parser (bank name, column meanings, or date format).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="ai-reparse-context-home">
              Context (optional)
            </label>
            <textarea
              id="ai-reparse-context-home"
              className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Example: Date column is DD/MM/YY, amounts are negative for debits."
              value={aiReparseContext}
              onChange={(event) => setAiReparseContext(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAiReparseOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAiReparse}
              disabled={isAiReparsing || !droppedFile}
            >
              {isAiReparsing ? "Reparsing..." : "Reparse with AI"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[95vw] lg:max-w-[1400px] w-full max-h-[90vh] flex flex-col p-0 gap-0">
          <div className="px-6 pt-6 pb-4 flex-shrink-0">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <IconCircleCheck className="w-5 h-5 text-primary" />
                </div>
                <DialogTitle className="text-xl">Confirm File Upload</DialogTitle>
              </div>
              <DialogDescription className="text-base">
                Review the file details below and confirm to proceed with the upload.
              </DialogDescription>
            </DialogHeader>
          </div>
          <Separator className="flex-shrink-0" />
          {droppedFile && (
            <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1 min-h-0">
              <Card className="border-2">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                        <IconFile className="w-8 h-8 text-primary" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 space-y-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground mb-1 break-words">
                          {droppedFile.name}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {formatFileSize(droppedFile.size)}
                          </Badge>
                          {droppedFile.type && (
                            <Badge variant="outline" className="text-xs">
                              {droppedFile.type.split('/')[1]?.toUpperCase() || 'FILE'}
                            </Badge>
                          )}
                          {transactionCount > 0 && (
                            <Badge variant="default" className="text-xs">
                              {transactionCount} transactions
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Separator />
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs mb-1">File Type</p>
                          <p className="font-medium">{droppedFile.type || "Unknown"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs mb-1">File Size</p>
                          <p className="font-medium">{formatFileSize(droppedFile.size)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Parsing Status */}
              {isParsing && (
                <Card className="border-2 border-primary/20 bg-primary/5">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <IconLoader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">Parsing file...</p>
                          <p className="text-xs text-muted-foreground">Extracting transactions and categorizing</p>
                        </div>
                        <span className="text-sm font-semibold text-primary flex-shrink-0">{Math.round(parsingProgress)}%</span>
                      </div>
                      <div className="w-full">
                        <Progress value={parsingProgress} className="w-full h-3" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Parse Error */}
              {parseError && !isParsing && (
                <Card className="border-2 border-destructive/20 bg-destructive/5">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <IconAlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-destructive">Parse Error</p>
                        <p className="text-xs text-muted-foreground mt-1">{parseError}</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAiReparseOpen(true)}
                        disabled={!droppedFile || isAiReparsing}
                      >
                        Reparse with AI
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Import Progress - Show during import */}
              {isImporting && (
                <Card className="border-2 border-primary/20 bg-primary/5">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <IconLoader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">Importing transactions...</p>
                          <p className="text-xs text-muted-foreground">
                            Please wait while we import {transactionCount} transactions into the database
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-primary flex-shrink-0">{Math.round(importProgress)}%</span>
                      </div>
                      <div className="w-full">
                        <Progress value={importProgress} className="w-full h-3" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Parsed CSV Preview - Hide during import */}
              {parsedCsv && !isParsing && !parseError && !isImporting && (
                <Card className="border-2 overflow-hidden flex flex-col min-h-0 max-w-[1200px] w-full mx-auto">
                  <CardHeader className="flex-shrink-0 px-4 pt-4 pb-2">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="text-sm">Preview ({transactionCount} transactions)</CardTitle>
                        <CardDescription className="text-xs">
                          Review and edit categories before importing
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleDeleteSelectedRows}
                          disabled={selectedParsedRowIds.size === 0}
                        >
                          Delete selected
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsAiReparseOpen(true)}
                          disabled={!droppedFile || isAiReparsing}
                        >
                          Reparse with AI
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 flex-1 min-h-0 overflow-hidden">
                    <div className="h-full max-h-[500px] overflow-auto rounded-lg border">
                      <Table>
                        <TableHeader className="bg-muted sticky top-0 z-10">
                          <TableRow>
                            <TableHead className="w-12">
                              <Checkbox
                                checked={parsedRows.length > 0 && selectedParsedRowIds.size === parsedRows.length}
                                onCheckedChange={(checked) => handleSelectAllParsedRows(checked === true)}
                                aria-label="Select all transactions"
                              />
                            </TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="w-12"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {parsedRows.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="h-24 text-center">
                                No transactions found
                              </TableCell>
                            </TableRow>
                          ) : (
                            parsedRows.map((row) => {
                              const amount = typeof row.amount === 'number' ? row.amount : parseFloat(row.amount) || 0
                              const category = row.category || 'Other'

                              return (
                                <MemoizedTableRow
                                  key={row.id ?? `${row.date}-${row.description}`}
                                  row={row}
                                  amount={amount}
                                  category={category}
                                  isSelected={selectedParsedRowIds.has(row.id)}
                                  onSelectChange={(value) => handleToggleParsedRow(row.id, value)}
                                  onCategoryChange={(value) => handleCategoryChange(row.id, value)}
                                  onDelete={() => handleDeleteRow(row.id)}
                                />
                              )
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          <Separator className="flex-shrink-0" />
          <div className="px-6 py-4 flex-shrink-0">
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isImporting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                className="gap-2"
                disabled={isParsing || isAiReparsing || isImporting || !!parseError || !parsedCsv}
              >
                {isImporting ? (
                  <>
                    <IconLoader2 className="w-4 h-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <IconUpload className="w-4 h-4" />
                    Import to Database
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
