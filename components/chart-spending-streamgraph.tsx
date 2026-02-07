"use client"

import { useMemo, useRef, useState, useEffect, memo } from "react"
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
import { DEFAULT_FALLBACK_PALETTE } from "@/lib/chart-colors"
import { ChartLoadingState } from "@/components/chart-loading-state"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"
import { ChartExpandButton } from "@/components/chart-expand-button"
import { ChartFullscreenModal } from "@/components/chart-fullscreen-modal"

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
const DIMENSIONS = { width: 928, height: 420, margin: { top: 32, right: 24, bottom: 64, left: 72 } }

const axisFormatter = new Intl.NumberFormat(undefined, {
  notation: "compact",
  maximumFractionDigits: 1,
})



const monthFormatter = (monthKey: string) => {
  const [year, month] = monthKey.split("-")
  const parsedYear = Number(year)
  const parsedMonth = Number(month)

  if (!Number.isFinite(parsedYear) || !Number.isFinite(parsedMonth)) {
    return monthKey
  }

  const normalizedMonth = String(parsedMonth).padStart(2, "0")
  return `${parsedYear}-${normalizedMonth}`
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
  const svgRef = useRef<SVGSVGElement | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<{ label: string; total: number; color: string } | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = resolvedTheme === "dark"

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

  // getShuffledPalette() filters, trims by theme, and shuffles for visual variety
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

  const chartGeometry = useMemo(() => {
    if (!rows.length || !activeKeys.length) return null

    const { width, height, margin } = DIMENSIONS
    const months = rows.map((row) => row.month)
    const xScale = scalePoint<string>()
      .domain(months)
      .range([margin.left, width - margin.right])
      .padding(0.6)

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

    const yTicks = ticks(yScale.domain()[0], yScale.domain()[1], 5)
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
    }
  }, [rows, activeKeys, numericRows])

  const totalsByKey = useMemo(() => {
    return activeKeys.reduce<Record<string, number>>((acc, key) => {
      acc[key] = rows.reduce((sum, row) => sum + (typeof row[key] === "number" ? (row[key] as number) : 0), 0)
      return acc
    }, {})
  }, [activeKeys, rows])

  const handleLayerPointerMove = (event: PointerEvent<SVGPathElement>, key: string) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return

    // Store viewport coordinates for portal-based tooltip
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

  if (!chartGeometry || !rows.length || !activeKeys.length) {
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
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[180px] md:h-[250px]">
          <ChartLoadingState
            isLoading={isLoading}
            skeletonType="area"
            emptyTitle={emptyTitle}
            emptyDescription={emptyDescription}
          />
        </CardContent>
      </Card>
    )
  }

  const { width, height, margin, months, yTicks, zeroLine, layers, xScale, yScale } = chartGeometry

  return (
    <>
      <ChartFullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title="Category Streamgraph"
        description="Stacked monthly expenses inspired by D3 streamgraphs"
        headerActions={renderInfoTrigger(true)}
      >
        <div className="h-full w-full min-h-[400px] text-center flex items-center justify-center text-muted-foreground">
          Fullscreen streamgraph view - Please expand card on desktop for better viewing
        </div>
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
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[180px] md:h-[250px]">
          <div className="relative flex h-full flex-col gap-4">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${width} ${height}`}
              role="img"
              aria-label="Monthly spending streamgraph"
              className="h-full w-full text-muted-foreground/70 [font-feature-settings:'tnum']"
            >
              {/* Horizontal grid */}
              <g className="text-xs">
                {yTicks.map((tickValue) => {
                  const y = yScale(tickValue)
                  return (
                    <g key={`y-${tickValue}`}>
                      <line
                        x1={margin.left}
                        x2={width - margin.right}
                        y1={y}
                        y2={y}
                        stroke="currentColor"
                        strokeDasharray="3 3"
                        strokeOpacity={0.3}
                      />
                      <text
                        x={margin.left - 12}
                        y={y + 4}
                        textAnchor="end"
                        fill="currentColor"
                        fontSize={11}
                      >
                        {axisFormatter.format(tickValue)}
                      </text>
                    </g>
                  )
                })}
              </g>

              {/* Baseline */}
              {zeroLine >= margin.top && zeroLine <= height - margin.bottom && (
                <line
                  x1={margin.left}
                  x2={width - margin.right}
                  y1={zeroLine}
                  y2={zeroLine}
                  stroke="currentColor"
                  strokeWidth={1}
                  strokeOpacity={0.4}
                />
              )}

              {/* Layers */}
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

              {/* X axis */}
              <g className="text-xs" transform={`translate(0, ${height - margin.bottom})`}>
                <line
                  x1={margin.left}
                  x2={width - margin.right}
                  y1={0}
                  y2={0}
                  stroke="currentColor"
                  strokeOpacity={0.35}
                />
                {months
                  .filter((_, index) => index % 2 === 0)  // Show every other month to prevent overlap
                  .map((month) => {
                    const x = xScale(month) ?? margin.left
                    return (
                      <g key={month} transform={`translate(${x}, 0)`}>
                        <line y2={6} stroke="currentColor" strokeWidth={0.75} />
                        <text
                          y={18}
                          textAnchor="middle"
                          fill="currentColor"
                          fontSize={11}
                          className="uppercase tracking-wide"
                        >
                          {monthFormatter(month)}
                        </text>
                      </g>
                    )
                  })}
              </g>
            </svg>

            {/* Tooltip rendered via portal for proper viewport boundary handling */}
            {mounted && tooltip && tooltipPosition && createPortal(
              <div
                ref={tooltipRef}
                className="pointer-events-none fixed z-[9999] rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl select-none"
                style={{
                  // Smart positioning: flip when near edges
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

            {activeKeys.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
                {activeKeys.map((key) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: colorAssignments[key] ?? FALLBACK_COLORS[0] }}
                    />
                    <span className="font-medium text-foreground">{key}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  )
})

ChartSpendingStreamgraph.displayName = "ChartSpendingStreamgraph"
