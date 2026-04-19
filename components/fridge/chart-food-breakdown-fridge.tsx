"use client"

import { memo, useEffect, useMemo, useState } from "react"
import { useTheme } from "next-themes"
import { ResponsivePie } from "@nivo/pie"
import { Store } from "lucide-react"

import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { ChartExpandButton } from "@/components/chart-expand-button"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { ChartFullscreenModal } from "@/components/chart-fullscreen-modal"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { ChartLoadingState } from "@/components/chart-loading-state"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"
import { NivoChartTooltip } from "@/components/chart-tooltip"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { getContrastTextColor, getChartTextColor } from "@/lib/chart-colors"
import type { ChartId } from "@/lib/chart-card-sizes.config"
import { computeFridgeScore } from "@/lib/fridge-score"
import { isSnackCategory } from "@/lib/receipt-categories"
import { toNumericValue } from "@/lib/utils"

import type { ReceiptTransactionRow } from "@/app/fridge/_client/types"

type GroceryDatum = {
  id: string
  label: string
  value: number
}

type MacronutrientDatum = {
  typeName: string
  total: number
  color: string | null
}

type SpendingBreakdownDatum = {
  id: string
  label: string
  value: number
  spend: number
}

type FoodBreakdownTab = "grocery" | "macros" | "spending"

type ChartFoodBreakdownFridgeProps = {
  data?: GroceryDatum[]
  receiptTransactions?: ReceiptTransactionRow[]
  categorySpendingData?: Array<{ category: string; total: number; color: string | null }>
  macronutrientBreakdown?: MacronutrientDatum[]
  isLoading?: boolean
}

type ColoredPieDatum = {
  id: string
  label: string
  value: number
  color: string
  spend?: number
}

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

function normalizeStoreName(value: string | null | undefined) {
  const raw = (value ?? "").trim()
  if (!raw) return "Unknown"
  return raw
}

function normalizeMacronutrientType(value: string | null | undefined) {
  const trimmed = (value ?? "").trim()
  return trimmed || "Other"
}

function isNutritiousCategory(categoryName: string | null | undefined): boolean {
  if (!categoryName) return false
  return NUTRITIOUS_CATEGORIES.has(categoryName.trim().toLowerCase())
}

function buildFridgeReceipts(transactions: ReceiptTransactionRow[]) {
  const receiptMap = new Map<string, {
    id: string
    date: string
    totalAmount: number
    items: Array<{
      id: string
      name: string
      category: string
      categoryId?: number | null
      price: number
      quantity: number
    }>
  }>()

  transactions.forEach((tx) => {
    const receiptId = String(tx.receiptId ?? tx.id)
    if (!receiptId) return

    if (!receiptMap.has(receiptId)) {
      receiptMap.set(receiptId, {
        id: receiptId,
        date: tx.receiptDate,
        totalAmount: Number(tx.receiptTotalAmount) || 0,
        items: [],
      })
    }

    const receipt = receiptMap.get(receiptId)
    if (!receipt) return

    const quantity = Number.isFinite(tx.quantity) && tx.quantity > 0 ? tx.quantity : 1
    const pricePerUnit = Number(tx.pricePerUnit)
    const unitPrice = pricePerUnit > 0
      ? pricePerUnit
      : (quantity > 0 && tx.totalPrice > 0 ? tx.totalPrice / quantity : tx.totalPrice)

    receipt.items.push({
      id: String(tx.id),
      name: tx.description || "Untitled",
      category: tx.categoryName || "Other",
      categoryId: tx.categoryId,
      price: unitPrice,
      quantity,
    })

    if (!Number.isFinite(receipt.totalAmount) || receipt.totalAmount <= 0) {
      receipt.totalAmount = receipt.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    }
  })

  return Array.from(receiptMap.values())
}

function getScoreFromTransactions(transactions: ReceiptTransactionRow[]) {
  if (transactions.length === 0) return null
  return computeFridgeScore(buildFridgeReceipts(transactions)).score
}

export const ChartFoodBreakdownFridge = memo(function ChartFoodBreakdownFridge({
  data: baseData = [],
  receiptTransactions = [],
  categorySpendingData,
  macronutrientBreakdown,
  isLoading = false,
}: ChartFoodBreakdownFridgeProps) {
  const { resolvedTheme } = useTheme()
  const { colorScheme, getShuffledPalette } = useColorScheme()
  const { formatCurrency } = useCurrency()

  const [mounted, setMounted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [activeTab, setActiveTab] = useState<FoodBreakdownTab>("grocery")
  const [selectedStores, setSelectedStores] = useState<Set<string>>(new Set())
  const [isStorePopoverOpen, setIsStorePopoverOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = resolvedTheme === "dark"
  const textColor = getChartTextColor(isDark)

  const valueFormatter = useMemo(
    () => ({
      format: (value: number) => formatCurrency(value),
    }),
    [formatCurrency],
  )

  const availableStores = useMemo(() => {
    const stores = new Set<string>()
    receiptTransactions.forEach((item) => {
      const store = normalizeStoreName(item.storeName)
      if (store !== "Unknown") stores.add(store)
    })
    return Array.from(stores).sort()
  }, [receiptTransactions])

  const filteredStoreTransactions = useMemo(() => {
    if (selectedStores.size === 0) return receiptTransactions
    return receiptTransactions.filter((item) => selectedStores.has(normalizeStoreName(item.storeName)))
  }, [receiptTransactions, selectedStores])

  const groceryScore = useMemo(
    () => getScoreFromTransactions(receiptTransactions),
    [receiptTransactions],
  )

  const storeScore = useMemo(
    () => getScoreFromTransactions(filteredStoreTransactions),
    [filteredStoreTransactions],
  )

  const groceryData = useMemo(() => {
    const chartBaseData = categorySpendingData && categorySpendingData.length > 0
      ? categorySpendingData.map((item) => ({
        id: item.category,
        label: item.category,
        value: item.total,
      }))
      : baseData

    return chartBaseData
      .map((item) => ({
        ...item,
        value: toNumericValue(item.value),
      }))
      .sort((a, b) => b.value - a.value)
  }, [baseData, categorySpendingData])

  const macronutrientData = useMemo(() => {
    if (macronutrientBreakdown && macronutrientBreakdown.length > 0) {
      return macronutrientBreakdown
        .map((item) => ({
          id: item.typeName,
          label: item.typeName,
          value: Number(item.total.toFixed(2)),
        }))
        .sort((a, b) => b.value - a.value)
    }

    const totals = new Map<string, number>()
    receiptTransactions.forEach((item) => {
      const macronutrientType = normalizeMacronutrientType(item.categoryTypeName)
      const spend = Number(item.totalPrice) || 0
      totals.set(macronutrientType, (totals.get(macronutrientType) || 0) + spend)
    })

    return Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({
        id: label,
        label,
        value: Number(value.toFixed(2)),
      }))
  }, [macronutrientBreakdown, receiptTransactions])

  const spendingData = useMemo<SpendingBreakdownDatum[]>(() => {
    let totalSpend = 0
    let snackSpend = 0
    let nutritiousSpend = 0

    filteredStoreTransactions.forEach((item) => {
      const totalPrice = Number(item.totalPrice) || 0
      totalSpend += totalPrice

      if (isSnackCategory(item.categoryName)) {
        snackSpend += totalPrice
      } else if (isNutritiousCategory(item.categoryName)) {
        nutritiousSpend += totalPrice
      }
    })

    const otherSpend = totalSpend - snackSpend - nutritiousSpend
    const snackPercentage = totalSpend > 0 ? (snackSpend / totalSpend) * 100 : 0
    const nutritiousPercentage = totalSpend > 0 ? (nutritiousSpend / totalSpend) * 100 : 0
    const otherPercentage = totalSpend > 0 ? (otherSpend / totalSpend) * 100 : 0

    return [
      { id: "Snacks", label: "Snacks", value: Number(snackPercentage.toFixed(2)), spend: snackSpend },
      { id: "Nutritious", label: "Nutritious", value: Number(nutritiousPercentage.toFixed(2)), spend: nutritiousSpend },
      { id: "Other", label: "Other", value: Number(otherPercentage.toFixed(2)), spend: otherSpend },
    ].filter((item) => item.value > 0)
  }, [filteredStoreTransactions])

  const activeBaseData = useMemo(() => {
    if (activeTab === "grocery") return groceryData
    if (activeTab === "macros") return macronutrientData
    return spendingData
  }, [activeTab, groceryData, macronutrientData, spendingData])

  const activeData = useMemo<ColoredPieDatum[]>(() => {
    const palette = getShuffledPalette()
    const colors = palette.slice(0, Math.min(activeBaseData.length, 7))
    return activeBaseData.map((item, index) => ({
      ...item,
      color: colors[index % colors.length],
    }))
  }, [activeBaseData, colorScheme, getShuffledPalette])

  const activeTotal = useMemo(
    () => activeBaseData.reduce((sum, item) => sum + item.value, 0),
    [activeBaseData],
  )

  const hasActiveData = activeData.length > 0 && activeTotal > 0

  const activeMeta = useMemo(() => {
    if (activeTab === "grocery") {
      return {
        chartId: "fridge:expenseBreakdown" as ChartId,
        title: "Grocery Breakdown",
        description: "This pie chart shows how your total grocery expenses are distributed across receipt categories.",
        details: [
          "Slices are sorted by spend so the largest categories stand out.",
          "Categories are based on receipt line items from your uploaded receipts.",
        ],
        score: groceryScore,
        scoreLabel: "Grocery Score",
      }
    }

    if (activeTab === "macros") {
      return {
        chartId: "fridge:macronutrientBreakdown" as ChartId,
        title: "Macronutrient Breakdown",
        description: "This pie chart shows how your total grocery expenses are distributed across macronutrient types.",
        details: [
          "Slices are sorted by spend so the largest macronutrient types stand out.",
          "Each slice groups categories like Protein, Carbs, Fat, Fiber, and similar type labels.",
        ],
        score: null,
        scoreLabel: "",
      }
    }

    return {
      chartId: "fridge:snackPercentage" as ChartId,
      title: "Spending Breakdown",
      description: "This chart shows how your grocery spending is split between snacks, nutritious foods, and other items.",
      details: [
        "Snacks include categories like pastries, salty snacks, cookies, candy, and ice cream.",
        "Nutritious includes staples like fruits, vegetables, meat, fish, dairy, eggs, grains, and legumes.",
        "Use the store filter to compare one store or a selected group of stores.",
      ],
      score: storeScore,
      scoreLabel: "Store Score",
    }
  }, [activeTab, groceryScore, storeScore])

  const handleStoreToggle = (store: string) => {
    setSelectedStores((prev) => {
      const next = new Set(prev)
      if (next.has(store)) next.delete(store)
      else next.add(store)
      return next
    })
  }

  const handleSelectAllStores = () => {
    if (selectedStores.size === availableStores.length) setSelectedStores(new Set())
    else setSelectedStores(new Set(availableStores))
  }

  const renderStoreFilter = () => {
    if (activeTab !== "spending") return null

    return (
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
                onClick={handleSelectAllStores}
              >
                {selectedStores.size === availableStores.length ? "Clear All" : "Select All"}
              </Button>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {availableStores.map((store) => (
                <div key={store} className="flex items-center space-x-2">
                  <Checkbox
                    id={`merged-store-${store}`}
                    checked={selectedStores.has(store)}
                    onCheckedChange={() => handleStoreToggle(store)}
                  />
                  <Label
                    htmlFor={`merged-store-${store}`}
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
    )
  }

  const renderInfoActions = () => (
    <div className="flex items-center gap-2">
      <ChartInfoPopover
        title={activeMeta.title}
        description={activeMeta.description}
        details={activeMeta.details}
      />
      <ChartAiInsightButton
        chartId={activeMeta.chartId}
        chartTitle={activeMeta.title}
        chartDescription={activeMeta.description}
        chartData={
          activeTab === "spending"
            ? {
              breakdown: activeData.map((item) => ({
                category: item.label,
                percentage: item.value,
                spend: item.spend,
              })),
              selectedStores: Array.from(selectedStores),
            }
            : {
              totalExpenses: activeBaseData.reduce((sum, item) => sum + item.value, 0),
              categories: activeData.map((item) => ({ name: item.label, amount: item.value })),
              topCategory: activeData[0]?.label,
              topCategoryAmount: activeData[0]?.value,
            }
        }
        size="sm"
      />
    </div>
  )

  const renderTabSwitcher = () => (
    <div
      className="flex shrink-0 items-center justify-start rounded-full bg-muted p-px text-xs leading-tight"
      role="group"
      aria-label="Food breakdown view"
    >
      {([
        { id: "grocery", label: "Grocery" },
        { id: "macros", label: "Macros" },
        { id: "spending", label: "Spending" },
      ] as Array<{ id: FoodBreakdownTab; label: string }>).map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`rounded-full px-2.5 py-1 font-medium transition-all whitespace-nowrap ${activeTab === tab.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => setActiveTab(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )

  const renderLegend = () => (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-2">
      {activeData.slice(0, 6).map((item) => (
        <div key={item.id} className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={{ backgroundColor: item.color }}
          />
          <span className="font-medium text-foreground truncate max-w-[90px]" title={item.label}>
            {item.label}
          </span>
          <span className="text-[0.7rem]">
            {activeTab === "spending"
              ? `${Number(item.value).toFixed(0)}%`
              : activeTotal > 0
                ? `${((item.value / activeTotal) * 100).toFixed(0)}%`
                : "0%"}
          </span>
        </div>
      ))}
      {activeData.length > 6 && (
        <span className="text-[0.65rem] text-muted-foreground">
          +{activeData.length - 6} more
        </span>
      )}
    </div>
  )

  const renderPie = (compact = false) => (
    <ResponsivePie
      data={activeData}
      margin={compact ? { top: 20, right: 20, bottom: 20, left: 20 } : { top: 40, right: 40, bottom: 40, left: 40 }}
      innerRadius={0.5}
      padAngle={0.6}
      cornerRadius={2}
      activeOuterRadiusOffset={8}
      enableArcLinkLabels={false}
      arcLabelsSkipAngle={15}
      arcLabelsTextColor={(datum: { color: string }) => getContrastTextColor(datum.color)}
      arcLabel={activeTab === "spending"
        ? (datum) => valueFormatter.format((datum.data as ColoredPieDatum).spend ?? 0)
        : undefined}
      valueFormat={(value) => activeTab === "spending" ? `${toNumericValue(value).toFixed(1)}%` : formatCurrency(value)}
      colors={{ datum: "data.color" as const }}
      tooltip={({ datum }) => {
        if (activeTab === "spending") {
          const sliceData = datum.data as ColoredPieDatum
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
                {valueFormatter.format(sliceData.spend ?? 0)}
              </div>
            </NivoChartTooltip>
          )
        }

        const percentage = activeTotal > 0 ? (Number(datum.value) / activeTotal) * 100 : 0
        return (
          <NivoChartTooltip
            title={datum.label as string}
            titleColor={datum.color as string}
            value={valueFormatter.format(Number(datum.value))}
            subValue={`${percentage.toFixed(1)}%`}
          />
        )
      }}
      theme={{ text: { fill: textColor, fontSize: 12 } }}
    />
  )

  const renderHeaderActions = () => (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {renderTabSwitcher()}
        {renderInfoActions()}
      </div>
      {renderStoreFilter()}
    </div>
  )

  if (!mounted) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartFavoriteButton chartId={activeMeta.chartId} chartTitle={activeMeta.title} size="md" />
            <CardTitle>{activeMeta.title}</CardTitle>
          </div>
          <CardAction>{renderHeaderActions()}</CardAction>
        </CardHeader>
        <CardContent className="flex-1 min-h-0">
          <div className="h-full w-full min-h-[250px]" />
        </CardContent>
      </Card>
    )
  }

  const emptyDescription = activeTab === "spending"
    ? selectedStores.size > 0
      ? "No spending data for the selected stores."
      : "Scan receipts to see your spending breakdown."
    : `No ${activeMeta.title.toLowerCase()} data available yet.`

  return (
    <>
      <ChartFullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title={activeMeta.title}
        description={activeMeta.description}
        headerActions={renderHeaderActions()}
        orientation="portrait"
      >
        <div className="flex h-full min-h-0 w-full flex-col">
          <div className="min-h-[360px] flex-1">
            {hasActiveData ? (
              <div className="relative h-full w-full" key={`${colorScheme}-${activeTab}-fullscreen`}>
                {renderPie()}
                {activeMeta.score !== null && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-4xl font-bold text-foreground leading-none">
                      {activeMeta.score}
                    </span>
                    <span className="text-sm font-medium text-muted-foreground mt-1">
                      {activeMeta.scoreLabel}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <ChartLoadingState
                isLoading={isLoading}
                skeletonType="pie"
                emptyDescription={emptyDescription}
              />
            )}
          </div>
          {hasActiveData ? renderLegend() : null}
        </div>
      </ChartFullscreenModal>

      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton chartId={activeMeta.chartId} chartTitle={activeMeta.title} size="md" />
            <CardTitle>{activeMeta.title}</CardTitle>
          </div>
          <CardAction>{renderHeaderActions()}</CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0 flex flex-col">
          {hasActiveData ? (
            <>
              <div className="relative flex-1 min-h-[180px] md:min-h-[260px]" key={`${colorScheme}-${activeTab}`}>
                {renderPie(true)}
                {activeMeta.score !== null && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl @sm/card:text-3xl @md/card:text-4xl @lg/card:text-5xl font-bold text-foreground leading-none">
                      {activeMeta.score}
                    </span>
                    <span className="text-[0.65rem] @sm/card:text-xs @md/card:text-sm font-medium text-muted-foreground mt-0.5">
                      {activeMeta.scoreLabel}
                    </span>
                  </div>
                )}
              </div>
              {renderLegend()}
            </>
          ) : (
            <div className="h-full w-full min-h-[250px]">
              <ChartLoadingState
                isLoading={isLoading}
                skeletonType="pie"
                emptyDescription={emptyDescription}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
})

ChartFoodBreakdownFridge.displayName = "ChartFoodBreakdownFridge"
