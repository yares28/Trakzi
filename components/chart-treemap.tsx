"use client"

import { useMemo, useState, memo } from "react"
import { useTheme } from "next-themes"
import { ResponsiveTreeMap } from "@nivo/treemap"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { ChartCardFloatingMeta } from "@/components/chart-card-overlay-controls"
import { ChartInfoPopover, ChartInfoPopoverCategoryControls } from "@/components/chart-info-popover"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import { getContrastTextColor } from "@/lib/chart-colors"
import { toNumericValue } from "@/lib/utils"
import { ChartLoadingState } from "@/components/chart-loading-state"
import { NivoChartTooltip } from "@/components/chart-tooltip"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"
import { ChartExpandButton } from "@/components/chart-expand-button"
import { ChartFullscreenModal } from "@/components/chart-fullscreen-modal"

type TreeMapNode = {
  name: string
  children: Array<{
    name: string
    children: Array<{ name: string; loc: number; fullDescription?: string }>
  }>
}

interface ChartTreeMapProps {
  data?: TreeMapNode
  categoryControls?: ChartInfoPopoverCategoryControls
  isLoading?: boolean
  emptyTitle?: string
  emptyDescription?: string
}

export const ChartTreeMap = memo(function ChartTreeMap({
  data = { name: "", children: [] },
  categoryControls,
  isLoading = false,
  emptyTitle,
  emptyDescription
}: ChartTreeMapProps) {
  const { getPalette, colorScheme } = useColorScheme()
  const { formatCurrency } = useCurrency()
  const { resolvedTheme } = useTheme()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const isDark = resolvedTheme === "dark"

  // Palette indices i=0 to i=n-2 (exclude last). In dark mode, use lighter colors first.
  const chartColors = useMemo(() => {
    const palette = getPalette()
    const base = palette.length <= 1 ? palette : palette.slice(0, -1)
    if (isDark) {
      return [...base].reverse()
    }
    return colorScheme === "dark" && base.length > 4 ? base.slice(4) : base
  }, [getPalette, isDark, colorScheme])

  // Per-node contrast: compute white/black based on each cell's actual background
  const labelColorFn = (node: { color: string }) => getContrastTextColor(node.color)

  const sanitizedData = useMemo<TreeMapNode>(() => {
    const empty: TreeMapNode = { name: "", children: [] }
    if (!data?.children?.length) return empty

    const sanitizeChildren = (node: TreeMapNode): TreeMapNode => ({
      name: node?.name || "",
      children:
        node?.children?.map((child) => ({
          name: child.name,
          children:
            child.children?.map((grandchild) => ({
              name: grandchild.name,
              loc: toNumericValue(grandchild.loc),
              fullDescription: grandchild.fullDescription,
            })) || [],
        })) || [],
    })

    const result = sanitizeChildren(data)

    return result
  }, [data])

  const renderInfoTrigger = (forFullscreen = false) => {
    if (!forFullscreen) {
      return (
        <ChartCardFloatingMeta
          insight={
            <ChartAiInsightButton
              chartId="netWorthAllocation"
              chartTitle="Net Worth Allocation"
              chartData={{
                categories: sanitizedData.children?.map(c => c.name) || [],
                totalCategories: sanitizedData.children?.length || 0
              }}
              size="sm"
            />
          }
          info={
            <ChartInfoPopover
              title="Net Worth Allocation"
              categoryControls={categoryControls}
            />
          }
        />
      )
    }

    return (
      <div className="flex flex-col items-center gap-2">
        <ChartAiInsightButton
          chartId="netWorthAllocation"
          chartTitle="Net Worth Allocation"
          chartData={{
            categories: sanitizedData.children?.map(c => c.name) || [],
            totalCategories: sanitizedData.children?.length || 0
          }}
          size="sm"
        />
        <ChartInfoPopover
          title="Net Worth Allocation"
          categoryControls={categoryControls}
        />
      </div>
    )
  }

  // Render chart function for reuse
  const renderChart = () => (
    <ResponsiveTreeMap
      data={sanitizedData}
      colors={chartColors}
      identity="name"
      value="loc"
      valueFormat=".02s"
      margin={{ top: 10, right: 20, bottom: 10, left: 20 }}
      labelSkipSize={12}
      labelTextColor={labelColorFn}
      orientLabel={false}
      label={(node) => {
        if (node.width <= 28 || node.height <= 49) return ""
        const name = node.data.name || ""
        const words = name.trim().split(/\s+/)
        return words.length > 1 ? words[0] : name
      }}
      parentLabelPosition="left"
      parentLabelTextColor={labelColorFn}
      parentLabel={(node) => {
        if (node.width <= 28 || node.height <= 49) return ""
        const name = node.data.name || ""
        const words = name.trim().split(/\s+/)
        return words.length > 1 ? words[0] : name
      }}
      borderColor={{ from: "color", modifiers: [["darker", 0.1]] }}
      tooltip={({ node }) => {
        const displayName = (node.data as { fullDescription?: string; name?: string }).fullDescription || node.data.name
        return (
          <NivoChartTooltip
            title={displayName}
            titleColor={node.color}
            value={formatCurrency(node.value)}
            maxWidth={300}
            className="break-words"
          />
        )
      }}
    />
  )

  if (!sanitizedData || !sanitizedData.children || sanitizedData.children.length === 0) {
    return (
      <Card className="@container/card col-span-full relative">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton
              chartId="netWorthAllocation"
              chartTitle="Net Worth Allocation"
              size="md"
            />
            <CardTitle>Net Worth Allocation</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-3 pt-4 sm:px-8 sm:pt-6 h-[250px]">
          <ChartLoadingState
            isLoading={isLoading}
            skeletonType="grid"
            emptyTitle={emptyTitle}
            emptyDescription={emptyDescription}
          />
        </CardContent>
        {renderInfoTrigger()}
      </Card>
    )
  }

  return (
    <>
      <ChartFullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title="Net Worth Allocation"
        headerActions={renderInfoTrigger(true)}
      >
        <div className="h-full w-full min-h-[400px]">
          {renderChart()}
        </div>
      </ChartFullscreenModal>

      <Card className="col-span-full relative">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton
              chartId="netWorthAllocation"
              chartTitle="Net Worth Allocation"
              size="md"
            />
            <CardTitle>Net Worth Allocation</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-3 pt-4 sm:px-8 sm:pt-6 h-[250px]">
          <div className="h-full w-full">
            {renderChart()}
          </div>
        </CardContent>
        {renderInfoTrigger()}
      </Card>
    </>
  )
})

ChartTreeMap.displayName = "ChartTreeMap"
