"use client"

import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { ResponsiveAreaBump } from "@nivo/bump"
import { ChartInfoPopover, ChartInfoPopoverCategoryControls } from "@/components/chart-info-popover"
import { useColorScheme } from "@/components/color-scheme-provider"
import {
  Card,
  CardAction,
  CardDescription,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Maximize2Icon, Minimize2Icon } from "lucide-react"

interface ChartCategoryFlowProps {
  data?: Array<{
    id: string
    data: Array<{
      x: string
      y: number
    }>
  }>
  categoryControls?: ChartInfoPopoverCategoryControls
  isExpanded?: boolean
  onToggleExpand?: () => void
}

export function ChartCategoryFlow({ data = [], categoryControls, isExpanded = false, onToggleExpand }: ChartCategoryFlowProps) {
  const { resolvedTheme } = useTheme()
  const { getPalette } = useColorScheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Client-side only rendering to avoid hydration mismatches
    setMounted(true)
  }, [])

  const isDark = resolvedTheme === "dark"
  // Use muted-foreground color to match ChartAreaInteractive
  // Light mode: oklch(0.556 0 0) ≈ #6b7280 (gray-500)
  // Dark mode: oklch(0.708 0 0) ≈ #9ca3af (gray-400)
  const textColor = isDark ? "#9ca3af" : "#6b7280"
  const borderColor = isDark ? "#374151" : "#e5e7eb"

  // Use custom palette for colored, custom dark palette for dark styling
  // For all palettes: darker colors = higher rank (lower rank number), lighter colors = lower rank (higher rank number)
  // Rank 1 (Housing) = darkest, Rank 7 (Healthcare) = lightest
  const palette = getPalette().filter(color => color !== "#c3c3c3")
  const numCategories = data.length

  // Reverse palette so darkest colors are first (for highest ranks)
  const reversedPalette = [...palette].reverse()
  let colorConfig = reversedPalette.slice(0, numCategories)

  // Cycle if needed
  while (colorConfig.length < numCategories) {
    colorConfig.push(...reversedPalette.slice(0, numCategories - colorConfig.length))
  }
  colorConfig = colorConfig.slice(0, numCategories)

  const renderInfoTrigger = () => (
    <ChartInfoPopover
      title="Spending Category Rankings"
      description="This chart tracks how your spending categories rank relative to each other over time."
      details={[
        "Each colored area represents a spending category; the higher it sits, the larger its share that month.",
        "How it works: we calculate each category's percentage of total spend per month so you can see priorities rise or fall.",
      ]}
      categoryControls={categoryControls}
    />
  )

  if (!mounted) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Spending Category Rankings</CardTitle>
          <CardDescription>
            <span className="hidden @[540px]/card:block">
              Track how your spending priorities shift over time
            </span>
            <span className="@[540px]/card:hidden">Category flow over 6 months</span>
          </CardDescription>
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
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <div className="h-[400px] w-full" />
        </CardContent>
      </Card>
    )
  }

  // Don't render chart if data is empty
  if (!data || data.length === 0) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Spending Category Rankings</CardTitle>
          <CardDescription>
            <span className="hidden @[540px]/card:block">
              Track how your spending priorities shift over time
            </span>
            <span className="@[540px]/card:hidden">Category flow over 6 months</span>
          </CardDescription>
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
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <div className="h-[400px] w-full flex items-center justify-center text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Spending Category Rankings</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Track how your spending priorities shift over time
          </span>
          <span className="@[540px]/card:hidden">Category flow over 6 months</span>
        </CardDescription>
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
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <div className="h-[400px] w-full">
          <ResponsiveAreaBump
            data={data}
            margin={{ top: 40, right: 120, bottom: 40, left: 140 }}
            spacing={12}
            colors={colorConfig}
            blendMode="normal"
            startLabel={(serie) => serie.id}
            endLabel={(serie) => serie.id}
            startLabelTextColor={textColor}
            endLabelTextColor={textColor}
            startLabelPadding={12}
            endLabelPadding={12}
            interpolation="smooth"
            axisTop={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: "",
              legendPosition: "middle",
              legendOffset: -36,
            }}
            axisBottom={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: "",
              legendPosition: "middle",
              legendOffset: 32,
            }}
            theme={{
              text: {
                fill: textColor,
                fontSize: 12,
                fontFamily: 'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
              },
              axis: {
                domain: {
                  line: {
                    stroke: borderColor,
                    strokeWidth: 1,
                  },
                },
                ticks: {
                  line: {
                    stroke: borderColor,
                    strokeWidth: 1,
                  },
                },
              },
              grid: {
                line: {
                  stroke: borderColor,
                  strokeWidth: 0.5,
                },
              },
              tooltip: {
                container: {
                  background: "#ffffff",
                  color: "#000000",
                  fontSize: 12,
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  padding: "8px 12px",
                  border: "1px solid #e2e8f0",
                },
              },
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
}

