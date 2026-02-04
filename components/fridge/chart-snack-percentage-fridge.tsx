"use client"

import { useState, useEffect, useMemo, memo } from "react"
import { useTheme } from "next-themes"
import { ResponsivePie } from "@nivo/pie"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { useColorScheme } from "@/components/color-scheme-provider"
import { toNumericValue } from "@/lib/utils"
import { ChartLoadingState } from "@/components/chart-loading-state"
import { NivoChartTooltip } from "@/components/chart-tooltip"
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
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Store } from "lucide-react"
import { cn } from "@/lib/utils"
import { isSnackCategory } from "@/lib/receipt-categories"

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

interface ChartSnackPercentageFridgeProps {
  receiptTransactions?: ReceiptTransactionRow[]
  categorySpendingData?: Array<{ category: string; total: number }>
  isLoading?: boolean
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

function normalizeStoreName(value: string | null | undefined) {
  const raw = (value ?? "").trim()
  if (!raw) return "Unknown"
  return raw
}

export const ChartSnackPercentageFridge = memo(function ChartSnackPercentageFridge({ receiptTransactions = [], categorySpendingData, isLoading = false }: ChartSnackPercentageFridgeProps) {
  const { resolvedTheme } = useTheme()
  const { colorScheme, getPalette } = useColorScheme()
  const [mounted, setMounted] = useState(false)
  const [selectedStores, setSelectedStores] = useState<Set<string>>(new Set())
  const [isStorePopoverOpen, setIsStorePopoverOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Get all unique stores
  const availableStores = useMemo(() => {
    const stores = new Set<string>()
    receiptTransactions.forEach((item) => {
      const store = normalizeStoreName(item.storeName)
      if (store !== "Unknown") {
        stores.add(store)
      }
    })
    return Array.from(stores).sort()
  }, [receiptTransactions])

  // Calculate aggregated snack vs non-snack spending
  const snackPercentageData = useMemo(() => {
    // Filter by selected stores if any are selected
    const filteredTransactions = selectedStores.size > 0
      ? receiptTransactions.filter((item) => {
        const store = normalizeStoreName(item.storeName)
        return selectedStores.has(store)
      })
      : receiptTransactions

    // Aggregate totals across all filtered transactions
    let totalSpend = 0
    let snackSpend = 0
    const tripIds = new Set<string>()

    filteredTransactions.forEach((item) => {
      const totalPrice = Number(item.totalPrice) || 0
      const isSnack = isSnackCategory(item.categoryName)

      totalSpend += totalPrice
      if (isSnack) {
        snackSpend += totalPrice
      }
      tripIds.add(item.receiptId)
    })

    const otherSpend = totalSpend - snackSpend
    const snackPercentage = totalSpend > 0 ? (snackSpend / totalSpend) * 100 : 0
    const otherPercentage = totalSpend > 0 ? (otherSpend / totalSpend) * 100 : 0

    // Return 2-slice pie data: Snacks and Other
    const chartData = [
      {
        id: "Snacks",
        label: "Snacks",
        value: Number(snackPercentage.toFixed(2)),
        trips: tripIds.size,
        totalSpend: totalSpend,
        snackSpend: snackSpend,
        spend: snackSpend,
      },
      {
        id: "Total",
        label: "Total",
        value: Number(otherPercentage.toFixed(2)),
        trips: tripIds.size,
        totalSpend: totalSpend,
        snackSpend: snackSpend,
        spend: otherSpend,
      },
    ].filter(item => item.value > 0) // Only show slices with value

    return chartData
  }, [receiptTransactions, selectedStores])

  // Dynamically assign colors based on number of parts (max 7)
  const dataWithColors = useMemo(() => {
    const numParts = Math.min(snackPercentageData.length, 7)
    const palette = getPalette().filter(color => color !== "#c3c3c3")

    // Sort by value descending (highest first) and assign colors
    const sorted = [...snackPercentageData].sort((a, b) => b.value - a.value)
    const reversedPalette = [...palette].reverse().slice(0, numParts)
    return sorted.map((item, index) => ({
      ...item,
      color: reversedPalette[index % reversedPalette.length]
    }))
  }, [snackPercentageData, colorScheme, getPalette])

  const data = dataWithColors

  // Calculate total for percentage calculations; Nivo pie does not render when total is 0
  const total = useMemo(() => {
    return snackPercentageData.reduce((sum, item) => sum + item.value, 0)
  }, [snackPercentageData])

  const hasChartData = snackPercentageData.length > 0 && total > 0

  const colorConfig = colorScheme === "colored"
    ? { datum: "data.color" as const }
    : { datum: "data.color" as const }

  const isDark = resolvedTheme === "dark"

  const textColor = isDark ? "#9ca3af" : "#4b5563"
  const arcLinkLabelColor = isDark ? "#d1d5db" : "#374151"

  // Format currency value
  const valueFormatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  })

  const handleStoreToggle = (store: string) => {
    setSelectedStores((prev) => {
      const next = new Set(prev)
      if (next.has(store)) {
        next.delete(store)
      } else {
        next.add(store)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedStores.size === availableStores.length) {
      setSelectedStores(new Set())
    } else {
      setSelectedStores(new Set(availableStores))
    }
  }

  const renderInfoTrigger = () => (
    <div className="flex flex-col items-center gap-2">
      <ChartInfoPopover
        title="Snack Percentage per Store"
        description="This chart shows the average percentage of snack spending per grocery trip, broken down by store."
        details={[
          "Each slice represents a store's average snack percentage across all trips.",
          "Use the store filter to view specific stores or compare selected stores.",
          "Percentage is calculated as: (Snack spending / Total trip spending) × 100",
        ]}
        ignoredFootnote="Snacks include: Pastries, Salty Snacks, Cookies & Biscuits, Chocolate & Candy, Nuts & Seeds, Ice Cream & Desserts."
      />
      <ChartAiInsightButton
        chartId="fridge:snackPercentage"
        chartTitle="Snack Percentage per Store"
        chartDescription="Average percentage of snack spending per grocery trip by store."
        chartData={{
          stores: data.map(d => ({
            name: d.label,
            snackPercentage: d.value,
            trips: d.trips,
            totalSpend: d.totalSpend,
            snackSpend: d.snackSpend,
          })),
          selectedStores: Array.from(selectedStores),
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
              chartId="fridge:snackPercentage"
              chartTitle="Snack Percentage per Store"
              size="md"
            />
            <CardTitle>Snack Percentage per Store</CardTitle>
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

  // Don't render chart if data is empty or all values are zero (Nivo pie won't render)
  if (!hasChartData) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartFavoriteButton
              chartId="fridge:snackPercentage"
              chartTitle="Snack Percentage per Store"
              size="md"
            />
            <CardTitle>Snack Percentage per Store</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-col items-center gap-2">
              <Popover open={isStorePopoverOpen} onOpenChange={setIsStorePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Store className="h-4 w-4" />
                    {selectedStores.size === 0
                      ? "All Stores"
                      : selectedStores.size === 1
                        ? Array.from(selectedStores)[0]
                        : `${selectedStores.size} Stores`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64" align="end">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Filter by Store</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={handleSelectAll}
                      >
                        {selectedStores.size === availableStores.length ? "Clear All" : "Select All"}
                      </Button>
                    </div>
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {availableStores.map((store) => (
                        <div key={store} className="flex items-center space-x-2">
                          <Checkbox
                            id={`store-${store}`}
                            checked={selectedStores.has(store)}
                            onCheckedChange={() => handleStoreToggle(store)}
                          />
                          <Label
                            htmlFor={`store-${store}`}
                            className="text-sm font-normal cursor-pointer flex-1"
                          >
                            {store}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
          <div className="h-full w-full min-h-[250px]">
            {isLoading ? (
              <ChartLoadingState isLoading skeletonType="pie" />
            ) : (
              <ChartLoadingState
                isLoading={false}
                emptyIcon="receipt"
                emptyDescription={
                  snackPercentageData.length === 0
                    ? "Scan receipts to see snack percentage by store."
                    : "No snack spending detected across stores."
                }
              />
            )}
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
            chartId="fridge:snackPercentage"
            chartTitle="Snack Percentage per Store"
            size="md"
          />
          <CardTitle>Snack Percentage per Store</CardTitle>
        </div>
        <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-col items-center gap-2">
            <Popover open={isStorePopoverOpen} onOpenChange={setIsStorePopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Store className="h-4 w-4" />
                  {selectedStores.size === 0
                    ? "All Stores"
                    : selectedStores.size === 1
                      ? Array.from(selectedStores)[0]
                      : `${selectedStores.size} Stores`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="end">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Filter by Store</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={handleSelectAll}
                    >
                      {selectedStores.size === availableStores.length ? "Clear All" : "Select All"}
                    </Button>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {availableStores.map((store) => (
                      <div key={store} className="flex items-center space-x-2">
                        <Checkbox
                          id={`store-${store}`}
                          checked={selectedStores.has(store)}
                          onCheckedChange={() => handleStoreToggle(store)}
                        />
                        <Label
                          htmlFor={`store-${store}`}
                          className="text-sm font-normal cursor-pointer flex-1"
                        >
                          {store}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          {renderInfoTrigger()}
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
        <div className="h-full w-full min-h-[250px]" key={colorScheme}>
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
            valueFormat={(value) => `${value.toFixed(1)}%`}
            colors={colorConfig}
            tooltip={({ datum }) => {
              const sliceData = datum.data as typeof data[0]
              return (
                <NivoChartTooltip>
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full border border-border/50"
                      style={{ backgroundColor: datum.color as string, borderColor: datum.color as string }}
                    />
                    <span className="font-medium text-foreground whitespace-nowrap">
                      {datum.label as string}
                    </span>
                  </div>
                  <div className="mt-1 text-[0.7rem] text-foreground/80">
                    <span className="font-mono">{Number(datum.value).toFixed(1)}%</span>
                  </div>
                  <div className="mt-0.5 text-[0.7rem] text-foreground/80">
                    {valueFormatter.format(sliceData.spend)}
                  </div>
                </NivoChartTooltip>
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
      </CardContent>
    </Card>
  )
})

ChartSnackPercentageFridge.displayName = "ChartSnackPercentageFridge"













