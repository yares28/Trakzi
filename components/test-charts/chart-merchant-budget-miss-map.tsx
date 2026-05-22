"use client"

import { Fragment, memo, useMemo, useState } from "react"
import { useTheme } from "next-themes"

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
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CHART_METADATA } from "@/lib/chart-metadata"
import { cn } from "@/lib/utils"

import type { PlaygroundCardModel } from "./one-click-playground-catalog"

const CHART_ID = "testCharts:merchantBudgetMissMap" as const

type MerchantCell = {
  amount: number
  hitCount: number
}

type MerchantRow = {
  merchant: string
  totalAmount: number
  totalHits: number
  activeMonths: number
  cells: Record<string, MerchantCell>
}

type ChartModel = {
  hasBudgets: boolean
  hasMisses: boolean
  monthKeys: string[]
  monthLabels: Record<string, string>
  monthTotals: Record<string, number>
  merchants: MerchantRow[]
  maxCellAmount: number
  missedMonthCount: number
  missedCategoryCount: number
  missedPairCount: number
  totalLinkedSpend: number
  totalOvershoot: number
  topMerchant: string | null
  topMerchantAmount: number
  topMerchantHits: number
}

function toTitleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function toMonthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`
}

function toMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-")
  const label = new Date(Date.UTC(Number(year), Number(month) - 1, 1)).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  })
  return label.replace(" ", " ")
}

function compactAmount(value: number) {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return `${Math.round(value)}`
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "")
  const fallback = { r: 254, g: 131, b: 57 }
  if (normalized.length !== 6) return fallback
  const parsed = Number.parseInt(normalized, 16)
  if (!Number.isFinite(parsed)) return fallback
  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255,
  }
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

function buildMockChartModel(card: PlaygroundCardModel): ChartModel {
  const seed = hashString(`${card.id}:${card.title}:${card.chartType}`)
  const today = new Date()
  const baseMerchants = [
    "amazon market",
    "mercadona city",
    "shell station",
    "ikea order",
    "ubereats local",
    "airbnb travel",
    "carrefour stop",
    "apple media",
    "aldi weekly",
    "zara home",
    "lidl express",
    "spotify family",
  ]

  const selectedMerchants = baseMerchants
    .map((merchant, index) => ({
      merchant,
      score: seededUnit(seed, index + 1),
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 8)
    .map((entry) => entry.merchant)

  const monthKeys = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - (5 - index), 1))
    return toMonthKey(date)
  })

  const monthLabels = monthKeys.reduce<Record<string, string>>((accumulator, monthKey) => {
    accumulator[monthKey] = toMonthLabel(monthKey)
    return accumulator
  }, {})

  const monthTotals: Record<string, number> = {}
  const merchants: MerchantRow[] = selectedMerchants.map((merchant, merchantIndex) => {
    const cells: Record<string, MerchantCell> = {}
    let totalAmount = 0
    let totalHits = 0
    let activeMonths = 0

    monthKeys.forEach((monthKey, monthIndex) => {
      const shape = seededUnit(seed + merchantIndex * 17, monthIndex + 1)
      const active = shape > 0.18 || merchantIndex < 3
      if (!active) return

      const amount = Math.round((320 + seededUnit(seed + merchantIndex * 29, monthIndex + 11) * 1650) / 10) * 10
      const hitCount = 2 + Math.floor(seededUnit(seed + merchantIndex * 43, monthIndex + 21) * 6)

      cells[monthKey] = { amount, hitCount }
      totalAmount += amount
      totalHits += hitCount
      activeMonths += 1
      monthTotals[monthKey] = (monthTotals[monthKey] ?? 0) + amount
    })

    return {
      merchant,
      totalAmount,
      totalHits,
      activeMonths,
      cells,
    }
  })
    .filter((merchant) => merchant.totalAmount > 0)
    .sort((left, right) => right.totalAmount - left.totalAmount)

  const maxCellAmount = Math.max(
    0,
    ...merchants.flatMap((merchant) => monthKeys.map((monthKey) => merchant.cells[monthKey]?.amount ?? 0)),
  )

  const missedMonthCount = monthKeys.filter((monthKey) => (monthTotals[monthKey] ?? 0) > 0).length
  const missedCategoryCount = 4 + Math.floor(seededUnit(seed, 91) * 4)
  const missedPairCount = missedMonthCount * missedCategoryCount
  const totalLinkedSpend = Object.values(monthTotals).reduce((sum, value) => sum + value, 0)
  const totalOvershoot = Math.round(totalLinkedSpend * (0.18 + seededUnit(seed, 101) * 0.16))

  return {
    hasBudgets: true,
    hasMisses: merchants.length > 0,
    monthKeys,
    monthLabels,
    monthTotals,
    merchants,
    maxCellAmount,
    missedMonthCount,
    missedCategoryCount,
    missedPairCount,
    totalLinkedSpend,
    totalOvershoot,
    topMerchant: merchants[0]?.merchant ?? null,
    topMerchantAmount: merchants[0]?.totalAmount ?? 0,
    topMerchantHits: merchants[0]?.totalHits ?? 0,
  }
}

function MerchantMissHeatmap({
  model,
  baseColor,
  isDark,
  formatCurrency,
  className,
}: {
  model: ChartModel
  baseColor: string
  isDark: boolean
  formatCurrency: ReturnType<typeof useCurrency>["formatCurrency"]
  className?: string
}) {
  const { r, g, b } = hexToRgb(baseColor)

  if (!model.hasBudgets) {
    return (
      <ChartLoadingState
        isLoading={false}
        skeletonType="grid"
        emptyTitle="Scenario model unavailable"
        emptyDescription="This implementation expects a deterministic scenario dataset for the current surface."
        height="min-h-[360px]"
        className={className}
      />
    )
  }

  if (!model.hasMisses) {
    return (
      <ChartLoadingState
        isLoading={false}
        skeletonType="grid"
        emptyTitle="No miss activity"
        emptyDescription="This scenario did not generate any merchant miss cells."
        height="min-h-[360px]"
        className={className}
      />
    )
  }

  return (
    <div className={cn("min-h-[320px] space-y-3", className)}>
      <div
        className="grid min-w-[680px] gap-2"
        style={{
          gridTemplateColumns: `minmax(132px,1.35fr) repeat(${model.monthKeys.length}, minmax(72px,1fr)) minmax(82px,0.85fr)`,
        }}
      >
        <div className="px-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/72">
          Merchant
        </div>
        {model.monthKeys.map((monthKey) => (
          <div key={monthKey} className="px-1 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/76">
              {model.monthLabels[monthKey]}
            </div>
            <div className="mt-1 text-[11px] font-medium text-foreground/85">
              {compactAmount(model.monthTotals[monthKey] ?? 0)}
            </div>
          </div>
        ))}
        <div className="px-1 text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/76">
          Total
        </div>

        {model.merchants.map((merchant) => (
          <Fragment key={merchant.merchant}>
            <div className="flex min-h-[56px] items-center px-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-foreground">{toTitleCase(merchant.merchant)}</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/72">
                  {merchant.totalHits} hits in {merchant.activeMonths} months
                </div>
              </div>
            </div>
            {model.monthKeys.map((monthKey) => {
              const cell = merchant.cells[monthKey]
              const value = cell?.amount ?? 0
              const ratio = model.maxCellAmount > 0 ? value / model.maxCellAmount : 0
              const alpha = value > 0 ? 0.14 + ratio * 0.72 : isDark ? 0.05 : 0.035
              const borderAlpha = value > 0 ? 0.18 + ratio * 0.4 : 0.1
              const textClassName =
                value > 0 && ratio > 0.52 ? "text-white" : isDark ? "text-foreground/86" : "text-foreground/82"

              return (
                <div
                  key={`${merchant.merchant}-${monthKey}`}
                  className={cn(
                    "flex min-h-[56px] flex-col justify-between rounded-[1rem] border p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-transform duration-200 hover:-translate-y-0.5",
                    textClassName,
                  )}
                  style={{
                    borderColor: `rgba(${r},${g},${b},${borderAlpha})`,
                    backgroundColor: `rgba(${r},${g},${b},${alpha})`,
                  }}
                  title={`${toTitleCase(merchant.merchant)} · ${model.monthLabels[monthKey]} · ${formatCurrency(value, { maximumFractionDigits: 0 })} across ${cell?.hitCount ?? 0} transactions`}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] opacity-80">
                    {cell?.hitCount ? `${cell.hitCount} tx` : " "}
                  </span>
                  <span className="text-sm font-semibold tracking-[-0.02em]">
                    {value > 0 ? compactAmount(value) : "–"}
                  </span>
                </div>
              )
            })}
            <div className="flex min-h-[56px] items-center justify-end px-1 text-right">
              <div>
                <div className="text-sm font-semibold tracking-[-0.02em] text-foreground">
                  {compactAmount(merchant.totalAmount)}
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/72">
                  linked spend
                </div>
              </div>
            </div>
          </Fragment>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-[1rem] border border-border/45 bg-background/55 px-3 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/74">
            Miss months
          </div>
          <div className="mt-1.5 text-lg font-semibold tracking-[-0.03em] text-foreground">{model.missedMonthCount}</div>
        </div>
        <div className="rounded-[1rem] border border-border/45 bg-background/55 px-3 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/74">
            Miss categories
          </div>
          <div className="mt-1.5 text-lg font-semibold tracking-[-0.03em] text-foreground">{model.missedCategoryCount}</div>
        </div>
        <div className="rounded-[1rem] border border-border/45 bg-background/55 px-3 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/74">
            Budget-linked spend
          </div>
          <div className="mt-1.5 text-lg font-semibold tracking-[-0.03em] text-foreground">
            {formatCurrency(model.totalLinkedSpend, { maximumFractionDigits: 0 })}
          </div>
        </div>
      </div>
    </div>
  )
}

export const ChartMerchantBudgetMissMap = memo(function ChartMerchantBudgetMissMap({
  card,
}: {
  card: PlaygroundCardModel
}) {
  const { resolvedTheme } = useTheme()
  const { getPalette } = useColorScheme()
  const { formatCurrency } = useCurrency()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const palette = useMemo(() => getPalette(), [getPalette])
  const isDark = resolvedTheme === "dark"
  const chartMeta = CHART_METADATA[CHART_ID]
  const model = useMemo(() => buildMockChartModel(card), [card])

  const topMerchantLabel = model.topMerchant ? toTitleCase(model.topMerchant) : "No misses"
  const infoDetails = [
    "Uses deterministic scenario data so the chart stays stable while this implementation remains disconnected from live budgets.",
    "Each cell represents merchant-linked spend inside an over-budget category-month pair.",
    "Opacity carries linked spend and the count badge shows repeated miss frequency.",
    `Category-month miss pairs in this scenario: ${model.missedPairCount}`,
    `Linked spend represented: ${formatCurrency(model.totalLinkedSpend, { maximumFractionDigits: 0 })}`,
  ]

  const aiChartData = {
    topMerchant: topMerchantLabel,
    topMerchantAmount: model.topMerchantAmount,
    topMerchantHits: model.topMerchantHits,
    missedMonths: model.missedMonthCount,
    missedCategories: model.missedCategoryCount,
    missedPairs: model.missedPairCount,
    totalLinkedSpend: model.totalLinkedSpend,
    totalOvershoot: model.totalOvershoot,
  }

  const chartSurface = (
    <div
      className={cn(
        "relative overflow-hidden min-h-[430px] px-0.5 py-1 pb-14 sm:px-1.5",
        isDark
          ? "bg-transparent"
          : "bg-transparent",
      )}
      style={{
        backgroundImage: "none",
      }}
    >
      <MerchantMissHeatmap
        model={model}
        baseColor={palette[0] ?? "#fe8339"}
        isDark={isDark}
        formatCurrency={formatCurrency}
      />
      <div className="absolute bottom-2 right-2 rounded-[0.85rem] border border-border/35 bg-background/78 px-2 py-1.5 text-right shadow-sm backdrop-blur-sm">
        <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/72">
          Worst repeat source
        </div>
        <div className="mt-0.5 text-[13px] font-semibold tracking-[-0.02em] text-foreground">{topMerchantLabel}</div>
        <div className="mt-0.5 text-[11px] text-muted-foreground/78">
          {formatCurrency(model.topMerchantAmount, { maximumFractionDigits: 0 })}
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
            <MerchantMissHeatmap
              model={model}
              baseColor={palette[0] ?? "#fe8339"}
              isDark={isDark}
              formatCurrency={formatCurrency}
              className="min-h-[420px]"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/45 bg-card/70 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/75">
                Worst repeat source
              </div>
              <div className="mt-2 text-xl font-semibold tracking-[-0.03em]">{topMerchantLabel}</div>
              <div className="mt-2 text-sm text-muted-foreground/85">
                {formatCurrency(model.topMerchantAmount, { maximumFractionDigits: 0 })} across {model.topMerchantHits} hits
              </div>
            </div>
            <div className="rounded-2xl border border-border/45 bg-card/70 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/75">
                Budget overshoot captured
              </div>
              <div className="mt-2 text-xl font-semibold tracking-[-0.03em]">
                {formatCurrency(model.totalOvershoot, { maximumFractionDigits: 0 })}
              </div>
              <div className="mt-2 text-sm text-muted-foreground/85">{model.missedPairCount} category-month misses</div>
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

ChartMerchantBudgetMissMap.displayName = "ChartMerchantBudgetMissMap"
