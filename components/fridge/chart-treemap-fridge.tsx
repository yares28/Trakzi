"use client"

import { useMemo, memo } from "react"
import { useTheme } from "next-themes"
import { ResponsiveTreeMap } from "@nivo/treemap"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { ChartInfoPopover, ChartInfoPopoverCategoryControls } from "@/components/chart-info-popover"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useColorScheme } from "@/components/color-scheme-provider"
import { getContrastTextColor } from "@/lib/chart-colors"
import { toNumericValue } from "@/lib/utils"
import { ChartLoadingState } from "@/components/chart-loading-state"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"
import { getReceiptCategoryByName } from "@/lib/receipt-categories"
import { NivoChartTooltip } from "@/components/chart-tooltip"

type TreeMapNode = {
  name: string
  loc?: number
  fullDescription?: string
  children?: TreeMapNode[]
}

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

interface ChartTreeMapFridgeProps {
  receiptTransactions?: ReceiptTransactionRow[]
  categorySpendingData?: Array<{ category: string; total: number; color: string | null }>
  categoryControls?: ChartInfoPopoverCategoryControls
  isLoading?: boolean
}

function normalizeCategoryName(value: string | null | undefined) {
  const trimmed = (value ?? "").trim()
  return trimmed || "Other"
}

function getItemLabel(description?: string) {
  if (!description) return "Misc"
  const delimiterSplit = description.split(/[-–|]/)[0] ?? description
  const trimmed = delimiterSplit.trim()
  return trimmed.length > 24 ? `${trimmed.slice(0, 21)}…` : (trimmed || "Misc")
}

export const ChartTreeMapFridge = memo(function ChartTreeMapFridge({ receiptTransactions = [], categorySpendingData, categoryControls, isLoading = false }: ChartTreeMapFridgeProps) {
  const { getShuffledPalette, colorScheme } = useColorScheme()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  // In dark mode, use lighter colors (reverse the palette so lightest colors come first)
  const chartColors = useMemo(() => {
    const palette = getShuffledPalette()
    if (isDark) {
      return [...palette].reverse()
    }
    return colorScheme === "dark" ? palette.slice(4) : palette
  }, [getShuffledPalette, isDark, colorScheme])

  // Text color function based on node background color for optimal contrast
  const labelColorFn = (node: { color: string }) => getContrastTextColor(node.color)

  const sanitizedData = useMemo<TreeMapNode>(() => {
    if (!receiptTransactions || receiptTransactions.length === 0) {
      return { name: "", children: [] }
    }

    // Group by: broadType -> categoryName -> items
    const broadTypeMap = new Map<string, Map<string, Map<string, { amount: number; fullDescription: string }>>>()

    receiptTransactions.forEach((item) => {
      const categoryName = normalizeCategoryName(item.categoryName)
      const receiptCategory = getReceiptCategoryByName(categoryName)
      const broadType = receiptCategory?.broadType || "Other"

      const totalPrice = Number(item.totalPrice) || 0
      if (totalPrice <= 0) return

      const itemLabel = getItemLabel(item.description)
      const fullDescription = item.description || itemLabel

      // Get or create broad type map
      if (!broadTypeMap.has(broadType)) {
        broadTypeMap.set(broadType, new Map())
      }
      const categoryMap = broadTypeMap.get(broadType)!

      // Get or create category map
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, new Map())
      }
      const itemMap = categoryMap.get(categoryName)!

      // Add or update item
      const existing = itemMap.get(itemLabel)
      if (existing) {
        existing.amount += totalPrice
      } else {
        itemMap.set(itemLabel, {
          amount: totalPrice,
          fullDescription,
        })
      }
    })

    // Convert to tree structure
    const maxItemsPerCategory = 5
    const children = Array.from(broadTypeMap.entries())
      .map(([broadType, categoryMap]) => {
        const categoryChildren = Array.from(categoryMap.entries())
          .map(([categoryName, itemMap]) => {
            const sortedItems = Array.from(itemMap.entries())
              .sort((a, b) => b[1].amount - a[1].amount)
            const topItems = sortedItems.slice(0, maxItemsPerCategory)
            const remainingTotal = sortedItems.slice(maxItemsPerCategory)
              .reduce((sum, [, value]) => sum + value.amount, 0)

            const itemChildren = topItems.map(([itemLabel, { amount, fullDescription }]) => ({
              name: itemLabel,
              loc: toNumericValue(amount),
              fullDescription,
            }))

            if (remainingTotal > 0) {
              itemChildren.push({
                name: "Other",
                loc: toNumericValue(remainingTotal),
                fullDescription: "Other items",
              })
            }

            return {
              name: categoryName,
              children: itemChildren.length > 0
                ? itemChildren
                : [{ name: categoryName, loc: 0, fullDescription: categoryName }],
            }
          })
          .filter(cat => {
            // Only include categories that have items
            const total = cat.children.reduce((sum, child) => sum + (child.loc || 0), 0)
            return total > 0
          })
          .sort((a, b) => {
            const aTotal = a.children.reduce((sum, child) => sum + (child.loc || 0), 0)
            const bTotal = b.children.reduce((sum, child) => sum + (child.loc || 0), 0)
            return bTotal - aTotal
          })

        return {
          name: broadType,
          children: categoryChildren,
        }
      })
      .filter(broad => {
        // Only include broad types that have categories
        const total = broad.children.reduce((sum, cat) => {
          const catTotal = cat.children.reduce((sum2, item) => sum2 + (item.loc || 0), 0)
          return sum + catTotal
        }, 0)
        return total > 0
      })
      .sort((a, b) => {
        const aTotal = a.children.reduce((sum, cat) => {
          const catTotal = cat.children.reduce((sum2, item) => sum2 + (item.loc || 0), 0)
          return sum + catTotal
        }, 0)
        const bTotal = b.children.reduce((sum, cat) => {
          const catTotal = cat.children.reduce((sum2, item) => sum2 + (item.loc || 0), 0)
          return sum + catTotal
        }, 0)
        return bTotal - aTotal
      })

    return {
      name: "Grocery Spending",
      children,
    }
  }, [receiptTransactions])

  const renderInfoTrigger = () => (
    <div className="flex flex-col items-center gap-2">
      <ChartInfoPopover
        title="Net Worth Allocation"
        description="Breakdown of your grocery spending by broad category, category, and individual items"
        details={[
          "Each rectangle represents spending; larger blocks indicate higher amounts.",
          "Structure: Broad Categories (top level) → Categories (middle level) → Items (bottom level).",
          "Click into a category to see the individual items purchased.",
        ]}
        ignoredFootnote="Only receipt transactions with assigned categories are included."
        categoryControls={categoryControls}
      />
      <ChartAiInsightButton
        chartId="fridge:netWorthAllocation"
        chartTitle="Net Worth Allocation"
        chartDescription="Breakdown of your grocery spending by broad category, category, and individual items"
        chartData={{
          broadCategories: sanitizedData.children?.map(c => c.name) || [],
          totalBroadCategories: sanitizedData.children?.length || 0,
        }}
        size="sm"
      />
    </div>
  )

  if (!sanitizedData || !sanitizedData.children || sanitizedData.children.length === 0) {
    return (
      <Card className="@container/card col-span-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartFavoriteButton
              chartId="fridge:netWorthAllocation"
              chartTitle="Net Worth Allocation"
              size="md"
            />
            <CardTitle>Net Worth Allocation</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px]">
          <ChartLoadingState isLoading={isLoading} skeletonType="grid" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <GridStackCardDragHandle />
          <ChartFavoriteButton
            chartId="fridge:netWorthAllocation"
            chartTitle="Net Worth Allocation"
            size="md"
          />
          <CardTitle>Net Worth Allocation</CardTitle>
        </div>
        <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          {renderInfoTrigger()}
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px]">
        <div className="h-full w-full">
          <ResponsiveTreeMap
            data={sanitizedData}
            colors={chartColors}
            identity="name"
            value="loc"
            valueFormat=".02s"
            margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
            labelSkipSize={12}
            labelTextColor={labelColorFn}
            orientLabel={false}
            label={(node) => {
              if (node.width <= 28 || node.height <= 49) {
                return ""
              }
              const name = node.data.name || ""
              const words = name.trim().split(/\s+/)
              return words.length > 1 ? words[0] : name
            }}
            parentLabelPosition="left"
            parentLabelTextColor={labelColorFn}
            parentLabel={(node) => {
              if (node.width <= 28 || node.height <= 49) {
                return ""
              }
              const name = node.data.name || ""
              const words = name.trim().split(/\s+/)
              return words.length > 1 ? words[0] : name
            }}
            borderColor={{ from: "color", modifiers: [["darker", 0.1]] }}
            tooltip={({ node }) => {
              const displayName =
                (node.data as { fullDescription?: string; name?: string }).fullDescription ||
                node.data.name

              return (
                <NivoChartTooltip
                  title={displayName}
                  titleColor={node.color}
                  value={String(node.formattedValue)}
                />
              )
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
})

ChartTreeMapFridge.displayName = "ChartTreeMapFridge"













