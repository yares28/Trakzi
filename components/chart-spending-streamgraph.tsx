"use client"

import { useMemo, useRef, useState, useEffect, memo, useLayoutEffect, type RefObject } from "react"
import type { PointerEvent } from "react"
import { createPortal } from "react-dom"
import { scaleLinear, scalePoint } from "d3-scale"
import { stack, stackOffsetWiggle, stackOrderInsideOut, area, curveCatmullRom } from "d3-shape"
import { ticks } from "d3-array"
import { useTheme } from "next-themes"
import { ChartInfoPopover, ChartInfoPopoverCategoryControls } from "@/components/chart-info-popover"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import { toNumericValue } from "@/lib/utils"
import { DEFAULT_FALLBACK_PALETTE, getChartAxisLineColor, getChartTextColor } from "@/lib/chart-colors"
import { ChartLoadingState } from "@/components/chart-loading-state"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"
import { ChartExpandButton } from "@/components/chart-expand-button"
import { ChartFullscreenModal } from "@/components/chart-fullscreen-modal"
import { useIsMobile } from "@/hooks/use-mobile"

type ChartSpendingStreamgraphDatum = {
  month: string
  [key: string]: number | string
}

interface ChartSpendingStreamgraphProps {
  data?: Array<Record<string, string | number>>
  keys?: string[]
  categoryControls?: ChartInfoPopoverCategoryControls
  isLoading?: boolean
  emptyTitle?: string
  emptyDescription?: string
}

const FALLBACK_COLORS = DEFAULT_FALLBACK_PALETTE

const axisFormatter = new Intl.NumberFormat(undefined, {
  notation: "compact",
  maximumFractionDigits: 1,
})

/** Match Category Rankings / Nivo-style month ticks (Jan'25, weekly Mar 2). */
function formatStreamPeriodLabel(periodKey: string): string {
  if (periodKey.endsWith("\u200B")) return ""
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

  const yyyyMmDd = periodKey.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (yyyyMmDd) {
    const monthIndex = parseInt(yyyyMmDd[2], 10) - 1
    const day = parseInt(yyyyMmDd[3], 10)
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${monthNames[monthIndex]} ${day}`
    }
  }

  const yyyyMm = periodKey.match(/^(\d{4})-(\d{1,2})$/)
  if (yyyyMm) {
    const year = yyyyMm[1].slice(-2)
    const monthIndex = parseInt(yyyyMm[2], 10) - 1
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${monthNames[monthIndex]}'${year}`
    }
  }

  return periodKey
}

function useObservedChartSize(active: boolean) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [dims, setDims] = useState({ w: 400, h: 260 })

  useLayoutEffect(() => {
    if (!active) return
    const el = ref.current
    if (!el) return

    const measure = () => {
      const cr = el.getBoundingClientRect()
      const w = Math.floor(cr.width)
      const h = Math.floor(cr.height)
      setDims((d) => {
        const nw = Math.max(260, w)
        const nh = Math.max(180, h)
        return d.w === nw && d.h === nh ? d : { w: nw, h: nh }
      })
    }

    measure()
    const ro = new ResizeObserver(() => measure())
    ro.observe(el)
    return () => ro.disconnect()
  }, [active])

  return { ref, w: dims.w, h: dims.h }
}

type StreamGeometry = {
  width: number
  height: number
  margin: { top: number; right: number; bottom: number; left: number }
  months: string[]
  yTicks: number[]
  zeroLine: number
  layers: { key: string; path: string | null }[]
  xScale: ReturnType<typeof scalePoint<string>>
  yScale: ReturnType<typeof scaleLinear<number, number>>
  xTickIndices: number[]
  xLabelRotation: number
  compact: boolean
}

function computeStreamgraphGeometry(
  rows: ChartSpendingStreamgraphDatum[],
  activeKeys: string[],
  numericRows: Record<string, number>[],
  width: number,
  height: number,
  isMobile: boolean,
): StreamGeometry | null {
  if (!rows.length || !activeKeys.length) return null

  const months = rows.map((row) => row.month)
  const compact = isMobile || width < 520
  const n = months.length
  const rotateX = compact && n > 4
  const margin = {
    top: compact ? 20 : 24,
    right: compact ? 10 : 18,
    bottom: rotateX ? (compact ? 56 : 52) : compact ? 36 : 44,
    left: compact ? 40 : 58,
  }

  const innerW = Math.max(120, width - margin.left - margin.right)
  const maxTicks = compact ? 5 : 9
  const stride = Math.max(1, Math.ceil(n / maxTicks))
  const tickIndexSet = new Set<number>()
  for (let i = 0; i < n; i += stride) tickIndexSet.add(i)
  tickIndexSet.add(0)
  if (n > 1) tickIndexSet.add(n - 1)
  const xTickIndices = [...tickIndexSet].sort((a, b) => a - b)

  const pointPadding = n <= 2 ? 0.12 : n <= 4 ? 0.28 : n <= 8 ? 0.42 : n <= 14 ? 0.52 : 0.58

  const xScale = scalePoint<string>()
    .domain(months)
    .range([margin.left, margin.left + innerW])
    .padding(pointPadding)

  const stackGenerator = stack<Record<string, number>>()
    .keys(activeKeys)
    .order(stackOrderInsideOut)
    .offset(stackOffsetWiggle)

  const stackedSeries = stackGenerator(numericRows)

  let minY = 0
  let maxY = 0
  stackedSeries.forEach((layer) => {
    layer.forEach((point) => {
      if (point[0] < minY) minY = point[0]
      if (point[1] > maxY) maxY = point[1]
    })
  })

  if (minY === maxY) {
    maxY = minY + 1
  }

  const yScale = scaleLinear()
    .domain([minY, maxY])
    .nice()
    .range([height - margin.bottom, margin.top])

  const areaGenerator = area<[number, number]>()
    .x((_, index) => xScale(months[index]) ?? margin.left)
    .y0((d) => yScale(d[0]))
    .y1((d) => yScale(d[1]))
    .curve(curveCatmullRom.alpha(0.55))

  const layers = stackedSeries.map((layer) => ({
    key: layer.key,
    path: areaGenerator(layer as unknown as [number, number][]),
  }))

  const yTicks = ticks(yScale.domain()[0], yScale.domain()[1], compact ? 4 : 5)
  const zeroLine = yScale(0)

  return {
    width,
    height,
    margin,
    months,
    yTicks,
    zeroLine,
    layers,
    xScale,
    yScale,
    xTickIndices,
    xLabelRotation: rotateX ? -42 : 0,
    compact,
  }
}

export const ChartSpendingStreamgraph = memo(function ChartSpendingStreamgraph({
  data = [],
  keys = [],
  categoryControls,
  isLoading = false,
  emptyTitle,
  emptyDescription
}: ChartSpendingStreamgraphProps) {
  const { getShuffledPalette } = useColorScheme()
  const { formatCurrency } = useCurrency()
  const { resolvedTheme } = useTheme()
  const isMobile = useIsMobile()
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<{ label: string; total: number; color: string } | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [mounted, setMounted] = useState(false)

  const mainSize = useObservedChartSize(true)
  const fsSize = useObservedChartSize(isFullscreen)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = resolvedTheme === "dark"
  const textColor = getChartTextColor(isDark)
  const axisLineColor = getChartAxisLineColor(isDark)

  const { rows, detectedKeys } = useMemo(() => {
    if (!data?.length) return { rows: [] as ChartSpendingStreamgraphDatum[], detectedKeys: [] as string[] }

    const discovered = new Set<string>()
    const normalizedRows = data
      .map((row) => {
        const entry: ChartSpendingStreamgraphDatum = { month: String(row.month ?? "") }
        Object.entries(row).forEach(([key, value]) => {
          if (key === "month") return
          const numericValue = Math.max(0, toNumericValue(value))
          if (!Number.isFinite(numericValue)) return
          entry[key] = numericValue
          discovered.add(key)
        })
        return entry
      })
      .filter((row) => row.month.trim().length > 0)

    return { rows: normalizedRows, detectedKeys: Array.from(discovered) }
  }, [data])

  const seriesKeys = useMemo(() => {
    if (keys.length > 0) return keys
    return detectedKeys
  }, [keys, detectedKeys])

  const activeKeys = useMemo(() => {
    if (!rows.length) return []
    return seriesKeys.filter((key) => rows.some((row) => Number(row[key]) > 0))
  }, [rows, seriesKeys])

  const colorAssignments = useMemo(() => {
    const palette = getShuffledPalette()
    const colors = palette.length ? palette : FALLBACK_COLORS
    return activeKeys.reduce<Record<string, string>>((acc, key, index) => {
      acc[key] = colors[index % colors.length] || FALLBACK_COLORS[index % FALLBACK_COLORS.length]
      return acc
    }, {})
  }, [activeKeys, getShuffledPalette])

  const numericRows = useMemo(() => {
    return rows.map((row) => {
      const numericRow: Record<string, number> = {}
      activeKeys.forEach((key) => {
        const raw = row[key]
        numericRow[key] = typeof raw === "number" ? raw : 0
      })
      return numericRow
    })
  }, [rows, activeKeys])

  const mainGeometry = useMemo(
    () => computeStreamgraphGeometry(rows, activeKeys, numericRows, mainSize.w, mainSize.h, isMobile),
    [rows, activeKeys, numericRows, mainSize.w, mainSize.h, isMobile],
  )

  const fsGeometry = useMemo(
    () => computeStreamgraphGeometry(rows, activeKeys, numericRows, fsSize.w, fsSize.h, isMobile),
    [rows, activeKeys, numericRows, fsSize.w, fsSize.h, isMobile],
  )

  const totalsByKey = useMemo(() => {
    return activeKeys.reduce<Record<string, number>>((acc, key) => {
      acc[key] = rows.reduce((sum, row) => sum + (typeof row[key] === "number" ? (row[key] as number) : 0), 0)
      return acc
    }, {})
  }, [activeKeys, rows])

  const handleLayerPointerMove = (event: PointerEvent<SVGPathElement>, key: string) => {
    setTooltipPosition({
      x: event.clientX,
      y: event.clientY,
    })
    setTooltip({
      label: key.replace(/•/g, "·"),
      total: totalsByKey[key] ?? 0,
      color: colorAssignments[key] ?? FALLBACK_COLORS[0],
    })
  }

  const handleLayerPointerLeave = () => {
    setTooltip(null)
    setTooltipPosition(null)
  }

  const renderInfoTrigger = (forFullscreen = false) => (
    <div className={`flex items-center gap-2 ${forFullscreen ? '' : 'hidden md:flex flex-col'}`}>
      <ChartInfoPopover
        title="Category Streamgraph"
        description="Stacked monthly expenses inspired by D3 streamgraphs"
        details={[
          "Each ribbon represents a spending category. The thicker the ribbon, the more you spent during that month.",
          "We remove inflows and transfer categories so the stream stays focused on actual spending."
        ]}
        ignoredFootnote="Only negative (expense) transactions are streamed. Inflows are excluded from this chart."
        categoryControls={categoryControls}
      />
      <ChartAiInsightButton
        chartId="spendingStreamgraph"
        chartTitle="Category Streamgraph"
        chartDescription="Stacked monthly expenses inspired by D3 streamgraphs"
        size="sm"
      />
    </div>
  )

  const renderPlot = (geometry: StreamGeometry | null, sizeRef: RefObject<HTMLDivElement | null>) => {
    if (!geometry || !rows.length || !activeKeys.length) {
      return (
        <div ref={sizeRef} className="flex h-full min-h-[200px] w-full flex-1 items-stretch">
          <ChartLoadingState
            isLoading={isLoading}
            skeletonType="area"
            emptyTitle={emptyTitle}
            emptyDescription={emptyDescription}
          />
        </div>
      )
    }

    const { width, height, margin, months, yTicks, zeroLine, layers, xScale, yScale, xTickIndices, xLabelRotation, compact } =
      geometry
    const tickFontSize = compact ? 10 : 11
    const labelFontFamily =
      'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"'

    return (
      <div ref={sizeRef} className="relative flex h-full min-h-[200px] w-full flex-1 flex-col gap-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Monthly spending streamgraph"
          className="h-full w-full min-h-0 flex-1 [font-feature-settings:'tnum']"
        >
          <g>
            {yTicks.map((tickValue) => {
              const y = yScale(tickValue)
              return (
                <g key={`y-${tickValue}`}>
                  <line
                    x1={margin.left}
                    x2={width - margin.right}
                    y1={y}
                    y2={y}
                    stroke={axisLineColor}
                    strokeDasharray="3 3"
                    strokeOpacity={0.55}
                  />
                  <text
                    x={margin.left - 8}
                    y={y + 4}
                    textAnchor="end"
                    fill={textColor}
                    fontSize={tickFontSize}
                    fontFamily={labelFontFamily}
                  >
                    {axisFormatter.format(tickValue)}
                  </text>
                </g>
              )
            })}
          </g>

          {zeroLine >= margin.top && zeroLine <= height - margin.bottom && (
            <line
              x1={margin.left}
              x2={width - margin.right}
              y1={zeroLine}
              y2={zeroLine}
              stroke={axisLineColor}
              strokeWidth={1}
              strokeOpacity={0.65}
            />
          )}

          <g className={isDark ? "" : "mix-blend-multiply"}>
            {layers.map((layer) => (
              <path
                key={layer.key}
                d={layer.path ?? ""}
                fill={colorAssignments[layer.key] ?? FALLBACK_COLORS[0]}
                fillOpacity={isDark ? 0.8 : 0.9}
                stroke={isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)"}
                strokeWidth={0.5}
                onPointerMove={(event) => handleLayerPointerMove(event, layer.key)}
                onPointerLeave={handleLayerPointerLeave}
                style={{ cursor: "pointer" }}
              />
            ))}
          </g>

          <g transform={`translate(0, ${height - margin.bottom})`}>
            <line
              x1={margin.left}
              x2={width - margin.right}
              y1={0}
              y2={0}
              stroke={axisLineColor}
              strokeWidth={1}
              strokeOpacity={0.85}
            />
            {xTickIndices.map((i) => {
              const month = months[i]
              if (!month) return null
              const x = xScale(month) ?? margin.left
              const label = formatStreamPeriodLabel(month)
              if (!label) return null
              return (
                <g key={`${month}-${i}`} transform={`translate(${x}, 0)`}>
                  <line y2={5} stroke={axisLineColor} strokeWidth={1} strokeOpacity={0.85} />
                  <text
                    y={xLabelRotation ? 8 : 14}
                    textAnchor={xLabelRotation ? "end" : "middle"}
                    fill={textColor}
                    fontSize={tickFontSize}
                    fontFamily={labelFontFamily}
                    transform={xLabelRotation ? `rotate(${xLabelRotation})` : undefined}
                  >
                    {label}
                  </text>
                </g>
              )
            })}
          </g>
        </svg>

        {activeKeys.length > 0 && (
          <div className="flex max-h-24 flex-wrap items-center justify-center gap-x-3 gap-y-1 overflow-y-auto px-1 text-[10px] text-muted-foreground sm:max-h-none sm:text-xs">
            {activeKeys.map((key) => (
              <div key={key} className="flex min-w-0 max-w-[140px] items-center gap-1.5 sm:max-w-none">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: colorAssignments[key] ?? FALLBACK_COLORS[0] }}
                />
                <span className="truncate font-medium text-foreground">{key}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (!mainGeometry || !rows.length || !activeKeys.length) {
    return (
      <Card className="@container/card col-span-full">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton
              chartId="spendingStreamgraph"
              chartTitle="Category Streamgraph"
              size="md"
            />
            <CardTitle>Category Streamgraph</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="flex min-h-[220px] flex-col px-2 pt-4 sm:min-h-[260px] sm:px-6 sm:pt-6 md:min-h-[280px]">
          {renderPlot(null, mainSize.ref)}
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <ChartFullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title="Category Streamgraph"
        description="Stacked monthly expenses inspired by D3 streamgraphs"
        headerActions={renderInfoTrigger(true)}
        orientation="portrait"
      >
        {fsGeometry && rows.length > 0 && activeKeys.length > 0 ? (
          renderPlot(fsGeometry, fsSize.ref)
        ) : (
          <div ref={fsSize.ref} className="flex h-full min-h-[280px] w-full items-center justify-center text-muted-foreground text-sm">
            Loading chart…
          </div>
        )}
      </ChartFullscreenModal>

      <Card className="col-span-full">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton
              chartId="spendingStreamgraph"
              chartTitle="Category Streamgraph"
              size="md"
            />
            <CardTitle>Category Streamgraph</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="flex min-h-[220px] flex-col px-2 pt-4 sm:min-h-[260px] sm:px-6 sm:pt-6 md:min-h-[280px]">
          {!isFullscreen ? renderPlot(mainGeometry, mainSize.ref) : (
            <div className="flex min-h-[200px] items-center justify-center text-center text-muted-foreground text-sm">
              Chart open in fullscreen
            </div>
          )}
        </CardContent>
      </Card>

      {mounted && tooltip && tooltipPosition && createPortal(
        <div
          ref={tooltipRef}
          className="pointer-events-none fixed z-[9999] rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl select-none"
          style={{
            left: tooltipPosition.x + 12 + 200 > window.innerWidth
              ? tooltipPosition.x - 12 - 200
              : tooltipPosition.x + 12,
            top: tooltipPosition.y - 60 < 0
              ? tooltipPosition.y + 12
              : tooltipPosition.y - 60,
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full border border-border/50"
              style={{ backgroundColor: tooltip.color, borderColor: tooltip.color }}
            />
            <span className="font-medium text-foreground whitespace-nowrap">{tooltip.label}</span>
          </div>
          <div className="mt-1 font-mono text-[0.7rem] text-foreground/80">
            {formatCurrency(tooltip.total)}
          </div>
        </div>,
        document.body
      )}
    </>
  )
})

ChartSpendingStreamgraph.displayName = "ChartSpendingStreamgraph"
