"use client"

import { useEffect, useMemo, useState } from "react"
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

interface ChartNeedsWantsPieProps {
  data?: Array<{
    id: string
    label: string
    value: number
  }>
  categoryControls?: ChartInfoPopoverCategoryControls
  // These props are passed by the draggable analytics layout but sizing is handled outside this component.
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

export function ChartNeedsWantsPie({ data: baseData = [], categoryControls }: ChartNeedsWantsPieProps) {
  const { resolvedTheme } = useTheme()
  const { colorScheme, getPalette } = useColorScheme()
  const [mounted, setMounted] = useState(false)

  const sanitizedBaseData = useMemo(
    () =>
      baseData.map((item) => ({
        ...item,
        value: toNumericValue(item.value),
      })),
    [baseData],
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  // We only ever have up to 3 slices (Essentials, Mandatory, Wants)
  // Assign colors from the current palette, using darker colors for larger values.
  const dataWithColors = useMemo(() => {
    const palette = getPalette().filter((color) => color !== "#c3c3c3")
    const sorted = [...sanitizedBaseData].sort((a, b) => b.value - a.value)
    const reversedPalette = [...palette].reverse()
    const colors = reversedPalette.slice(0, Math.max(sorted.length, 3))

    return sorted.map((item, index) => ({
      ...item,
      color: colors[index % colors.length],
    }))
  }, [sanitizedBaseData, getPalette])

  const data = dataWithColors

  const total = useMemo(() => {
    return sanitizedBaseData.reduce((sum, item) => sum + item.value, 0)
  }, [sanitizedBaseData])

  const colorConfig = { datum: "data.color" as const }

  const isDark = resolvedTheme === "dark"

  const textColor = isDark ? "#9ca3af" : "#4b5563"
  const arcLinkLabelColor = isDark ? "#d1d5db" : "#374151"

  const customTooltip = ({ datum }: { datum: { id: string; label: string; value: number; color: string } }) => {
    const percentage = total > 0 ? ((datum.value / total) * 100).toFixed(1) : "0.0"
    const tooltipBg = isDark ? "#1f2937" : "#ffffff"
    const tooltipText = isDark ? "#f3f4f6" : "#000000"
    const tooltipSecondary = isDark ? "#9ca3af" : "#666666"
    const tooltipBorder = isDark ? "#374151" : "#e2e8f0"

    return (
      <div
        style={{
          background: tooltipBg,
          padding: "8px 12px",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          border: `1px solid ${tooltipBorder}`,
          fontSize: "12px",
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: "4px", color: tooltipText }}>{datum.label}</div>
        <div style={{ color: tooltipSecondary, marginBottom: "2px" }}>${datum.value.toFixed(2)}</div>
        <div style={{ color: tooltipSecondary }}>{percentage}%</div>
      </div>
    )
  }

  const renderInfoTrigger = () => (
    <ChartInfoPopover
      title="Needs vs Wants"
      description="Groups your spending into essentials, mandatory obligations, and discretionary wants."
      details={[
        "Essentials include day-to-day living costs like groceries, housing, core utilities, and basic transport.",
        "Mandatory covers recurring obligations such as insurance, taxes and similar non‑negotiable commitments.",
        "Wants capture lifestyle and discretionary categories like shopping, entertainment, and travel.",
      ]}
      ignoredFootnote="Only expense (negative) transactions are included, and hidden categories are excluded from the totals."
      categoryControls={categoryControls}
    />
  )

  if (!mounted) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Needs vs Wants</CardTitle>
          <CardDescription>Your spending split across essentials, mandatory, and wants</CardDescription>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="flex-1 min-h-0">
          <div className="h-full w-full min-h-[250px]" />
        </CardContent>
      </Card>
    )
  }

  if (!sanitizedBaseData || sanitizedBaseData.length === 0) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Needs vs Wants</CardTitle>
          <CardDescription>
            <span className="hidden @[540px]/card:block">
              How much of your spending is going to essentials, mandatory obligations, and wants
            </span>
            <span className="@[540px]/card:hidden">Needs vs wants split</span>
          </CardDescription>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
          <div className="h-full w-full min-h-[250px] flex items-center justify-center text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Needs vs Wants</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Distribution of your expenses across essentials, mandatory obligations, and wants
          </span>
          <span className="@[540px]/card:hidden">Needs vs wants split</span>
        </CardDescription>
        <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          {renderInfoTrigger()}
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
        <div className="h-full w-full min-h-[250px]" key={colorScheme}>
          <ResponsivePie
            data={data}
            margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
            innerRadius={0.5}
            padAngle={0.6}
            cornerRadius={2}
            activeOuterRadiusOffset={8}
            enableArcLinkLabels={true}
            arcLinkLabelsSkipAngle={10}
            arcLinkLabelsTextColor={arcLinkLabelColor}
            arcLinkLabelsThickness={2}
            arcLinkLabelsColor={{ from: "color" }}
            arcLabelsSkipAngle={10}
            arcLabelsTextColor={(d: { color: string }) => getTextColor(d.color, colorScheme)}
            valueFormat={(value) => `$${toNumericValue(value).toFixed(2)}`}
            colors={colorConfig}
            tooltip={customTooltip}
            theme={{
              text: {
                fill: textColor,
                fontSize: 12,
              },
            }}
            legends={[
              {
                anchor: "bottom",
                direction: "row",
                translateY: 56,
                itemWidth: 100,
                itemHeight: 18,
                symbolShape: "circle",
              },
            ]}
          />
        </div>
      </CardContent>
    </Card>
  )
}


