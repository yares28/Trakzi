"use client";

import { useState, useRef, useEffect, memo, useMemo } from "react";
import ReactDOM from "react-dom";
import {
  CartesianGrid,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip,
  TooltipProps,
  LineChart,
  Line,
} from "recharts";
import { useTheme } from "next-themes";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { ChartLoadingState } from "@/components/chart-loading-state";
import { ChartFavoriteButton } from "@/components/chart-favorite-button";
import { ChartExpandButton } from "@/components/chart-expand-button";
import { ChartFullscreenModal } from "@/components/chart-fullscreen-modal";
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle";
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button";
import { ChartInfoPopover } from "@/components/chart-info-popover";
import {
  ChartCardFloatingMeta,
  ChartCardTopRightControl,
} from "@/components/chart-card-overlay-controls";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useColorScheme } from "@/components/color-scheme-provider";
import { useCurrency } from "@/components/currency-provider";
import { CHART_GRID_COLOR } from "@/lib/chart-colors";
import { type ChartId } from "@/lib/chart-card-sizes.config";
import { formatDateForDisplay } from "@/lib/date";

// Categories treated as "essentials" — deducted before computing discretionary pool
const ESSENTIAL_CATEGORIES = new Set([
  "Groceries",
  "Housing",
  "Utilities",
  "Transport",
  "Medical/Healthcare",
  "Insurance",
  "Taxes",
])

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export type DailyAllowancePoint = {
  day: number
  date: string
  allowance: number | null          // daily mode: actualPool / daysRemaining
  totalAllowance: number | null     // total mode: actualPool / totalDays
  idealAllowance: number
  actualSpend: number
}

type ViewMode = "daily" | "total"

export interface ChartDailySpendAllowanceProps {
  rawTransactions: Array<{
    date: string
    amount: number
    category: string
  }>
  chartId?: ChartId
  isLoading?: boolean
  emptyTitle?: string
  emptyDescription?: string
}

function computeDailyAllowance(
  transactions: ChartDailySpendAllowanceProps["rawTransactions"],
  year: number,
  month: number
): { points: DailyAllowancePoint[]; idealDailyAllowance: number; pool: number; totalIncome: number; totalEssentials: number } {
  const prefix = `${year}-${String(month).padStart(2, "0")}-`
  const totalDays = daysInMonth(year, month)
  const monthTxs = transactions.filter((tx) => tx.date.startsWith(prefix))

  // Ideal = flat reference: (total month income − total month essentials) / days in month
  const totalIncome = monthTxs
    .filter((tx) => tx.amount > 0)
    .reduce((s, tx) => s + tx.amount, 0)
  const totalEssentials = monthTxs
    .filter((tx) => tx.amount < 0 && ESSENTIAL_CATEGORIES.has(tx.category))
    .reduce((s, tx) => s + Math.abs(tx.amount), 0)
  const pool = totalIncome - totalEssentials
  const idealDailyAllowance = totalDays > 0 ? pool / totalDays : 0

  // Actual = day-by-day rolling pool: income/essentials accumulate as they arrive,
  // discretionary spending reduces the pool → allowance[day] = actualPool / daysRemaining
  const incomeByDate: Record<string, number> = {}
  const essentialsByDate: Record<string, number> = {}
  const discretionaryByDate: Record<string, number> = {}
  for (const tx of monthTxs) {
    if (tx.amount > 0) {
      incomeByDate[tx.date] = (incomeByDate[tx.date] ?? 0) + tx.amount
    } else if (ESSENTIAL_CATEGORIES.has(tx.category)) {
      essentialsByDate[tx.date] = (essentialsByDate[tx.date] ?? 0) + Math.abs(tx.amount)
    } else {
      discretionaryByDate[tx.date] = (discretionaryByDate[tx.date] ?? 0) + Math.abs(tx.amount)
    }
  }

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

  let actualPool = 0
  const points: DailyAllowancePoint[] = []

  for (let day = 1; day <= totalDays; day++) {
    const dateStr = `${prefix}${String(day).padStart(2, "0")}`
    const isPastOrToday = dateStr <= todayStr
    const daysRemaining = totalDays - day + 1
    const discretionaryToday = isPastOrToday ? (discretionaryByDate[dateStr] ?? 0) : 0

    actualPool +=
      (incomeByDate[dateStr] ?? 0) -
      (essentialsByDate[dateStr] ?? 0) -
      discretionaryToday

    points.push({
      day,
      date: dateStr,
      allowance: isPastOrToday ? Math.max(0, actualPool / daysRemaining) : null,
      totalAllowance: isPastOrToday ? Math.max(0, actualPool / totalDays) : null,
      idealAllowance: Math.max(0, idealDailyAllowance),
      actualSpend: discretionaryToday,
    })
  }

  return { points, idealDailyAllowance, pool, totalIncome, totalEssentials }
}

const InfoAction = memo(function InfoAction({
  chartId,
  title,
  forFullscreen,
  savingsTarget,
  onSavingsTargetChange,
  targetColor,
}: {
  chartId: ChartId
  title: string
  forFullscreen?: boolean
  savingsTarget: number
  onSavingsTargetChange: (v: number) => void
  targetColor: string
}) {
  const description = "Tracks your daily discretionary spending allowance throughout the month."
  const details = [
    "The Allowance line recalculates each day: pool = (monthly income − essentials) ÷ days remaining.",
    "If you spend less than your allowance, tomorrow's allowance increases. Overspend and it decreases.",
    "The Ideal line is a flat reference: (income − essentials) ÷ days in month.",
    "Essentials deducted: Groceries, Housing, Utilities, Transport, Medical/Healthcare, Insurance, Taxes.",
  ]

  const savingsInput = (
    <div className="rounded-lg border border-border/60 bg-background/70 px-2.5 py-2 space-y-2">
      <div className="space-y-0.5">
        <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
          Savings target line
        </span>
        <p className="text-[0.7rem] text-muted-foreground/80">
          Shows a 3rd line — max daily discretionary spend to hit your savings goal.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="number"
            min={0}
            max={99}
            value={savingsTarget || ""}
            placeholder="e.g. 40"
            onChange={(e) => {
              const v = Math.min(99, Math.max(0, Number(e.target.value)))
              onSavingsTargetChange(v)
            }}
            className="w-full rounded-md border border-border/60 bg-muted px-2 py-1 pr-7 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
        </div>
        {savingsTarget > 0 && (
          <button
            type="button"
            onClick={() => onSavingsTargetChange(0)}
            className="text-[0.65rem] text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>
      {savingsTarget > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full" style={{ backgroundColor: targetColor }} />
          <span className="text-[0.65rem] text-muted-foreground">Save {savingsTarget}% of income</span>
        </div>
      )}
    </div>
  )

  if (forFullscreen) {
    return (
      <div className="flex flex-col items-center gap-2">
        <ChartInfoPopover title={title} description={description} details={details} extraContent={savingsInput} />
        <ChartAiInsightButton chartId={chartId} chartTitle={title} chartDescription={description} chartData={{}} size="sm" />
      </div>
    )
  }
  return (
    <ChartCardFloatingMeta
      insight={<ChartAiInsightButton chartId={chartId} chartTitle={title} chartDescription={description} chartData={{}} size="sm" />}
      info={<ChartInfoPopover title={title} description={description} details={details} extraContent={savingsInput} />}
    />
  )
})
InfoAction.displayName = "InfoAction"

export const ChartDailySpendAllowance = memo(function ChartDailySpendAllowance({
  rawTransactions,
  chartId = "dailySpendAllowance",
  isLoading = false,
  emptyTitle = "No data for this month",
  emptyDescription = "Import transactions to see your daily spend allowance.",
}: ChartDailySpendAllowanceProps) {
  const { getPalette } = useColorScheme()
  const { formatCurrency } = useCurrency()
  const { resolvedTheme } = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const tooltipSizeRef = useRef({ width: 200, height: 90 })
  const mousePositionRef = useRef<{ x: number; y: number } | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [useRealData, setUseRealData] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>("daily")
  const [savingsTarget, setSavingsTarget] = useState(0)
  const [tooltip, setTooltip] = useState<{
    day: number; date: string; allowance: number | null; totalAllowance: number | null; idealAllowance: number; actualSpend: number
  } | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)

  const gridStrokeColor = CHART_GRID_COLOR
  const isDark = resolvedTheme === "dark"

  // Derive available year-months from rawTransactions
  const availableYearMonths = useMemo(() => {
    const set = new Set<string>()
    for (const tx of rawTransactions) {
      const m = tx.date.match(/^(\d{4})-(\d{2})/)
      if (m) set.add(`${m[1]}-${m[2]}`)
    }
    return Array.from(set).sort().reverse()
  }, [rawTransactions])

  const availableYears = useMemo(() => {
    const years = new Set(availableYearMonths.map((ym) => ym.split("-")[0]))
    return Array.from(years).sort().reverse()
  }, [availableYearMonths])

  const now = new Date()
  const defaultYM = availableYearMonths.find((ym) => {
    const [y, m] = ym.split("-")
    return Number(y) === now.getFullYear() && Number(m) === now.getMonth() + 1
  }) ?? availableYearMonths[0] ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

  const [selectedYear, setSelectedYear] = useState<string>(() => defaultYM?.split("-")[0] ?? String(now.getFullYear()))
  const [selectedMonth, setSelectedMonth] = useState<string>(() => defaultYM?.split("-")[1] ?? String(now.getMonth() + 1).padStart(2, "0"))

  // Keep selection valid when transactions change
  useEffect(() => {
    if (defaultYM) {
      const [y, m] = defaultYM.split("-")
      setSelectedYear(y)
      setSelectedMonth(m)
    }
  }, [defaultYM])

  const monthsForYear = useMemo(
    () => availableYearMonths.filter((ym) => ym.startsWith(selectedYear + "-")).map((ym) => ym.split("-")[1]),
    [availableYearMonths, selectedYear]
  )

  const palette = useMemo(() => getPalette(), [getPalette])
  const allowanceColor = palette[palette.length - 2] || palette[0]
  const idealColor = palette[Math.floor(palette.length / 2)] || palette[0]
  const targetColor = palette[1] || palette[0]

  const { points, idealDailyAllowance, pool, totalIncome, totalEssentials } = useMemo(
    () => computeDailyAllowance(rawTransactions, Number(selectedYear), Number(selectedMonth)),
    [rawTransactions, selectedYear, selectedMonth]
  )

  useEffect(() => {
    const raf = requestAnimationFrame(() => setUseRealData(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const onMove = (e: MouseEvent) => { mousePositionRef.current = { x: e.clientX, y: e.clientY } }
    const onLeave = () => { setTooltip(null); setTooltipPosition(null); mousePositionRef.current = null }
    const onScroll = () => { setTooltip(null); setTooltipPosition(null) }
    container.addEventListener("mousemove", onMove)
    container.addEventListener("mouseleave", onLeave)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      container.removeEventListener("mousemove", onMove)
      container.removeEventListener("mouseleave", onLeave)
      window.removeEventListener("scroll", onScroll)
    }
  }, [])

  const totalDays = useMemo(() => daysInMonth(Number(selectedYear), Number(selectedMonth)), [selectedYear, selectedMonth])

  const targetDailyRate = useMemo(() => {
    if (!savingsTarget || savingsTarget <= 0 || totalIncome <= 0 || totalDays <= 0) return null
    const spendable = totalIncome * (1 - savingsTarget / 100) - totalEssentials
    return Math.max(0, spendable / totalDays)
  }, [savingsTarget, totalIncome, totalEssentials, totalDays])

  const chartData = useRealData ? points : []
  const hasData = points.length > 0 && pool > 0
  const title = "Daily Spend Allowance"

  const monthLabel = MONTH_NAMES[Number(selectedMonth) - 1] ?? selectedMonth

  const modeToggle = (
    <div className="flex items-center rounded-full bg-muted p-0.5">
      {(["daily", "total"] as ViewMode[]).map((mode) => (
        <button
          key={mode}
          onClick={() => setViewMode(mode)}
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors capitalize ${
            viewMode === mode
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {mode}
        </button>
      ))}
    </div>
  )

  const selectorControl = (
    <div className="flex items-center gap-1.5">
      <Select value={selectedYear} onValueChange={(v) => {
        setSelectedYear(v)
        // default to first available month for that year
        const firstMonth = availableYearMonths.find((ym) => ym.startsWith(v + "-"))?.split("-")[1]
        if (firstMonth) setSelectedMonth(firstMonth)
      }}>
        <SelectTrigger className="h-7 w-[72px] rounded-full border-0 bg-muted px-2 text-xs font-medium shadow-none focus:ring-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {availableYears.map((y) => (
            <SelectItem key={y} value={y} className="text-xs">{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
        <SelectTrigger className="h-7 w-[100px] rounded-full border-0 bg-muted px-2 text-xs font-medium shadow-none focus:ring-0">
          <SelectValue placeholder="Month" />
        </SelectTrigger>
        <SelectContent align="end">
          {monthsForYear.map((m) => (
            <SelectItem key={m} value={m} className="text-xs">{MONTH_NAMES[Number(m) - 1]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  const activeDataKey = viewMode === "daily" ? "allowance" : "totalAllowance"
  const activeLineName = viewMode === "daily" ? "Allowance" : "Allowance"

  const renderChart = (height?: string) => (
    <ChartContainer config={{}} className={`w-full ${height ?? "h-full"}`}>
      <LineChart data={chartData} margin={{ top: 10, right: 8, bottom: 10 }}>
        <CartesianGrid vertical={false} stroke={gridStrokeColor} strokeDasharray="3 3" opacity={0.3} />
        <XAxis
          dataKey="day"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(v) => String(v)}
          label={{ value: `${monthLabel} ${selectedYear}`, position: "insideBottom", offset: -2, fontSize: 10, fill: isDark ? "#888" : "#aaa" }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={4}
          width={72}
          tickFormatter={(v: number) => formatCurrency(v, { maximumFractionDigits: 0 })}
        />
        <ReferenceLine
          y={idealDailyAllowance}
          stroke={idealColor}
          strokeDasharray="5 3"
          strokeOpacity={0.7}
          strokeWidth={1.5}
          label={{ value: "Ideal", position: "insideTopRight", fontSize: 9, fill: idealColor }}
        />
        {targetDailyRate !== null && (
          <ReferenceLine
            y={targetDailyRate}
            stroke={targetColor}
            strokeDasharray="3 4"
            strokeOpacity={0.8}
            strokeWidth={1.5}
            label={{ value: `Save ${savingsTarget}%`, position: "insideBottomRight", fontSize: 9, fill: targetColor }}
          />
        )}
        <Tooltip
          cursor={false}
          content={(props: TooltipProps<number, string>) => {
            const { active, payload, coordinate } = props
            if (!active || !payload || !payload.length || !coordinate) {
              queueMicrotask(() => { setTooltip(null); setTooltipPosition(null) })
              return null
            }
            const d = payload[0].payload as DailyAllowancePoint
            if (containerRef.current) {
              const rect = containerRef.current.getBoundingClientRect()
              const pos = mousePositionRef.current ?? {
                x: rect.left + (coordinate.x ?? 0),
                y: rect.top + (coordinate.y ?? 0),
              }
              queueMicrotask(() => {
                setTooltipPosition(pos)
                setTooltip({ day: d.day, date: d.date, allowance: d.allowance, totalAllowance: d.totalAllowance, idealAllowance: d.idealAllowance, actualSpend: d.actualSpend })
              })
            }
            return null
          }}
        />
        <Line
          dataKey={activeDataKey}
          name={activeLineName}
          type="monotone"
          stroke={allowanceColor}
          strokeWidth={2}
          dot={false}
          connectNulls={false}
          isAnimationActive
          animationDuration={800}
          animationEasing="ease-out"
        />
      </LineChart>
    </ChartContainer>
  )

  if (isLoading || availableYearMonths.length === 0) {
    return (
      <Card className="@container/card relative gap-[20px]">
        <ChartCardTopRightControl className="hidden md:block">{selectorControl}</ChartCardTopRightControl>
        <CardHeader className="flex flex-row items-start justify-between gap-2 pb-0">
          <div className="flex items-center gap-2 min-w-0">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton chartId={chartId} chartTitle={title} size="md" />
            <CardTitle className="truncate">{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-2 pt-0 sm:px-6">
          <div className="h-[250px] w-full">
            <ChartLoadingState isLoading={isLoading} skeletonType="area" emptyTitle={emptyTitle} emptyDescription={emptyDescription} />
          </div>
        </CardContent>
        <InfoAction chartId={chartId} title={title} savingsTarget={savingsTarget} onSavingsTargetChange={setSavingsTarget} targetColor={targetColor} />
      </Card>
    )
  }

  return (
    <>
      <ChartFullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title={title}
        description={`Daily allowance for ${monthLabel} ${selectedYear}`}
        headerActions={<InfoAction chartId={chartId} title={title} forFullscreen savingsTarget={savingsTarget} onSavingsTargetChange={setSavingsTarget} targetColor={targetColor} />}
      >
        <div className="flex h-full min-h-0 w-full flex-col gap-3">
          <div className="shrink-0 flex items-center gap-2 justify-start">
            {modeToggle}
            {selectorControl}
          </div>
          <div className="flex-1 min-h-[320px]">
            {!hasData ? (
              <ChartLoadingState isLoading={false} skeletonType="area" emptyTitle={emptyTitle} emptyDescription={emptyDescription} />
            ) : renderChart()}
          </div>
        </div>
      </ChartFullscreenModal>

      <Card className="@container/card relative gap-[20px]">
        <ChartCardTopRightControl className="hidden md:flex items-center gap-2">
          {modeToggle}
          {selectorControl}
        </ChartCardTopRightControl>
        <CardHeader className="flex flex-row items-start justify-between gap-2 pb-0">
          <div className="flex items-center gap-2 min-w-0">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton chartId={chartId} chartTitle={title} size="md" />
            <CardTitle className="truncate">{title}</CardTitle>
          </div>
        </CardHeader>
        {/* Mobile selectors */}
        <div className="flex justify-center flex-wrap gap-2 px-4 pb-2 md:hidden">
          {modeToggle}
          {selectorControl}
        </div>
        <CardContent className="px-2 pt-0 sm:px-6 min-w-0 flex flex-col flex-1 min-h-0">
          <div ref={containerRef} className="relative flex-1 min-h-[180px]">
            {!hasData ? (
              <div className="flex h-full min-h-[180px] w-full items-center justify-center">
                <ChartLoadingState isLoading={false} skeletonType="area" emptyTitle={emptyTitle} emptyDescription={emptyDescription} />
              </div>
            ) : (
              <div className="h-full">{renderChart()}</div>
            )}
            {tooltip && tooltipPosition && typeof document !== "undefined" &&
              ReactDOM.createPortal(
                <div
                  ref={(el) => {
                    tooltipRef.current = el
                    if (el) tooltipSizeRef.current = { width: el.offsetWidth, height: el.offsetHeight }
                  }}
                  className="pointer-events-none fixed z-[9999] rounded-md border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg"
                  style={(() => {
                    const { x: cx, y: cy } = tooltipPosition
                    const { width: tw, height: th } = tooltipSizeRef.current
                    const gap = 16
                    const vw = typeof window !== "undefined" ? window.innerWidth : 9999
                    const xRight = cx + gap
                    const left = xRight + tw > vw ? cx - tw - gap : xRight
                    const yAbove = cy - gap - th
                    const top = yAbove < 0 ? cy + gap : yAbove
                    return { left, top }
                  })()}
                >
                  <div className="font-medium text-foreground mb-2 whitespace-nowrap">
                    {formatDateForDisplay(tooltip.date, "en-US", { month: "short", day: "numeric" })}
                  </div>
                  {(() => {
                    const val = viewMode === "daily" ? tooltip.allowance : tooltip.totalAllowance
                    return val !== null ? (
                      <div className="flex items-center gap-2 mb-1">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: allowanceColor }} />
                        <span className="text-foreground/80">Allowance:</span>
                        <span className="font-mono text-[0.7rem] text-foreground font-medium">{formatCurrency(val)}</span>
                      </div>
                    ) : null
                  })()}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0 border border-dashed" style={{ borderColor: idealColor }} />
                    <span className="text-foreground/80">Ideal:</span>
                    <span className="font-mono text-[0.7rem] text-foreground font-medium">{formatCurrency(tooltip.idealAllowance)}</span>
                  </div>
                  {targetDailyRate !== null && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0 border border-dashed" style={{ borderColor: targetColor }} />
                      <span className="text-foreground/80">Save {savingsTarget}%:</span>
                      <span className="font-mono text-[0.7rem] text-foreground font-medium">{formatCurrency(targetDailyRate)}</span>
                    </div>
                  )}
                  {tooltip.actualSpend > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0 bg-muted-foreground/40" />
                      <span className="text-foreground/80">Spent:</span>
                      <span className="font-mono text-[0.7rem] text-foreground font-medium">{formatCurrency(tooltip.actualSpend)}</span>
                    </div>
                  )}
                </div>,
                document.body
              )}
          </div>
        </CardContent>
        <InfoAction chartId={chartId} title={title} savingsTarget={savingsTarget} onSavingsTargetChange={setSavingsTarget} targetColor={targetColor} />
      </Card>
    </>
  )
})

ChartDailySpendAllowance.displayName = "ChartDailySpendAllowance"
