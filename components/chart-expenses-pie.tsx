"use client"

import { useState, useEffect, useMemo } from "react"
import { useTheme } from "next-themes"
import { ResponsivePie } from "@nivo/pie"
import { ChartInfoPopover, ChartInfoPopoverCategoryControls } from "@/components/chart-info-popover"
import { useColorScheme } from "@/components/color-scheme-provider"
import { toNumericValue } from "@/lib/utils"
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

interface ChartExpensesPieProps {
  data?: Array<{
    id: string
    label: string
    value: number
  }>
  categoryControls?: ChartInfoPopoverCategoryControls
  isExpanded?: boolean
  onToggleExpand?: () => void
}

// Dark colors that require white text
const darkColors = ["#696969", "#464646", "#2F2F2F", "#252525"]

// Gold palette colors that require white text (black and brown)
const goldDarkColors = ["#000000", "#361c1b", "#754232", "#cd894a"]

// Helper function to determine text color based on slice color
const getTextColor = (sliceColor: string, colorScheme?: string): string => {
  if (colorScheme === "gold") {
    return goldDarkColors.includes(sliceColor) ? "#ffffff" : "#000000"
  }
  return darkColors.includes(sliceColor) ? "#ffffff" : "#000000"
}

export function ChartExpensesPie({ data: baseData = [], categoryControls, isExpanded = false, onToggleExpand }: ChartExpensesPieProps) {
  const { resolvedTheme } = useTheme()
  const { colorScheme, getPalette } = useColorScheme()
  const [mounted, setMounted] = useState(false)
  const sanitizedBaseData = useMemo(() => baseData.map(item => ({
    ...item,
    value: toNumericValue(item.value)
  })), [baseData])

  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Dynamically assign colors based on number of parts (max 7)
  // For all palettes: darker colors = larger amounts, lighter colors = smaller amounts
  const dataWithColors = useMemo(() => {
    const numParts = Math.min(sanitizedBaseData.length, 7)
    const palette = getPalette().filter(color => color !== "#c3c3c3")
    
    // Sort by value descending (highest first) and assign colors
    // Darker colors go to higher values, lighter colors to lower values
    const sorted = [...sanitizedBaseData].sort((a, b) => b.value - a.value)
    // Reverse palette so darkest colors are first (for highest values)
    const reversedPalette = [...palette].reverse().slice(0, numParts)
    return sorted.map((item, index) => ({
      ...item,
      color: reversedPalette[index % reversedPalette.length]
    }))
  }, [baseData, colorScheme, getPalette])
  
  const data = dataWithColors
  
  // Calculate total for percentage calculations
  const total = useMemo(() => {
    return sanitizedBaseData.reduce((sum, item) => sum + item.value, 0)
  }, [sanitizedBaseData])
  
  const colorConfig = colorScheme === "colored" 
    ? { datum: "data.color" as const }
    : { datum: "data.color" as const } // Use assigned colors from darkDataWithColors

  const isDark = resolvedTheme === "dark"

  const textColor = isDark ? "#9ca3af" : "#4b5563"
  const arcLinkLabelColor = isDark ? "#d1d5db" : "#374151"
  
  // Custom tooltip with percentage
  const customTooltip = ({ datum }: { datum: { id: string; label: string; value: number; color: string } }) => {
    const percentage = total > 0 ? ((datum.value / total) * 100).toFixed(1) : '0.0'
    const tooltipBg = isDark ? '#1f2937' : '#ffffff'
    const tooltipText = isDark ? '#f3f4f6' : '#000000'
    const tooltipSecondary = isDark ? '#9ca3af' : '#666666'
    const tooltipBorder = isDark ? '#374151' : '#e2e8f0'
    
    return (
      <div style={{
        background: tooltipBg,
        padding: '8px 12px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        border: `1px solid ${tooltipBorder}`,
        fontSize: '12px',
      }}>
        <div style={{ fontWeight: 600, marginBottom: '4px', color: tooltipText }}>
          {datum.label}
        </div>
        <div style={{ color: tooltipSecondary, marginBottom: '2px' }}>
          ${datum.value.toFixed(2)}
        </div>
        <div style={{ color: tooltipSecondary }}>
          {percentage}%
        </div>
      </div>
    )
  }

  const renderInfoTrigger = () => (
    <ChartInfoPopover
      title="Expense Breakdown"
      description="This pie chart shows how your total expenses are distributed across spending categories."
      details={[
        "Slices are sorted by spend so the largest categories stand out.",
        "Income entries and zero-dollar adjustments are filtered out so only real expenses appear.",
      ]}
      ignoredFootnote="Only negative (expense) transactions are plotted. Positive cash flow is excluded from this view."
      categoryControls={categoryControls}
    />
  )

  if (!mounted) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Expense Breakdown</CardTitle>
          <CardDescription>Your spending by category</CardDescription>
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
        <CardContent>
          <div className="h-[400px] w-full" />
        </CardContent>
      </Card>
    )
  }

  // Don't render chart if data is empty
  if (!sanitizedBaseData || sanitizedBaseData.length === 0) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Expense Breakdown</CardTitle>
          <CardDescription>
            <span className="hidden @[540px]/card:block">
              Distribution of your monthly expenses across categories
            </span>
            <span className="@[540px]/card:hidden">Monthly expense distribution</span>
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
          <CardTitle>Expense Breakdown</CardTitle>
          <CardDescription>
            <span className="hidden @[540px]/card:block">
              Distribution of your monthly expenses across categories
            </span>
            <span className="@[540px]/card:hidden">Monthly expense distribution</span>
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
        <div className="h-[400px] w-full" key={colorScheme}>
          <ResponsivePie
            data={data}
            margin={{ top: 40, right: 80, bottom: 40, left: 80 }}
            innerRadius={0.5}
            padAngle={0.7}
            cornerRadius={3}
            activeOuterRadiusOffset={8}
            borderWidth={0}
            arcLinkLabelsSkipAngle={10}
            arcLinkLabelsTextColor={arcLinkLabelColor}
            arcLinkLabelsThickness={2}
            arcLinkLabelsColor={{ from: "color" }}
            arcLabelsSkipAngle={20}
            arcLabelsTextColor={(d: { color: string }) => getTextColor(d.color, colorScheme)}
            valueFormat={(value) => `$${value.toFixed(2)}`}
            colors={colorConfig}
            tooltip={customTooltip}
            theme={{
              text: {
                fill: textColor,
                fontSize: 12,
              },
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
}

