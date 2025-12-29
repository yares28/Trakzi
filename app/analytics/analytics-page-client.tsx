"use client"

import { useState, useEffect, useCallback, useMemo, memo, useRef } from "react"
import { flushSync } from "react-dom"
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable"
import { AppSidebar } from "@/components/app-sidebar"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { ChartCirclePacking } from "@/components/chart-circle-packing"
import { ChartPolarBar } from "@/components/chart-polar-bar"
import { ChartRadar } from "@/components/chart-radar"
import { ChartSpendingStreamgraph } from "@/components/chart-spending-streamgraph"
import { ChartSwarmPlot } from "@/components/chart-swarm-plot"
import { ChartCategoryFlow } from "@/components/chart-category-flow"
import { ChartExpensesPie } from "@/components/chart-expenses-pie"
import { ChartNeedsWantsPie } from "@/components/chart-needs-wants-pie"
import { ChartSpendingFunnel } from "@/components/chart-spending-funnel"
import { ChartTreeMap } from "@/components/chart-treemap"
import { ChartDayOfWeekSpending } from "@/components/chart-day-of-week-spending"
import { ChartAllMonthsCategorySpending } from "@/components/chart-all-months-category-spending"
import { ChartCategoryBubble } from "@/components/chart-category-bubble"
import { ChartSingleMonthCategorySpending } from "@/components/chart-single-month-category-spending"
import { ChartDayOfWeekCategory } from "@/components/chart-day-of-week-category"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import { SortableAnalyticsChart } from "@/components/SortableAnalyticsChart"
import { FileUpload01 } from "@/components/file-upload-01"
import { useCurrency } from "@/components/currency-provider"
import { toNumericValue } from "@/lib/utils"
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
import { Checkbox } from "@/components/ui/checkbox"
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
import { useColorScheme, colorPalettes } from "@/components/color-scheme-provider"
import { useChartCategoryVisibility } from "@/hooks/use-chart-category-visibility"
import { IconUpload, IconFile, IconCircleCheck, IconLoader2, IconAlertCircle, IconTrash, IconMaximize, IconMinimize } from "@tabler/icons-react"
import { parseCsvToRows } from "@/lib/parsing/parseCsvToRows"
import { rowsToCanonicalCsv } from "@/lib/parsing/rowsToCanonicalCsv"
import { TxRow } from "@/lib/types/transactions"
import { DEFAULT_CATEGORIES } from "@/lib/categories"

type ParsedRow = TxRow & { id: number }

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
  return (
    prevProps.category === nextProps.category &&
    prevProps.row.id === nextProps.row.id &&
    prevProps.isSelected === nextProps.isSelected
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
  colorScheme?: string
}

// Custom concentric rings renderer so we control tooltips from Neon data
function SpendingActivityRings({ data, config, theme, ringLimits = {}, getDefaultLimit, colorScheme }: SpendingActivityRingsProps) {
  const rings = Array.isArray(data) ? data.filter((item): item is NonNullable<typeof item> => item != null) : []

  // Hooks must be called unconditionally - move before early return
  const [hoveredRing, setHoveredRing] = useState<number | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)
  const [isAnimating, setIsAnimating] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ width: config.width, height: config.height })

  // Reset animation state when data changes
  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in effect
    let endTimer: NodeJS.Timeout | null = null
    const timer = setTimeout(() => {
      setIsAnimating(true)
      endTimer = setTimeout(() => setIsAnimating(false), 800)
    }, 0)
    return () => {
      clearTimeout(timer)
      if (endTimer) clearTimeout(endTimer)
    }
  }, [data])

  // Observe container size changes
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateSize = () => {
      const rect = container.getBoundingClientRect()
      // Use the smaller dimension to keep the chart square, with minimal padding
      // Account for padding and margins
      const padding = 10
      const availableWidth = rect.width - padding
      const availableHeight = rect.height - padding
      const size = Math.min(availableWidth, availableHeight)
      // Allow chart to scale larger while maintaining minimum size
      const minSize = 200 // Minimum size
      const maxSize = 1200 // Increased maximum size for better visibility
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

  // Early return after all hooks
  if (!rings.length) return null

  const width = containerSize.width
  const height = containerSize.height
  const centerX = width / 2
  const centerY = height / 2
  // Scale ring size and radius proportionally to container size
  const sizeScale = width / config.width
  const ringSize = (config.ringSize ?? 12) * sizeScale
  const gap = 4 * sizeScale
  const baseRadius = (config.radius ?? 32) * sizeScale

  // For dark color palette, use "#e5e7eb" as background for dark mode
  const trackBase = colorScheme === "dark" && theme === "dark"
    ? "#e5e7eb"
    : theme === "light"
      ? "#e5e7eb"
      : "#374151"
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

          return (
            <g key={item?.category ?? item?.label ?? `ring-${index}`}>
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
                            <span className="text-foreground font-mono font-medium tabular-nums" style={{ color: '#ef4444' }}>ÔÜá Exceeded</span>
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

type SpendingTier = "Essentials" | "Mandatory" | "Wants"

const CATEGORY_TIER_STORAGE_KEY = "needsWantsCategoryTier"

function getUserCategoryTier(normalizedCategory: string): SpendingTier | null {
  if (typeof window === "undefined") return null
  try {
    const key = normalizedCategory.trim().toLowerCase()
    const raw = window.localStorage.getItem(CATEGORY_TIER_STORAGE_KEY)
    if (!raw) return null
    const map = JSON.parse(raw) as Record<string, SpendingTier>
    return map[key] ?? null
  } catch {
    return null
  }
}

function classifySpendingTier(normalizedCategory: string): SpendingTier {
  const override = getUserCategoryTier(normalizedCategory)
  if (override) return override

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

export default function AnalyticsPage() {
  const { resolvedTheme } = useTheme()
  const { getPalette, colorScheme } = useColorScheme()
  const palette = getPalette()
  const normalizeCategoryName = useCallback((value?: string | null) => {
    const trimmed = (value ?? "").trim()
    return trimmed || "Other"
  }, [])

  // FileUpload01 upload state (replaces old CSV upload state)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [fileProgresses, setFileProgresses] = useState<Record<string, number>>({})
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [projectName, setProjectName] = useState("")
  const [projectNameEdited, setProjectNameEdited] = useState(false)

  // Ref to track if we've already checked for pending upload (prevents duplicate checks)
  const hasCheckedPendingUploadRef = useRef(false)

  // Keep only needed state for post-upload processing
  const [parsedCsv, setParsedCsv] = useState<string | null>(null)
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [selectedParsedRowIds, setSelectedParsedRowIds] = useState<Set<number>>(new Set())
  const [transactionCount, setTransactionCount] = useState<number>(0)
  const csvRegenerationTimerRef = useRef<NodeJS.Timeout | null>(null)
  const latestParsedRowsRef = useRef<ParsedRow[]>([])
  const preferenceUpdateTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pendingPreferenceEntriesRef = useRef<Array<{ description: string; category: string }>>([])
  // Draggable ordering for all analytics charts
  const [analyticsChartOrder, setAnalyticsChartOrder] = useState<string[]>([
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
    "dayOfWeekSpending",
    "allMonthsCategorySpending",
    "singleMonthCategorySpending",
    "dayOfWeekCategory",
    "budgetDistribution",
  ])
  // Track expansion per chart so each card controls its own expanded state
  const [expandedCharts, setExpandedCharts] = useState<Record<string, boolean>>({})

  const dndSensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 3 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 100, tolerance: 4 },
    }),
  )

  const handleAnalyticsChartsDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      // Update state immediately - React will batch this update
      // The transform preservation in SortableAnalyticsChart will prevent snap-back
      setAnalyticsChartOrder((items) => {
        const oldIndex = items.indexOf(active.id as string)
        const newIndex = items.indexOf(over.id as string)
        if (oldIndex === -1 || newIndex === -1) return items
        return arrayMove(items, oldIndex, newIndex)
      })
    },
    [],
  )

  const handleToggleChartExpand = useCallback((id: string) => {
    setExpandedCharts((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }, [])

  // Transactions state
  const [rawTransactions, setRawTransactions] = useState<Array<{
    id: number
    date: string
    description: string
    amount: number
    balance: number | null
    category: string
  }>>([])

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

  const getDefaultRingLimit = useCallback((filter: string | null): number => {
    // All time (no filter), specific year (e.g. "2024"), or last year use a higher default
    const isYearLike =
      !filter ||
      filter === "lastyear" ||
      (/^\d{4}$/.test(filter))

    return isYearLike ? 5000 : 2000
  }, [])


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
          setRawTransactions(normalizeTransactions(data) as Array<{
            id: number
            date: string
            description: string
            amount: number
            balance: number | null
            category: string
          }>)
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

  useEffect(() => {
    return () => {
      if (preferenceUpdateTimerRef.current) {
        clearTimeout(preferenceUpdateTimerRef.current)
      }
    }, [])

  // Listen for pending uploads from sidebar Upload button
  // IMPORTANT: Must run on mount with empty dependency array [] to ensure it runs after navigation
  useEffect(() => {
    // Only check once to prevent duplicate processing
    if (hasCheckedPendingUploadRef.current) {
      return;
    }
    hasCheckedPendingUploadRef.current = true;

    console.log('[Analytics] Component mounted, checking for pending upload...');

    // Check sessionStorage (survives navigation) and window property (immediate transfers)
    const targetPage = sessionStorage.getItem('pendingUploadTargetPage');
    const pendingFile = (window as any).__pendingUploadFile;

    console.log('[Analytics] Pending upload check:', {
      sessionTargetPage: targetPage,
      windowHasFile: !!pendingFile,
      sessionFileName: sessionStorage.getItem('pendingUploadFileName'),
      currentDialogOpen: isUploadDialogOpen
    });

    if (targetPage === "analytics" && pendingFile) {
      console.log('[Analytics] ✅ Found pending upload, opening dialog for:', pendingFile.name);

      // Clear the storage markers
      sessionStorage.removeItem('pendingUploadFileName');
      sessionStorage.removeItem('pendingUploadFileType');
      sessionStorage.removeItem('pendingUploadFileSize');
      sessionStorage.removeItem('pendingUploadTargetPage');
      delete (window as any).__pendingUploadFile;

      // Open the upload dialog with the pending file
      setUploadFiles([pendingFile]);
      setFileProgresses({ [`${pendingFile.name}::${pendingFile.size}::${pendingFile.lastModified}`]: 0 });
      setProjectName(pendingFile.name.replace(/\.(csv|xlsx|xls)$/i, ''));
      setProjectNameEdited(false);
      setIsUploadDialogOpen(true);

      console.log('[Analytics] Upload dialog state updated successfully');
    } else if (targetPage === "analytics" && !pendingFile) {
      console.warn('[Analytics] ⚠️  Found targetPage in sessionStorage but no file in window - file was lost during navigation');
      // Clean up the orphaned session storage
      sessionStorage.removeItem('pendingUploadFileName');
      sessionStorage.removeItem('pendingUploadFileType');
      sessionStorage.removeItem('pendingUploadFileSize');
      sessionStorage.removeItem('pendingUploadTargetPage');
    } else {
      console.log('[Analytics] No pending upload found (targetPage:', targetPage, ', hasFile:', !!pendingFile, ')');
    }
  }, []) // Empty array = run only once on mount

  // Helper function to strip file extension for project name
  const stripFileExtension = useCallback((filename: string) => {
    const lastDot = filename.lastIndexOf(".")
    return lastDot > 0 ? filename.slice(0, lastDot) : filename
  }, [])

  // Handle upload dialog file changes
  const handleUploadFilesChange = useCallback((nextFiles: File[]) => {
    setUploadFiles(nextFiles)
    setFileProgresses((prev) => {
      const next: Record<string, number> = {}
      nextFiles.forEach((file) => {
        const key = `${file.name}::${file.size}::${file.lastModified}`
        next[key] = prev[key] ?? 0
      })
      return next
    })

    if (!projectNameEdited && nextFiles.length > 0) {
      setProjectName(stripFileExtension(nextFiles[0].name))
    }
  }, [projectNameEdited, stripFileExtension])

  // Handle project name change
  const handleProjectNameChange = useCallback((next: string) => {
    setProjectName(next)
    setProjectNameEdited(true)
  }, [])

  // Handle upload cancel
  const handleUploadCancel = useCallback(() => {
    setIsUploadDialogOpen(false)
    setUploadFiles([])
    setFileProgresses({})
    setUploadError(null)
    setProjectName("")
    setProjectNameEdited(false)
  }, [])

  // Handle upload continue - parse CSV and process
  const handleUploadContinue = useCallback(async () => {
    if (uploadFiles.length === 0) return

    const file = uploadFiles[0]
    setIsUploading(true)
    setUploadError(null)

    try {
      // Read file
      const text = await file.text()

      // Parse CSV
      setParsedCsv(text)
      const rows = parseCsvToRows(text)
      const rowsWithId: ParsedRow[] = rows.map((row, index) => ({
        ...row,
        id: index,
        category: row.category || undefined
      }))
      setParsedRows(rowsWithId)
      setSelectedParsedRowIds(new Set(rowsWithId.map(r => r.id)))

      // Close upload dialog
      handleUploadCancel()

      toast.success("File parsed successfully", {
        description: `Found ${rowsWithId.length} transactions`
      })
    } catch (error) {
      console.error("Error parsing file:", error)
      setUploadError(error instanceof Error ? error.message : "Failed to parse file")
    } finally {
      setIsUploading(false)
    }
  }, [uploadFiles, handleUploadCancel])

  // Handle row selection in review table
  const handleParsedRowSelectChange = useCallback((rowId: number, isSelected: boolean) => {
    setSelectedParsedRowIds((prev) => {
      const next = new Set(prev)
      if (isSelected) {
        next.add(rowId)
      } else {
        next.delete(rowId)
      }
      return next
    })
  }, [])

  // Handle select all rows
  const handleSelectAllParsedRows = useCallback((isSelected: boolean) => {
    if (isSelected) {
      setSelectedParsedRowIds(new Set(parsedRows.map(r => r.id)))
    } else {
      setSelectedParsedRowIds(new Set())
    }
  }, [parsedRows])

  // Handle delete selected rows
  const handleDeleteSelectedRows = useCallback(() => {
    setParsedRows((prev) => prev.filter(row => !selectedParsedRowIds.has(row.id)))
    setSelectedParsedRowIds(new Set())
  }, [selectedParsedRowIds])

  // Handle delete single row
  const handleDeleteRow = useCallback((rowId: number) => {
    setParsedRows((prev) => prev.filter(row => row.id !== rowId))
    setSelectedParsedRowIds((prev) => {
      const next = new Set(prev)
      next.delete(rowId)
      return next
    })
  }, [])

  // Handle confirm import - sends transactions to database
  const handleConfirm = useCallback(async () => {
    if (parsedRows.length === 0) return

    try {
      // Regenerate CSV from edited rows
      const canonical = rowsToCanonicalCsv(parsedRows)

      // Import to database
      const response = await fetch("/api/statements/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csv: canonical,
          source: projectName || "CSV Import"
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to import transactions")
      }

      const result = await response.json()

      toast.success("Import successful", {
        description: `Imported ${result.imported || parsedRows.length} transactions`
      })

      // Clear state and refresh page data
      setParsedRows([])
      setParsedCsv(null)
      setSelectedParsedRowIds(new Set())

      // Refresh transactions
      await fetchTransactions()
    } catch (error) {
      console.error("Import error:", error)
      toast.error("Import failed", {
        description: error instanceof Error ? error.message : "Unknown error"
      })
    }
  }, [parsedRows, projectName, fetchTransactions])

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
      console.warn("[Analytics] Failed to store category preferences", error)
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

    const updatedRow = latestParsedRowsRef.current.find((row) => row.id === rowId)
    if (updatedRow && updatedRow.description.trim() && newCategory.trim()) {
      schedulePreferenceUpdate({ description: updatedRow.description, category: newCategory })
    }

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
  }, [schedulePreferenceUpdate])


  // ===== END OF HANDLERS =====

  // Cleanup timer on unmount

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
    // Handle "All time" filter properly: convert string "null", empty string, or actual null to null
    if (savedFilter && savedFilter !== "null" && savedFilter.trim() !== "") {
      setDateFilter(savedFilter)
    } else {
      setDateFilter(null) // Explicitly set to null for "All time"
    }

    return () => {
      window.removeEventListener("dateFilterChanged", handleFilterChange as EventListener)
    }
  }, [])

  // Load per-category limits for Spending Activity Rings from database based on current filter
  useEffect(() => {
    let cancelled = false

    const loadRingLimits = async () => {
      try {
        // Load from database with current filter
        const url = dateFilter
          ? `/api/budgets?filter=${encodeURIComponent(dateFilter)}`
          : "/api/budgets"
        const res = await fetch(url)
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled && data && typeof data === "object") {
          // Use database budgets as the source of truth for ring limits
          setRingLimits(data as Record<string, number>)
        }
      } catch (error) {
        console.error("[Analytics] Failed to load ring limits:", error)
        // If database fails, start with empty budgets
        if (!cancelled) {
          setRingLimits({})
        }
      }
    }

    loadRingLimits()
    return () => {
      cancelled = true
    }
  }, [dateFilter]) // Reload when filter changes

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

    // Net worth is calculated as income minus expenses
    const netWorth = currentIncome - currentExpenses

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

    // Previous net worth is also calculated as income minus expenses
    const previousNetWorth = previousIncome - previousExpenses

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

  // Calculate trend data for stat cards (daily cumulative values)
  const statsTrends = useMemo(() => {
    if (!rawTransactions || rawTransactions.length === 0) {
      return {
        incomeTrend: [],
        expensesTrend: [],
        netWorthTrend: [],
      }
    }

    // Group transactions by date
    const dateData = new Map<string, { income: number; expenses: number; balance: number | null }>()

    rawTransactions.forEach((tx) => {
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

      // Special handling for dark color palette
      let color: string
      if (colorScheme === "dark") {
        // Use dark palette with specific indices
        const darkPalette = colorPalettes.dark
        // For dark mode theme: use lighter colors for better visibility against dark background
        // User wants to start from #DCDCDC (index 9) and use lighter colors
        // Using only the lightest indices: [9, 10, 8, 7] which gives: #DCDCDC, #F2F2F2, #C6C6C6, #B0B0B0
        // If more rings are needed, cycle through these light colors
        // Note: For dark mode UI, we want light colors, so when resolvedTheme === "dark", use light indices
        const darkModeIndices = [9, 10, 8, 7] // Light colors for dark mode UI (starting from #DCDCDC at index 9)
        const lightModeIndices = [10, 8, 6, 4, 2] // Darker colors for light mode UI
        // When UI is in dark mode (resolvedTheme === "dark"), use light colors (darkModeIndices)
        // When UI is in light mode (resolvedTheme === "light"), use darker colors (lightModeIndices)
        const indices = resolvedTheme === "dark" ? darkModeIndices : lightModeIndices
        const paletteIndex = indices[index % indices.length]
        color = darkPalette[paletteIndex] || "#a1a1aa"

        // Debug: log the color to verify
        // console.log(`Ring ${index}: colorScheme=${colorScheme}, resolvedTheme=${resolvedTheme}, paletteIndex=${paletteIndex}, color=${color}`)
      } else {
        color =
          (Array.isArray(palette) && palette.length > 0
            ? palette[index % palette.length]
            : undefined) || "#a1a1aa"
      }

      const exceeded = ratioToLimit !== null && amount > effectiveLimit
      const pct = ratioToLimit !== null ? (ratioToLimit * 100).toFixed(1) : '0'

      return {
        // Label is used by the ActivityRings tooltip on hover
        label:
          ratioToLimit !== null
            ? `Category: ${category}\nUsed: ${pct}%\nSpent: $${amount.toFixed(2)}\nBudget: $${effectiveLimit.toFixed(2)}${exceeded ? '\nÔÜá Exceeded' : ''}`
            : `Category: ${category}\nSpent: $${amount.toFixed(2)}\nNo budget set`,
        // Store the raw category name separately for our own legend
        // (extra fields are ignored by the library)
        category,
        spent: amount,
        value,
        color,
      }
    })
  }, [rawTransactions, palette, ringCategories, ringLimits, colorScheme, resolvedTheme, dateFilter, getDefaultRingLimit])

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
  }, [rawTransactions, incomeExpenseVisibility.hiddenCategorySet, normalizeCategoryName])

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
        // All time: use year-month format (e.g., "Jan 2024")
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        return `${monthNames[date.getMonth()]} ${date.getFullYear()}`
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
          // For medium periods, use months with year
          const monthNames2 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
          return `${monthNames2[date.getMonth()]} ${date.getFullYear()}`
        default:
          // For specific years or other filters, use months with year
          if (/^\d{4}$/.test(dateFilter)) {
            const monthNames3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            return `${monthNames3[date.getMonth()]} ${date.getFullYear()}`
          }
          const monthNames4 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
          return `${monthNames4[date.getMonth()]} ${date.getFullYear()}`
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

    const top2Categories = sortedCategories.slice(0, 2)

    // Calculate remaining expenses (all categories beyond top 2)
    const shownExpenses = top2Categories.reduce((sum, cat) => sum + cat.amount, 0)
    const remainingExpenses = totalExpenses - shownExpenses

    // Build expense categories array
    const expenseCategories: Array<{ id: string; value: number; label: string }> = []

    // Add top 2 categories (highest spending)
    top2Categories.forEach((cat) => {
      expenseCategories.push({
        id: cat.category.toLowerCase().replace(/\s+/g, "-"),
        value: cat.amount,
        label: cat.category,
      })
    })

    // Add "Others" category (remaining categories, which are less than top 2)
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
  }, [rawTransactions, spendingFunnelVisibility.hiddenCategorySet, normalizeCategoryName])

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

    filteredSource
      .filter((tx) => tx.amount < 0)
      .forEach((tx) => {
        const normalized = normalizeCategoryName(tx.category)
        const tier = classifySpendingTier(normalized)
        const amount = Math.abs(toNumericValue(tx.amount))
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
        // All time: use year-month format (e.g., "Jan 2024")
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        return `${monthNames[date.getMonth()]} ${date.getFullYear()}`
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
          const monthNames2 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
          return `${monthNames2[date.getMonth()]} ${date.getFullYear()}`
        case "lastyear":
          // Monthly grouping for last year
          const monthNames3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
          return `${monthNames3[date.getMonth()]} ${date.getFullYear()}`
        default:
          // For specific years or other filters, use months
          if (/^\d{4}$/.test(dateFilter)) {
            const monthNames4 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            return `${monthNames4[date.getMonth()]} ${date.getFullYear()}`
          }
          const monthNames5 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
          return `${monthNames5[date.getMonth()]} ${date.getFullYear()}`
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

  // Memoized data for charts rendered inside map callback
  // These must be at component level to follow Rules of Hooks
  const transactionHistoryData = useMemo(() => {
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
  }, [rawTransactions])

  const allMonthsCategorySpendingControls = useMemo(() => {
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
  ])

  const incomeExpensesTracking1Data = useMemo(() => {
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
  }, [rawTransactions, incomeExpenseTopVisibility.hiddenCategorySet, normalizeCategoryName])

  const netWorthAllocationData = useMemo(() => {
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
      const delimiterSplit = description.split(/[-ÔÇô|]/)[0] ?? description
      const trimmed = delimiterSplit.trim()
      return trimmed.length > 24 ? `${trimmed.slice(0, 21)}ÔÇª` : (trimmed || "Misc")
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
  }, [rawTransactions, treeMapVisibility.hiddenCategorySet, normalizeCategoryName])

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
        <div className="flex-1 overflow-y-auto p-6 pb-0">
          <div className="max-w-full space-y-6">

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

                {/* Draggable analytics chart section */}
                <DndContext
                  sensors={dndSensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleAnalyticsChartsDragEnd}
                >
                  <SortableContext items={analyticsChartOrder} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @3xl/main:grid-cols-2">
                      {analyticsChartOrder.map((chartId) => {
                        // Determine if chart should be full width (transactionHistory is always full width, or if expanded)
                        const isFullWidth =
                          chartId === "transactionHistory" ||
                          chartId === "netWorthAllocation" ||
                          chartId === "spendingStreamgraph" ||
                          chartId === "incomeExpensesTracking1" ||
                          chartId === "incomeExpensesTracking2" ||
                          chartId === "spendingCategoryRankings" ||
                          expandedCharts[chartId]
                        const colSpanClass = isFullWidth
                          ? "col-span-1 @3xl/main:col-span-2"
                          : "col-span-1"

                        if (chartId === "transactionHistory") {
                          return (
                            <SortableAnalyticsChart
                              key={chartId}
                              id={chartId}
                              className={colSpanClass}
                            >
                              <ChartSwarmPlot
                                data={transactionHistoryData}
                              />
                            </SortableAnalyticsChart>
                          )
                        }

                        if (chartId === "dayOfWeekSpending") {
                          return (
                            <SortableAnalyticsChart
                              key={chartId}
                              id={chartId}
                              className={colSpanClass}
                            >
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
                            </SortableAnalyticsChart>
                          )
                        }

                        if (chartId === "allMonthsCategorySpending") {
                          return (
                            <SortableAnalyticsChart
                              key={chartId}
                              id={chartId}
                              className={colSpanClass}
                            >
                              <ChartAllMonthsCategorySpending
                                data={rawTransactions}
                                categoryControls={allMonthsCategorySpendingControls}
                              />
                            </SortableAnalyticsChart>
                          )
                        }

                        if (chartId === "incomeExpensesTracking1") {
                          return (
                            <SortableAnalyticsChart
                              key={chartId}
                              id={chartId}
                              className={colSpanClass}
                            >
                              <ChartAreaInteractive
                                chartId="incomeExpensesTracking1"
                                categoryControls={incomeExpenseTopControls}
                                data={incomeExpensesTracking1Data}
                              />
                            </SortableAnalyticsChart>
                          )
                        }

                        if (chartId === "incomeExpensesTracking2") {
                          return (
                            <SortableAnalyticsChart
                              key={chartId}
                              id={chartId}
                              className={colSpanClass}
                            >
                              <ChartAreaInteractive
                                chartId="incomeExpensesTracking2"
                                categoryControls={incomeExpenseControls}
                                data={incomeExpenseChart.data}
                              />
                            </SortableAnalyticsChart>
                          )
                        }

                        if (chartId === "spendingCategoryRankings") {
                          return (
                            <SortableAnalyticsChart
                              key={chartId}
                              id={chartId}
                              className={colSpanClass}
                            >
                              <ChartCategoryFlow
                                categoryControls={categoryFlowControls}
                                data={categoryFlowChart.data}
                              />
                            </SortableAnalyticsChart>
                          )
                        }

                        if (chartId === "netWorthAllocation") {
                          return (
                            <SortableAnalyticsChart
                              key={chartId}
                              id={chartId}
                              className={colSpanClass}
                            >
                              <ChartTreeMap
                                categoryControls={treeMapControls}
                                data={netWorthAllocationData}
                              />
                            </SortableAnalyticsChart>
                          )
                        }

                        if (chartId === "moneyFlow") {
                          return (
                            <SortableAnalyticsChart
                              key={chartId}
                              id={chartId}
                              className={colSpanClass}
                            >
                              <ChartSpendingFunnel
                                categoryControls={spendingFunnelControls}
                                data={spendingFunnelChart.data}
                              />
                            </SortableAnalyticsChart>
                          )
                        }

                        if (chartId === "expenseBreakdown") {
                          return (
                            <SortableAnalyticsChart
                              key={chartId}
                              id={chartId}
                              className={colSpanClass}
                            >
                              <ChartExpensesPie
                                categoryControls={expensesPieControls}
                                data={expensesPieData.slices}
                              />
                            </SortableAnalyticsChart>
                          )
                        }

                        if (chartId === "needsWantsBreakdown") {
                          return (
                            <SortableAnalyticsChart
                              key={chartId}
                              id={chartId}
                              className={colSpanClass}
                            >
                              <ChartNeedsWantsPie
                                categoryControls={needsWantsControls}
                                data={needsWantsPieData.slices}
                              />
                            </SortableAnalyticsChart>
                          )
                        }

                        if (chartId === "categoryBubbleMap") {
                          return (
                            <SortableAnalyticsChart
                              key={chartId}
                              id={chartId}
                              className={colSpanClass}
                            >
                              <ChartCategoryBubble
                                data={rawTransactions}
                              />
                            </SortableAnalyticsChart>
                          )
                        }

                        if (chartId === "householdSpendMix") {
                          return (
                            <SortableAnalyticsChart
                              key={chartId}
                              id={chartId}
                              className={colSpanClass}
                            >
                              <ChartPolarBar
                                categoryControls={polarBarControls}
                                data={polarBarData.data}
                                keys={polarBarData.keys}
                              />
                            </SortableAnalyticsChart>
                          )
                        }

                        if (chartId === "financialHealthScore") {
                          return (
                            <SortableAnalyticsChart
                              key={chartId}
                              id={chartId}
                              className={colSpanClass}
                            >
                              <ChartRadar
                              />
                            </SortableAnalyticsChart>
                          )
                        }

                        if (chartId === "spendingActivityRings") {
                          return (
                            <SortableAnalyticsChart
                              key={chartId}
                              id={chartId}
                              className={colSpanClass}
                            >
                              <Card className="relative h-full flex flex-col">
                                <CardHeader>
                                  <div className="space-y-1 pointer-events-auto flex-shrink-0">
                                    <div className="flex items-center gap-2">
                                      <ChartFavoriteButton
                                        chartId="spendingActivityRings"
                                        chartTitle="Spending Activity Rings"
                                      />
                                      <CardTitle className="mb-0">Spending Activity Rings</CardTitle>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 pointer-events-auto flex-shrink-0">
                                    <ChartInfoPopover
                                      title="Spending Activity Rings"
                                      description="Top spending categories from your Neon transactions"
                                      details={[
                                        "Each ring shows how much a category has consumed relative to its budget.",
                                        "Budgets come from your saved limits or a default amount for the selected date filter.",
                                      ]}
                                      className="self-start"
                                    />
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
                                                          ? `${category} ÔÇô ${percent}% of limit (${item.value} of 1.0)`
                                                          : `${category} ÔÇô no limit set`
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
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon-sm"
                                      className="ml-auto"
                                      onClick={() => handleToggleChartExpand("spendingActivityRings")}
                                      aria-label={expandedCharts["spendingActivityRings"] ? "Shrink chart" : "Expand chart"}
                                    >
                                      {expandedCharts["spendingActivityRings"] ? (
                                        <IconMinimize className="h-4 w-4" />
                                      ) : (
                                        <IconMaximize className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                </CardHeader>
                                <CardContent className="min-h-[420px] flex flex-col items-center justify-between flex-1 mt-[15px]">
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
                                          colorScheme={colorScheme}
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
                                </CardContent>
                              </Card>
                            </SortableAnalyticsChart>
                          )
                        }

                        if (chartId === "spendingStreamgraph") {
                          return (
                            <SortableAnalyticsChart
                              key={chartId}
                              id={chartId}
                              className={colSpanClass}
                            >
                              <ChartSpendingStreamgraph
                                categoryControls={streamgraphControls}
                                data={spendingStreamData.data}
                                keys={spendingStreamData.keys}
                              />
                            </SortableAnalyticsChart>
                          )
                        }

                        if (chartId === "singleMonthCategorySpending") {
                          return (
                            <SortableAnalyticsChart
                              key={chartId}
                              id={chartId}
                              className={colSpanClass}
                            >
                              <ChartSingleMonthCategorySpending
                                dateFilter={dateFilter}
                              />
                            </SortableAnalyticsChart>
                          )
                        }

                        if (chartId === "dayOfWeekCategory") {
                          return (
                            <SortableAnalyticsChart
                              key={chartId}
                              id={chartId}
                              className={colSpanClass}
                            >
                              <ChartDayOfWeekCategory
                                dateFilter={dateFilter}
                              />
                            </SortableAnalyticsChart>
                          )
                        }

                        if (chartId === "budgetDistribution") {
                          return (
                            <SortableAnalyticsChart
                              key={chartId}
                              id={chartId}
                              className={colSpanClass}
                            >
                              <ChartCirclePacking
                                categoryControls={circlePackingControls}
                                data={circlePackingData.tree}
                              />
                            </SortableAnalyticsChart>
                          )
                        }

                        if (chartId === "transactionHistory") {
                          return (
                            <SortableAnalyticsChart
                              key={chartId}
                              id={chartId}
                              className={colSpanClass}
                            >
                              <ChartSwarmPlot
                                data={transactionHistoryData}
                              />
                            </SortableAnalyticsChart>
                          )
                        }

                        return null
                      })}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            </div>
          </div>
        </div>

        {/* FileUpload01 Dialog - Initial File Selection */}
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogContent className="sm:max-w-xl">
            <FileUpload01
              files={uploadFiles}
              fileProgresses={fileProgresses}
              isBusy={isUploading}
              error={uploadError}
              projectName={projectName}
              onProjectNameChange={handleProjectNameChange}
              projectLead={null}
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onFilesChange={handleUploadFilesChange}
              onCancel={handleUploadCancel}
              onContinue={handleUploadContinue}
              continueLabel="Parse & Review"
            />
          </DialogContent>
        </Dialog>

        {/* Review Transactions Dialog - After Parsing */}
        {parsedRows.length > 0 && (
          <Dialog open={parsedRows.length > 0} onOpenChange={(open) => {
            if (!open) {
              setParsedRows([])
              setParsedCsv(null)
              setSelectedParsedRowIds(new Set())
            }
          }}>
            <DialogContent className="sm:max-w-[95vw] lg:max-w-[1400px] w-full max-h-[90vh] flex flex-col p-0 gap-0">
              <div className="px-6 pt-6 pb-4 flex-shrink-0">
                <DialogHeader>
                  <DialogTitle className="text-xl">Review Transactions</DialogTitle>
                  <DialogDescription className="text-base">
                    Review and edit {parsedRows.length} parsed transactions before importing to database.
                  </DialogDescription>
                </DialogHeader>
              </div>
              <Separator className="flex-shrink-0" />

              <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1 min-h-0">
                <Card className="border-2 overflow-hidden flex flex-col min-h-0">
                  <CardHeader className="flex-shrink-0 px-4 pt-4 pb-2">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="text-sm">Transactions ({parsedRows.length})</CardTitle>
                        <CardDescription className="text-xs">
                          Select categories and remove unwanted transactions
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleDeleteSelectedRows}
                          disabled={selectedParsedRowIds.size === 0}
                        >
                          Delete selected ({selectedParsedRowIds.size})
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
                          {parsedRows.map((row) => {
                            const amount = typeof row.amount === 'number' ? row.amount : parseFloat(row.amount) || 0
                            const category = row.category || 'Other'

                            return (
                              <MemoizedTableRow
                                key={row.id ?? `${row.date}-${row.description}`}
                                row={row}
                                amount={amount}
                                category={category}
                                isSelected={selectedParsedRowIds.has(row.id)}
                                onSelectChange={(isSelected) => handleParsedRowSelectChange(row.id, isSelected)}
                                onCategoryChange={(value) => handleCategoryChange(row.id, value)}
                                onDelete={() => handleDeleteRow(row.id)}
                              />
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="px-6 py-4 flex-shrink-0">
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setParsedRows([])
                      setParsedCsv(null)
                      setSelectedParsedRowIds(new Set())
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirm}
                    className="gap-2"
                  >
                    <IconUpload className="w-4 h-4" />
                    Import {parsedRows.length} Transactions
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        )}

      </SidebarInset>

    </SidebarProvider >
  )
}



