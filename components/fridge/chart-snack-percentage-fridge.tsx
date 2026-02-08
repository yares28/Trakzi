"use client"

import { useState, useEffect, useMemo, memo } from "react"
import { useTheme } from "next-themes"
import { ResponsivePie } from "@nivo/pie"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import { getContrastTextColor, getChartTextColor } from "@/lib/chart-colors"
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

interface ChartSpendingBreakdownFridgeProps {
  receiptTransactions?: ReceiptTransactionRow[]
  categorySpendingData?: Array<{ category: string; total: number }>
  isLoading?: boolean
}


function normalizeStoreName(value: string | null | undefined) {
  const raw = (value ?? "").trim()
  if (!raw) return "Unknown"
  return raw
}

// Categories considered "nutritious" - whole foods with good nutritional value
const NUTRITIOUS_CATEGORIES = new Set([
  "fruits",
  "vegetables",
  "herbs & fresh aromatics",
  "meat & poultry",
  "fish & seafood",
  "eggs",
  "dairy (milk/yogurt)",
  "cheese",
  "deli / cold cuts",
  "legumes",
  "pasta, rice & grains",
  "bread",
  "frozen vegetables & fruit",
  "water",
])

// Helper function to determine if a category is "nutritious"
function isNutritiousCategory(categoryName: string | null | undefined): boolean {
  if (!categoryName) return false
  const normalized = categoryName.trim().toLowerCase()
  return NUTRITIOUS_CATEGORIES.has(normalized)
}

export const ChartSpendingBreakdownFridge = memo(function ChartSpendingBreakdownFridge({ receiptTransactions = [], categorySpendingData, isLoading = false }: ChartSpendingBreakdownFridgeProps) {
  const { resolvedTheme } = useTheme()
  const { colorScheme, getShuffledPalette } = useColorScheme()
  const { formatCurrency } = useCurrency()
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

  // Calculate aggregated spending breakdown: Snacks vs Nutritious vs Other
  const spendingBreakdownData = useMemo(() => {
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
    let nutritiousSpend = 0
    const tripIds = new Set<string>()

    filteredTransactions.forEach((item) => {
      const totalPrice = Number(item.totalPrice) || 0
      const isSnack = isSnackCategory(item.categoryName)
      const isNutritious = isNutritiousCategory(item.categoryName)

      totalSpend += totalPrice
      if (isSnack) {
        snackSpend += totalPrice
      } else if (isNutritious) {
        nutritiousSpend += totalPrice
      }
      tripIds.add(item.receiptId)
    })

    const otherSpend = totalSpend - snackSpend - nutritiousSpend
    const snackPercentage = totalSpend > 0 ? (snackSpend / totalSpend) * 100 : 0
    const nutritiousPercentage = totalSpend > 0 ? (nutritiousSpend / totalSpend) * 100 : 0
    const otherPercentage = totalSpend > 0 ? (otherSpend / totalSpend) * 100 : 0

    // Return 3-slice pie data: Snacks, Nutritious, and Other
    const chartData = [
      {
        id: "Snacks",
        label: "Snacks",
        value: Number(snackPercentage.toFixed(2)),
        trips: tripIds.size,
        totalSpend: totalSpend,
        spend: snackSpend,
      },
      {
        id: "Nutritious",
        label: "Nutritious",
        value: Number(nutritiousPercentage.toFixed(2)),
        trips: tripIds.size,
        totalSpend: totalSpend,
        spend: nutritiousSpend,
      },
      {
        id: "Other",
        label: "Other",
        value: Number(otherPercentage.toFixed(2)),
        trips: tripIds.size,
        totalSpend: totalSpend,
        spend: otherSpend,
      },
    ].filter(item => item.value > 0) // Only show slices with value

    return chartData
  }, [receiptTransactions, selectedStores])

  // Dynamically assign colors based on number of parts (max 7)
  const dataWithColors = useMemo(() => {
    const numParts = Math.min(spendingBreakdownData.length, 7)
    const palette = getShuffledPalette()
    const sorted = [...spendingBreakdownData].sort((a, b) => b.value - a.value)
    const colors = palette.slice(0, numParts)
    return sorted.map((item, index) => ({
      ...item,
      color: colors[index % colors.length]
    }))
  }, [spendingBreakdownData, colorScheme, getShuffledPalette])

  const data = dataWithColors

  // Calculate total for percentage calculations; Nivo pie does not render when total is 0
  const total = useMemo(() => {
    return spendingBreakdownData.reduce((sum, item) => sum + item.value, 0)
  }, [spendingBreakdownData])

  const hasChartData = spendingBreakdownData.length > 0 && total > 0

  const colorConfig = colorScheme === "colored"
    ? { datum: "data.color" as const }
    : { datum: "data.color" as const }

  const isDark = resolvedTheme === "dark"

  const textColor = getChartTextColor(isDark)

  // Format currency value using user's preferred currency
  const valueFormatter = useMemo(() => ({
    format: (value: number) => formatCurrency(value)
  }), [formatCurrency])

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
        title="Spending Breakdown"
        description="This chart shows how your grocery spending is split between snacks, nutritious foods, and other items."
        details={[
          "Snacks: Pastries, Salty Snacks, Cookies, Chocolate & Candy, Nuts & Seeds, Ice Cream.",
          "Nutritious: Fruits, Vegetables, Meat, Fish, Dairy, Eggs, Grains, Legumes.",
          "Other: Everything else including drinks, prepared foods, and non-food items.",
          "Use the store filter to view specific stores or compare selected stores.",
        ]}
      />
      <ChartAiInsightButton
        chartId="fridge:snackPercentage"
        chartTitle="Spending Breakdown"
        chartDescription="Breakdown of grocery spending between snacks, nutritious foods, and other items."
        chartData={{
          breakdown: data.map(d => ({
            category: d.label,
            percentage: d.value,
            spend: d.spend,
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
              chartTitle="Spending Breakdown"
              size="md"
            />
            <CardTitle>Spending Breakdown</CardTitle>
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
              chartTitle="Spending Breakdown"
              size="md"
            />
            <CardTitle>Spending Breakdown</CardTitle>
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
                  spendingBreakdownData.length === 0
                    ? "Scan receipts to see your spending breakdown."
                    : "No spending data detected."
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
            chartTitle="Spending Breakdown"
            size="md"
          />
          <CardTitle>Spending Breakdown</CardTitle>
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
            arcLabel={(datum) => valueFormatter.format((datum.data as { spend: number }).spend)}
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
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-2">
          {data.slice(0, 6).map((item) => (
            <div key={item.id} className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="font-medium text-foreground truncate max-w-[80px]" title={item.label}>{item.label}</span>
              <span className="text-[0.7rem]">
                {total > 0 ? `${Number(item.value).toFixed(0)}%` : "0%"}
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

ChartSpendingBreakdownFridge.displayName = "ChartSpendingBreakdownFridge"

// Backwards-compatible alias for existing imports
export const ChartSnackPercentageFridge = ChartSpendingBreakdownFridge








