"use client"

import { memo, useMemo, useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { ResponsivePie } from "@nivo/pie"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { ChartExpandButton } from "@/components/chart-expand-button"
import { ChartFullscreenModal } from "@/components/chart-fullscreen-modal"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import { ChartLoadingState } from "@/components/chart-loading-state"
import { NivoChartTooltip } from "@/components/chart-tooltip"
import { getChartTextColor } from "@/lib/chart-colors"

interface ChartRecurringVsOneTimeProps {
  data: Array<{
    date: string
    amount: number
    category?: string
    isRecurring?: boolean
    description: string
  }>
  isLoading?: boolean
  emptyTitle?: string
  emptyDescription?: string
}

const RECURRING_KEYWORDS = [
  "subscription", "netflix", "spotify", "amazon prime", "gym", "membership",
  "insurance", "rent", "mortgage", "utility", "phone", "internet", "electric",
  "water", "loan", "hulu", "disney", "apple music", "icloud", "youtube premium",
  "adobe", "microsoft 365", "dropbox", "chatgpt", "openai", "github",
  "google storage", "google one",
]

const RECURRING_CATEGORIES = [
  "subscription", "subscriptions", "recurring", "bills", "utilities",
]

function isLikelyRecurring(description: string, category?: string): boolean {
  if (category && RECURRING_CATEGORIES.some((c) => category.toLowerCase().includes(c))) {
    return true
  }
  const lower = description.toLowerCase()
  return RECURRING_KEYWORDS.some((kw) => lower.includes(kw))
}

export const ChartRecurringVsOneTime = memo(function ChartRecurringVsOneTime({
  data,
  isLoading = false,
  emptyTitle,
  emptyDescription,
}: ChartRecurringVsOneTimeProps) {
  const { resolvedTheme } = useTheme()
  const { colorScheme, getShuffledPalette } = useColorScheme()
  const { formatCurrency } = useCurrency()
  const [mounted, setMounted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const palette = useMemo(() => getShuffledPalette(), [getShuffledPalette])

  useEffect(() => {
    setMounted(true)
  }, [])

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []

    let recurringTotal = 0
    let oneTimeTotal = 0
    let recurringCount = 0
    let oneTimeCount = 0

    data.forEach((tx) => {
      if (tx.amount >= 0) return
      const amount = Math.abs(tx.amount)
      const recurring = tx.isRecurring ?? isLikelyRecurring(tx.description, tx.category)

      if (recurring) {
        recurringTotal += amount
        recurringCount++
      } else {
        oneTimeTotal += amount
        oneTimeCount++
      }
    })

    if (recurringTotal === 0 && oneTimeTotal === 0) return []

    return [
      { id: "Recurring", label: "Recurring", value: recurringTotal, count: recurringCount, color: palette[0] || "#fe8339" },
      { id: "One-Time", label: "One-Time", value: oneTimeTotal, count: oneTimeCount, color: palette[2] || "#3b82f6" },
    ].filter((d) => d.value > 0)
  }, [data, palette])

  const total = useMemo(() => chartData.reduce((sum, d) => sum + d.value, 0), [chartData])
  const isDark = resolvedTheme === "dark"
  const textColor = getChartTextColor(isDark)

  const chartTitle = "Recurring vs One-Time"
  const chartDescription = "See how much of your spending is on subscriptions and recurring bills versus one-time purchases."

  const renderInfoTrigger = (forFullscreen = false) => (
    <div className={`flex items-center gap-2 ${forFullscreen ? "" : "hidden md:flex flex-col"}`}>
      <ChartInfoPopover
        title={chartTitle}
        description={chartDescription}
        details={[
          "Recurring: subscriptions, bills, memberships",
          "One-Time: individual purchases",
          "Detected using transaction descriptions",
        ]}
      />
      <ChartAiInsightButton
        chartId="recurringVsOneTime"
        chartTitle={chartTitle}
        chartDescription={chartDescription}
        chartData={{ categories: chartData, total }}
        size="sm"
      />
    </div>
  )

  const renderChart = () => (
    <ResponsivePie
      data={chartData}
      margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      innerRadius={0.5}
      padAngle={0.7}
      cornerRadius={3}
      activeOuterRadiusOffset={8}
      colors={{ datum: "data.color" }}
      borderWidth={0}
      enableArcLinkLabels={false}
      arcLabelsSkipAngle={15}
      valueFormat={(v) => formatCurrency(v)}
      tooltip={({ datum }) => {
        const pct = total > 0 ? (Number(datum.value) / total) * 100 : 0
        const count = (datum.data as { count?: number }).count
        return (
          <NivoChartTooltip
            title={datum.label as string}
            titleColor={datum.color as string}
            value={formatCurrency(Number(datum.value))}
            subValue={`${pct.toFixed(1)}% of total${count ? ` · ${count} txns` : ""}`}
          />
        )
      }}
      theme={{ text: { fill: textColor, fontSize: 12 } }}
      animate={true}
      motionConfig="gentle"
    />
  )

  if (!mounted || isLoading || chartData.length === 0) {
    return (
      <Card className="@container/card h-full relative">
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton chartId="recurringVsOneTime" chartTitle={chartTitle} size="md" />
            <CardTitle>{chartTitle}</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex flex-col flex-1 min-h-0">
          <div className="h-full w-full min-h-[250px]">
            <ChartLoadingState
              isLoading={isLoading || !mounted}
              skeletonType="pie"
              emptyTitle={emptyTitle || "No transaction data yet"}
              emptyDescription={emptyDescription || "Import your bank statements to see recurring vs one-time spending."}
            />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <ChartFullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title={chartTitle}
        description={chartDescription}
        headerActions={renderInfoTrigger(true)}
      >
        <div className="h-full w-full min-h-[400px]" key={colorScheme}>
          {renderChart()}
        </div>
      </ChartFullscreenModal>

      <Card className="@container/card h-full relative">
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton chartId="recurringVsOneTime" chartTitle={chartTitle} size="md" />
            <CardTitle>{chartTitle}</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex flex-col flex-1 min-h-0">
          <div className="h-full w-full min-h-[250px]" key={colorScheme}>
            {renderChart()}
          </div>
        </CardContent>
      </Card>
    </>
  )
})

ChartRecurringVsOneTime.displayName = "ChartRecurringVsOneTime"
