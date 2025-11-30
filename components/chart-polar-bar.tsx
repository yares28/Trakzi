"use client"

import { useMemo } from "react"
import { PolarBarTooltipProps, ResponsivePolarBar } from "@nivo/polar-bar"
import { useTheme } from "next-themes"
import { ChartInfoPopover, ChartInfoPopoverCategoryControls } from "@/components/chart-info-popover"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Maximize2Icon, Minimize2Icon } from "lucide-react"
import { useColorScheme } from "@/components/color-scheme-provider"
import { toNumericValue } from "@/lib/utils"

interface ChartPolarBarProps {
  data?: Array<Record<string, string | number>> | { data: Array<Record<string, string | number>>; keys: string[] }
  keys?: string[]
  categoryControls?: ChartInfoPopoverCategoryControls
  isExpanded?: boolean
  onToggleExpand?: () => void
}

const PolarBarTooltipContent = ({ arc }: PolarBarTooltipProps) => (
  <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-sm">
    <div className="font-medium">{arc.key}</div>
    <div className="text-muted-foreground">{arc.formattedValue}</div>
  </div>
)

export function ChartPolarBar({ data: dataProp = [], keys: keysProp, categoryControls, isExpanded = false, onToggleExpand }: ChartPolarBarProps) {
  const { getPalette } = useColorScheme()
  const { resolvedTheme } = useTheme()
  const renderInfoTrigger = () => (
    <ChartInfoPopover
      title="Household Spend Mix"
      description="Track monthly expenses across your top categories in a circular stacked chart."
      details={[
        "Each ring shows one month, while the colored bars show how much you spent per category.",
        "Only expense categories are included, and we cap the legend to the five highest spenders for readability."
      ]}
      ignoredFootnote="Transactions tagged as income or transfers are removed, and we only render the five categories with the highest spend."
      categoryControls={categoryControls}
    />
  )
  
  // Handle both old format (array) and new format (object with data and keys)
  const chartData = Array.isArray(dataProp) ? dataProp : dataProp.data || []
  const chartKeys = keysProp || (Array.isArray(dataProp) ? [] : dataProp.keys) || []
  const sanitizedChartData = useMemo(() => {
    if (!chartData || chartData.length === 0) return []
    return chartData.map(row => {
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
  
  // If no keys provided and data is array, extract keys from first data item (excluding 'month')
  const finalKeys = chartKeys.length > 0 
    ? chartKeys 
    : (sanitizedChartData.length > 0 
        ? Object.keys(sanitizedChartData[0]).filter(key => key !== 'month')
        : [])
  const legendItemWidth = useMemo(() => {
    if (!finalKeys.length) return 70
    const longest = finalKeys.reduce((max, key) => Math.max(max, key.length), 0)
    const baseWidth = Math.min(Math.max(longest * 9, 90), 200)
    return Math.max(baseWidth - 20, 70)
  }, [finalKeys])
  const monthLabelColor = resolvedTheme === "dark" ? "oklch(0.708 0 0)" : "oklch(0.556 0 0)"
  const polarTheme = useMemo(
    () => ({
      axis: {
        ticks: {
          text: {
            fill: monthLabelColor,
          },
        },
      },
      legends: {
        text: {
          fill: monthLabelColor,
        },
      },
    }),
    [monthLabelColor]
  )
  
  if (!sanitizedChartData || sanitizedChartData.length === 0 || finalKeys.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Household Spend Mix</CardTitle>
            <CardDescription>Track monthly expenses across key categories</CardDescription>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
            {onToggleExpand && (
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="ml-auto"
                onClick={onToggleExpand}
                aria-label={isExpanded ? "Shrink chart" : "Expand chart"}
              >
                {isExpanded ? (
                  <Minimize2Icon className="h-4 w-4" />
                ) : (
                  <Maximize2Icon className="h-4 w-4" />
                )}
              </Button>
            )}
          </CardAction>
        </CardHeader>
        <CardContent className="h-[420px] flex items-center justify-center text-muted-foreground">
          No data available
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Household Spend Mix</CardTitle>
          <CardDescription>Track monthly expenses across key categories</CardDescription>
        </div>
        <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          {renderInfoTrigger()}
          {onToggleExpand && (
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="ml-auto"
              onClick={onToggleExpand}
              aria-label={isExpanded ? "Shrink chart" : "Expand chart"}
            >
              {isExpanded ? (
                <Minimize2Icon className="h-4 w-4" />
              ) : (
                <Maximize2Icon className="h-4 w-4" />
              )}
            </Button>
          )}
        </CardAction>
      </CardHeader>
      <CardContent className="chart-polar-bar h-[420px]">
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
          borderColor="#d1d5db"
          arcLabelsSkipRadius={28}
          radialAxis={{ angle: 180, tickSize: 5, tickPadding: 5, tickRotation: 0, ticksPosition: 'after' }}
          circularAxisOuter={{ tickSize: 5, tickPadding: 15, tickRotation: 0 }}
          colors={getPalette()}
          tooltip={PolarBarTooltipContent}
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
      </CardContent>
    </Card>
  )
}

