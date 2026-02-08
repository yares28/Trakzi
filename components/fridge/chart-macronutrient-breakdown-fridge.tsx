"use client"

import { useState, useEffect, useMemo, memo } from "react"
import { useTheme } from "next-themes"
import { ResponsivePie } from "@nivo/pie"
import { ChartInfoPopover, ChartInfoPopoverCategoryControls } from "@/components/chart-info-popover"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import { getContrastTextColor, getChartTextColor } from "@/lib/chart-colors"
import { toNumericValue } from "@/lib/utils"
import { ChartLoadingState } from "@/components/chart-loading-state"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { NivoChartTooltip } from "@/components/chart-tooltip"

type ReceiptTransactionRow = {
  id: number
  receiptId: string
  storeName: string | null
  receiptDate: string
  receiptTime: string
  receiptTotalAmount: number
  receiptStatus: string
  description: string
  quantity: number
  pricePerUnit: number
  totalPrice: number
  categoryId: number | null
  categoryTypeId?: number | null
  categoryName: string | null
  categoryColor: string | null
  categoryTypeName?: string | null
  categoryTypeColor?: string | null
}

interface ChartMacronutrientBreakdownFridgeProps {
  receiptTransactions?: ReceiptTransactionRow[]
  macronutrientBreakdown?: Array<{ typeName: string; total: number; color: string | null }>
  categoryControls?: ChartInfoPopoverCategoryControls
  isLoading?: boolean
}


function normalizeMacronutrientType(value: string | null | undefined) {
  const trimmed = (value ?? "").trim()
  return trimmed || "Other"
}

export const ChartMacronutrientBreakdownFridge = memo(function ChartMacronutrientBreakdownFridge({ receiptTransactions = [], macronutrientBreakdown, categoryControls, isLoading = false }: ChartMacronutrientBreakdownFridgeProps) {
  const { resolvedTheme } = useTheme()
  const { colorScheme, getShuffledPalette } = useColorScheme()
  const { formatCurrency } = useCurrency()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Group transactions by macronutrient type
  const macronutrientData = useMemo(() => {
    // Use bundle data if available (pre-computed by server)
    if (macronutrientBreakdown && macronutrientBreakdown.length > 0) {
      return macronutrientBreakdown
        .map(m => ({ id: m.typeName, label: m.typeName, value: Number(m.total.toFixed(2)) }))
        .sort((a, b) => b.value - a.value)
    }

    // Fallback to receiptTransactions
    const totals = new Map<string, number>()
    receiptTransactions.forEach((item) => {
      const macronutrientType = normalizeMacronutrientType(item.categoryTypeName)
      const spend = Number(item.totalPrice) || 0
      totals.set(macronutrientType, (totals.get(macronutrientType) || 0) + spend)
    })

    return Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([macronutrientType, value]) => ({
        id: macronutrientType,
        label: macronutrientType,
        value: Number(value.toFixed(2)),
      }))
  }, [macronutrientBreakdown, receiptTransactions])

  const sanitizedBaseData = useMemo(() => macronutrientData.map(item => ({
    ...item,
    value: toNumericValue(item.value)
  })), [macronutrientData])

  // Dynamically assign colors based on number of parts (max 7)
  // For all palettes: darker colors = larger amounts, lighter colors = smaller amounts
  const dataWithColors = useMemo(() => {
    const numParts = Math.min(sanitizedBaseData.length, 7)
    const palette = getShuffledPalette()
    const sorted = [...sanitizedBaseData].sort((a, b) => b.value - a.value)
    const colors = palette.slice(0, numParts)
    return sorted.map((item, index) => ({
      ...item,
      color: colors[index % colors.length]
    }))
  }, [sanitizedBaseData, colorScheme, getShuffledPalette])

  const data = dataWithColors

  // Calculate total for percentage calculations
  const total = useMemo(() => {
    return sanitizedBaseData.reduce((sum, item) => sum + item.value, 0)
  }, [sanitizedBaseData])

  const colorConfig = colorScheme === "colored"
    ? { datum: "data.color" as const }
    : { datum: "data.color" as const } // Use assigned colors from darkDataWithColors

  const isDark = resolvedTheme === "dark"

  const textColor = getChartTextColor(isDark)

  // Format currency value using user's preferred currency
  const valueFormatter = useMemo(() => ({
    format: (value: number) => formatCurrency(value)
  }), [formatCurrency])

  const renderInfoTrigger = () => (
    <div className="flex flex-col items-center gap-2">
      <ChartInfoPopover
        title="Macronutrient Breakdown"
        description="This pie chart shows how your total grocery expenses are distributed across macronutrient types (Protein, Carbs, Fat, Fiber, etc.)."
        details={[
          "Slices are sorted by spend so the largest macronutrient types stand out.",
          "Categories are based on receipt line items from your uploaded receipts.",
          "Each macronutrient type represents the total spending across all categories of that type.",
        ]}
        ignoredFootnote="Only receipt transactions with assigned categories and macronutrient types are included in this view."
        categoryControls={categoryControls}
      />
      <ChartAiInsightButton
        chartId="fridge:macronutrientBreakdown"
        chartTitle="Macronutrient Breakdown"
        chartDescription="This pie chart shows how your total grocery expenses are distributed across macronutrient types."
        chartData={{
          totalExpenses: total,
          macronutrients: data.map(d => ({ name: d.label, amount: d.value })),
          topMacronutrient: data[0]?.label,
          topMacronutrientAmount: data[0]?.value
        }}
        size="sm"
      />
    </div>
  )

  if (!mounted) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartFavoriteButton
              chartId="fridge:macronutrientBreakdown"
              chartTitle="Macronutrient Breakdown"
              size="md"
            />
            <CardTitle>Macronutrient Breakdown</CardTitle>
          </div>
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

  // Don't render chart if data is empty
  if (!sanitizedBaseData || sanitizedBaseData.length === 0) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartFavoriteButton
              chartId="fridge:macronutrientBreakdown"
              chartTitle="Macronutrient Breakdown"
              size="md"
            />
            <CardTitle>Macronutrient Breakdown</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
          <div className="h-full w-full min-h-[250px]">
            <ChartLoadingState isLoading={isLoading} skeletonType="pie" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <div className="flex items-center gap-2">
          <GridStackCardDragHandle />
          <ChartFavoriteButton
            chartId="fridge:macronutrientBreakdown"
            chartTitle="Macronutrient Breakdown"
            size="md"
          />
          <CardTitle>Macronutrient Breakdown</CardTitle>
        </div>
        <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          {renderInfoTrigger()}
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-[140px] md:min-h-[200px]" key={colorScheme}>
          <ResponsivePie
            data={data}
            margin={{ top: 40, right: 40, bottom: 40, left: 40 }}
            innerRadius={0.5}
            padAngle={0.6}
            cornerRadius={2}
            activeOuterRadiusOffset={8}
            enableArcLinkLabels={false}
            arcLabelsSkipAngle={15}
            arcLabelsTextColor={(d: { color: string }) => getContrastTextColor(d.color)}
            valueFormat={(value) => formatCurrency(value)}
            colors={colorConfig}
            tooltip={({ datum }) => {
              const percentage = total > 0 ? (Number(datum.value) / total) * 100 : 0

              return (
                <NivoChartTooltip
                  title={datum.label as string}
                  titleColor={datum.color as string}
                  value={valueFormatter.format(Number(datum.value))}
                  subValue={`${percentage.toFixed(1)}%`}
                />
              )
            }}
            theme={{
              text: {
                fill: textColor,
                fontSize: 12,
              },
            }}
          />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-2">
          {data.slice(0, 6).map((item) => (
            <div key={item.id} className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="font-medium text-foreground truncate max-w-[80px]" title={item.label}>{item.label}</span>
              <span className="text-[0.7rem]">
                {total > 0 ? `${((item.value / total) * 100).toFixed(0)}%` : "0%"}
              </span>
            </div>
          ))}
          {data.length > 6 && (
            <span className="text-[0.65rem] text-muted-foreground">+{data.length - 6} more</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
})

ChartMacronutrientBreakdownFridge.displayName = "ChartMacronutrientBreakdownFridge"













