"use client";

import { useState, useRef, useEffect, memo, useMemo, useCallback } from "react";
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
  allowance: number | null
  idealAllowance: number
  actualSpend: number
}

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
): { points: DailyAllowancePoint[]; initialDailyAllowance: number; pool: number } {
  const prefix = `${year}-${String(month).padStart(2, "0")}-`
  const monthTxs = transactions.filter((tx) => tx.date.startsWith(prefix))

  // Income: positive amounts
  const totalIncome = monthTxs
    .filter((tx) => tx.amount > 0)
    .reduce((sum, tx) => sum + tx.amount, 0)

  // Essentials: negative amounts in essential categories
  const totalEssentials = monthTxs
    .filter((tx) => tx.amount < 0 && ESSENTIAL_CATEGORIES.has(tx.category))
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0)

  const pool = totalIncome - totalEssentials
  const totalDays = daysInMonth(year, month)
  const idealDailyAllowance = totalDays > 0 ? pool / totalDays : 0

  // Group spendable expenses (non-essential, non-income) by date
  const spendByDate: Record<string, number> = {}
  for (const tx of monthTxs) {
    if (tx.amount < 0 && !ESSENTIAL_CATEGORIES.has(tx.category)) {
      spendByDate[tx.date] = (spendByDate[tx.date] ?? 0) + Math.abs(tx.amount)
    }
  }

  // Determine today's date for cutting off the allowance line at the present
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

  let remainingPool = pool
  const points: DailyAllowancePoint[] = []

  for (let day = 1; day <= totalDays; day++) {
    const dateStr = `${prefix}${String(day).padStart(2, "0")}`
    const daysRemaining = totalDays - day + 1
    const allowanceToday = remainingPool > 0 && daysRemaining > 0
      ? remainingPool / daysRemaining
      : 0

    const actualSpend = spendByDate[dateStr] ?? 0
    const isPastOrToday = dateStr <= todayStr

    points.push({
      day,
      date: dateStr,
      allowance: isPastOrToday ? Math.max(0, allowanceToday) : null,
      idealAllowance: Math.max(0, idealDailyAllowance),
      actualSpend,
    })

    if (isPastOrToday) {
      remainingPool -= actualSpend
    }
  }

  return { points, initialDailyAllowance: idealDailyAllowance, pool }
}

const InfoAction = memo(function InfoAction({ chartId, title, forFullscreen }: { chartId: ChartId; title: string; forFullscreen?: boolean }) {
  const description = "Tracks your daily discretionary spending allowance throughout the month."
  const details = [
    "The Allowance line recalculates each day: pool = (monthly income − essentials) ÷ days remaining.",
    "If you spend less than your allowance, tomorrow's allowance increases. Overspend and it decreases.",
    "The Ideal line is a flat reference: (income − essentials) ÷ days in month.",
    "Essentials deducted: Groceries, Housing, Utilities, Transport, Medical/Healthcare, Insurance, Taxes.",
  ]

  if (forFullscreen) {
    return (
      <div className="flex flex-col items-center gap-2">
        <ChartInfoPopover title={title} description={description} details={details} />
        <ChartAiInsightButton chartId={chartId} chartTitle={title} chartDescription={description} chartData={{}} size="sm" />
      </div>
    )
  }
  return (
    <ChartCardFloatingMeta
      insight={<ChartAiInsightButton chartId={chartId} chartTitle={title} chartDescription={description} chartData={{}} size="sm" />}
      info={<ChartInfoPopover title={title} description={description} details={details} />}
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
  const [tooltip, setTooltip] = useState<{
    day: number; date: string; allowance: number | null; idealAllowance: number; actualSpend: number
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

  const { points, initialDailyAllowance, pool } = useMemo(
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

  const chartData = useRealData ? points : []
  const hasData = points.length > 0 && pool > 0
  const title = "Daily Spend Allowance"

  const monthLabel = MONTH_NAMES[Number(selectedMonth) - 1] ?? selectedMonth

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
        {/* Ideal flat reference */}
        <ReferenceLine
          y={initialDailyAllowance}
          stroke={idealColor}
          strokeDasharray="5 3"
          strokeOpacity={0.7}
          strokeWidth={1.5}
          label={{ value: "Ideal", position: "insideTopRight", fontSize: 9, fill: idealColor }}
        />
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
                setTooltip({ day: d.day, date: d.date, allowance: d.allowance, idealAllowance: d.idealAllowance, actualSpend: d.actualSpend })
              })
            }
            return null
          }}
        />
        {/* Rolling daily allowance line */}
        <Line
          dataKey="allowance"
          name="Allowance"
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
        <InfoAction chartId={chartId} title={title} />
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
        headerActions={<InfoAction chartId={chartId} title={title} forFullscreen />}
      >
        <div className="flex h-full min-h-0 w-full flex-col gap-3">
          <div className="shrink-0 flex justify-start">{selectorControl}</div>
          <div className="flex-1 min-h-[320px]">
            {!hasData ? (
              <ChartLoadingState isLoading={false} skeletonType="area" emptyTitle={emptyTitle} emptyDescription={emptyDescription} />
            ) : renderChart()}
          </div>
        </div>
      </ChartFullscreenModal>

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
        {/* Mobile selectors */}
        <div className="flex justify-center gap-2 px-4 pb-2 md:hidden">{selectorControl}</div>
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
                  {tooltip.allowance !== null && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: allowanceColor }} />
                      <span className="text-foreground/80">Allowance:</span>
                      <span className="font-mono text-[0.7rem] text-foreground font-medium">{formatCurrency(tooltip.allowance)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0 border border-dashed" style={{ borderColor: idealColor }} />
                    <span className="text-foreground/80">Ideal:</span>
                    <span className="font-mono text-[0.7rem] text-foreground font-medium">{formatCurrency(tooltip.idealAllowance)}</span>
                  </div>
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
        <InfoAction chartId={chartId} title={title} />
      </Card>
    </>
  )
})

ChartDailySpendAllowance.displayName = "ChartDailySpendAllowance"
