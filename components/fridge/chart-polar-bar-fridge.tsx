"use client"

import { useMemo } from "react"
import { ResponsivePolarBar } from "@nivo/polar-bar"
import { useTheme } from "next-themes"
import { IconGripVertical } from "@tabler/icons-react"

import { ChartInfoPopover } from "@/components/chart-info-popover"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { ChartLoadingState } from "@/components/chart-loading-state"
import { useColorScheme } from "@/components/color-scheme-provider"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { toNumericValue } from "@/lib/utils"

interface ChartPolarBarFridgeProps {
  data?:
  | Array<Record<string, string | number>>
  | { data: Array<Record<string, string | number>>; keys: string[] }
  storeSpendingData?: Array<{ storeName: string; total: number; count: number }>
  keys?: string[]
  isLoading?: boolean
}

export function ChartPolarBarFridge({
  data: dataProp = [],
  storeSpendingData,
  keys: keysProp,
  isLoading = false,
}: ChartPolarBarFridgeProps) {
  const { resolvedTheme } = useTheme()
  const { getPalette } = useColorScheme()

  const chartColors = useMemo(() => {
    const palette = getPalette().filter((color) => color !== "#c3c3c3")
    return resolvedTheme === "dark" ? [...palette].reverse() : palette
  }, [getPalette, resolvedTheme])

  const chartData = Array.isArray(dataProp) ? dataProp : dataProp.data || []
  const chartKeys = keysProp || (Array.isArray(dataProp) ? [] : dataProp.keys) || []

  const sanitizedChartData = useMemo(() => {
    if (!chartData || chartData.length === 0) return []
    return chartData.map((row) => {
      const sanitized: Record<string, string | number> = {}
      Object.entries(row).forEach(([key, value]) => {
        if (key === "month") {
          sanitized[key] = String(value ?? "")
        } else {
          sanitized[key] = toNumericValue(value)
        }
      })
      return sanitized
    })
  }, [chartData])

  const finalKeys = chartKeys.length
    ? chartKeys
    : sanitizedChartData.length
      ? Object.keys(sanitizedChartData[0]).filter((key) => key !== "month")
      : []

  const infoAction = (
    <div className="flex flex-col items-center gap-2">
      <ChartInfoPopover
        title="Store Spend Mix"
        description="Track monthly grocery spending across your most-visited stores."
        details={[
          "Each ring is a month; each colored segment is a store.",
          "This helps you spot which stores dominate your budget and how that mix changes over time.",
        ]}
        ignoredFootnote="Only receipts inside the selected time filter are included."
      />
      <ChartAiInsightButton
        chartId="fridge:store-spend-mix"
        chartTitle="Store Spend Mix"
        chartDescription="Monthly grocery spend across stores."
        chartData={{
          months: sanitizedChartData.map((d) => d.month as string),
          stores: finalKeys,
          dataPoints: sanitizedChartData.length,
        }}
        size="sm"
      />
    </div>
  )

  const legendItemWidth = useMemo(() => {
    if (!finalKeys.length) return 70
    const longest = finalKeys.reduce((max, key) => Math.max(max, key.length), 0)
    const baseWidth = Math.min(Math.max(longest * 9, 90), 200)
    return Math.max(baseWidth - 20, 70)
  }, [finalKeys])

  const axisText = resolvedTheme === "dark" ? "oklch(0.6268 0 0)" : "oklch(0.551 0.0234 264.3637)"

  const polarTheme = useMemo(
    () => ({
      axis: {
        ticks: {
          text: {
            fill: axisText,
          },
        },
      },
      legends: {
        text: {
          fill: axisText,
        },
      },
    }),
    [axisText]
  )

  const hasData = sanitizedChartData.length > 0 && finalKeys.length > 0

  return (
    <Card className="@container/card relative">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="gridstack-drag-handle -m-1 inline-flex cursor-grab touch-none select-none items-center justify-center rounded p-1 active:cursor-grabbing">
            <IconGripVertical className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </span>
          <CardTitle>Store Spend Mix</CardTitle>
        </div>
        <CardDescription>Monthly grocery spend across stores</CardDescription>
        <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          {infoAction}
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px]">
        {!hasData ? (
          <ChartLoadingState isLoading={isLoading} />
        ) : (
          <div className="h-full w-full">
            <ResponsivePolarBar
              data={sanitizedChartData}
              keys={finalKeys}
              indexBy="month"
              valueSteps={5}
              valueFormat=">-$.0f"
              margin={{ top: 30, right: 20, bottom: 70, left: 20 }}
              innerRadius={0.25}
              cornerRadius={4}
              borderWidth={1}
              borderColor={resolvedTheme === "dark" ? "#4b5563" : "#d1d5db"}
              arcLabelsSkipRadius={28}
              radialAxis={{ angle: 180, tickSize: 5, tickPadding: 5, tickRotation: 0, ticksPosition: "after" }}
              circularAxisOuter={{ tickSize: 5, tickPadding: 15, tickRotation: 0 }}
              colors={chartColors}
              tooltip={({ arc }) => (
                <div className="rounded-md border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full border border-border/50"
                      style={{ backgroundColor: arc.color, borderColor: arc.color }}
                    />
                    <span className="font-medium text-foreground whitespace-nowrap">{arc.key}</span>
                  </div>
                  <div className="mt-1 font-mono text-[0.7rem] text-foreground/80">{arc.formattedValue}</div>
                </div>
              )}
              theme={polarTheme}
              legends={[
                {
                  anchor: "bottom",
                  direction: "row",
                  translateY: 50,
                  itemWidth: legendItemWidth,
                  itemHeight: 16,
                  symbolShape: "circle",
                },
              ]}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
