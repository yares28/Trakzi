"use client"

import { useState, useEffect, useMemo } from "react"
import { useTheme } from "next-themes"
import { ResponsivePie } from "@nivo/pie"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { useColorScheme } from "@/components/color-scheme-provider"
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

export function ChartSnackPercentageFridge({ receiptTransactions = [], isLoading = false }: ChartSnackPercentageFridgeProps) {
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

  // Calculate snack percentage per trip
  const snackPercentageData = useMemo(() => {
    // Filter by selected stores if any are selected
    const filteredTransactions = selectedStores.size > 0
      ? receiptTransactions.filter((item) => {
        const store = normalizeStoreName(item.storeName)
        return selectedStores.has(store)
      })
      : receiptTransactions

    // Group by receipt (trip)
    const trips = new Map<string, {
      receiptId: string
      storeName: string
      date: string
      totalAmount: number
      snackAmount: number
    }>()

    filteredTransactions.forEach((item) => {
      const receiptId = item.receiptId
      const storeName = normalizeStoreName(item.storeName)
      const totalPrice = Number(item.totalPrice) || 0
      const isSnack = (item.categoryName?.toLowerCase().trim() === "snacks")

      const trip = trips.get(receiptId) || {
        receiptId,
        storeName,
        date: item.receiptDate,
        totalAmount: 0,
        snackAmount: 0,
      }

      trip.totalAmount += totalPrice
      if (isSnack) {
        trip.snackAmount += totalPrice
      }

      trips.set(receiptId, trip)
    })

    // Calculate percentages and aggregate by store
    const storeStats = new Map<string, {
      storeName: string
      totalTrips: number
      totalSpend: number
      totalSnackSpend: number
      averageSnackPercentage: number
    }>()

    trips.forEach((trip) => {
      const snackPercentage = trip.totalAmount > 0
        ? (trip.snackAmount / trip.totalAmount) * 100
        : 0

      const store = trip.storeName
      const stats = storeStats.get(store) || {
        storeName: store,
        totalTrips: 0,
        totalSpend: 0,
        totalSnackSpend: 0,
        averageSnackPercentage: 0,
      }

      stats.totalTrips += 1
      stats.totalSpend += trip.totalAmount
      stats.totalSnackSpend += trip.snackAmount
      storeStats.set(store, stats)
    })

    // Calculate average snack percentage per store
    storeStats.forEach((stats) => {
      stats.averageSnackPercentage = stats.totalSpend > 0
        ? (stats.totalSnackSpend / stats.totalSpend) * 100
        : 0
    })

    // Convert to chart data format
    const chartData = Array.from(storeStats.values())
      .map((stats) => ({
        id: stats.storeName,
        label: stats.storeName,
        value: Number(stats.averageSnackPercentage.toFixed(2)),
        trips: stats.totalTrips,
        totalSpend: stats.totalSpend,
        snackSpend: stats.totalSnackSpend,
      }))
      .sort((a, b) => b.value - a.value)

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

  // Calculate total for percentage calculations
  const total = useMemo(() => {
    return snackPercentageData.reduce((sum, item) => sum + item.value, 0)
  }, [snackPercentageData])

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
        ignoredFootnote="Only trips with assigned categories are included. Snacks are identified by the 'Snacks' category."
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

  // Don't render chart if data is empty
  if (!snackPercentageData || snackPercentageData.length === 0) {
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
            <ChartLoadingState isLoading={isLoading} />
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
              const storeData = datum.data as typeof data[0]
              return (
                <div className="rounded-md border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg">
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
                    Snack Percentage: <span className="font-mono">{Number(datum.value).toFixed(1)}%</span>
                  </div>
                  <div className="mt-0.5 text-[0.7rem] text-foreground/80">
                    Trips: {storeData.trips}
                  </div>
                  <div className="mt-0.5 text-[0.7rem] text-foreground/80">
                    Total Spend: {valueFormatter.format(storeData.totalSpend)}
                  </div>
                  <div className="mt-0.5 text-[0.7rem] text-foreground/80">
                    Snack Spend: {valueFormatter.format(storeData.snackSpend)}
                  </div>
                </div>
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
}

