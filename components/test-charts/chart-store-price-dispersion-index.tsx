"use client"

import { memo, useMemo, useState } from "react"
import { useTheme } from "next-themes"

import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { ChartExpandButton } from "@/components/chart-expand-button"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { ChartFullscreenModal } from "@/components/chart-fullscreen-modal"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import {
  ChartCardFloatingMeta,
  chartCardHeaderIconClusterClassName,
  chartCardHeaderLeadingClassName,
  chartCardHeaderRowClassName,
  chartCardHeaderTitleClassName,
} from "@/components/chart-card-overlay-controls"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CHART_METADATA } from "@/lib/chart-metadata"
import { cn } from "@/lib/utils"

import type { PlaygroundCardModel } from "./one-click-playground-catalog"

const CHART_ID = "testCharts:storePriceDispersionIndex" as const

type StoreDispersionRow = {
  store: string
  min: number
  q1: number
  median: number
  q3: number
  max: number
}

function hashString(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0
  }
  return Math.abs(hash)
}

function seededUnit(seed: number, offset: number) {
  const value = Math.sin(seed * 12.9898 + offset * 78.233) * 43758.5453
  return value - Math.floor(value)
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function buildMockRows(card: PlaygroundCardModel): StoreDispersionRow[] {
  const seed = hashString(`${card.id}:${card.title}:${card.chartType}`)
  const stores = ["Mercadona", "Lidl", "Carrefour", "Aldi", "Costco", "Whole Foods"]

  return stores
    .map((store, index) => {
      const floor = round(0.8 + seededUnit(seed, index + 1) * 2.4)
      const q1 = round(floor + 0.35 + seededUnit(seed + 7, index + 1) * 1.3)
      const median = round(q1 + 0.18 + seededUnit(seed + 17, index + 1) * 1.15)
      const q3 = round(median + 0.22 + seededUnit(seed + 29, index + 1) * 1.35)
      const ceiling = round(q3 + 0.35 + seededUnit(seed + 41, index + 1) * 2.5)

      return {
        store,
        min: floor,
        q1,
        median,
        q3,
        max: ceiling,
      }
    })
    .sort((left, right) => (right.max - right.min) - (left.max - left.min))
}

function formatCompactCurrency(
  value: number,
  formatCurrency: ReturnType<typeof useCurrency>["formatCurrency"],
) {
  return formatCurrency(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function PriceDispersionPlot({
  rows,
  baseColor,
  formatCurrency,
  className,
}: {
  rows: StoreDispersionRow[]
  baseColor: string
  formatCurrency: ReturnType<typeof useCurrency>["formatCurrency"]
  className?: string
}) {
  const maxValue = Math.max(...rows.map((row) => row.max), 1)
  const minValue = Math.min(...rows.map((row) => row.min), 0)
  const span = Math.max(maxValue - minValue, 1)

  const toPct = (value: number) => ((value - minValue) / span) * 100

  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid grid-cols-[minmax(110px,1fr)_minmax(0,2.6fr)_auto] items-end gap-3 px-1">
        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/72">Store</div>
        <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/72">
          <span>Low-price lines</span>
          <span>High-price lines</span>
        </div>
        <div className="text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/72">
          Spread
        </div>
      </div>

      {rows.map((row, index) => {
        const spread = row.max - row.min
        return (
          <div key={row.store} className="grid grid-cols-[minmax(110px,1fr)_minmax(0,2.6fr)_auto] items-center gap-3 rounded-[1rem] border border-border/45 bg-background/50 px-3 py-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-foreground">{row.store}</div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/72">
                median {formatCompactCurrency(row.median, formatCurrency)}
              </div>
            </div>

            <div className="relative h-12">
              <div className="absolute top-1/2 h-px -translate-y-1/2 bg-border/65" style={{ left: `${toPct(row.min)}%`, width: `${toPct(row.max) - toPct(row.min)}%` }} />
              <div className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border/60 bg-background" style={{ left: `${toPct(row.min)}%` }} />
              <div className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border/60 bg-background" style={{ left: `${toPct(row.max)}%` }} />
              <div
                className="absolute top-1/2 h-5 -translate-y-1/2 rounded-[0.7rem] border shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                style={{
                  left: `${toPct(row.q1)}%`,
                  width: `${Math.max(toPct(row.q3) - toPct(row.q1), 3)}%`,
                  backgroundColor: `${baseColor}33`,
                  borderColor: `${baseColor}66`,
                }}
              />
              <div
                className="absolute top-1/2 h-6 w-[2px] -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ left: `${toPct(row.median)}%`, backgroundColor: baseColor }}
              />
              <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-muted-foreground/68">
                <span>{formatCompactCurrency(row.min, formatCurrency)}</span>
                <span>{formatCompactCurrency(row.max, formatCurrency)}</span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-base font-semibold tracking-[-0.03em] text-foreground">{formatCompactCurrency(spread, formatCurrency)}</div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/72">
                #{index + 1}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export const ChartStorePriceDispersionIndex = memo(function ChartStorePriceDispersionIndex({
  card,
}: {
  card: PlaygroundCardModel
}) {
  const { resolvedTheme } = useTheme()
  const { getPalette } = useColorScheme()
  const { formatCurrency } = useCurrency()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const palette = useMemo(() => getPalette(), [getPalette])
  const chartMeta = CHART_METADATA[CHART_ID]
  const rows = useMemo(() => buildMockRows(card), [card])
  const isDark = resolvedTheme === "dark"

  const widestStore = rows[0]
  const tightestStore = rows.at(-1)
  const widestSpread = widestStore ? widestStore.max - widestStore.min : 0
  const dispersionSpan = rows.length ? Math.max(...rows.map((row) => row.max)) - Math.min(...rows.map((row) => row.min)) : 0

  const infoDetails = [
    "Uses deterministic scenario price-per-line distributions so the card stays stable without live receipt wiring.",
    "Whiskers show the lowest and highest line-level prices seen for that store.",
    "The box shows the interquartile span and the copper rule marks the median line price.",
    `Widest spread in this scenario: ${widestStore?.store ?? "N/A"} at ${formatCompactCurrency(widestSpread, formatCurrency)}`,
  ]

  const aiChartData = {
    widestStore: widestStore?.store ?? "N/A",
    tightestStore: tightestStore?.store ?? "N/A",
    widestSpread,
    totalSpan: dispersionSpan,
    storeCount: rows.length,
  }

  const chartSurface = (
    <div
      className={cn(
        "relative overflow-hidden min-h-[500px] px-0.5 py-1 pb-14 sm:px-1.5",
        isDark
          ? "bg-transparent"
          : "bg-transparent",
      )}
      style={{
        backgroundImage: "none",
      }}
    >
      <PriceDispersionPlot rows={rows} baseColor={palette[0] ?? "#e78a53"} formatCurrency={formatCurrency} />
      <div className="absolute bottom-2 right-2 rounded-[0.85rem] border border-border/35 bg-background/78 px-2 py-1.5 text-right shadow-sm backdrop-blur-sm">
        <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/72">
          Widest spread
        </div>
        <div className="mt-0.5 text-[13px] font-semibold tracking-[-0.02em] text-foreground">
          {widestStore?.store ?? "N/A"}
        </div>
        <div className="mt-0.5 text-[11px] text-muted-foreground/78">
          {formatCompactCurrency(widestSpread, formatCurrency)}
        </div>
      </div>
      <ChartCardFloatingMeta
        insight={
          <ChartAiInsightButton
            chartId={CHART_ID}
            chartTitle={card.title}
            chartDescription={chartMeta.description}
            chartData={aiChartData}
          />
        }
        info={<ChartInfoPopover title={card.title} description={card.question} details={infoDetails} />}
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
              <ChartFavoriteButton chartId={CHART_ID} chartTitle={card.title} />
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
        description={chartMeta.description}
        headerActions={
          <>
            <ChartAiInsightButton
              chartId={CHART_ID}
              chartTitle={card.title}
              chartDescription={chartMeta.description}
              chartData={aiChartData}
            />
            <ChartInfoPopover title={card.title} description={card.question} details={infoDetails} />
          </>
        }
        orientation="landscape"
      >
        <div className="flex h-full flex-col gap-4">
          <div className="rounded-2xl border border-border/45 bg-card/70 p-4">
            <PriceDispersionPlot
              rows={rows}
              baseColor={palette[0] ?? "#e78a53"}
              formatCurrency={formatCurrency}
              className="min-h-[420px]"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/45 bg-card/70 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/75">
                Widest spread
              </div>
              <div className="mt-2 text-xl font-semibold tracking-[-0.03em]">{widestStore?.store ?? "N/A"}</div>
              <div className="mt-2 text-sm text-muted-foreground/85">
                {formatCompactCurrency(widestSpread, formatCurrency)}
              </div>
            </div>
            <div className="rounded-2xl border border-border/45 bg-card/70 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/75">
                Tightest store
              </div>
              <div className="mt-2 text-xl font-semibold tracking-[-0.03em]">{tightestStore?.store ?? "N/A"}</div>
              <div className="mt-2 text-sm text-muted-foreground/85">
                {tightestStore ? formatCompactCurrency(tightestStore.max - tightestStore.min, formatCurrency) : "N/A"}
              </div>
            </div>
            <div className="rounded-2xl border border-border/45 bg-card/70 p-4 text-sm leading-relaxed text-muted-foreground/88">
              Deterministic line-price dispersion keeps the implementation honest about spread, not just average
              price, so the card still communicates the right decision signal before live wiring exists.
            </div>
          </div>
        </div>
      </ChartFullscreenModal>
    </>
  )
})

ChartStorePriceDispersionIndex.displayName = "ChartStorePriceDispersionIndex"
