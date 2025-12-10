"use client"

import { useState, useEffect, useCallback, useMemo, memo, useRef, startTransition } from "react"
import { GridStack } from "gridstack"
import "gridstack/dist/gridstack.min.css"
import { AppSidebar } from "@/components/app-sidebar"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { ChartCirclePacking } from "@/components/chart-circle-packing"
import { ChartPolarBar } from "@/components/chart-polar-bar"
import { ChartRadar } from "@/components/chart-radar"
import { ChartSankey } from "@/components/chart-sankey"
import { ChartSpendingStreamgraph } from "@/components/chart-spending-streamgraph"
import { ChartSwarmPlot } from "@/components/chart-swarm-plot"
import { ChartCategoryFlow } from "@/components/chart-category-flow"
import { ChartExpensesPie } from "@/components/chart-expenses-pie"
import { ChartNeedsWantsPie } from "@/components/chart-needs-wants-pie"
import { ChartSpendingFunnel } from "@/components/chart-spending-funnel"
import { ChartTreeMap } from "@/components/chart-treemap"
import { ChartTransactionCalendar } from "@/components/chart-transaction-calendar"
import { ChartDayOfWeekSpending } from "@/components/chart-day-of-week-spending"
import { ChartAllMonthsCategorySpending } from "@/components/chart-all-months-category-spending"
import { ChartCategoryBubble } from "@/components/chart-category-bubble"
import { ChartSingleMonthCategorySpending } from "@/components/chart-single-month-category-spending"
import { ChartDayOfWeekCategory } from "@/components/chart-day-of-week-category"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import { deduplicatedFetch } from "@/lib/request-deduplication"
import { getChartCardSize, type ChartId } from "@/lib/chart-card-sizes.config"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Progress } from "@/components/ui/progress"
import { CategorySelect } from "@/components/category-select"
import { toast } from "sonner"
import { normalizeTransactions, cn } from "@/lib/utils"
import { useTheme } from "next-themes"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useChartCategoryVisibility } from "@/hooks/use-chart-category-visibility"
import { IconUpload, IconFile, IconCircleCheck, IconLoader2, IconAlertCircle, IconTrash } from "@tabler/icons-react"
import { parseCsvToRows } from "@/lib/parsing/parseCsvToRows"
import { rowsToCanonicalCsv } from "@/lib/parsing/rowsToCanonicalCsv"
import { TxRow } from "@/lib/types/transactions"
import { DEFAULT_CATEGORIES } from "@/lib/categories"

type ParsedRow = TxRow & { id: number }

// Memoized table row component to prevent unnecessary re-renders
const MemoizedTableRow = memo(function MemoizedTableRow({
  row,
  amount,
  balance,
  category,
  hasBalance,
  onCategoryChange,
  onDelete
}: {
  row: ParsedRow
  amount: number
  balance: number | null
  category: string
  hasBalance: boolean
  onCategoryChange: (value: string) => void
  onDelete: () => void
}) {
  return (
    <TableRow>
      <TableCell className="w-28 flex-shrink-0">
        {row.date}
      </TableCell>
      <TableCell className="min-w-[350px] max-w-[600px]">
        <div className="truncate" title={row.description}>
          {row.description}
        </div>
      </TableCell>
      <TableCell className={cn("text-right font-medium w-24 flex-shrink-0", amount < 0 ? "text-red-500" : "text-green-500")}>
        {amount.toFixed(2)}€
      </TableCell>
      <TableCell className="w-[140px] flex-shrink-0">
        <CategorySelect
          value={category}
          onValueChange={onCategoryChange}
        />
      </TableCell>
      {hasBalance && (
        <TableCell className="text-right w-32 flex-shrink-0">
          {balance !== null ? `${balance.toFixed(2)}€` : "-"}
        </TableCell>
      )}
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
  return (
    prevProps.category === nextProps.category &&
    prevProps.row.id === nextProps.row.id
  )
})

// Local ring types compatible with the original react-activity-rings API,
// extended with our own Neon-specific fields.
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

// Custom concentric rings renderer so we control tooltips from Neon data
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
      // Use the smaller dimension to keep the chart square, with some padding
      // Account for padding and margins
      const padding = 40
      const availableWidth = rect.width - padding
      const availableHeight = rect.height - padding
      const size = Math.min(availableWidth, availableHeight)
      const minSize = 200 // Minimum size
      const maxSize = 800 // Increased maximum size
      const clampedSize = Math.max(minSize, Math.min(maxSize, size))
      
      // Only update if size actually changed to avoid unnecessary re-renders
      setContainerSize(prev => {
        if (Math.abs(prev.width - clampedSize) > 1) {
          return { width: clampedSize, height: clampedSize }
        }
        return prev
      })
    }

    // Initial size with a small delay to ensure layout is complete
    const timeoutId = setTimeout(updateSize, 0)

    // Observe resize
    const resizeObserver = new ResizeObserver(() => {
      // Use requestAnimationFrame to ensure layout is complete
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
  // Scale ring size and radius proportionally to container size
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
          // Outermost ring corresponds to first item
          const ringIndexFromOutside = index
          const radius =
            baseRadius + (maxIndex - ringIndexFromOutside) * (ringSize + gap)
          const circumference = 2 * Math.PI * radius
          const clampedValue = Math.max(0, Math.min(1, item.value ?? 0))
          const dashOffset = circumference * (1 - clampedValue)

          const strokeColor = item.color || "#6b7280"
          const trackColor =
            item.backgroundColor || `${trackBase}${theme === "light" ? "ff" : "cc"}`

          // Get category and spent from item data (used in tooltip)
          const _category = (item as { category?: string }).category ?? "Category"
          const _spent = typeof (item as { spent?: number }).spent === "number"
            ? (item as { spent?: number }).spent!
            : 0

          return (
            <g key={item.category ?? item.label ?? index}>
              {/* Track */}
              <circle
                cx={centerX}
                cy={centerY}
                r={radius}
                fill="none"
                stroke={trackColor}
                strokeWidth={ringSize}
                strokeLinecap="round"
              />
              {/* Progress arc */}
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

            // Calculate budget from ringLimits or default
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

export default function AnalyticsPage() {
  const { resolvedTheme } = useTheme()
  const { getPalette } = useColorScheme()
  const palette = getPalette()
  const normalizeCategoryName = useCallback((value?: string | null) => {
    const trimmed = (value ?? "").trim()
    return trimmed || "Other"
  }, [])

  // CSV drop-to-import state
  const [isDragging, setIsDragging] = useState(false)
  const [droppedFile, setDroppedFile] = useState<File | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [parsingProgress, setParsingProgress] = useState(0)
  const [parsedCsv, setParsedCsv] = useState<string | null>(null)
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [fileId, setFileId] = useState<string | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [transactionCount, setTransactionCount] = useState<number>(0)
  const dragCounterRef = useRef(0)
  const csvRegenerationTimerRef = useRef<NodeJS.Timeout | null>(null)
  const latestParsedRowsRef = useRef<ParsedRow[]>([])

  // GridStack ref and instance
  const gridRef = useRef<HTMLDivElement>(null)
  const gridStackRef = useRef<GridStack | null>(null)

  // Chart order for rendering
  const analyticsChartOrder = useMemo(
    () => [
      "incomeExpensesTracking1",
      "incomeExpensesTracking2",
      "spendingCategoryRankings",
      "netWorthAllocation",
      "moneyFlow",
      "needsWantsBreakdown",
      "expenseBreakdown",
      "categoryBubbleMap",
      "householdSpendMix",
      "financialHealthScore",
      "spendingActivityRings",
      "spendingStreamgraph",
      "transactionHistory",
      "dailyTransactionActivity",
      "dayOfWeekSpending",
      "allMonthsCategorySpending",
      "singleMonthCategorySpending",
      "dayOfWeekCategory",
      // "budgetDistribution", // Hidden chart - kept in code but not displayed
    ],
    [],
  )

  // Default chart sizes and positions - these are the initial sizes for new users
  // Update these values to match your current chart layout
  // Note: GridStack uses grid units (not pixels)
  // w = width in grid units (6 or 12 columns), h = height in grid units (4-20)
  // x = x position in grid units (0-11), y = y position in grid units (stacks vertically)
  const DEFAULT_CHART_SIZES: Record<string, { w: number; h: number; x?: number; y?: number }> = {
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
    "spendingActivityRings": { w: 6, h: 10, x: 0, y: 50 },
    "spendingStreamgraph": { w: 12, h: 9, x: 0, y: 60 },
    "transactionHistory": { w: 12, h: 9, x: 0, y: 69 },
    "dailyTransactionActivity": { w: 12, h: 7, x: 0, y: 78 },
    "dayOfWeekSpending": { w: 6, h: 8, x: 6, y: 86 },
    "allMonthsCategorySpending": { w: 6, h: 8, x: 0, y: 94 },
    "singleMonthCategorySpending": { w: 6, h: 8, x: 6, y: 102 },
    "dayOfWeekCategory": { w: 6, h: 8, x: 0, y: 102 },
    "budgetDistribution": { w: 6, h: 10, x: 0, y: 101 },
  }

  // Define allowed sizes: small (6x6) and large (12x6)
  const allowedSizes = [
    { w: 6, h: 6 },  // Small
    { w: 12, h: 6 }  // Large
  ]

  // Snap to nearest allowed size (snap width, keep height as-is)
  const snapToAllowedSize = (w: number, h: number) => {
    // Snap width to nearest allowed size (6 or 12)
    // Keep height as-is (user can resize vertically freely)
    const widthDistanceToSmall = Math.abs(w - 6)
    const widthDistanceToLarge = Math.abs(w - 12)
    
    const snappedWidth = widthDistanceToSmall <= widthDistanceToLarge ? 6 : 12
    
    // Clamp height to valid range
    const clampedHeight = Math.max(4, Math.min(20, h))
    
    return { w: snappedWidth, h: clampedHeight }
  }

  // localStorage key for chart sizes and positions
  const CHART_SIZES_STORAGE_KEY = 'analytics-chart-sizes'
  const CHART_SIZES_VERSION_KEY = 'analytics-chart-sizes-version'
  
  // Version hash of default sizes - increment this when defaults change to force update
  const DEFAULT_SIZES_VERSION = '7'

  // Load saved chart sizes and positions from localStorage
  const loadChartSizes = useCallback((): Record<string, { w: number; h: number; x?: number; y?: number }> => {
    if (typeof window === 'undefined') return {}
    try {
      const saved = localStorage.getItem(CHART_SIZES_STORAGE_KEY)
      const savedSizes = saved ? JSON.parse(saved) : {}
      const savedVersion = localStorage.getItem(CHART_SIZES_VERSION_KEY)
      
      // Check if version changed or if we need to update sizes
      const needsUpdate = savedVersion !== DEFAULT_SIZES_VERSION
      
      // Start with defaults, then merge in saved positions (x, y) if they exist
      // This preserves user's manual positioning while applying new default sizes
      const result: Record<string, { w: number; h: number; x?: number; y?: number }> = {}
      let hasChanges = false
      
      Object.keys(DEFAULT_CHART_SIZES).forEach(chartId => {
        const defaultSize = DEFAULT_CHART_SIZES[chartId]
        const savedSize = savedSizes[chartId]
        
        // If version changed, always use new defaults for w and h
        // Otherwise, use saved size if it exists, otherwise use default
        const finalSize = needsUpdate || !savedSize
          ? {
              w: defaultSize.w,
              h: defaultSize.h,
              x: savedSize?.x ?? defaultSize.x,
              y: savedSize?.y ?? defaultSize.y
            }
          : {
              w: savedSize.w,
              h: savedSize.h,
              x: savedSize.x ?? defaultSize.x,
              y: savedSize.y ?? defaultSize.y
            }
        
        result[chartId] = finalSize
        
        // Check if this chart's size changed
        if (needsUpdate && (!savedSize || savedSize.w !== defaultSize.w || savedSize.h !== defaultSize.h)) {
          hasChanges = true
        }
      })
      
      // Save updated sizes if version changed or if we detected changes
      if (needsUpdate || hasChanges) {
        localStorage.setItem(CHART_SIZES_STORAGE_KEY, JSON.stringify(result))
        localStorage.setItem(CHART_SIZES_VERSION_KEY, DEFAULT_SIZES_VERSION)
      }
      
      return result
    } catch (error) {
      console.error('Failed to load chart sizes from localStorage:', error)
    }
    return {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [DEFAULT_SIZES_VERSION])

  // Save chart sizes and positions to localStorage AND React state
  const saveChartSizes = useCallback(
    (sizes: Record<string, { w: number; h: number; x?: number; y?: number }>) => {
      // Update in-memory state so components like Money Flow can react immediately
      setSavedChartSizes(sizes)

      if (typeof window === "undefined") return
      try {
        localStorage.setItem(CHART_SIZES_STORAGE_KEY, JSON.stringify(sizes))
        localStorage.setItem(CHART_SIZES_VERSION_KEY, DEFAULT_SIZES_VERSION)
      } catch (error) {
        console.error("Failed to save chart sizes to localStorage:", error)
      }
    },
    [],
  )

  // Load saved sizes on mount - use state to avoid hydration mismatch
  const [savedChartSizes, setSavedChartSizes] = useState<Record<string, { w: number; h: number; x?: number; y?: number }>>({})
  
  // Load saved sizes after mount (client-side only)
  useEffect(() => {
    const loaded = loadChartSizes()
    setSavedChartSizes(loaded)
  }, [loadChartSizes])

  // Initialize GridStack - wait for items to be rendered
  useEffect(() => {
    if (!gridRef.current) return

    // Define initialization function
    const initializeGridStack = () => {
      if (!gridRef.current) return
      const items = gridRef.current.querySelectorAll('.grid-stack-item')
      if (items.length === 0) return

      // Initialize GridStack with empty grid first (don't let it auto-read attributes)
      gridStackRef.current = GridStack.init({
        column: 12,
        cellHeight: 70,
        margin: 0,  // No margin - cards fill entire grid-stack-item
        minRow: 1,
        float: false,  // Don't float items, use strict grid
        resizable: {
          handles: 'se', // Only bottom-right resize handle (matching trends page style)
        },
        draggable: {
          handle: ".grid-stack-item-content"
        },
        // Constrain to allowed sizes
        disableOneColumnMode: true,
        // Don't set global min/max - let per-item constraints handle it
        // Per-item min/max will be set when loading widgets
      }, gridRef.current)
      
      // Now explicitly load all items with correct sizes from data attributes or saved sizes
      if (gridStackRef.current && items.length > 0) {
        // First pass: collect all widget data with saved positions
        const widgetData = Array.from(items).map((item) => {
          const el = item as HTMLElement
          // Get chartId from data attribute
          const chartId = el.getAttribute('data-chart-id') || ''
          
          // Try to load saved size and position first, then fall back to data attribute, then default
          let w = 12
          let h = 6
          let x = 0
          let y = 0
          
          if (chartId && savedChartSizes[chartId]) {
            // Use saved size and position, but ensure width is exactly 6 or 12
            const saved = savedChartSizes[chartId]
            const snapped = snapToAllowedSize(saved.w, saved.h)
            w = snapped.w
            h = saved.h
            // Use saved position if available
            if (typeof saved.x === 'number') x = saved.x
            if (typeof saved.y === 'number') y = saved.y
          } else {
            // Use default size and position from DEFAULT_CHART_SIZES if available
            const defaultSize = DEFAULT_CHART_SIZES[chartId]
            if (defaultSize) {
              const snapped = snapToAllowedSize(defaultSize.w, defaultSize.h)
              w = snapped.w
              h = defaultSize.h
              if (typeof defaultSize.x === 'number') x = defaultSize.x
              if (typeof defaultSize.y === 'number') y = defaultSize.y
            } else {
              // Fallback: Read from data attribute
              w = parseInt(el.getAttribute('data-gs-w') || '12', 10)
              h = parseInt(el.getAttribute('data-gs-h') || '6', 10)
              x = parseInt(el.getAttribute('data-gs-x') || '0', 10)
              y = parseInt(el.getAttribute('data-gs-y') || '0', 10)
              // Snap width to exactly 6 or 12
              const snapped = snapToAllowedSize(w, h)
              w = snapped.w
            }
          }
          
          // Get chart-specific constraints from config
          const sizeConfig = getChartCardSize(chartId as ChartId)
          
          // Ensure height is within chart-specific valid range
          h = Math.max(sizeConfig.minH, Math.min(sizeConfig.maxH, h))
          // Ensure width is within chart-specific valid range
          w = Math.max(sizeConfig.minW, Math.min(sizeConfig.maxW, w))
          
          return { el, w, h, x, y, chartId, minW: sizeConfig.minW, maxW: sizeConfig.maxW, minH: sizeConfig.minH, maxH: sizeConfig.maxH }
        })
        
        // Second pass: use saved positions, default positions, or stack vertically for new items
        let currentY = 0
        const widgets = widgetData.map((data) => {
          // If position was saved, use it; otherwise use default position or stack vertically
          let finalY = data.y
          let finalX = data.x
          
          if (!savedChartSizes[data.chartId]) {
            // No saved position, check for default position
            const defaultSize = DEFAULT_CHART_SIZES[data.chartId]
            if (defaultSize) {
              if (typeof defaultSize.x === 'number') finalX = defaultSize.x
              if (typeof defaultSize.y === 'number') finalY = defaultSize.y
            } else {
              // No default position either, stack vertically
              finalY = currentY
              currentY += data.h
            }
          } else {
            // Use saved position (already set in data.y and data.x)
            finalY = data.y
            finalX = data.x
          }
          
          const widget = {
            el: data.el,
            w: data.w,
            h: data.h,
            x: finalX,  // Use saved x position, default position, or 0
            y: finalY,
            minW: data.minW || 6,
            maxW: data.maxW || 12,
            minH: data.minH || 4,
            maxH: data.maxH || 20,
            chartId: data.chartId, // Store chartId for constraint enforcement
          }
          // Store chartId on the element for later reference
          if (data.chartId) {
            data.el.setAttribute('data-chart-id', data.chartId)
          }
          return widget
        })
        
        // Clear any existing items first, then load with correct sizes
        gridStackRef.current.removeAll(false)
        gridStackRef.current.load(widgets)
        
        // After loading, set constraints directly on GridStack nodes
        // GridStack needs constraints set on the node object itself, not just the widget
        setTimeout(() => {
          if (gridStackRef.current) {
            gridStackRef.current.engine.nodes.forEach((node) => {
              if (node.el) {
                const chartId = node.el.getAttribute('data-chart-id')
                if (chartId) {
                  const sizeConfig = getChartCardSize(chartId as ChartId)
                  
                  // Set constraints directly on the node (this is what GridStack uses)
                  node.minW = sizeConfig.minW
                  node.maxW = sizeConfig.maxW
                  node.minH = sizeConfig.minH
                  node.maxH = sizeConfig.maxH
                  
                  // Also set on the DOM element for persistence
                  node.el.setAttribute('gs-min-w', sizeConfig.minW.toString())
                  node.el.setAttribute('gs-max-w', sizeConfig.maxW.toString())
                  node.el.setAttribute('gs-min-h', sizeConfig.minH.toString())
                  node.el.setAttribute('gs-max-h', sizeConfig.maxH.toString())
                  
                  // Clamp current size to constraints
                  const clampedW = Math.max(sizeConfig.minW, Math.min(sizeConfig.maxW, node.w || 6))
                  const clampedH = Math.max(sizeConfig.minH, Math.min(sizeConfig.maxH, node.h || 6))
                  
                  // Update if size needs to be clamped
                  if (node.w !== clampedW || node.h !== clampedH) {
                    gridStackRef.current!.update(node.el, {
                      w: clampedW,
                      h: clampedH,
                    }, false)
                  }
                }
              }
            })
          }
        }, 100)
        
        // Force a layout update to ensure sizes are applied
        gridStackRef.current.compact()
        
        // Enforce constraints during resize (not just after)
        gridStackRef.current.on('resize', (event, items) => {
          if (items && items.length > 0 && gridStackRef.current) {
            const item = items[0]
            const chartId = item.el?.getAttribute('data-chart-id')
            if (chartId && item.el) {
              // Get the node to access its constraints
              const node = gridStackRef.current.engine.nodes.find(n => n.el === item.el)
              if (node) {
                // Use node's constraints (which we set after loading)
                const minH = node.minH ?? 4
                const maxH = node.maxH ?? 20
                const minW = node.minW ?? 6
                const maxW = node.maxW ?? 12
                
                const clampedW = Math.max(minW, Math.min(maxW, item.w || 6))
                const clampedH = Math.max(minH, Math.min(maxH, item.h || 6))
                
                // If size exceeds constraints, clamp it immediately
                if (item.w !== clampedW || item.h !== clampedH) {
                  gridStackRef.current.update(item.el, {
                    w: clampedW,
                    h: clampedH,
                  }, false)
                }
              }
            }
          }
        })
        
        // Handle vertical resize (GridStack handles this)
        gridStackRef.current.on('resizestop', (event, items) => {
          if (items && items.length > 0 && gridStackRef.current) {
            const item = items[0]
            const chartId = item.el?.getAttribute('data-chart-id')
            if (chartId && item.el) {
              // Get the node to access its constraints
              const node = gridStackRef.current.engine.nodes.find(n => n.el === item.el)
              if (node) {
                // Use node's constraints (which we set after loading)
                const minH = node.minH ?? 4
                const maxH = node.maxH ?? 20
                const minW = node.minW ?? 6
                const maxW = node.maxW ?? 12
                
                const clampedW = Math.max(minW, Math.min(maxW, item.w || 6))
                const clampedH = Math.max(minH, Math.min(maxH, item.h || 6))
                
                // If size was clamped, update the GridStack item
                if (item.w !== clampedW || item.h !== clampedH) {
                  gridStackRef.current.update(item.el, {
                    w: clampedW,
                    h: clampedH,
                  }, false)
                }
                
                const newSizes = { ...savedChartSizes }
                newSizes[chartId] = { 
                  w: clampedW, 
                  h: clampedH,
                  x: item.x || 0,
                  y: item.y || 0
                }
                saveChartSizes(newSizes)
              }
            }
          }
        })
        
        // Also save on change event (for drag operations that might affect layout)
        gridStackRef.current.on('change', (event, items) => {
          if (items && items.length > 0) {
            const newSizes = { ...savedChartSizes }
            items.forEach((item) => {
              const chartId = item.el?.getAttribute('data-chart-id')
              if (chartId && item.w && item.h) {
                // Get chart-specific constraints
                const sizeConfig = getChartCardSize(chartId as ChartId)
                // Ensure width is snapped to 6 or 12, then clamp to chart constraints
                const snapped = snapToAllowedSize(item.w, item.h)
                const clampedW = Math.max(sizeConfig.minW, Math.min(sizeConfig.maxW, snapped.w))
                const clampedH = Math.max(sizeConfig.minH, Math.min(sizeConfig.maxH, snapped.h))
                newSizes[chartId] = { 
                  w: clampedW, 
                  h: clampedH,
                  x: item.x || 0,
                  y: item.y || 0
                }
              }
            })
            if (Object.keys(newSizes).length > 0) {
              saveChartSizes(newSizes)
            }
          }
        })
        
        // Save on drag stop to preserve positions
        gridStackRef.current.on('dragstop', (event, items) => {
          if (items && items.length > 0) {
            const newSizes = { ...savedChartSizes }
            items.forEach((item) => {
              const chartId = item.el?.getAttribute('data-chart-id')
              if (chartId && item.w && item.h) {
                const snapped = snapToAllowedSize(item.w, item.h)
                newSizes[chartId] = { 
                  w: snapped.w, 
                  h: snapped.h,
                  x: item.x || 0,
                  y: item.y || 0
                }
              }
            })
            if (Object.keys(newSizes).length > 0) {
              saveChartSizes(newSizes)
            }
          }
        })
      }
    };

    // Use requestAnimationFrame to ensure DOM is fully rendered and layout is calculated
    let rafId: number | null = null
    const timer = setTimeout(() => {
      if (!gridRef.current) return

      rafId = requestAnimationFrame(() => {
        if (!gridRef.current) return

        // Destroy existing instance if it exists
        if (gridStackRef.current) {
          gridStackRef.current.destroy(false)
          gridStackRef.current = null
        }

        // Check if items exist in DOM
        const items = gridRef.current!.querySelectorAll('.grid-stack-item')
        if (items.length === 0) {
          // Items not ready yet, try again
          return
        }

        // Ensure container has width calculated before initializing GridStack
        const containerWidth = gridRef.current!.offsetWidth
        if (containerWidth === 0) {
          // Container width not calculated yet, try again with another frame
          rafId = requestAnimationFrame(() => {
            if (!gridRef.current || gridRef.current.offsetWidth === 0) return
            initializeGridStack()
          })
          return
        }
        
        // Force recalculation to ensure symmetrical spacing
        if (gridRef.current) {
          const computedStyle = window.getComputedStyle(gridRef.current)
          const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0
          const paddingRight = parseFloat(computedStyle.paddingRight) || 0
          // Ensure padding is symmetrical
          if (paddingLeft !== paddingRight && paddingLeft > 0) {
            gridRef.current.style.paddingRight = computedStyle.paddingLeft
          }
        }

        initializeGridStack()
      })
    }, 100)

    return () => {
      clearTimeout(timer)
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
      if (gridStackRef.current) {
        gridStackRef.current.destroy(false)
        gridStackRef.current = null
      }
    }
  }, [analyticsChartOrder, snapToAllowedSize, savedChartSizes, saveChartSizes])

  // Transactions state
  const [rawTransactions, setRawTransactions] = useState<Array<{
    id: number
    date: string
    description: string
    amount: number
    balance: number | null
    category: string
  }>>([])
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true)

  // Date filter state
  const [dateFilter, setDateFilter] = useState<string | null>(null)

  const [ringCategories, setRingCategories] = useState<string[]>([])
  const [allExpenseCategories, setAllExpenseCategories] = useState<string[]>([])
  // Independent limits used ONLY for Spending Activity Rings card
  const [ringLimits, setRingLimits] = useState<Record<string, number>>({})
  const [ringCategoryPopoverIndex, setRingCategoryPopoverIndex] = useState<number | null>(null)
  const [ringCategoryPopoverValue, setRingCategoryPopoverValue] = useState<string | null>(null)
  const [ringLimitPopoverValue, setRingLimitPopoverValue] = useState<string>("")

  const incomeExpenseVisibility = useChartCategoryVisibility({
    chartId: "analytics:income-expense",
    storageScope: "analytics",
    normalizeCategory: normalizeCategoryName,
  })
  const incomeExpenseTopVisibility = useChartCategoryVisibility({
    chartId: "analytics:income-expense-top",
    storageScope: "analytics",
    normalizeCategory: normalizeCategoryName,
  })
  const categoryFlowVisibility = useChartCategoryVisibility({
    chartId: "analytics:category-flow",
    storageScope: "analytics",
    normalizeCategory: normalizeCategoryName,
  })
  const spendingFunnelVisibility = useChartCategoryVisibility({
    chartId: "analytics:spending-funnel",
    storageScope: "analytics",
    normalizeCategory: normalizeCategoryName,
  })
  const expensesPieVisibility = useChartCategoryVisibility({
    chartId: "analytics:expenses-pie",
    storageScope: "analytics",
    normalizeCategory: normalizeCategoryName,
  })
  const needsWantsVisibility = useChartCategoryVisibility({
    chartId: "analytics:needs-wants-pie",
    storageScope: "analytics",
    normalizeCategory: normalizeCategoryName,
  })
  const circlePackingVisibility = useChartCategoryVisibility({
    chartId: "analytics:circle-packing",
    storageScope: "analytics",
    normalizeCategory: normalizeCategoryName,
  })
  const polarBarVisibility = useChartCategoryVisibility({
    chartId: "analytics:polar-bar",
    storageScope: "analytics",
    normalizeCategory: normalizeCategoryName,
  })
  const streamgraphVisibility = useChartCategoryVisibility({
    chartId: "analytics:streamgraph",
    storageScope: "analytics",
    normalizeCategory: normalizeCategoryName,
  })
  const treeMapVisibility = useChartCategoryVisibility({
    chartId: "analytics:treemap",
    storageScope: "analytics",
    normalizeCategory: normalizeCategoryName,
  })
  const sankeyVisibility = useChartCategoryVisibility({
    chartId: "analytics:sankey",
    storageScope: "analytics",
    normalizeCategory: normalizeCategoryName,
  })
  const dayOfWeekSpendingVisibility = useChartCategoryVisibility({
    chartId: "analytics:day-of-week-spending",
    storageScope: "analytics",
    normalizeCategory: normalizeCategoryName,
  })
  const monthOfYearSpendingVisibility = useChartCategoryVisibility({
    chartId: "analytics:month-of-year-spending",
    storageScope: "analytics",
    normalizeCategory: normalizeCategoryName,
  })

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

  const getDefaultRingLimit = (filter: string | null): number => {
    // All time (no filter), specific year (e.g. "2024"), or last year use a higher default
    const isYearLike =
      !filter ||
      filter === "lastyear" ||
      (/^\d{4}$/.test(filter))

    return isYearLike ? 5000 : 2000
  }


  // Fetch ALL analytics data in parallel for maximum performance
  const fetchAllAnalyticsData = useCallback(async () => {
    setIsLoadingTransactions(true)
    try {
      const startTime = performance.now()
      console.log("[Analytics] Starting parallel data fetch...")
      
      // Fetch ALL data in parallel - this is the key optimization
      const [
        transactionsData,
        budgetsData,
        categoriesData,
        financialHealthData,
        transactionHistoryData,
        monthlyCategoryBatch,
        dailyTransactionsData,
        dayOfWeekCategoryData,
      ] = await Promise.all([
        // 1. Transactions
        deduplicatedFetch<any[]>(
          dateFilter
            ? `/api/transactions?filter=${encodeURIComponent(dateFilter)}`
            : "/api/transactions"
        ).catch(err => {
          console.error("[Analytics] Transactions fetch error:", err)
          return []
        }),

        // 2. Budgets
        fetch(
          dateFilter
            ? `/api/budgets?filter=${encodeURIComponent(dateFilter)}`
            : "/api/budgets"
        )
          .then(res => res.ok ? res.json() : {})
          .catch(() => ({})),

        // 3. Categories
        fetch("/api/categories")
          .then(res => res.ok ? res.json() : [])
          .catch(() => []),

        // 4. Financial Health
        deduplicatedFetch<{ data: any[]; years: any[] }>(
          "/api/financial-health"
        ).catch(() => ({ data: [], years: [] })),

        // 5. Transaction History (for swarm plot)
        deduplicatedFetch<any[]>(
          "/api/charts/transaction-history"
        ).catch(() => []),

        // 6. Monthly Category (batch for all 12 months)
        deduplicatedFetch<{ data: Record<number, Array<{ category: string; month: number; total: number }>>; availableMonths: number[] }>(
          `/api/analytics/monthly-category-duplicate?months=1,2,3,4,5,6,7,8,9,10,11,12${dateFilter ? `&filter=${encodeURIComponent(dateFilter)}` : ''}`
        ).catch(() => ({ data: {}, availableMonths: [] })),

        // 7. Daily Transactions
        deduplicatedFetch<Array<{ day: string; value: number }>>(
          dateFilter
            ? `/api/transactions/daily?filter=${encodeURIComponent(dateFilter)}`
            : "/api/transactions/daily"
        ).catch(() => []),

        // 8. Day of Week Category
        deduplicatedFetch<{ data: Array<{ category: string; dayOfWeek: number; total: number }>; availableDays: number[] }>(
          `/api/analytics/day-of-week-category${dateFilter ? `?filter=${encodeURIComponent(dateFilter)}` : ''}`
        ).catch(() => ({ data: [], availableDays: [] })),
      ])

      const endTime = performance.now()
      console.log(`[Analytics] All data fetched in ${(endTime - startTime).toFixed(2)}ms`)

      // Set transactions
      if (Array.isArray(transactionsData)) {
        console.log(`[Analytics] Setting ${transactionsData.length} transactions`)
        setRawTransactions(normalizeTransactions(transactionsData) as Array<{
          id: number
          date: string
          description: string
          amount: number
          balance: number | null
          category: string
        }>)
      }

      // Set budgets
      if (budgetsData && typeof budgetsData === "object") {
        setRingLimits(budgetsData as Record<string, number>)
      }

    } catch (error) {
      console.error("Error fetching analytics data:", error)
      toast.error("Network Error", {
        description: "Failed to fetch analytics data. Check your database connection.",
        duration: 8000,
      })
    } finally {
      setIsLoadingTransactions(false)
    }
  }, [dateFilter])

  // Fetch all data on mount and when filter changes
  useEffect(() => {
    fetchAllAnalyticsData()
  }, [fetchAllAnalyticsData])

  // Parse CSV when it changes
  useEffect(() => {
    if (parsedCsv) {
      const rows = parseCsvToRows(parsedCsv)
      const rowsWithId: ParsedRow[] = rows.map((row, index) => ({
        ...row,
        id: index,
        category: row.category || undefined
      }))
      setParsedRows(rowsWithId)
    } else {
      setParsedRows([])
    }
  }, [parsedCsv])

  // Keep ref in sync with parsedRows
  useEffect(() => {
    latestParsedRowsRef.current = parsedRows
  }, [parsedRows])

  const handleCategoryChange = useCallback((rowId: number, newCategory: string) => {
    flushSync(() => {
      setParsedRows((prevRows) => {
        const updatedRows = prevRows.map((row) => {
          if (row.id === rowId) {
            return { ...row, category: newCategory }
          }
          return row
        })
        latestParsedRowsRef.current = updatedRows
        return updatedRows
      })
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
    }, 300)
  }, [])

  const handleDeleteRow = useCallback((rowId: number) => {
    flushSync(() => {
      setParsedRows((prevRows) => {
        const updatedRows = prevRows.filter((row) => row.id !== rowId)
        latestParsedRowsRef.current = updatedRows
        setTransactionCount(updatedRows.length)
        return updatedRows
      })
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
  }, [])

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

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    dragCounterRef.current = 0

    const files = Array.from(e.dataTransfer.files)
    if (files && files.length > 0) {
      const file = files[0]
      setDroppedFile(file)
      setIsDialogOpen(true)
      setIsParsing(true)
      setParsingProgress(0)
      setParseError(null)
      setParsedCsv(null)
      setFileId(null)
      setTransactionCount(0)

      setParsingProgress(5)

      try {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("bankName", "Unknown")

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
          console.warn("[ANALYTICS] Failed to load categories from API. Using defaults.", categoriesError)
        }

        setParsingProgress(20)

        const response = await fetch("/api/statements/parse", {
          method: "POST",
          headers: {
            "X-Custom-Categories": JSON.stringify(currentCategories),
          },
          body: formData,
        })

        const contentType = response.headers.get("content-type") || ""
        const fileIdHeader = response.headers.get("X-File-Id")
        const categorizationError = response.headers.get("X-Categorization-Error")
        const categorizationWarning = response.headers.get("X-Categorization-Warning")

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

        let responseText = ""

        if (response.body) {
          const reader = response.body.getReader()
          const contentLength = response.headers.get("content-length")
          const total = contentLength ? parseInt(contentLength, 10) : 0
          let received = 0
          const decoder = new TextDecoder()
          const chunks: string[] = []

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            chunks.push(chunk)
            received += value.length

            if (total > 0) {
              const downloadProgress = (received / total) * 65
              setParsingProgress(25 + downloadProgress)
            } else {
              const estimatedTotal = file.size * 1.2
              const estimatedProgress = Math.min(25 + (received / estimatedTotal) * 65, 90)
              setParsingProgress(estimatedProgress)
            }
          }

          responseText = chunks.join("")
        } else {
          setParsingProgress(60)
          responseText = await response.text()
          setParsingProgress(90)
        }

        setParsingProgress(95)

        if (contentType.includes("application/json")) {
          try {
            const data = JSON.parse(responseText)
            if (!data.parseable) {
              setParseError(data.message || "File format not supported for parsing")
              setIsParsing(false)
              setParsingProgress(0)
              return
            }
          } catch {
            throw new Error("Invalid response from server")
          }
        }

        const csv = responseText
        setParsingProgress(100)

        const lines = csv.trim().split("\n")
        const count = lines.length > 1 ? lines.length - 1 : 0

        setParsedCsv(csv)
        setFileId(fileIdHeader)
        setTransactionCount(count)

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
        } else if (errorMessage.includes("Failed to parse")) {
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
    }
  }, [])

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

    const progressInterval = setInterval(() => {
      setImportProgress((prev) => {
        if (prev >= 90) return prev
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
        const errorData = await response.json().catch(() => ({ error: "Failed to import" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setImportProgress(100)

      toast.success("File Imported Successfully", {
        description: `${data.inserted} transactions imported from ${droppedFile.name}`,
      })

      setIsDialogOpen(false)
      setDroppedFile(null)
      setParsedCsv(null)
      setFileId(null)
      setTransactionCount(0)
      setParseError(null)
      setImportProgress(0)

      // Refresh analytics data after import
      await fetchAllAnalyticsData()
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

  useEffect(() => {
    return () => {
      if (csvRegenerationTimerRef.current) {
        clearTimeout(csvRegenerationTimerRef.current)
      }
    }
  }, [])

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

  // Budgets are now loaded in fetchAllAnalyticsData() in parallel with other data
  // This useEffect is removed to avoid duplicate fetching

  // Derive available expense categories from Neon transactions for the activity rings
  useEffect(() => {
    if (!rawTransactions || rawTransactions.length === 0) {
      setAllExpenseCategories([])
      return
    }

    const categorySet = new Set<string>()
    rawTransactions
      .filter((tx) => tx.amount < 0)
      .forEach((tx) => {
        const rawCategory = (tx.category || "Other").trim()
        const category = rawCategory || "Other"
        categorySet.add(category)
      })

    const derived = Array.from(categorySet).sort((a, b) =>
      a.localeCompare(b)
    )
    setAllExpenseCategories(derived)
  }, [rawTransactions])

  // Calculate stats directly from transactions data (like dashboard)
  const stats = useMemo(() => {
    if (!rawTransactions || rawTransactions.length === 0) {
      return {
        totalIncome: 0,
        totalExpenses: 0,
        savingsRate: 0,
        netWorth: 0,
        incomeChange: 0,
        expensesChange: 0,
        savingsRateChange: 0,
        netWorthChange: 0,
      }
    }

    const currentIncome = rawTransactions
      .filter(tx => tx.amount > 0)
      .reduce((sum, tx) => sum + tx.amount, 0)

    const currentExpenses = Math.abs(
      rawTransactions
        .filter(tx => tx.amount < 0)
        .reduce((sum, tx) => sum + tx.amount, 0),
    )

    const currentSavingsRate =
      currentIncome > 0 ? ((currentIncome - currentExpenses) / currentIncome) * 100 : 0

    const sortedByDate = [...rawTransactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )
    const netWorth =
      sortedByDate.length > 0 && sortedByDate[0].balance !== null ? sortedByDate[0].balance : 0

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const threeMonthsAgo = new Date(today)
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    const sixMonthsAgo = new Date(threeMonthsAgo)
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 3)

    const formatDate = (date: Date) => date.toISOString().split("T")[0]
    const threeMonthsAgoStr = formatDate(threeMonthsAgo)
    const sixMonthsAgoStr = formatDate(sixMonthsAgo)

    const previousTransactions = rawTransactions.filter(tx => {
      const txDate = tx.date.split("T")[0]
      return txDate >= sixMonthsAgoStr && txDate < threeMonthsAgoStr
    })

    const previousIncome = previousTransactions
      .filter(tx => tx.amount > 0)
      .reduce((sum, tx) => sum + tx.amount, 0)

    const previousExpenses = Math.abs(
      previousTransactions
        .filter(tx => tx.amount < 0)
        .reduce((sum, tx) => sum + tx.amount, 0),
    )

    const previousSavingsRate =
      previousIncome > 0 ? ((previousIncome - previousExpenses) / previousIncome) * 100 : 0

    const previousSorted = previousTransactions.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )
    const previousNetWorth =
      previousSorted.length > 0 && previousSorted[0].balance !== null
        ? previousSorted[0].balance
        : 0

    const incomeChange =
      previousIncome > 0
        ? ((currentIncome - previousIncome) / previousIncome) * 100
        : currentIncome > 0
          ? 100
          : 0

    const expensesChange =
      previousExpenses > 0
        ? ((currentExpenses - previousExpenses) / previousExpenses) * 100
        : currentExpenses > 0
          ? 100
          : 0

    const savingsRateChange =
      previousSavingsRate !== 0
        ? currentSavingsRate - previousSavingsRate
        : currentSavingsRate > 0
          ? 100
          : 0

    const netWorthChange =
      previousNetWorth > 0
        ? ((netWorth - previousNetWorth) / previousNetWorth) * 100
        : netWorth > 0
          ? 100
          : 0

    return {
      totalIncome: currentIncome,
      totalExpenses: currentExpenses,
      savingsRate: currentSavingsRate,
      netWorth: netWorth,
      incomeChange,
      expensesChange,
      savingsRateChange,
      netWorthChange,
    }
  }, [rawTransactions])

  const activityData: ActivityRingsData = useMemo(() => {
    if (!rawTransactions || rawTransactions.length === 0) {
      return []
    }

    // Use real Neon categories from expenses
    const categoryTotals = new Map<string, number>()
    rawTransactions
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
        // Label is used by the ActivityRings tooltip on hover
        label:
          ratioToLimit !== null
            ? `Category: ${category}\nUsed: ${pct}%\nSpent: $${amount.toFixed(2)}\nBudget: $${effectiveLimit.toFixed(2)}${exceeded ? '\n⚠ Exceeded' : ''}`
            : `Category: ${category}\nSpent: $${amount.toFixed(2)}\nNo budget set`,
        // Store the raw category name separately for our own legend
        // (extra fields are ignored by the library)
        category,
        spent: amount,
        value,
        color,
      }
    })
  }, [rawTransactions, palette, ringCategories, ringLimits])

  const incomeExpenseChart = useMemo(() => {
    if (!rawTransactions || rawTransactions.length === 0) {
      return { data: [] as Array<{ date: string; desktop: number; mobile: number }>, categories: [] as string[] }
    }

    const categorySet = new Set<string>()
    rawTransactions.forEach((tx) => {
      categorySet.add(normalizeCategoryName(tx.category))
    })

    const filteredSource =
      incomeExpenseVisibility.hiddenCategorySet.size === 0
        ? rawTransactions
        : rawTransactions.filter((tx) => {
          const category = normalizeCategoryName(tx.category)
          return !incomeExpenseVisibility.hiddenCategorySet.has(category)
        })

    const grouped = filteredSource.reduce((acc, tx) => {
      const date = tx.date.split("T")[0]
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

    return {
      data: Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date)),
      categories: Array.from(categorySet),
    }
  }, [rawTransactions, incomeExpenseVisibility.hiddenCategorySet])

  const incomeExpenseControls = incomeExpenseVisibility.buildCategoryControls(
    incomeExpenseChart.categories,
    {
      description: "Hide a category to remove its transactions from this cash-flow chart.",
    }
  )

  // Build categories for the top chart (same as incomeExpenseChart but independent visibility)
  const incomeExpenseTopCategories = useMemo(() => {
    const categorySet = new Set<string>()
    rawTransactions.forEach((tx) => {
      categorySet.add(normalizeCategoryName(tx.category))
    })
    return Array.from(categorySet)
  }, [rawTransactions, normalizeCategoryName])

  const incomeExpenseTopControls = incomeExpenseTopVisibility.buildCategoryControls(
    incomeExpenseTopCategories,
    {
      description: "Hide a category to remove its transactions from this cash-flow chart.",
    }
  )

  const categoryFlowChart = useMemo(() => {
    if (!rawTransactions || rawTransactions.length === 0) {
      return { data: [] as Array<{ id: string; data: Array<{ x: string; y: number }> }>, categories: [] as string[] }
    }

    const categoryMap = new Map<string, Map<string, number>>()
    const allTimePeriods = new Set<string>()
    const categorySet = new Set<string>()

    // Determine time granularity based on date filter
    const getTimeKey = (date: Date): string => {
      if (!dateFilter) {
        // All time: use months
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      }

      switch (dateFilter) {
        case "last7days":
        case "last30days":
          // For short periods, use weeks
          const weekStart = new Date(date)
          weekStart.setDate(date.getDate() - date.getDay()) // Start of week (Sunday)
          return `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, "0")}-${String(weekStart.getDate()).padStart(2, "0")}`
        case "last3months":
        case "last6months":
        case "lastyear":
          // For medium periods, use months
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        default:
          // For specific years or other filters, use months
          if (/^\d{4}$/.test(dateFilter)) {
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
          }
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      }
    }

    rawTransactions.forEach((tx) => {
      if (tx.amount >= 0) return
      const rawCategory = (tx.category || "Other").trim()
      const category = normalizeCategoryName(rawCategory)
      categorySet.add(category)
      if (categoryFlowVisibility.hiddenCategorySet.has(category)) return

      const date = new Date(tx.date)
      if (Number.isNaN(date.getTime())) return
      const timeKey = getTimeKey(date)
      allTimePeriods.add(timeKey)
      if (!categoryMap.has(category)) {
        categoryMap.set(category, new Map())
      }
      const timeMap = categoryMap.get(category)!
      const current = timeMap.get(timeKey) || 0
      timeMap.set(timeKey, current + Math.abs(tx.amount))
    })

    if (!categoryMap.size) {
      return { data: [], categories: Array.from(categorySet) }
    }

    const sortedTimePeriods = Array.from(allTimePeriods).sort((a, b) => a.localeCompare(b))
    const periodTotals = new Map<string, number>()
    sortedTimePeriods.forEach((period) => {
      let total = 0
      categoryMap.forEach((periods) => {
        total += periods.get(period) || 0
      })
      periodTotals.set(period, total)
    })

    const data = Array.from(categoryMap.entries())
      .map(([category, periods]) => ({
        id: category,
        data: sortedTimePeriods.map((period) => {
          const value = periods.get(period) || 0
          const total = periodTotals.get(period) || 1
          const percentage = total > 0 ? (value / total) * 100 : 0
          return { x: period, y: Math.max(percentage, 0.1) }
        }),
      }))
      .filter((series) => {
        return series.data.some((point) => point.y > 0.1)
      })

    return {
      data,
      categories: Array.from(categorySet),
    }
  }, [rawTransactions, categoryFlowVisibility.hiddenCategorySet, normalizeCategoryName, dateFilter])

  const categoryFlowControls = categoryFlowVisibility.buildCategoryControls(
    categoryFlowChart.categories,
    {
      description: "Hide a spending category to remove it from the ranking stream.",
    }
  )

  const treeMapCategories = useMemo(() => {
    const categories = new Set<string>()
    rawTransactions.filter(tx => tx.amount < 0).forEach(tx => {
      categories.add(normalizeCategoryName(tx.category))
    })
    return Array.from(categories).sort((a, b) => a.localeCompare(b))
  }, [rawTransactions, normalizeCategoryName])

  const treeMapControls = treeMapVisibility.buildCategoryControls(treeMapCategories, {
    description: "Hide categories to remove them from this treemap view.",
  })

  // Money Flow: derive how many expense categories to show from chart height.
  // Use the chart's configured minH as the baseline, so every +2 grid units of height adds 1 more category.
  const moneyFlowSizeConfig = getChartCardSize("moneyFlow" as ChartId)
  const baseMoneyFlowHeight = moneyFlowSizeConfig.minH
  const moneyFlowHeight = savedChartSizes["moneyFlow"]?.h ?? baseMoneyFlowHeight
  const moneyFlowExtraSteps = Math.max(0, Math.floor((moneyFlowHeight - baseMoneyFlowHeight) / 2))
  const moneyFlowMaxExpenseCategories = 2 + moneyFlowExtraSteps

  const spendingFunnelChart = useMemo(() => {
    if (!rawTransactions || rawTransactions.length === 0) {
      return { data: [] as Array<{ id: string; value: number; label: string }>, categories: [] as string[] }
    }

    const categorySet = new Set<string>()
    rawTransactions.forEach((tx) => {
      if (tx.amount < 0) {
        categorySet.add(normalizeCategoryName(tx.category))
      }
    })

    const filteredSource =
      spendingFunnelVisibility.hiddenCategorySet.size === 0
        ? rawTransactions
        : rawTransactions.filter((tx) => {
          const category = normalizeCategoryName(tx.category)
          return !spendingFunnelVisibility.hiddenCategorySet.has(category)
        })

    if (!filteredSource.length) {
      return { data: [], categories: Array.from(categorySet) }
    }

    const totalIncome = filteredSource
      .filter((tx) => tx.amount > 0)
      .reduce((sum, tx) => sum + Number(tx.amount), 0)

    const categoryMap = new Map<string, number>()
    filteredSource
      .filter((tx) => tx.amount < 0)
      .forEach((tx) => {
        const category = normalizeCategoryName(tx.category)
        const current = categoryMap.get(category) || 0
        const amount = Math.abs(Number(tx.amount)) || 0
        categoryMap.set(category, current + amount)
      })

    if (categoryMap.size === 0) {
      return { data: [], categories: Array.from(categorySet) }
    }

    const totalExpenses = Array.from(categoryMap.values()).reduce((sum, amount) => sum + Number(amount), 0)
    const savings = totalIncome - totalExpenses

    // Sort categories by amount (descending) to get spending order
    const sortedCategories = Array.from(categoryMap.entries())
      .map(([category, amount]) => ({ category, amount: Number(amount) }))
      .sort((a, b) => b.amount - a.amount)

    // Determine how many top categories to show individually based on chart height
    const maxExpenseCategories = Math.max(1, moneyFlowMaxExpenseCategories)
    const topCategories = sortedCategories.slice(0, maxExpenseCategories)

    // Calculate remaining expenses (all categories beyond the top N)
    const shownExpenses = topCategories.reduce((sum, cat) => sum + cat.amount, 0)
    const remainingExpenses = totalExpenses - shownExpenses

    // Build expense categories array
    const expenseCategories: Array<{ id: string; value: number; label: string }> = []

    // Add top N categories (highest spending)
    topCategories.forEach((cat) => {
      expenseCategories.push({
        id: cat.category.toLowerCase().replace(/\s+/g, "-"),
        value: cat.amount,
        label: cat.category,
      })
    })

    // Add "Others" category (remaining categories, which are less significant)
    if (remainingExpenses > 0) {
      expenseCategories.push({
        id: "others",
        value: remainingExpenses,
        label: "Others",
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
      funnelData.push({
        id: "savings",
        value: savings,
        label: "Savings",
      })
    }

    return {
      data: funnelData,
      categories: Array.from(categorySet),
    }
  }, [rawTransactions, spendingFunnelVisibility.hiddenCategorySet, normalizeCategoryName, moneyFlowMaxExpenseCategories])

  const spendingFunnelControls = spendingFunnelVisibility.buildCategoryControls(
    spendingFunnelChart.categories,
    {
      description: "Hide a category to keep it out of this funnel view only.",
    }
  )

  const expensesPieData = useMemo(() => {
    if (!rawTransactions || rawTransactions.length === 0) {
      return { slices: [] as Array<{ id: string; label: string; value: number }>, categories: [] as string[] }
    }

    const categorySet = new Set<string>()
    rawTransactions.forEach((tx) => {
      if (tx.amount < 0) {
        categorySet.add(normalizeCategoryName(tx.category))
      }
    })

    const filteredSource =
      expensesPieVisibility.hiddenCategorySet.size === 0
        ? rawTransactions
        : rawTransactions.filter((tx) => {
          const category = normalizeCategoryName(tx.category)
          return !expensesPieVisibility.hiddenCategorySet.has(category)
        })

    const categoryMap = new Map<string, number>()
    filteredSource
      .filter((tx) => tx.amount < 0)
      .forEach((tx) => {
        const category = normalizeCategoryName(tx.category)
        const current = categoryMap.get(category) || 0
        categoryMap.set(category, current + Math.abs(tx.amount))
      })

    const slices = Array.from(categoryMap.entries())
      .map(([id, value]) => ({ id, label: id, value }))
      .sort((a, b) => b.value - a.value)

    return { slices, categories: Array.from(categorySet) }
  }, [rawTransactions, expensesPieVisibility.hiddenCategorySet, normalizeCategoryName])

  const expensesPieControls = expensesPieVisibility.buildCategoryControls(expensesPieData.categories, {
    description: "Choose which expense categories appear in this pie chart.",
  })

  type SpendingTier = "Essentials" | "Mandatory" | "Wants"

  const needsWantsPieData = useMemo(() => {
    if (!rawTransactions || rawTransactions.length === 0) {
      return {
        slices: [] as Array<{ id: string; label: string; value: number }>,
        categories: [] as string[],
      }
    }

    const categorySet = new Set<string>()
    rawTransactions.forEach((tx) => {
      if (tx.amount < 0) {
        categorySet.add(normalizeCategoryName(tx.category))
      }
    })

    const filteredSource =
      needsWantsVisibility.hiddenCategorySet.size === 0
        ? rawTransactions
        : rawTransactions.filter((tx) => {
            const category = normalizeCategoryName(tx.category)
            return !needsWantsVisibility.hiddenCategorySet.has(category)
          })

    const totals: Record<SpendingTier, number> = {
      Essentials: 0,
      Mandatory: 0,
      Wants: 0,
    }

    const classifySpendingTier = (normalizedCategory: string): SpendingTier => {
      if (typeof window !== "undefined") {
        try {
          const key = normalizedCategory.trim().toLowerCase()
          const raw = window.localStorage.getItem("needsWantsCategoryTier")
          if (raw) {
            const map = JSON.parse(raw) as Record<string, SpendingTier>
            const override = map[key]
            if (override) {
              return override
            }
          }
        } catch {
          // ignore storage errors and fall back to keyword rules
        }
      }

      const lower = normalizedCategory.toLowerCase()

      const essentialKeywords = [
        "grocery",
        "groceries",
        "supermarket",
        "rent",
        "mortgage",
        "utility",
        "utilities",
        "electric",
        "water",
        "gas",
        "fuel",
        "transport",
        "transit",
        "bus",
        "train",
        "subway",
        "health",
        "pharmacy",
      ]

      const mandatoryKeywords = ["insurance", "tax", "fee", "loan", "debt"]

      const wantsKeywords = [
        "shopping",
        "entertainment",
        "travel",
        "vacation",
        "subscription",
        "subscriptions",
        "restaurant",
        "restaurants",
        "dining",
        "bar",
        "coffee",
        "services",
        "education",
      ]

      if (essentialKeywords.some((k) => lower.includes(k))) {
        return "Essentials"
      }
      if (mandatoryKeywords.some((k) => lower.includes(k))) {
        return "Mandatory"
      }
      if (wantsKeywords.some((k) => lower.includes(k))) {
        return "Wants"
      }
      return "Wants"
    }

    filteredSource
      .filter((tx) => tx.amount < 0)
      .forEach((tx) => {
        const normalized = normalizeCategoryName(tx.category)
        const tier = classifySpendingTier(normalized)
        const amount = Math.abs(Number(tx.amount) || 0)
        totals[tier] += amount
      })

    const slices = (["Essentials", "Mandatory", "Wants"] as SpendingTier[])
      .map((tier) => ({
        id: tier,
        label: tier,
        value: totals[tier],
      }))
      .filter((slice) => slice.value > 0)

    return {
      slices,
      categories: Array.from(categorySet),
    }
  }, [rawTransactions, needsWantsVisibility.hiddenCategorySet, normalizeCategoryName])

  const needsWantsControls = needsWantsVisibility.buildCategoryControls(needsWantsPieData.categories, {
    description: "Hide a category to exclude it from the Needs vs Wants grouping.",
  })

  const circlePackingData = useMemo(() => {
    if (!rawTransactions || rawTransactions.length === 0) {
      return { tree: { name: "", children: [] as Array<{ name: string; value: number }> }, categories: [] as string[] }
    }

    const categoryMap = new Map<string, number>()
    const categorySet = new Set<string>()

    rawTransactions
      .filter((tx) => {
        const amount = Number(tx.amount) || 0
        return amount < 0
      })
      .forEach((tx) => {
        const rawCategory = (tx.category || "Other").trim()
        const category = normalizeCategoryName(rawCategory)
        categorySet.add(category)
        if (circlePackingVisibility.hiddenCategorySet.has(category)) return

        const current = categoryMap.get(category) || 0
        const amount = Math.abs(Number(tx.amount)) || 0
        categoryMap.set(category, current + amount)
      })

    const children = Array.from(categoryMap.entries())
      .map(([name, value]) => ({
        name,
        value: Number(value) || 0,
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)

    return {
      tree: {
        name: "Expenses",
        children,
      },
      categories: Array.from(categorySet),
    }
  }, [rawTransactions, circlePackingVisibility.hiddenCategorySet, normalizeCategoryName])

  const circlePackingControls = circlePackingVisibility.buildCategoryControls(
    circlePackingData.categories,
    {
      description: "Toggle categories to hide their bubbles in this packing chart.",
    }
  )

  const polarBarData = useMemo(() => {
    if (!rawTransactions || rawTransactions.length === 0) {
      return { data: [] as Array<Record<string, string | number>>, keys: [] as string[], categories: [] as string[] }
    }

    // Determine time granularity based on date filter
    const getTimeKey = (date: Date): string => {
      if (!dateFilter) {
        // All time: use months
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      }

      switch (dateFilter) {
        case "last7days":
          // Daily grouping for 7 days
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
        case "last30days":
          // Weekly grouping for 30 days
          const weekStart = new Date(date)
          weekStart.setDate(date.getDate() - date.getDay()) // Start of week (Sunday)
          return `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, "0")}-${String(weekStart.getDate()).padStart(2, "0")}`
        case "last3months":
        case "last6months":
          // Monthly grouping for 3 and 6 months
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        case "lastyear":
          // Monthly grouping for last year
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        default:
          // For specific years or other filters, use months
          if (/^\d{4}$/.test(dateFilter)) {
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
          }
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      }
    }

    const categoryTotals = new Map<string, number>()
    const categorySet = new Set<string>()

    rawTransactions
      .filter((tx) => {
        const amount = Number(tx.amount) || 0
        return amount < 0
      })
      .forEach((tx) => {
        const rawCategory = (tx.category || "Other").trim()
        const category = normalizeCategoryName(rawCategory)
        categorySet.add(category)
        if (polarBarVisibility.hiddenCategorySet.has(category)) return
        const current = categoryTotals.get(category) || 0
        const amount = Math.abs(Number(tx.amount)) || 0
        categoryTotals.set(category, current + amount)
      })

    if (!categoryTotals.size) {
      return { data: [], keys: [], categories: Array.from(categorySet) }
    }

    const topCategories = Array.from(categoryTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category]) => category)

    if (!topCategories.length) {
      return { data: [], keys: [], categories: Array.from(categorySet) }
    }

    const timePeriodMap = new Map<string, Record<string, number>>()

    rawTransactions
      .filter((tx) => {
        const amount = Number(tx.amount) || 0
        return amount < 0
      })
      .forEach((tx) => {
        const rawCategory = (tx.category || "Other").trim()
        const category = normalizeCategoryName(rawCategory)
        categorySet.add(category)
        if (polarBarVisibility.hiddenCategorySet.has(category)) return

        const date = new Date(tx.date)
        if (isNaN(date.getTime())) return
        const timeKey = getTimeKey(date)

        if (!timePeriodMap.has(timeKey)) {
          const initialData: Record<string, number> = {}
          topCategories.forEach((cat) => {
            initialData[cat] = 0
          })
          timePeriodMap.set(timeKey, initialData)
        }

        if (topCategories.includes(category)) {
          const periodData = timePeriodMap.get(timeKey)!
          periodData[category] = (periodData[category] || 0) + Math.abs(Number(tx.amount)) || 0
        }
      })

    const data = Array.from(timePeriodMap.entries())
      .map(([period, values]) => ({
        month: period, // Keep 'month' key for compatibility with chart component
        ...values,
      }))
      .sort((a, b) => (a.month as string).localeCompare(b.month as string))

    return {
      data,
      keys: topCategories,
      categories: Array.from(categorySet),
    }
  }, [rawTransactions, polarBarVisibility.hiddenCategorySet, normalizeCategoryName, dateFilter])

  const polarBarControls = polarBarVisibility.buildCategoryControls(polarBarData.categories, {
    description: "Hide categories to declutter this polar bar view.",
  })

  const spendingStreamData = useMemo(() => {
    if (!rawTransactions || rawTransactions.length === 0) {
      return { data: [] as Array<Record<string, string | number>>, keys: [] as string[], categories: [] as string[] }
    }

    const normalizeCategory = (value: string | undefined | null) => {
      const cleaned = (value ?? "").trim()
      if (!cleaned) return "Other"
      return cleaned
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(" ")
    }

    const monthMap = new Map<string, Map<string, number>>()
    const categoryTotals = new Map<string, number>()
    const categorySet = new Set<string>()

    rawTransactions
      .filter((tx) => tx.amount < 0)
      .forEach((tx) => {
        const date = new Date(tx.date)
        if (isNaN(date.getTime())) return

        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        const rawCategory = normalizeCategory(tx.category)
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
  }, [rawTransactions, streamgraphVisibility.hiddenCategorySet])

  const streamgraphControls = streamgraphVisibility.buildCategoryControls(spendingStreamData.categories, {
    description: "Select which categories flow through this streamgraph.",
  })


  const sankeyData = useMemo(() => {
    if (!rawTransactions || rawTransactions.length === 0) {
      return { graph: { nodes: [], links: [] as Array<{ source: string; target: string; value: number }> }, categories: [] as string[] }
    }

    const categorySet = new Set<string>()
    rawTransactions.forEach((tx) => {
      categorySet.add(normalizeCategoryName(tx.category))
    })

    const filteredSource =
      sankeyVisibility.hiddenCategorySet.size === 0
        ? rawTransactions
        : rawTransactions.filter((tx) => {
          const category = normalizeCategoryName(tx.category)
          return !sankeyVisibility.hiddenCategorySet.has(category)
        })

    if (!filteredSource.length) {
      return { graph: { nodes: [], links: [] }, categories: Array.from(categorySet) }
    }

    const rootNode = { id: "root:total-income", label: "Total Income" }
    const inflowTotals = new Map<string, number>()
    const outflowTotals = new Map<string, number>()

    filteredSource.forEach((tx) => {
      const amount = Number(tx.amount) || 0
      if (amount === 0) return

      const categoryName = tx.category?.trim() || "Other"
      if (amount > 0) {
        inflowTotals.set(categoryName, (inflowTotals.get(categoryName) || 0) + amount)
      } else {
        outflowTotals.set(categoryName, (outflowTotals.get(categoryName) || 0) + Math.abs(amount))
      }
    })

    const totalIncome = Array.from(inflowTotals.values()).reduce((sum, value) => sum + value, 0)
    const totalExpenses = Array.from(outflowTotals.values()).reduce((sum, value) => sum + value, 0)

    if (totalIncome === 0 && totalExpenses === 0) {
      return { graph: { nodes: [], links: [] }, categories: Array.from(categorySet) }
    }

    const limitEntries = (sourceMap: Map<string, number>, limit: number, otherLabel: string) => {
      const entries = Array.from(sourceMap.entries())
        .filter(([, value]) => value > 0)
        .sort((a, b) => b[1] - a[1])

      if (entries.length <= limit) {
        return entries
      }

      const slicePoint = Math.max(limit - 1, 1)
      const topEntries = entries.slice(0, slicePoint)
      const remainderTotal = entries.slice(slicePoint).reduce((sum, [, value]) => sum + value, 0)

      if (remainderTotal > 0) {
        topEntries.push([otherLabel, remainderTotal])
      }

      return topEntries
    }

    const inflowEntries = limitEntries(inflowTotals, 4, "Other Income")
    const outflowEntries = limitEntries(outflowTotals, 8, "Other Expenses")
    const surplusValue = totalIncome - totalExpenses
    const surplusNode =
      surplusValue >= 0 ? { id: "node:net-profit", label: "Net Profit" } : { id: "node:net-deficit", label: "Net Deficit" }

    const nodeMap = new Map<string, { id: string; label?: string }>()
    const ensureNode = (id: string, label?: string) => {
      if (!nodeMap.has(id)) {
        nodeMap.set(id, { id, label })
      }
    }

    ensureNode(rootNode.id, rootNode.label)

    const inflowLinks = inflowEntries.map(([label, value]) => {
      const nodeId = `inflow:${label}`
      ensureNode(nodeId, label)
      return {
        source: nodeId,
        target: rootNode.id,
        value,
      }
    })

    const outflowLinks = outflowEntries.map(([label, value]) => {
      const nodeId = `outflow:${label}`
      ensureNode(nodeId, label)
      return {
        source: rootNode.id,
        target: nodeId,
        value,
      }
    })

    if (surplusValue !== 0) {
      ensureNode(surplusNode.id, surplusNode.label)
      outflowLinks.push({
        source: rootNode.id,
        target: surplusNode.id,
        value: Math.abs(surplusValue),
      })
    }

    const links = [...inflowLinks, ...outflowLinks].filter((link) => link.value > 0)

    if (links.length === 0) {
      return { graph: { nodes: [], links: [] }, categories: Array.from(categorySet) }
    }

    const nodes = Array.from(nodeMap.values())

    return {
      graph: { nodes, links },
      categories: Array.from(categorySet),
    }
  }, [rawTransactions, sankeyVisibility.hiddenCategorySet, normalizeCategoryName])

  const sankeyControls = sankeyVisibility.buildCategoryControls(sankeyData.categories, {
    description: "Hide sources to remove them from the cash-flow Sankey.",
  })

  const activityConfig: ActivityRingsConfig = useMemo(
    () => ({
      width: 360,
      height: 360,
      radius: 70,
      ringSize: 18,
    }),
    []
  )

  const activityTheme = resolvedTheme === "light" ? "light" : "dark"

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
        <main
          className="flex-1 space-y-4 p-4 pt-0 lg:p-6 lg:pt-2"
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
              
              {/* GridStack analytics chart section */}
              <div className="w-full mb-4">
                <div ref={gridRef} className="grid-stack w-full px-4 lg:px-6">
                      {analyticsChartOrder.map((chartId, index) => {
                      // Determine default size and position for a chart
                      const getDefaultSize = (id: string) => {
                        return DEFAULT_CHART_SIZES[id] || { w: 12, h: 6, x: 0, y: 0 }  // Fallback to large if not found
                      }
                      const defaultSize = getDefaultSize(chartId)
                      // Get min/max size constraints from config
                      const sizeConfig = getChartCardSize(chartId as ChartId)
                      // Use defaultSize for initial render to avoid hydration mismatch
                      // Saved sizes will be applied by GridStack after mount via load() method
                      const initialW = defaultSize.w
                      const initialH = defaultSize.h

                      if (chartId === "transactionHistory") {
                        return (
                          <div key={chartId} className="grid-stack-item overflow-visible" data-chart-id={chartId} data-gs-w={initialW} data-gs-h={initialH} data-gs-min-w={sizeConfig.minW} data-gs-max-w={sizeConfig.maxW} data-gs-min-h={sizeConfig.minH} data-gs-max-h={sizeConfig.maxH}>
                            <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                            <ChartSwarmPlot
                              data={useMemo(() => {
                                if (!rawTransactions || rawTransactions.length === 0) {
                                  return []
                                }

                                const CATEGORY_GROUPS: Record<string, string[]> = {
                                  Essentials: [
                                    "Groceries",
                                    "Rent",
                                    "Mortgage",
                                    "Utilities",
                                    "Insurance",
                                    "Taxes",
                                    "Healthcare",
                                    "Health",
                                    "Medical",
                                  ],
                                  Lifestyle: [
                                    "Shopping",
                                    "Travel",
                                    "Entertainment",
                                    "Restaurants",
                                    "Bars",
                                    "Subscriptions",
                                    "Services",
                                    "Education",
                                    "Personal",
                                    "Leisure",
                                  ],
                                  Transport: [
                                    "Transport",
                                    "Transportation",
                                    "Fuel",
                                    "Gas",
                                    "Car",
                                    "Ride",
                                    "Transit",
                                    "Commute",
                                  ],
                                  Financial: [
                                    "Transfers",
                                    "Transfer",
                                    "Fees",
                                    "Banking",
                                    "Savings",
                                    "Investments",
                                    "Loan",
                                    "Debt",
                                    "Mortgage",
                                  ],
                                }

                                const CATEGORY_DEFAULT_GROUP = "Essentials"

                                const resolveGroup = (categoryName: string): string => {
                                  const normalized = categoryName.toLowerCase()
                                  for (const [group, categories] of Object.entries(CATEGORY_GROUPS)) {
                                    if (
                                      categories.some((cat) =>
                                        normalized.includes(cat.toLowerCase()),
                                      )
                                    ) {
                                      return group
                                    }
                                  }
                                  return CATEGORY_DEFAULT_GROUP
                                }

                                const computeVolume = (amount: number): number => {
                                  const min = 4
                                  const max = 20
                                  if (!Number.isFinite(amount) || amount <= 0) {
                                    return min
                                  }
                                  const scaled = Math.round(amount / 50)
                                  return Math.max(min, Math.min(max, scaled))
                                }

                                return rawTransactions
                                  .filter((tx) => tx.amount < 0) // Only expenses
                                  .map((tx, index) => {
                                    const normalizedAmount = Math.abs(tx.amount)
                                    const rawCategory = tx.category || "Other"
                                    const group = resolveGroup(rawCategory)

                                    return {
                                      id: tx.id ? `tx-${tx.id}` : `tx-${index}`,
                                      group,
                                      price: normalizedAmount,
                                      volume: computeVolume(normalizedAmount),
                                      category: rawCategory,
                                      color: null,
                                      date: tx.date.split("T")[0],
                                      description: tx.description,
                                    }
                                  })
                              }, [rawTransactions])}
                              />
                            </div>
                          </div>
                        )
                      }

                      if (chartId === "dayOfWeekSpending") {
                        return (
                          <div key={chartId} className="grid-stack-item overflow-visible" data-chart-id={chartId} data-gs-w={initialW} data-gs-h={initialH} data-gs-min-w={sizeConfig.minW} data-gs-max-w={sizeConfig.maxW} data-gs-min-h={sizeConfig.minH} data-gs-max-h={sizeConfig.maxH}>
                            <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                              <ChartDayOfWeekSpending
                                data={rawTransactions}
                                categoryControls={dayOfWeekSpendingVisibility.buildCategoryControls(
                                  Array.from(
                                    new Set(
                                      rawTransactions
                                        .filter((tx) => Number(tx.amount) < 0)
                                        .map((tx) => normalizeCategoryName(tx.category)),
                                    ),
                                  ).sort(),
                                )}
                              />
                            </div>
                          </div>
                        )
                      }

                      if (chartId === "allMonthsCategorySpending") {
                        return (
                          <div key={chartId} className="grid-stack-item overflow-visible" data-chart-id={chartId} data-gs-w={initialW} data-gs-h={initialH} data-gs-min-w={sizeConfig.minW} data-gs-max-w={sizeConfig.maxW} data-gs-min-h={sizeConfig.minH} data-gs-max-h={sizeConfig.maxH}>
                            <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                              <ChartAllMonthsCategorySpending
                                data={rawTransactions}
                                categoryControls={useMemo(() => {
                                  const categories = Array.from(
                                    new Set(
                                      rawTransactions
                                        .filter((tx) => Number(tx.amount) < 0)
                                        .map((tx) => normalizeCategoryName(tx.category)),
                                    ),
                                  ).sort()
                                  return monthOfYearSpendingVisibility.buildCategoryControls(
                                    categories,
                                  )
                                }, [
                                  rawTransactions,
                                  monthOfYearSpendingVisibility,
                                  normalizeCategoryName,
                                ])}
                              />
                            </div>
                          </div>
                        )
                      }

                      if (chartId === "incomeExpensesTracking1") {
                        return (
                          <div
                            key={chartId}
                            className="grid-stack-item overflow-visible"
                            data-chart-id={chartId}
                            data-gs-w={initialW}
                            data-gs-h={initialH}
                            data-gs-x={defaultSize.x ?? 0}
                            data-gs-y={defaultSize.y ?? 0}
                            data-gs-min-w={sizeConfig.minW}
                            data-gs-max-w={sizeConfig.maxW}
                            data-gs-min-h={sizeConfig.minH}
                            data-gs-max-h={sizeConfig.maxH}
                          >
                            <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                            <ChartAreaInteractive
                              chartId="incomeExpensesTracking1"
                              categoryControls={incomeExpenseTopControls}
                              isLoading={isLoadingTransactions}
                              data={useMemo(() => {
                                const filteredSource =
                                  incomeExpenseTopVisibility.hiddenCategorySet.size === 0
                                    ? rawTransactions
                                    : rawTransactions.filter((tx) => {
                                      const category = normalizeCategoryName(tx.category)
                                      return !incomeExpenseTopVisibility.hiddenCategorySet.has(category)
                                    })
                                const transactionsByDate = new Map<string, Array<{ amount: number }>>()
                                filteredSource.forEach(tx => {
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
                              }, [rawTransactions, incomeExpenseTopVisibility.hiddenCategorySet, normalizeCategoryName])}
                            />
                            </div>
                          </div>
                        )
                      }

                      if (chartId === "incomeExpensesTracking2") {
                        return (
                          <div
                            key={chartId}
                            className="grid-stack-item overflow-visible"
                            data-chart-id={chartId}
                            data-gs-w={initialW}
                            data-gs-h={initialH}
                            data-gs-x={defaultSize.x ?? 0}
                            data-gs-y={defaultSize.y ?? 0}
                            data-gs-min-w={sizeConfig.minW}
                            data-gs-max-w={sizeConfig.maxW}
                            data-gs-min-h={sizeConfig.minH}
                            data-gs-max-h={sizeConfig.maxH}
                          >
                            <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                            <ChartAreaInteractive
                              chartId="incomeExpensesTracking2"
                              categoryControls={incomeExpenseControls}
                              isLoading={isLoadingTransactions}
                              data={incomeExpenseChart.data}
                            />
                            </div>
                          </div>
                        )
                      }

                      if (chartId === "spendingCategoryRankings") {
                        return (
                          <div key={chartId} className="grid-stack-item overflow-visible" data-chart-id={chartId} data-gs-w={initialW} data-gs-h={initialH} data-gs-min-w={sizeConfig.minW} data-gs-max-w={sizeConfig.maxW} data-gs-min-h={sizeConfig.minH} data-gs-max-h={sizeConfig.maxH}>
                            <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                            <ChartCategoryFlow
                              categoryControls={categoryFlowControls}
                              data={categoryFlowChart.data}
                            />
                            </div>
                          </div>
                        )
                      }

                      if (chartId === "netWorthAllocation") {
                        return (
                          <div key={chartId} className="grid-stack-item overflow-visible" data-chart-id={chartId} data-gs-w={initialW} data-gs-h={initialH} data-gs-min-w={sizeConfig.minW} data-gs-max-w={sizeConfig.maxW} data-gs-min-h={sizeConfig.minH} data-gs-max-h={sizeConfig.maxH}>
                            <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                            <ChartTreeMap
                              categoryControls={treeMapControls}
                              data={useMemo(() => {
                                const filteredSource =
                                  treeMapVisibility.hiddenCategorySet.size === 0
                                    ? rawTransactions
                                    : rawTransactions.filter((tx) => {
                                      const category = normalizeCategoryName(tx.category)
                                      return !treeMapVisibility.hiddenCategorySet.has(category)
                                    })
                                const categoryMap = new Map<string, { total: number; subcategories: Map<string, { amount: number; fullDescription: string }> }>()
                                const getSubCategoryLabel = (description?: string) => {
                                  if (!description) return "Misc"
                                  const delimiterSplit = description.split(/[-–|]/)[0] ?? description
                                  const trimmed = delimiterSplit.trim()
                                  return trimmed.length > 24 ? `${trimmed.slice(0, 21)}…` : (trimmed || "Misc")
                                }
                                filteredSource
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
                              }, [rawTransactions, treeMapVisibility.hiddenCategorySet, normalizeCategoryName])}
                            />
                            </div>
                          </div>
                        )
                      }

                      if (chartId === "moneyFlow") {
                        return (
                          <div
                            key={chartId}
                            className="grid-stack-item overflow-visible"
                            data-chart-id={chartId}
                            data-gs-w={initialW}
                            data-gs-h={initialH}
                            data-gs-min-w={sizeConfig.minW}
                            data-gs-max-w={sizeConfig.maxW}
                            data-gs-min-h={sizeConfig.minH}
                            data-gs-max-h={sizeConfig.maxH}
                          >
                            <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                            <ChartSpendingFunnel
                              categoryControls={spendingFunnelControls}
                              data={spendingFunnelChart.data}
                              maxExpenseCategories={moneyFlowMaxExpenseCategories}
                            />
                            </div>
                          </div>
                        )
                      }

                      if (chartId === "expenseBreakdown") {
                        return (
                          <div key={chartId} className="grid-stack-item overflow-visible" data-chart-id={chartId} data-gs-w={initialW} data-gs-h={initialH} data-gs-min-w={sizeConfig.minW} data-gs-max-w={sizeConfig.maxW} data-gs-min-h={sizeConfig.minH} data-gs-max-h={sizeConfig.maxH}>
                            <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                            <ChartExpensesPie
                              categoryControls={expensesPieControls}
                              data={expensesPieData.slices}
                            />
                            </div>
                          </div>
                        )
                      }

                      if (chartId === "needsWantsBreakdown") {
                        return (
                          <div
                            key={chartId}
                            className="grid-stack-item overflow-visible"
                            data-chart-id={chartId}
                            data-gs-w={initialW}
                            data-gs-h={initialH}
                            data-gs-min-w={sizeConfig.minW}
                            data-gs-max-w={sizeConfig.maxW}
                            data-gs-min-h={sizeConfig.minH}
                            data-gs-max-h={sizeConfig.maxH}
                          >
                            <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                              <ChartNeedsWantsPie
                                categoryControls={needsWantsControls}
                                data={needsWantsPieData.slices}
                              />
                            </div>
                          </div>
                        )
                      }

                      if (chartId === "categoryBubbleMap") {
                        return (
                          <div key={chartId} className="grid-stack-item overflow-visible" data-chart-id={chartId} data-gs-w={initialW} data-gs-h={initialH} data-gs-min-w={sizeConfig.minW} data-gs-max-w={sizeConfig.maxW} data-gs-min-h={sizeConfig.minH} data-gs-max-h={sizeConfig.maxH}>
                            <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                            <ChartCategoryBubble
                              data={rawTransactions}
                            />
                            </div>
                          </div>
                        )
                      }

                      if (chartId === "householdSpendMix") {
                        return (
                          <div key={chartId} className="grid-stack-item overflow-visible" data-chart-id={chartId} data-gs-w={initialW} data-gs-h={initialH} data-gs-min-w={sizeConfig.minW} data-gs-max-w={sizeConfig.maxW} data-gs-min-h={sizeConfig.minH} data-gs-max-h={sizeConfig.maxH}>
                            <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                            <ChartPolarBar
                              categoryControls={polarBarControls}
                              data={polarBarData.data}
                              keys={polarBarData.keys}
                            />
                            </div>
                          </div>
                        )
                      }

                      if (chartId === "financialHealthScore") {
                        return (
                          <div key={chartId} className="grid-stack-item overflow-visible" data-chart-id={chartId} data-gs-w={initialW} data-gs-h={initialH} data-gs-min-w={sizeConfig.minW} data-gs-max-w={sizeConfig.maxW} data-gs-min-h={sizeConfig.minH} data-gs-max-h={sizeConfig.maxH}>
                            <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                            <ChartRadar
                            />
                            </div>
                          </div>
                        )
                      }

                      if (chartId === "spendingActivityRings") {
                        return (
                          <div key={chartId} className="grid-stack-item overflow-visible" data-chart-id={chartId} data-gs-w={initialW} data-gs-h={initialH} data-gs-min-w={sizeConfig.minW} data-gs-max-w={sizeConfig.maxW} data-gs-min-h={sizeConfig.minH} data-gs-max-h={sizeConfig.maxH}>
                            <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                            <Card className="h-full flex flex-col">
                              <CardHeader className="relative flex flex-row items-start justify-between gap-2 flex-1 min-h-[420px] pb-6">
                                <div className="space-y-1 z-10">
                                  <div className="flex items-center gap-2">
                                    <ChartFavoriteButton 
                                      chartId="spendingActivityRings" 
                                      chartTitle="Spending Activity Rings"
                                      size="md"
                                    />
                                    <CardTitle className="mb-0">Spending Activity Rings</CardTitle>
                                    <ChartInfoPopover
                                      title="Spending Activity Rings"
                                      description="Top spending categories from your Neon transactions"
                                      details={[
                                        "Each ring shows how much a category has consumed relative to its budget.",
                                        "Budgets come from your saved limits or a default amount for the selected date filter.",
                                      ]}
                                    />
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
                                                              filter: dateFilter, // Include current filter
                                                            }),
                                                          })

                                                          if (!res.ok) {
                                                            console.error(
                                                              "[Analytics] Failed to save ring limit:",
                                                              await res.text()
                                                            )
                                                          }
                                                        } catch (error) {
                                                          console.error("[Analytics] Error saving ring limit:", error)
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
                          </div>
                        )
                      }

                      if (chartId === "spendingStreamgraph") {
                        return (
                          <div key={chartId} className="grid-stack-item overflow-visible" data-chart-id={chartId} data-gs-w={initialW} data-gs-h={initialH} data-gs-min-w={sizeConfig.minW} data-gs-max-w={sizeConfig.maxW} data-gs-min-h={sizeConfig.minH} data-gs-max-h={sizeConfig.maxH}>
                            <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                            <ChartSpendingStreamgraph
                              categoryControls={streamgraphControls}
                              data={spendingStreamData.data}
                              keys={spendingStreamData.keys}
                            />
                            </div>
                          </div>
                        )
                      }

                      if (chartId === "singleMonthCategorySpending") {
                        return (
                          <div key={chartId} className="grid-stack-item overflow-visible" data-chart-id={chartId} data-gs-w={initialW} data-gs-h={initialH} data-gs-min-w={sizeConfig.minW} data-gs-max-w={sizeConfig.maxW} data-gs-min-h={sizeConfig.minH} data-gs-max-h={sizeConfig.maxH}>
                            <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                            <ChartSingleMonthCategorySpending
                              dateFilter={dateFilter}
                            />
                            </div>
                          </div>
                        )
                      }

                      if (chartId === "dayOfWeekCategory") {
                        return (
                          <div key={chartId} className="grid-stack-item overflow-visible" data-chart-id={chartId} data-gs-w={initialW} data-gs-h={initialH} data-gs-min-w={sizeConfig.minW} data-gs-max-w={sizeConfig.maxW} data-gs-min-h={sizeConfig.minH} data-gs-max-h={sizeConfig.maxH}>
                            <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                            <ChartDayOfWeekCategory
                              dateFilter={dateFilter}
                            />
                            </div>
                          </div>
                        )
                      }

                      // Hidden chart - kept in code but not displayed
                      // if (chartId === "budgetDistribution") {
                      //   return (
                      //     <div key={chartId} className="grid-stack-item" data-chart-id={chartId} data-gs-w={initialW} data-gs-h={initialH} data-gs-min-w={sizeConfig.minW} data-gs-max-w={sizeConfig.maxW} data-gs-min-h={sizeConfig.minH} data-gs-max-h={sizeConfig.maxH}>
                      //       <div className="grid-stack-item-content h-full w-full overflow-hidden">
                      //       <ChartCirclePacking
                      //         categoryControls={circlePackingControls}
                      //         data={circlePackingData.tree}
                      //       />
                      //       </div>
                      //     </div>
                      //   )
                      // }

                      if (chartId === "transactionHistory") {
                        return (
                          <div key={chartId} className="grid-stack-item overflow-visible" data-chart-id={chartId} data-gs-w={initialW} data-gs-h={initialH} data-gs-min-w={sizeConfig.minW} data-gs-max-w={sizeConfig.maxW} data-gs-min-h={sizeConfig.minH} data-gs-max-h={sizeConfig.maxH}>
                            <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                            <ChartSwarmPlot
                              data={useMemo(() => {
                                if (!rawTransactions || rawTransactions.length === 0) {
                                  return []
                                }
                                const CATEGORY_GROUPS: Record<string, string[]> = {
                                  Essentials: [
                                    "Groceries",
                                    "Rent",
                                    "Mortgage",
                                    "Utilities",
                                    "Insurance",
                                    "Taxes",
                                    "Healthcare",
                                    "Health",
                                    "Medical",
                                  ],
                                  Lifestyle: [
                                    "Shopping",
                                    "Travel",
                                    "Entertainment",
                                    "Restaurants",
                                    "Bars",
                                    "Subscriptions",
                                    "Services",
                                    "Education",
                                    "Personal",
                                    "Leisure",
                                  ],
                                  Transport: [
                                    "Transport",
                                    "Transportation",
                                    "Fuel",
                                    "Gas",
                                    "Car",
                                    "Ride",
                                    "Transit",
                                    "Commute",
                                  ],
                                  Financial: [
                                    "Transfers",
                                    "Transfer",
                                    "Fees",
                                    "Banking",
                                    "Savings",
                                    "Investments",
                                    "Loan",
                                    "Debt",
                                    "Mortgage",
                                  ],
                                }
                                const CATEGORY_DEFAULT_GROUP = "Essentials"
                                const resolveGroup = (categoryName: string): string => {
                                  const normalized = categoryName.toLowerCase()
                                  for (const [group, categories] of Object.entries(CATEGORY_GROUPS)) {
                                    if (
                                      categories.some((cat) =>
                                        normalized.includes(cat.toLowerCase()),
                                      )
                                    ) {
                                      return group
                                    }
                                  }
                                  return CATEGORY_DEFAULT_GROUP
                                }
                                const computeVolume = (amount: number): number => {
                                  const min = 4
                                  const max = 20
                                  if (!Number.isFinite(amount) || amount <= 0) {
                                    return min
                                  }
                                  const scaled = Math.round(amount / 50)
                                  return Math.max(min, Math.min(max, scaled))
                                }
                                return rawTransactions
                                  .filter((tx) => tx.amount < 0)
                                  .map((tx, index) => {
                                    const normalizedAmount = Math.abs(tx.amount)
                                    const rawCategory = tx.category || "Other"
                                    const group = resolveGroup(rawCategory)
                                    return {
                                      id: tx.id ? `tx-${tx.id}` : `tx-${index}`,
                                      group,
                                      price: normalizedAmount,
                                      volume: computeVolume(normalizedAmount),
                                      category: rawCategory,
                                      color: null,
                                      date: tx.date.split("T")[0],
                                      description: tx.description,
                                    }
                                  })
                              }, [rawTransactions])}
                            />
                            </div>
                          </div>
                        )
                      }

                      if (chartId === "dailyTransactionActivity") {
                        return (
                          <div key={chartId} className="grid-stack-item overflow-visible" data-chart-id={chartId} data-gs-w={initialW} data-gs-h={initialH} data-gs-min-w={sizeConfig.minW} data-gs-max-w={sizeConfig.maxW} data-gs-min-h={sizeConfig.minH} data-gs-max-h={sizeConfig.maxH}>
                            <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                              <ChartTransactionCalendar />
                            </div>
                          </div>
                        )
                      }

                      return null
                    })}
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Modern Confirmation Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[95vw] lg:max-w-[1200px] w-full max-h-[90vh] flex flex-col p-0 gap-0">
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
                    </CardContent>
                  </Card>
                )}

                {/* Import Progress */}
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

                {/* Parsed CSV Preview */}
                {parsedCsv && !isParsing && !parseError && !isImporting && (
                  <Card className="border-2 overflow-hidden flex flex-col min-h-0">
                    <CardHeader className="flex-shrink-0 px-4 pt-4 pb-2">
                      <CardTitle className="text-sm">Preview ({transactionCount} transactions)</CardTitle>
                      <CardDescription className="text-xs">
                        Review and edit categories before importing
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 min-h-0 overflow-hidden">
                      <div className="h-full max-h-[500px] overflow-auto relative">
                        <Table>
                          <TableHeader className="sticky top-0 z-20 bg-muted border-b">
                            <TableRow>
                              <TableHead className="sticky top-0 z-20 bg-muted">Date</TableHead>
                              <TableHead className="sticky top-0 z-20 bg-muted">Description</TableHead>
                              <TableHead className="sticky top-0 z-20 bg-muted text-right">Amount</TableHead>
                              <TableHead className="sticky top-0 z-20 bg-muted">Category</TableHead>
                              {parsedRows.some((row) => row.balance !== null && row.balance !== undefined) && (
                                <TableHead className="sticky top-0 z-20 bg-muted text-right">Balance</TableHead>
                              )}
                              <TableHead className="sticky top-0 z-20 bg-muted w-12"></TableHead>
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
                                const balance = row.balance !== null && row.balance !== undefined
                                  ? (typeof row.balance === 'number' ? row.balance : parseFloat(row.balance))
                                  : null
                                const category = row.category || 'Other'
                                const hasBalance = parsedRows.some((r) => r.balance !== null && r.balance !== undefined)

                                return (
                                  <MemoizedTableRow
                                    key={row.id ?? `${row.date}-${row.description}`}
                                    row={row}
                                    amount={amount}
                                    balance={balance}
                                    category={category}
                                    hasBalance={hasBalance}
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
                  disabled={isParsing || isImporting || !!parseError || !parsedCsv}
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
      </SidebarInset>
    </SidebarProvider>
  )
}





