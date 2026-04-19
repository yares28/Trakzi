"use client"

import { Fragment, memo, useMemo, useState, type ReactNode } from "react"
import { ResponsiveBar } from "@nivo/bar"
import { ResponsiveFunnel } from "@nivo/funnel"
import { ResponsiveHeatMap } from "@nivo/heatmap"
import { ResponsiveLine } from "@nivo/line"
import { ResponsivePie } from "@nivo/pie"
import { ResponsiveRadar } from "@nivo/radar"
import { ResponsiveSankey } from "@nivo/sankey"
import { ResponsiveTreeMap } from "@nivo/treemap"
import { useTheme } from "next-themes"
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts"

import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { ChartExpandButton } from "@/components/chart-expand-button"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { ChartFullscreenModal } from "@/components/chart-fullscreen-modal"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { ChartLoadingState } from "@/components/chart-loading-state"
import {
  ChartCardFloatingMeta,
  chartCardHeaderIconClusterClassName,
  chartCardHeaderLeadingClassName,
  chartCardHeaderRowClassName,
  chartCardHeaderTitleClassName,
} from "@/components/chart-card-overlay-controls"
import { HoverableBar } from "@/components/chart-hoverable-bar"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import type { ChartSkeletonType } from "@/components/chart-skeletons"
import { NivoChartTooltip } from "@/components/chart-tooltip"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getChartAxisLineColor, getChartTextColor, getContrastTextColor } from "@/lib/chart-colors"
import { cn } from "@/lib/utils"
import type { ChartId } from "@/lib/chart-card-sizes.config"

import type { PlaygroundCardModel, PlaygroundVisual } from "./one-click-playground-catalog"

type Formatter = "currency" | "percent" | "number" | undefined

const SURFACE_HEIGHT = 500
const PLOT_HEIGHT = SURFACE_HEIGHT - 48

function compactNumber(value: number) {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return `${Math.round(value)}`
}

function formatVisualValue(
  value: number,
  formatter: Formatter,
  formatCurrency: ReturnType<typeof useCurrency>["formatCurrency"],
) {
  if (formatter === "currency") {
    return formatCurrency(value, { maximumFractionDigits: Math.abs(value) < 10 ? 1 : 0 })
  }
  if (formatter === "percent") {
    return `${Math.round(value)}%`
  }
  return compactNumber(value)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function normalizeNumber(value: number) {
  if (!Number.isFinite(value)) return 0
  return value
}

function normalizeGaugePercent(value: number) {
  return value <= 1 ? value * 100 : value
}

function mixAlpha(hex: string | undefined, alpha: string, fallback: string) {
  if (!hex) return fallback
  if (hex.startsWith("#") && (hex.length === 7 || hex.length === 4)) {
    return `${hex}${alpha}`
  }
  return fallback
}

function polarToCartesian(cx: number, cy: number, radius: number, angle: number) {
  const radians = ((angle - 90) * Math.PI) / 180
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  }
}

function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, radius, endAngle)
  const end = polarToCartesian(cx, cy, radius, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1"
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`
}

function describeDonutArc(
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number,
) {
  const outerStart = polarToCartesian(cx, cy, outerRadius, endAngle)
  const outerEnd = polarToCartesian(cx, cy, outerRadius, startAngle)
  const innerStart = polarToCartesian(cx, cy, innerRadius, startAngle)
  const innerEnd = polarToCartesian(cx, cy, innerRadius, endAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1"
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${innerEnd.x} ${innerEnd.y}`,
    "Z",
  ].join(" ")
}

function getValueExtent(values: number[]) {
  if (!values.length) return { min: 0, max: 1, span: 1 }
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  return { min, max, span }
}

function getNivoTheme(isDark: boolean) {
  return {
    text: { fill: getChartTextColor(isDark), fontSize: 11 },
    axis: { ticks: { text: { fill: getChartTextColor(isDark) } } },
    grid: { line: { stroke: getChartAxisLineColor(isDark), strokeDasharray: "4 4" } },
  }
}

function getSurfaceSkeletonType(visual: PlaygroundVisual): ChartSkeletonType {
  switch (visual.kind) {
    case "trend":
      return "area"
    case "heatmap":
    case "scatter":
    case "treemap":
    case "sunburst":
    case "parallel":
      return "grid"
    case "gauge":
      return "pie"
    case "funnel":
    case "sankey":
      return "flow"
    default:
      return "bar"
  }
}

function isSurfaceEmpty(visual: PlaygroundVisual) {
  switch (visual.kind) {
    case "trend":
      return visual.points.length === 0
    case "bars":
      return visual.items.length === 0
    case "heatmap":
      return visual.cells.length === 0 || visual.xLabels.length === 0 || visual.yLabels.length === 0
    case "gauge":
      return !Number.isFinite(visual.value)
    case "scatter":
      return visual.points.length === 0
    case "dumbbell":
    case "bullet":
    case "dotPlot":
    case "rangePlot":
    case "arrowPlot":
    case "splitBars":
    case "treemap":
    case "boxplot":
    case "pictorialBar":
    case "rankedList":
      return visual.items.length === 0
    case "groupedBars":
      return visual.keys.length === 0 || visual.groups.length === 0
    case "stackedBars":
      return visual.keys.length === 0 || visual.items.length === 0
    case "funnel":
    case "waterfall":
      return visual.steps.length === 0
    case "sankey":
      return visual.nodes.length === 0 || visual.links.length === 0
    case "sunburst":
      return visual.nodes.length === 0
    case "parallel":
      return visual.axes.length === 0 || visual.lines.length === 0
    default:
      return false
  }
}

function SurfaceFrame({
  title: _title,
  kicker: _kicker,
  children,
}: {
  title?: string
  kicker?: string
  children: ReactNode
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  )
}

function ChartLegend({
  items,
}: {
  items: Array<{ label: string; color: string }>
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="inline-flex items-center gap-2 rounded-full border border-border/45 bg-background/65 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
        >
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  )
}

type SurfaceTooltipState = {
  title: string
  color?: string
  value?: string
  subValue?: string
}

function SurfaceTooltip({ tooltip }: { tooltip: SurfaceTooltipState | null }) {
  if (!tooltip) return null

  return (
    <NivoChartTooltip
      title={tooltip.title}
      titleColor={tooltip.color}
      value={tooltip.value}
      subValue={tooltip.subValue}
    />
  )
}

function TrendSurface({
  id,
  visual,
  palette,
  formatCurrency,
}: {
  id: string
  visual: Extract<PlaygroundVisual, { kind: "trend" }>
  palette: string[]
  formatCurrency: ReturnType<typeof useCurrency>["formatCurrency"]
}) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const nivoTheme = useMemo(() => getNivoTheme(isDark), [isDark])
  const chartData = useMemo(() => {
    const series = [
      {
        id: "Current",
        data: visual.points.map((point) => ({ x: point.label, y: normalizeNumber(point.value) })),
      },
    ]

    if (visual.comparePoints?.length) {
      series.push({
        id: "Compare",
        data: visual.comparePoints.map((point) => ({ x: point.label, y: normalizeNumber(point.value) })),
      })
    }

    return series
  }, [visual.comparePoints, visual.points])

  return (
    <SurfaceFrame title="Recent movement with endpoint emphasis" kicker="Trend">
      <div className="w-full" style={{ height: PLOT_HEIGHT }}>
        <ResponsiveLine
          data={chartData}
          margin={{ top: 18, right: 20, bottom: 42, left: 58 }}
          xScale={{ type: "point" }}
          yScale={{ type: "linear", min: "auto", max: "auto" }}
          curve="monotoneX"
          colors={[palette[0] ?? "#fe8339", palette[2] ?? palette[1] ?? "#d0ab7e"]}
          lineWidth={3}
          enableArea={!visual.comparePoints?.length}
          areaOpacity={0.16}
          pointSize={8}
          pointColor={{ theme: "background" }}
          pointBorderWidth={2}
          pointBorderColor={{ from: "serieColor" }}
          enableGridX={false}
          useMesh
          axisBottom={{ tickSize: 0, tickPadding: 12 }}
          axisLeft={{
            tickSize: 0,
            tickPadding: 8,
            format: (value: number) => formatVisualValue(value, visual.formatter, formatCurrency),
          }}
          theme={nivoTheme}
          tooltip={({ point }) => (
            <NivoChartTooltip
              title={`${point.seriesId} · ${String(point.data.x)}`}
              titleColor={point.seriesColor as string}
              value={formatVisualValue(Number(point.data.y), visual.formatter, formatCurrency)}
            />
          )}
          animate
          motionConfig="gentle"
        />
      </div>
      {visual.comparePoints ? (
        <ChartLegend
          items={[
            { label: "Current path", color: palette[0] ?? "#fe8339" },
            { label: "Compare path", color: palette[2] ?? palette[1] ?? "#9f8866" },
          ]}
        />
      ) : null}
    </SurfaceFrame>
  )
}

function BarsSurface({
  visual,
  palette,
  formatCurrency,
}: {
  visual: Extract<PlaygroundVisual, { kind: "bars" }>
  palette: string[]
  formatCurrency: ReturnType<typeof useCurrency>["formatCurrency"]
}) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const nivoTheme = useMemo(() => getNivoTheme(isDark), [isDark])
  const hasCompare = visual.items.some((item) => item.secondaryValue != null)
  const chartData = useMemo(
    () =>
      visual.items.map((item, index) => ({
        label: item.label,
        primary: normalizeNumber(item.value),
        compare: normalizeNumber(item.secondaryValue ?? 0),
        primaryColor: palette[index % palette.length] ?? palette[0] ?? "#fe8339",
        compareColor:
          mixAlpha(palette[(index + 2) % palette.length] ?? palette[1], "CC", "rgba(194,156,102,0.85)"),
      })),
    [palette, visual.items],
  )

  return (
    <SurfaceFrame title="Ranked bars with primary and comparison lanes" kicker="Bars">
      <div className="w-full" style={{ height: PLOT_HEIGHT }}>
        <ResponsiveBar
          data={chartData}
          keys={hasCompare ? ["primary", "compare"] : ["primary"]}
          indexBy="label"
          margin={{ top: 16, right: 16, bottom: 52, left: 58 }}
          padding={0.28}
          groupMode={hasCompare ? "grouped" : "stacked"}
          borderRadius={8}
          enableLabel
          labelSkipWidth={28}
          labelSkipHeight={18}
          label={(datum) => formatVisualValue(Number(datum.value), visual.formatter, formatCurrency)}
          labelTextColor={{ from: "color", modifiers: [["brighter", 2.4]] }}
          colors={({ id, data }) =>
            String(id) === "compare"
              ? String((data as { compareColor: string }).compareColor)
              : String((data as { primaryColor: string }).primaryColor)
          }
          axisBottom={{ tickSize: 0, tickPadding: 10, tickRotation: -22 }}
          axisLeft={{
            tickSize: 0,
            tickPadding: 8,
            format: (value: number) => formatVisualValue(value, visual.formatter, formatCurrency),
          }}
          enableGridX={false}
          theme={nivoTheme}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          barComponent={HoverableBar as any}
          tooltip={({ id, value, indexValue, color }) => (
            <NivoChartTooltip
              title={`${String(indexValue)} · ${String(id) === "compare" ? "Compare" : "Primary"}`}
              titleColor={color}
              value={formatVisualValue(Number(value), visual.formatter, formatCurrency)}
            />
          )}
          animate
          motionConfig="gentle"
        />
      </div>
      {hasCompare ? (
        <ChartLegend
          items={[
            { label: "Primary", color: palette[0] ?? "#fe8339" },
            { label: "Compare", color: palette[2] ?? palette[1] ?? "#c49c66" },
          ]}
        />
      ) : null}
    </SurfaceFrame>
  )
}

function HeatmapSurface({
  visual,
  palette,
}: {
  visual: Extract<PlaygroundVisual, { kind: "heatmap" }>
  palette: string[]
}) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const textColor = getChartTextColor(isDark)
  const chartData = useMemo(
    () =>
      visual.yLabels.map((yLabel) => ({
        id: yLabel,
        data: visual.xLabels.map((xLabel) => ({
          x: xLabel,
          y: visual.cells.find((cell) => cell.x === xLabel && cell.y === yLabel)?.value ?? 0,
        })),
      })),
    [visual.cells, visual.xLabels, visual.yLabels],
  )

  return (
    <SurfaceFrame>
      <div className="w-full" style={{ height: PLOT_HEIGHT }}>
        <ResponsiveHeatMap
          data={chartData}
          margin={{ top: 12, right: 12, bottom: 28, left: 72 }}
          valueFormat=">-.0f"
          xOuterPadding={0.05}
          yOuterPadding={0.05}
          axisTop={{ tickSize: 0, tickPadding: 6 }}
          axisLeft={{ tickSize: 0, tickPadding: 6 }}
          colors={{ type: "sequential", scheme: "oranges" }}
          emptyColor={isDark ? "#302f2f" : "#f4efe8"}
          borderRadius={6}
          borderWidth={2}
          borderColor={isDark ? "#171717" : "#ffffff"}
          enableLabels
          labelTextColor={{ from: "color", modifiers: [["darker", 2.8]] }}
          theme={{ text: { fill: textColor, fontSize: 11 } }}
          animate
          motionConfig="gentle"
          hoverTarget="cell"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tooltip={({ cell }: any) => (
            <NivoChartTooltip
              title={`${cell.serieId} · ${cell.data.x}`}
              titleColor={palette[0] ?? "#fe8339"}
              value={`${Math.round(Number(cell.data.y ?? 0))}`}
            />
          )}
        />
      </div>
    </SurfaceFrame>
  )
}

function GaugeSurface({
  visual,
  palette,
}: {
  visual: Extract<PlaygroundVisual, { kind: "gauge" }>
  palette: string[]
}) {
  const value = clamp(normalizeGaugePercent(visual.value), 0, 100)
  const target = clamp(normalizeGaugePercent(visual.target ?? 75), 0, 100)
  const pieData = [
    { id: "Current", label: "Current", value, color: palette[0] ?? "#fe8339" },
    { id: "Remaining", label: "Remaining", value: Math.max(100 - value, 0), color: mixAlpha(palette[2] ?? palette[1], "55", "rgba(194,156,102,0.35)") },
  ]

  return (
    <SurfaceFrame title="Single score against an explicit target band" kicker="Gauge">
      <div className="relative flex h-full flex-col items-center justify-center gap-2">
        <div className="w-full max-w-[430px]" style={{ height: PLOT_HEIGHT - 24 }}>
          <ResponsivePie
            data={pieData}
            margin={{ top: 18, right: 18, bottom: 18, left: 18 }}
            innerRadius={0.78}
            startAngle={-120}
            endAngle={120}
            padAngle={0}
            cornerRadius={6}
            activeOuterRadiusOffset={4}
            colors={{ datum: "data.color" }}
            enableArcLabels={false}
            enableArcLinkLabels={false}
            isInteractive
            tooltip={({ datum }) => (
              <NivoChartTooltip
                title={String(datum.label)}
                titleColor={String(datum.color)}
                value={`${Math.round(Number(datum.value))}%`}
                subValue={datum.id === "Current" ? `Target ${Math.round(target)}%` : undefined}
              />
            )}
            animate
            motionConfig="gentle"
          />
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-[58%] flex -translate-y-1/2 flex-col items-center justify-center">
          <div className="text-4xl font-semibold tracking-[-0.05em] text-foreground">{Math.round(value)}%</div>
          <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Current score</div>
        </div>
        <ChartLegend
          items={[
            { label: "Current", color: palette[0] ?? "#fe8339" },
            { label: "Target", color: palette[2] ?? palette[1] ?? "#c49c66" },
          ]}
        />
      </div>
    </SurfaceFrame>
  )
}

function ScatterSurface({
  visual,
  palette,
  formatCurrency,
}: {
  visual: Extract<PlaygroundVisual, { kind: "scatter" }>
  palette: string[]
  formatCurrency: ReturnType<typeof useCurrency>["formatCurrency"]
}) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const gridColor = getChartAxisLineColor(isDark)
  const textColor = getChartTextColor(isDark)

  return (
    <SurfaceFrame title="Two-axis spread with quadrant cues" kicker="Scatter">
      <div className="w-full" style={{ height: PLOT_HEIGHT }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
            <CartesianGrid stroke={gridColor} strokeDasharray="4 4" />
            <XAxis
              type="number"
              dataKey="x"
              name={visual.xLabel}
              tick={{ fill: textColor, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              label={{ value: visual.xLabel, position: "insideBottom", offset: -10, fill: textColor, fontSize: 11 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name={visual.yLabel}
              tick={{ fill: textColor, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              label={{ value: visual.yLabel, angle: -90, position: "insideLeft", fill: textColor, fontSize: 11 }}
            />
            <ZAxis type="number" dataKey="size" range={[60, 220]} />
            <RechartsTooltip
              cursor={{ strokeDasharray: "4 4", stroke: gridColor }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const point = payload[0].payload as { label: string; x: number; y: number }
                return (
                  <NivoChartTooltip
                    title={point.label}
                    titleColor={palette[0] ?? "#fe8339"}
                    value={`${visual.xLabel}: ${formatVisualValue(point.x, "number", formatCurrency)}`}
                    subValue={`${visual.yLabel}: ${formatVisualValue(point.y, "number", formatCurrency)}`}
                  />
                )
              }}
            />
            <Scatter
              data={visual.points.map((point, index) => ({
                ...point,
                size: 80 + ((index % 4) + 1) * 24,
                fill: palette[index % palette.length] ?? "#fe8339",
              }))}
              fill={palette[0] ?? "#fe8339"}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </SurfaceFrame>
  )
}

function DumbbellLikeSurface({
  visual,
  palette,
  formatCurrency,
  variant,
}: {
  visual:
    | Extract<PlaygroundVisual, { kind: "dumbbell" }>
    | Extract<PlaygroundVisual, { kind: "rangePlot" }>
    | Extract<PlaygroundVisual, { kind: "arrowPlot" }>
  palette: string[]
  formatCurrency: ReturnType<typeof useCurrency>["formatCurrency"]
  variant: "dumbbell" | "range" | "arrow"
}) {
  const [tooltip, setTooltip] = useState<SurfaceTooltipState | null>(null)
  const items = visual.items
  const values = items.flatMap((item) => [item.start, item.end, "marker" in item ? item.marker ?? 0 : 0])
  const { min, span } = getValueExtent(values)
  const toPct = (value: number) => ((value - min) / span) * 100

  return (
    <SurfaceFrame
      title={variant === "range" ? "Ranges with central markers" : variant === "arrow" ? "Direction and delta by row" : "Two-point comparisons by row"}
      kicker={variant === "range" ? "Range" : variant === "arrow" ? "Arrow" : "Dumbbell"}
    >
      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={item.label}
            className="rounded-[1rem] border border-border/45 bg-background/55 px-3 py-3"
            onMouseEnter={() =>
              setTooltip({
                title: item.label,
                color: palette[index % palette.length] ?? "#fe8339",
                value:
                  variant === "range"
                    ? formatVisualValue(("marker" in item ? item.marker : undefined) ?? item.end, visual.formatter, formatCurrency)
                    : formatVisualValue(item.end - item.start, visual.formatter, formatCurrency),
                subValue: `${formatVisualValue(item.start, visual.formatter, formatCurrency)} -> ${formatVisualValue(item.end, visual.formatter, formatCurrency)}`,
              })
            }
            onMouseLeave={() => setTooltip(null)}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="truncate text-sm font-medium text-foreground">{item.label}</div>
              <div className="text-sm font-semibold text-foreground">
                {variant === "range"
                  ? formatVisualValue(("marker" in item ? item.marker : undefined) ?? item.end, visual.formatter, formatCurrency)
                  : formatVisualValue(item.end - item.start, visual.formatter, formatCurrency)}
              </div>
            </div>
            <div className="relative mt-4 h-10">
              <div
                className="absolute top-1/2 h-px -translate-y-1/2 bg-border/70"
                style={{ left: `${toPct(item.start)}%`, width: `${Math.max(toPct(item.end) - toPct(item.start), 2)}%` }}
              />
              {variant === "arrow" ? (
                <div
                  className="absolute top-1/2 h-px -translate-y-1/2"
                  style={{
                    left: `${Math.min(toPct(item.start), toPct(item.end))}%`,
                    width: `${Math.max(Math.abs(toPct(item.end) - toPct(item.start)), 2)}%`,
                    background: `linear-gradient(90deg, ${palette[2] ?? palette[1] ?? "#c49c66"} 0%, ${palette[0] ?? "#fe8339"} 100%)`,
                  }}
                />
              ) : null}
              <div className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border/60 bg-background" style={{ left: `${toPct(item.start)}%` }} />
              <div className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border/60 bg-background" style={{ left: `${toPct(item.end)}%`, backgroundColor: palette[index % palette.length] ?? "#fe8339" }} />
              {"marker" in item && item.marker != null ? (
                <div
                  className="absolute top-1/2 h-6 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{ left: `${toPct(item.marker)}%`, backgroundColor: palette[0] ?? "#fe8339" }}
                />
              ) : null}
              <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-muted-foreground/70">
                <span>{formatVisualValue(item.start, visual.formatter, formatCurrency)}</span>
                <span>{formatVisualValue(item.end, visual.formatter, formatCurrency)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <SurfaceTooltip tooltip={tooltip} />
    </SurfaceFrame>
  )
}

function BulletSurface({
  visual,
  palette,
  formatCurrency,
}: {
  visual: Extract<PlaygroundVisual, { kind: "bullet" }>
  palette: string[]
  formatCurrency: ReturnType<typeof useCurrency>["formatCurrency"]
}) {
  const [tooltip, setTooltip] = useState<SurfaceTooltipState | null>(null)
  const max = Math.max(...visual.items.map((item) => item.max ?? Math.max(item.value, item.target) * 1.15), 1)
  const itemCount = Math.max(visual.items.length, 1)
  const rowMinHeight = Math.max(78, Math.floor((PLOT_HEIGHT - (itemCount - 1) * 12) / itemCount))

  return (
    <SurfaceFrame title="Current performance against target lines" kicker="Bullet">
      <div className="flex h-full flex-col gap-3" style={{ height: PLOT_HEIGHT }}>
        {visual.items.map((item, index) => (
          <div
            key={item.label}
            className="flex min-h-0 flex-1 flex-col justify-center rounded-[1rem] border border-border/45 bg-background/55 px-3 py-3"
            style={{ minHeight: rowMinHeight }}
            onMouseEnter={() =>
              setTooltip({
                title: item.label,
                color: palette[index % palette.length] ?? "#fe8339",
                value: formatVisualValue(item.value, visual.formatter, formatCurrency),
                subValue: `Target ${formatVisualValue(item.target, visual.formatter, formatCurrency)}`,
              })
            }
            onMouseLeave={() => setTooltip(null)}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="truncate text-sm font-medium text-foreground">{item.label}</div>
              <div className="text-sm font-semibold text-foreground">{formatVisualValue(item.value, visual.formatter, formatCurrency)}</div>
            </div>
            <div className="relative mt-4 h-4 rounded-full bg-foreground/8">
              <div
                className="h-4 rounded-full"
                style={{
                  width: `${(item.value / max) * 100}%`,
                  background: `linear-gradient(90deg, ${palette[index % palette.length] ?? "#fe8339"} 0%, ${palette[(index + 1) % palette.length] ?? "#d8bf91"} 100%)`,
                }}
              />
              <div
                className="absolute top-1/2 h-8 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/85"
                style={{ left: `${(item.target / max) * 100}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">
              <span>Target {formatVisualValue(item.target, visual.formatter, formatCurrency)}</span>
              <span>{Math.round((item.value / Math.max(item.target, 1)) * 100)}% of target</span>
            </div>
          </div>
        ))}
      </div>
      <SurfaceTooltip tooltip={tooltip} />
    </SurfaceFrame>
  )
}

function DotPlotSurface({
  visual,
  palette,
  formatCurrency,
}: {
  visual: Extract<PlaygroundVisual, { kind: "dotPlot" }>
  palette: string[]
  formatCurrency: ReturnType<typeof useCurrency>["formatCurrency"]
}) {
  const [tooltip, setTooltip] = useState<SurfaceTooltipState | null>(null)
  const values = visual.items.flatMap((item) => [item.value, item.reference ?? 0])
  const { min, span } = getValueExtent(values)
  const toPct = (value: number) => ((value - min) / span) * 100
  const itemCount = Math.max(visual.items.length, 1)
  const rowMinHeight = Math.max(64, Math.floor((PLOT_HEIGHT - (itemCount - 1) * 12) / itemCount))

  return (
    <SurfaceFrame title="Ranked values with optional benchmark markers" kicker="Dot Plot">
      <div className="flex h-full flex-col gap-3" style={{ height: PLOT_HEIGHT }}>
        {visual.items.map((item, index) => (
          <div
            key={item.label}
            className="grid min-h-0 flex-1 grid-cols-[minmax(110px,1fr)_minmax(0,2.2fr)_auto] items-center gap-3 rounded-[1rem] border border-border/45 bg-background/55 px-3 py-3"
            style={{ minHeight: rowMinHeight }}
            onMouseEnter={() =>
              setTooltip({
                title: item.label,
                color: palette[index % palette.length] ?? "#fe8339",
                value: formatVisualValue(item.value, visual.formatter, formatCurrency),
                subValue:
                  item.reference != null
                    ? `Reference ${formatVisualValue(item.reference, visual.formatter, formatCurrency)}`
                    : undefined,
              })
            }
            onMouseLeave={() => setTooltip(null)}
          >
            <div className="truncate text-sm font-medium text-foreground">{item.label}</div>
            <div className="relative h-8">
              <div className="absolute top-1/2 h-px w-full -translate-y-1/2 bg-border/60" />
              {item.reference != null ? (
                <div className="absolute top-1/2 h-6 w-[2px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/80" style={{ left: `${toPct(item.reference)}%` }} />
              ) : null}
              <div className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-background" style={{ left: `${toPct(item.value)}%`, backgroundColor: palette[index % palette.length] ?? "#fe8339" }} />
            </div>
            <div className="text-right text-sm font-semibold text-foreground">{formatVisualValue(item.value, visual.formatter, formatCurrency)}</div>
          </div>
        ))}
      </div>
      <SurfaceTooltip tooltip={tooltip} />
    </SurfaceFrame>
  )
}

function GroupedBarsSurface({
  visual,
  palette,
  formatCurrency,
}: {
  visual: Extract<PlaygroundVisual, { kind: "groupedBars" }>
  palette: string[]
  formatCurrency: ReturnType<typeof useCurrency>["formatCurrency"]
}) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const nivoTheme = useMemo(() => getNivoTheme(isDark), [isDark])
  const data = useMemo(
    () =>
      visual.groups.map((group) => ({
        label: group.label,
        ...Object.fromEntries(group.values.map((value) => [value.key, normalizeNumber(value.value)])),
      })),
    [visual.groups],
  )

  return (
    <SurfaceFrame title="Grouped comparisons within each category row" kicker="Grouped Bars">
      <div className="w-full" style={{ height: PLOT_HEIGHT }}>
        <ResponsiveBar
          data={data}
          keys={visual.keys}
          indexBy="label"
          margin={{ top: 16, right: 16, bottom: 52, left: 58 }}
          padding={0.26}
          groupMode="grouped"
          colors={visual.keys.map((_, index) => palette[index % palette.length] ?? "#fe8339")}
          borderRadius={7}
          enableLabel={false}
          axisBottom={{ tickSize: 0, tickPadding: 10, tickRotation: -22 }}
          axisLeft={{
            tickSize: 0,
            tickPadding: 8,
            format: (value: number) => formatVisualValue(value, visual.formatter, formatCurrency),
          }}
          enableGridX={false}
          theme={nivoTheme}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          barComponent={HoverableBar as any}
          tooltip={({ id, value, indexValue, color }) => (
            <NivoChartTooltip
              title={`${String(indexValue)} · ${String(id)}`}
              titleColor={color}
              value={formatVisualValue(Number(value), visual.formatter, formatCurrency)}
            />
          )}
          animate
          motionConfig="gentle"
        />
      </div>
      <ChartLegend items={visual.keys.map((key, index) => ({ label: key, color: palette[index % palette.length] ?? "#fe8339" }))} />
    </SurfaceFrame>
  )
}

function StackedBarsSurface({
  visual,
  palette,
  formatCurrency,
}: {
  visual: Extract<PlaygroundVisual, { kind: "stackedBars" }>
  palette: string[]
  formatCurrency: ReturnType<typeof useCurrency>["formatCurrency"]
}) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const nivoTheme = useMemo(() => getNivoTheme(isDark), [isDark])
  const data = useMemo(
    () =>
      visual.items.map((item) => ({
        label: item.label,
        ...Object.fromEntries(item.segments.map((segment) => [segment.key, normalizeNumber(segment.value)])),
      })),
    [visual.items],
  )

  return (
    <SurfaceFrame title="Composed totals with visible segment mix" kicker="Stacked Bars">
      <div className="w-full" style={{ height: PLOT_HEIGHT }}>
        <ResponsiveBar
          data={data}
          keys={visual.keys}
          indexBy="label"
          margin={{ top: 16, right: 16, bottom: 52, left: 58 }}
          padding={0.24}
          groupMode="stacked"
          colors={visual.keys.map((_, index) => palette[index % palette.length] ?? "#fe8339")}
          borderRadius={7}
          enableLabel={false}
          axisBottom={{ tickSize: 0, tickPadding: 10, tickRotation: -22 }}
          axisLeft={{
            tickSize: 0,
            tickPadding: 8,
            format: (value: number) => formatVisualValue(value, visual.formatter, formatCurrency),
          }}
          enableGridX={false}
          theme={nivoTheme}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          barComponent={HoverableBar as any}
          tooltip={({ id, value, indexValue, color }) => (
            <NivoChartTooltip
              title={`${String(indexValue)} · ${String(id)}`}
              titleColor={color}
              value={formatVisualValue(Number(value), visual.formatter, formatCurrency)}
            />
          )}
          animate
          motionConfig="gentle"
        />
      </div>
      <ChartLegend items={visual.keys.map((key, index) => ({ label: key, color: palette[index % palette.length] ?? "#fe8339" }))} />
    </SurfaceFrame>
  )
}

function SplitBarsSurface({
  visual,
  palette,
  formatCurrency,
}: {
  visual: Extract<PlaygroundVisual, { kind: "splitBars" }>
  palette: string[]
  formatCurrency: ReturnType<typeof useCurrency>["formatCurrency"]
}) {
  const [tooltip, setTooltip] = useState<SurfaceTooltipState | null>(null)
  const max = Math.max(...visual.items.flatMap((item) => [item.left, item.right]), 1)

  return (
    <SurfaceFrame title="Diverging bars for two-sided tradeoffs" kicker="Split Bars">
      <div className="space-y-3">
        {visual.items.map((item) => (
          <div
            key={item.label}
            className="rounded-[1rem] border border-border/45 bg-background/55 px-3 py-3"
            onMouseEnter={() =>
              setTooltip({
                title: item.label,
                color: palette[0] ?? "#fe8339",
                value: `${formatVisualValue(item.left, visual.formatter, formatCurrency)} vs ${formatVisualValue(item.right, visual.formatter, formatCurrency)}`,
                subValue: `${item.leftLabel ?? "Left"} vs ${item.rightLabel ?? "Right"}`,
              })
            }
            onMouseLeave={() => setTooltip(null)}
          >
            <div className="mb-3 text-sm font-medium text-foreground">{item.label}</div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div className="space-y-1">
                <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">{item.leftLabel ?? "Left"}</div>
                <div className="ml-auto h-3 rounded-full bg-foreground/8">
                  <div
                    className="ml-auto h-3 rounded-full"
                    style={{ width: `${(item.left / max) * 100}%`, backgroundColor: palette[1] ?? palette[2] ?? "#c49c66" }}
                  />
                </div>
              </div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/72">vs</div>
              <div className="space-y-1">
                <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">{item.rightLabel ?? "Right"}</div>
                <div className="h-3 rounded-full bg-foreground/8">
                  <div
                    className="h-3 rounded-full"
                    style={{ width: `${(item.right / max) * 100}%`, backgroundColor: palette[0] ?? "#fe8339" }}
                  />
                </div>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-foreground/86">
              <span>{formatVisualValue(item.left, visual.formatter, formatCurrency)}</span>
              <span>{formatVisualValue(item.right, visual.formatter, formatCurrency)}</span>
            </div>
          </div>
        ))}
      </div>
      <SurfaceTooltip tooltip={tooltip} />
    </SurfaceFrame>
  )
}

function TreemapSurface({
  visual,
  palette,
  formatCurrency,
}: {
  visual: Extract<PlaygroundVisual, { kind: "treemap" }>
  palette: string[]
  formatCurrency: ReturnType<typeof useCurrency>["formatCurrency"]
}) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const chartData = useMemo(
    () => ({
      name: "root",
      children: visual.items.map((item) => ({
        name: item.label,
        loc: normalizeNumber(item.value),
      })),
    }),
    [visual.items],
  )

  return (
    <SurfaceFrame title="Weighted blocks for share concentration" kicker="Treemap">
      <div className="w-full" style={{ height: PLOT_HEIGHT }}>
        <ResponsiveTreeMap
          data={chartData}
          identity="name"
          value="loc"
          margin={{ top: 10, right: 12, bottom: 10, left: 12 }}
          colors={palette}
          labelSkipSize={16}
          labelTextColor={(node: { color: string }) => getContrastTextColor(node.color)}
          parentLabelTextColor={(node: { color: string }) => getContrastTextColor(node.color)}
          borderColor={{ from: "color", modifiers: [["darker", 0.1]] }}
          tooltip={({ node }) => (
            <NivoChartTooltip
              title={String(node.id)}
              titleColor={node.color}
              value={formatVisualValue(Number(node.value ?? 0), visual.formatter, formatCurrency)}
            />
          )}
        />
      </div>
    </SurfaceFrame>
  )
}

function BoxplotSurface({
  visual,
  palette,
  formatCurrency,
}: {
  visual: Extract<PlaygroundVisual, { kind: "boxplot" }>
  palette: string[]
  formatCurrency: ReturnType<typeof useCurrency>["formatCurrency"]
}) {
  const [tooltip, setTooltip] = useState<SurfaceTooltipState | null>(null)
  const values = visual.items.flatMap((item) => [item.min, item.q1, item.median, item.q3, item.max])
  const { min, span } = getValueExtent(values)
  const toPct = (value: number) => ((value - min) / span) * 100

  return (
    <SurfaceFrame title="Spread and median behavior by row" kicker="Boxplot">
      <div className="space-y-3">
        {visual.items.map((item, index) => (
          <div
            key={item.label}
            className="grid grid-cols-[minmax(110px,1fr)_minmax(0,2.4fr)_auto] items-center gap-3 rounded-[1rem] border border-border/45 bg-background/55 px-3 py-3"
            onMouseEnter={() =>
              setTooltip({
                title: item.label,
                color: palette[index % palette.length] ?? "#fe8339",
                value: `Median ${formatVisualValue(item.median, visual.formatter, formatCurrency)}`,
                subValue: `${formatVisualValue(item.min, visual.formatter, formatCurrency)} to ${formatVisualValue(item.max, visual.formatter, formatCurrency)}`,
              })
            }
            onMouseLeave={() => setTooltip(null)}
          >
            <div className="truncate text-sm font-medium text-foreground">{item.label}</div>
            <div className="relative h-12">
              <div className="absolute top-1/2 h-px -translate-y-1/2 bg-border/65" style={{ left: `${toPct(item.min)}%`, width: `${toPct(item.max) - toPct(item.min)}%` }} />
              <div className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border/60 bg-background" style={{ left: `${toPct(item.min)}%` }} />
              <div className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border/60 bg-background" style={{ left: `${toPct(item.max)}%` }} />
              <div
                className="absolute top-1/2 h-5 -translate-y-1/2 rounded-[0.7rem] border"
                style={{
                  left: `${toPct(item.q1)}%`,
                  width: `${Math.max(toPct(item.q3) - toPct(item.q1), 3)}%`,
                  backgroundColor: mixAlpha(palette[index % palette.length], "33", "rgba(232,179,116,0.2)"),
                  borderColor: mixAlpha(palette[index % palette.length], "66", "rgba(232,179,116,0.36)"),
                }}
              />
              <div className="absolute top-1/2 h-6 w-[2px] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: `${toPct(item.median)}%`, backgroundColor: palette[index % palette.length] ?? "#fe8339" }} />
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-foreground">{formatVisualValue(item.median, visual.formatter, formatCurrency)}</div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/72">median</div>
            </div>
          </div>
        ))}
      </div>
      <SurfaceTooltip tooltip={tooltip} />
    </SurfaceFrame>
  )
}

function FunnelSurface({
  visual,
  palette,
  formatCurrency,
}: {
  visual: Extract<PlaygroundVisual, { kind: "funnel" }>
  palette: string[]
  formatCurrency: ReturnType<typeof useCurrency>["formatCurrency"]
}) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const textColor = getChartTextColor(isDark)
  const data = useMemo(
    () =>
      visual.steps.map((step) => ({
        id: step.label,
        label: step.label,
        value: normalizeNumber(step.value),
      })),
    [visual.steps],
  )

  return (
    <SurfaceFrame title="Stage-by-stage attrition through the modeled flow" kicker="Funnel">
      <div className="w-full" style={{ height: PLOT_HEIGHT }}>
        <ResponsiveFunnel
          data={data}
          margin={{ top: 18, right: 20, bottom: 18, left: 20 }}
          valueFormat={(value: number) => formatVisualValue(value, visual.formatter, formatCurrency)}
          colors={palette}
          borderWidth={18}
          labelColor={(datum: { color: string }) => getContrastTextColor(datum.color)}
          beforeSeparatorLength={48}
          beforeSeparatorOffset={12}
          afterSeparatorLength={48}
          afterSeparatorOffset={12}
          currentPartSizeExtension={8}
          currentBorderWidth={28}
          theme={{ text: { fill: textColor, fontSize: 11 } }}
          tooltip={({ part }) => (
            <NivoChartTooltip
              title={String(part.data.label ?? part.data.id)}
              titleColor={part.color}
              value={formatVisualValue(Number(part.data.value), visual.formatter, formatCurrency)}
            />
          )}
        />
      </div>
    </SurfaceFrame>
  )
}

function SankeySurface({
  visual,
  palette,
  formatCurrency,
}: {
  visual: Extract<PlaygroundVisual, { kind: "sankey" }>
  palette: string[]
  formatCurrency: ReturnType<typeof useCurrency>["formatCurrency"]
}) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const textColor = getChartTextColor(isDark)
  const nodeLabels = useMemo(
    () => new Map(visual.nodes.map((node) => [node.id, node.label])),
    [visual.nodes],
  )

  return (
    <SurfaceFrame title="Source-to-outcome structure through staged nodes" kicker="Sankey">
      <div className="w-full" style={{ height: PLOT_HEIGHT }}>
        <ResponsiveSankey
          data={{
            nodes: visual.nodes.map((node) => ({ id: node.id, label: node.label })),
            links: visual.links.map((link) => ({
              source: link.source,
              target: link.target,
              value: normalizeNumber(link.value),
            })),
          }}
          margin={{ top: 20, right: 110, bottom: 20, left: 70 }}
          align="justify"
          colors={palette}
          nodeOpacity={1}
          nodeThickness={18}
          nodeSpacing={18}
          nodeInnerPadding={4}
          nodeBorderWidth={0}
          linkOpacity={0.45}
          linkHoverOpacity={0.72}
          labelTextColor={textColor}
          label={(node) => String(nodeLabels.get(String(node.id)) ?? node.id)}
          nodeTooltip={({ node }) => (
            <NivoChartTooltip
              title={String(nodeLabels.get(String(node.id)) ?? node.id)}
              titleColor={palette[0] ?? "#fe8339"}
              value={formatVisualValue(Number(node.value ?? 0), visual.formatter, formatCurrency)}
            />
          )}
          linkTooltip={({ link }) => (
            <NivoChartTooltip
              title={`${String(nodeLabels.get(String(link.source.id)) ?? link.source.id)} -> ${String(nodeLabels.get(String(link.target.id)) ?? link.target.id)}`}
              titleColor={palette[0] ?? "#fe8339"}
              value={formatVisualValue(Number(link.value ?? 0), visual.formatter, formatCurrency)}
            />
          )}
        />
      </div>
    </SurfaceFrame>
  )
}

function SunburstSurface({
  visual,
  palette,
  formatCurrency,
}: {
  visual: Extract<PlaygroundVisual, { kind: "sunburst" }>
  palette: string[]
  formatCurrency: ReturnType<typeof useCurrency>["formatCurrency"]
}) {
  const [tooltip, setTooltip] = useState<SurfaceTooltipState | null>(null)
  const total = Math.max(visual.nodes.reduce((sum, node) => sum + node.value, 0), 1)
  let currentAngle = 0

  return (
    <SurfaceFrame title="Primary categories with second-ring breakdowns" kicker="Sunburst">
      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <svg viewBox="0 0 240 240" className="mx-auto h-[240px] w-[240px]">
          {visual.nodes.map((node, index) => {
            const sweep = (node.value / total) * 360
            const parentStart = currentAngle
            const parentEnd = currentAngle + sweep
            currentAngle += sweep
            let childAngle = parentStart
            const childTotal = Math.max(node.children?.reduce((sum, entry) => sum + entry.value, 0) ?? 0, 1)
            return (
              <g key={node.label}>
                <path
                  d={describeDonutArc(120, 120, 76, 46, parentStart, parentEnd)}
                  fill={mixAlpha(palette[index % palette.length], "CC", "rgba(232,179,116,0.8)")}
                  stroke="var(--background)"
                  strokeWidth="2"
                  onMouseEnter={() =>
                    setTooltip({
                      title: node.label,
                      color: palette[index % palette.length] ?? "#fe8339",
                      value: formatVisualValue(node.value, visual.formatter, formatCurrency),
                      subValue: `${Math.round((node.value / total) * 100)}% of total`,
                    })
                  }
                  onMouseLeave={() => setTooltip(null)}
                />
                {(node.children ?? []).map((child, childIndex) => {
                  const childSweep = sweep * (child.value / childTotal)
                  const childStart = childAngle
                  const childEnd = childAngle + childSweep
                  childAngle += childSweep
                  return (
                    <path
                      key={`${node.label}-${child.label}`}
                      d={describeDonutArc(120, 120, 102, 80, childStart, childEnd)}
                      fill={mixAlpha(palette[(index + childIndex + 1) % palette.length], "AA", "rgba(194,156,102,0.66)")}
                      stroke="var(--background)"
                      strokeWidth="1.5"
                      onMouseEnter={() =>
                        setTooltip({
                          title: `${node.label}: ${child.label}`,
                          color: palette[(index + childIndex + 1) % palette.length] ?? palette[index % palette.length] ?? "#fe8339",
                          value: formatVisualValue(child.value, visual.formatter, formatCurrency),
                          subValue: `${Math.round((child.value / total) * 100)}% of total`,
                        })
                      }
                      onMouseLeave={() => setTooltip(null)}
                    />
                  )
                })}
              </g>
            )
          })}
          <circle cx="120" cy="120" r="32" fill="currentColor" opacity="0.05" />
          <text x="120" y="114" textAnchor="middle" className="fill-muted-foreground text-[10px] uppercase tracking-[0.18em]">
            Total
          </text>
          <text x="120" y="132" textAnchor="middle" className="fill-foreground text-[16px] font-semibold">
            {formatVisualValue(total, visual.formatter, formatCurrency)}
          </text>
        </svg>
        <div className="space-y-3">
          {visual.nodes.map((node, index) => (
            <div
              key={node.label}
              className="rounded-[1rem] border border-border/45 bg-background/55 px-3 py-3"
              onMouseEnter={() =>
                setTooltip({
                  title: node.label,
                  color: palette[index % palette.length] ?? "#fe8339",
                  value: formatVisualValue(node.value, visual.formatter, formatCurrency),
                  subValue: `${node.children?.length ?? 0} child segments`,
                })
              }
              onMouseLeave={() => setTooltip(null)}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: palette[index % palette.length] ?? "#fe8339" }} />
                  <span>{node.label}</span>
                </div>
                <div className="text-sm font-semibold text-foreground">{formatVisualValue(node.value, visual.formatter, formatCurrency)}</div>
              </div>
              {node.children?.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {node.children.map((child, childIndex) => (
                    <div key={child.label} className="rounded-full border border-border/45 bg-background/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      {child.label}: {formatVisualValue(child.value, visual.formatter, formatCurrency)}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
      <SurfaceTooltip tooltip={tooltip} />
    </SurfaceFrame>
  )
}

function ParallelSurface({
  visual,
  palette,
}: {
  visual: Extract<PlaygroundVisual, { kind: "parallel" }>
  palette: string[]
}) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const radarData = useMemo(
    () =>
      visual.axes.map((axis, axisIndex) => ({
        axis,
        ...Object.fromEntries(
          visual.lines.map((line) => [line.label, normalizeNumber(line.values[axisIndex] ?? 0)]),
        ),
      })),
    [visual.axes, visual.lines],
  )

  return (
    <SurfaceFrame title="Multi-axis profile comparison" kicker="Radar">
      <div className="w-full" style={{ height: PLOT_HEIGHT }}>
        <ResponsiveRadar
          data={radarData}
          keys={visual.lines.map((line) => line.label)}
          indexBy="axis"
          margin={{ top: 16, right: 20, bottom: 16, left: 20 }}
          colors={palette}
          borderColor={{ from: "color" }}
          gridShape="linear"
          gridLevels={4}
          dotSize={6}
          dotColor={{ theme: "background" }}
          dotBorderWidth={2}
          dotBorderColor={{ from: "color" }}
          fillOpacity={0.16}
          blendMode="multiply"
          theme={{
            text: { fill: getChartTextColor(isDark), fontSize: 10 },
            grid: { line: { stroke: getChartAxisLineColor(isDark), strokeWidth: 1 } },
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          sliceTooltip={({ index, data }: any) => (
            <NivoChartTooltip
              title={String(index)}
              rows={data.map((entry: { id: string; value: number; color: string }) => ({
                label: entry.id,
                value: `${Math.round(entry.value)}`,
                color: entry.color,
              }))}
            />
          )}
          animate
          motionConfig="gentle"
        />
      </div>
    </SurfaceFrame>
  )
}

function PictorialBarSurface({
  visual,
  palette,
  formatCurrency,
}: {
  visual: Extract<PlaygroundVisual, { kind: "pictorialBar" }>
  palette: string[]
  formatCurrency: ReturnType<typeof useCurrency>["formatCurrency"]
}) {
  const [tooltip, setTooltip] = useState<SurfaceTooltipState | null>(null)
  const max = Math.max(...visual.items.map((item) => item.max ?? item.value), 1)

  return (
    <SurfaceFrame title="Icon-density read instead of a plain bar list" kicker="Pictorial">
      <div className="space-y-3">
        {visual.items.map((item, index) => {
          const filled = Math.max(1, Math.round((item.value / max) * 12))
          return (
            <div
              key={item.label}
              className="rounded-[1rem] border border-border/45 bg-background/55 px-3 py-3"
              onMouseEnter={() =>
                setTooltip({
                  title: item.label,
                  color: palette[index % palette.length] ?? "#fe8339",
                  value: formatVisualValue(item.value, visual.formatter, formatCurrency),
                  subValue: `${filled}/12 markers filled`,
                })
              }
              onMouseLeave={() => setTooltip(null)}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="truncate text-sm font-medium text-foreground">{item.label}</div>
                <div className="text-sm font-semibold text-foreground">{formatVisualValue(item.value, visual.formatter, formatCurrency)}</div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {Array.from({ length: 12 }).map((_, dotIndex) => (
                  <span
                    key={dotIndex}
                    className="h-3.5 w-3.5 rounded-full border border-border/35"
                    style={{
                      backgroundColor: dotIndex < filled ? palette[index % palette.length] ?? "#fe8339" : "transparent",
                    }}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <SurfaceTooltip tooltip={tooltip} />
    </SurfaceFrame>
  )
}

function WaterfallSurface({
  visual,
  palette,
  formatCurrency,
}: {
  visual: Extract<PlaygroundVisual, { kind: "waterfall" }>
  palette: string[]
  formatCurrency: ReturnType<typeof useCurrency>["formatCurrency"]
}) {
  const [tooltip, setTooltip] = useState<SurfaceTooltipState | null>(null)
  let runningTotal = 0
  const bars = visual.steps.map((step) => {
    const start = step.isTotal ? 0 : runningTotal
    if (!step.isTotal) runningTotal += step.value
    const end = step.isTotal ? step.value : runningTotal
    return { ...step, start, end, total: end }
  })
  const values = bars.flatMap((bar) => [bar.start, bar.end])
  const { min, max, span } = getValueExtent(values)
  const width = 640
  const height = PLOT_HEIGHT
  const bottomPadding = 28
  const topPadding = 18
  const usableHeight = height - bottomPadding - topPadding
  const toY = (value: number) => height - bottomPadding - ((value - min) / span) * usableHeight
  const stepWidth = (width - 60) / Math.max(bars.length, 1)

  return (
    <SurfaceFrame title="Running total through positive and negative steps" kicker="Waterfall">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
        <line x1="32" y1={toY(0)} x2={width - 16} y2={toY(0)} stroke="currentColor" strokeOpacity="0.18" />
        {bars.map((bar, index) => {
          const x = 36 + index * stepWidth
          const y = Math.min(toY(bar.start), toY(bar.end))
          const height = Math.abs(toY(bar.start) - toY(bar.end))
          const color = bar.isTotal ? palette[1] ?? palette[2] ?? "#c49c66" : bar.value >= 0 ? "#88b37a" : palette[0] ?? "#fe8339"
          return (
            <g key={bar.label}>
              <rect
                x={x}
                y={y}
                width={stepWidth - 10}
                height={Math.max(height, 4)}
                rx="10"
                fill={color}
                opacity={bar.isTotal ? 0.92 : 0.84}
                onMouseEnter={() =>
                  setTooltip({
                    title: bar.label,
                    color,
                    value: formatVisualValue(bar.isTotal ? bar.total : bar.value, visual.formatter, formatCurrency),
                    subValue: `Running total ${formatVisualValue(bar.total, visual.formatter, formatCurrency)}`,
                  })
                }
                onMouseLeave={() => setTooltip(null)}
              />
              <text x={x + (stepWidth - 10) / 2} y={height - 6} textAnchor="middle" className="fill-muted-foreground text-[10px]">
                {bar.label}
              </text>
              <text x={x + (stepWidth - 10) / 2} y={y - 8} textAnchor="middle" className="fill-foreground text-[10px] font-medium">
                {formatVisualValue(bar.isTotal ? bar.total : bar.value, visual.formatter, formatCurrency)}
              </text>
            </g>
          )
        })}
      </svg>
      <SurfaceTooltip tooltip={tooltip} />
    </SurfaceFrame>
  )
}

function RankedListSurface({
  visual,
  palette,
  formatCurrency,
}: {
  visual: Extract<PlaygroundVisual, { kind: "rankedList" }>
  palette: string[]
  formatCurrency: ReturnType<typeof useCurrency>["formatCurrency"]
}) {
  const [tooltip, setTooltip] = useState<SurfaceTooltipState | null>(null)
  return (
    <SurfaceFrame title="Ordered leaderboard with context callouts" kicker="Ranked List">
      <div className="space-y-3">
        {visual.items.map((item, index) => (
          <div
            key={item.label}
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[1rem] border border-border/45 bg-background/55 px-3 py-3"
            onMouseEnter={() =>
              setTooltip({
                title: item.label,
                color: palette[index % palette.length] ?? "#fe8339",
                value: formatVisualValue(item.value, visual.formatter, formatCurrency),
                subValue: item.context ?? `Rank ${index + 1}`,
              })
            }
            onMouseLeave={() => setTooltip(null)}
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold"
              style={{ backgroundColor: mixAlpha(palette[index % palette.length], "22", "rgba(232,179,116,0.15)") }}
            >
              {index + 1}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-foreground">{item.label}</div>
              {item.context ? (
                <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/72">{item.context}</div>
              ) : null}
            </div>
            <div className="text-right text-sm font-semibold text-foreground">{formatVisualValue(item.value, visual.formatter, formatCurrency)}</div>
          </div>
        ))}
      </div>
      <SurfaceTooltip tooltip={tooltip} />
    </SurfaceFrame>
  )
}

function ProductionChartSurface({
  card,
  palette,
  formatCurrency,
}: {
  card: PlaygroundCardModel
  palette: string[]
  formatCurrency: ReturnType<typeof useCurrency>["formatCurrency"]
}) {
  switch (card.visual.kind) {
    case "trend":
      return <TrendSurface id={card.id} visual={card.visual} palette={palette} formatCurrency={formatCurrency} />
    case "bars":
      return <BarsSurface visual={card.visual} palette={palette} formatCurrency={formatCurrency} />
    case "heatmap":
      return <HeatmapSurface visual={card.visual} palette={palette} />
    case "gauge":
      return <GaugeSurface visual={card.visual} palette={palette} />
    case "scatter":
      return <ScatterSurface visual={card.visual} palette={palette} formatCurrency={formatCurrency} />
    case "dumbbell":
      return <DumbbellLikeSurface visual={card.visual} palette={palette} formatCurrency={formatCurrency} variant="dumbbell" />
    case "bullet":
      return <BulletSurface visual={card.visual} palette={palette} formatCurrency={formatCurrency} />
    case "dotPlot":
      return <DotPlotSurface visual={card.visual} palette={palette} formatCurrency={formatCurrency} />
    case "rangePlot":
      return <DumbbellLikeSurface visual={card.visual} palette={palette} formatCurrency={formatCurrency} variant="range" />
    case "arrowPlot":
      return <DumbbellLikeSurface visual={card.visual} palette={palette} formatCurrency={formatCurrency} variant="arrow" />
    case "groupedBars":
      return <GroupedBarsSurface visual={card.visual} palette={palette} formatCurrency={formatCurrency} />
    case "stackedBars":
      return <StackedBarsSurface visual={card.visual} palette={palette} formatCurrency={formatCurrency} />
    case "splitBars":
      return <SplitBarsSurface visual={card.visual} palette={palette} formatCurrency={formatCurrency} />
    case "treemap":
      return <TreemapSurface visual={card.visual} palette={palette} formatCurrency={formatCurrency} />
    case "boxplot":
      return <BoxplotSurface visual={card.visual} palette={palette} formatCurrency={formatCurrency} />
    case "funnel":
      return <FunnelSurface visual={card.visual} palette={palette} formatCurrency={formatCurrency} />
    case "sankey":
      return <SankeySurface visual={card.visual} palette={palette} formatCurrency={formatCurrency} />
    case "sunburst":
      return <SunburstSurface visual={card.visual} palette={palette} formatCurrency={formatCurrency} />
    case "parallel":
      return <ParallelSurface visual={card.visual} palette={palette} />
    case "pictorialBar":
      return <PictorialBarSurface visual={card.visual} palette={palette} formatCurrency={formatCurrency} />
    case "waterfall":
      return <WaterfallSurface visual={card.visual} palette={palette} formatCurrency={formatCurrency} />
    case "rankedList":
      return <RankedListSurface visual={card.visual} palette={palette} formatCurrency={formatCurrency} />
    default:
      return null
  }
}

export const ProductionPlaygroundChartCard = memo(function ProductionPlaygroundChartCard({
  card,
  isLoading = false,
}: {
  card: PlaygroundCardModel
  isLoading?: boolean
}) {
  const { resolvedTheme } = useTheme()
  const { getPalette } = useColorScheme()
  const { formatCurrency } = useCurrency()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const palette = useMemo(() => getPalette(), [getPalette])
  const isDark = resolvedTheme === "dark"
  const reviewChartId = (`testCharts:${card.id}` as unknown) as ChartId

  const infoDetails = [
    `Domain: ${card.domain}`,
    `Level: ${card.level}`,
    `Chart type: ${card.chartType}`,
    `Primary data: ${card.primaryDataNeeded}`,
    `Mock state: deterministic seeded chart preview`,
    `Originality: ${card.whyOriginal}`,
  ]

  const infoExtraContent = (
    <div className="space-y-3">
      <div className="rounded-lg border border-border/60 bg-background/70 px-3 py-3">
        <div className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">
          Why this chart works
        </div>
        <p className="mt-2 text-xs leading-relaxed text-foreground/88">{card.insight}</p>
      </div>
      <div className="rounded-lg border border-border/60 bg-background/70 px-3 py-3">
        <div className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">
          Data read
        </div>
        <p className="mt-2 text-xs leading-relaxed text-foreground/80">{card.primaryDataNeeded}</p>
      </div>
    </div>
  )

  const aiChartData = {
    domain: card.domain,
    level: card.level,
    chartType: card.chartType,
    metricLabel: card.metricLabel,
    metricValue: card.metricValue,
    crossFeature: card.crossFeature,
    extractionConfidence: card.extractionConfidence,
  }
  const surfaceSkeletonType = getSurfaceSkeletonType(card.visual)
  const surfaceIsEmpty = isSurfaceEmpty(card.visual)
  const shouldShowChartState = isLoading || surfaceIsEmpty

  const chartSurface = (
    <div
      className={cn(
        "relative min-h-[500px] px-0.5 py-1 pb-14 sm:px-1.5",
        isDark
          ? "bg-transparent"
          : "bg-transparent",
      )}
      style={{
        minHeight: SURFACE_HEIGHT,
        backgroundImage: "none",
      }}
    >
      {shouldShowChartState ? (
        <ChartLoadingState
          isLoading={isLoading}
          skeletonType={surfaceSkeletonType}
          emptyIcon="chart"
          emptyTitle="No preview data yet"
          emptyDescription="This chart needs a stronger scenario bundle before it can render."
          height="h-full"
        />
      ) : (
        <ProductionChartSurface card={card} palette={palette} formatCurrency={formatCurrency} />
      )}
      <div className="absolute bottom-2 right-2 rounded-[0.85rem] border border-border/35 bg-background/78 px-2 py-1.5 text-right shadow-sm backdrop-blur-sm">
        <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/72">
          {card.metricLabel}
        </div>
        <div className="mt-0.5 text-base font-semibold tracking-[-0.03em] text-foreground">{card.metricValue}</div>
      </div>
      <ChartCardFloatingMeta
        insight={
          <ChartAiInsightButton
            chartId={reviewChartId}
            chartTitle={card.title}
            chartDescription={card.question}
            chartData={aiChartData}
          />
        }
        info={
          <ChartInfoPopover
            title={card.title}
            description={card.question}
            details={infoDetails}
            extraContent={infoExtraContent}
          />
        }
      />
    </div>
  )

  return (
    <>
      <Card className="group h-full border-border/55 bg-card/92 shadow-[0_22px_55px_-38px_rgba(0,0,0,0.55)] transition-all duration-300 hover:-translate-y-0.5 hover:border-border/80">
        <CardHeader className={cn(chartCardHeaderRowClassName, "gap-1.5 px-3.5 pt-3.5")}>
          <div className={chartCardHeaderLeadingClassName}>
            <div className={chartCardHeaderIconClusterClassName}>
              <GridStackCardDragHandle />
              <ChartExpandButton onClick={() => setIsFullscreen(true)} />
              <ChartFavoriteButton chartId={reviewChartId} chartTitle={card.title} />
            </div>
            <div className="min-w-0">
              <CardTitle className={cn(chartCardHeaderTitleClassName, "text-[0.9rem] leading-snug tracking-[-0.02em]")}>
                {card.title}
              </CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-1.5 px-3.5 pb-3.5 pt-1">
          <CardDescription className="max-w-none text-[0.74rem] leading-relaxed text-muted-foreground/76">
            {card.question}
          </CardDescription>
          {chartSurface}
        </CardContent>
      </Card>

      <ChartFullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title={card.title}
        description={card.question}
        headerActions={
          <>
            <ChartAiInsightButton
              chartId={reviewChartId}
              chartTitle={card.title}
              chartDescription={card.question}
              chartData={aiChartData}
            />
            <ChartInfoPopover title={card.title} description={card.question} details={infoDetails} extraContent={infoExtraContent} />
          </>
        }
        orientation={card.chartType.toLowerCase().includes("gauge") || card.chartType.toLowerCase().includes("funnel") ? "portrait" : "landscape"}
      >
        <div className="flex h-full flex-col gap-4">
          <div className="rounded-2xl border border-border/45 bg-card/70 p-4">
            <div className="mb-4 flex flex-wrap gap-2">
              {card.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border/45 bg-background/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
            {shouldShowChartState ? (
              <div
                className={cn(
                  "rounded-[1.35rem] border border-border/55 px-4 py-4 sm:px-5",
                  isDark
                    ? "bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))]"
                    : "bg-[linear-gradient(180deg,rgba(18,18,18,0.03),rgba(18,18,18,0.008))]",
                )}
                style={{
                  minHeight: SURFACE_HEIGHT,
                  backgroundImage: `radial-gradient(circle at top right, ${mixAlpha(palette[0], "18", "rgba(254,131,57,0.08)")} 0%, transparent 42%), radial-gradient(circle at bottom left, ${mixAlpha(palette[2] ?? palette[1], "10", "rgba(194,156,102,0.08)")} 0%, transparent 58%)`,
                }}
              >
                <ChartLoadingState
                  isLoading={isLoading}
                  skeletonType={surfaceSkeletonType}
                  emptyIcon="chart"
                  emptyTitle="No preview data yet"
                  emptyDescription="This chart needs a stronger scenario bundle before it can render."
                  height="h-full"
                />
              </div>
            ) : (
              chartSurface
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/45 bg-card/70 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/75">
                {card.metricLabel}
              </div>
              <div className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{card.metricValue}</div>
            </div>
            <div className="rounded-2xl border border-border/45 bg-card/70 p-4 text-sm leading-relaxed text-muted-foreground/88">
              {card.insight}
            </div>
          </div>
        </div>
      </ChartFullscreenModal>
    </>
  )
})
