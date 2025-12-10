"use client"

import { useMemo } from "react"
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
import { toNumericValue } from "@/lib/utils"
import { ChartLoadingState } from "@/components/chart-loading-state"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"

interface ChartTreeMapProps {
  data?: {
    name: string
    children: Array<{
      name: string
      children: Array<{ name: string; loc: number; fullDescription?: string }>
    }>
  }
  categoryControls?: ChartInfoPopoverCategoryControls
  isLoading?: boolean
}

export function ChartTreeMap({ data = { name: "", children: [] }, categoryControls, isLoading = false }: ChartTreeMapProps) {
  const { getPalette, colorScheme } = useColorScheme()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  
  // In dark mode, use lighter colors (reverse the palette so lightest colors come first)
  // Also handle the "dark" color scheme specially
  const chartColors = useMemo(() => {
    const palette = getPalette()
    if (isDark) {
      // In dark theme mode, reverse to get lighter colors first
      return [...palette].reverse()
    }
    // For "dark" color scheme in light mode, shift to lighter colors
    return colorScheme === "dark" ? palette.slice(4) : palette
  }, [getPalette, isDark, colorScheme])
  
  // Text color based on theme - white in dark mode, black in light mode
  const labelColor = isDark ? "#ffffff" : "#000000"
  
  const sanitizedData = useMemo(() => {
    if (!data || !data.children) return { name: "", children: [] }
    const sanitizeChildren = (node: ChartTreeMapProps["data"]): ChartTreeMapProps["data"] => ({
      name: node?.name || "",
      children: node?.children?.map(child => ({
        name: child.name,
        children: child.children.map(grandchild => ({
          name: grandchild.name,
          loc: toNumericValue(grandchild.loc),
          fullDescription: grandchild.fullDescription
        }))
      })) || []
    })
    return sanitizeChildren(data)
  }, [data])

  const renderInfoTrigger = () => (
    <div className="flex flex-col items-center gap-2">
      <ChartInfoPopover
        title="Net Worth Allocation"
        description="Breakdown of your total assets - Click on a category to see transactions"
        details={[
          "Each rectangle represents a category; larger blocks indicate higher spend or allocation.",
          "Click into a category to inspect the underlying transactions for that time period."
        ]}
        ignoredFootnote="Only expense-driven categories are included so you can focus on where money leaves your accounts."
        categoryControls={categoryControls}
      />
      <ChartAiInsightButton
        chartId="netWorthAllocation"
        chartTitle="Net Worth Allocation"
        chartDescription="Breakdown of your total assets - Click on a category to see transactions"
        chartData={{
          categories: sanitizedData.children?.map(c => c.name) || [],
          totalCategories: sanitizedData.children?.length || 0
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
            <ChartFavoriteButton
              chartId="netWorthAllocation"
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
          <ChartLoadingState isLoading={isLoading} />
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ChartFavoriteButton
            chartId="netWorthAllocation"
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
            labelTextColor={labelColor}
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
            parentLabelTextColor={labelColor}
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
                <div className="rounded-md border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg max-w-[300px] break-words">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full border border-border/50 shrink-0"
                      style={{ backgroundColor: node.color, borderColor: node.color }}
                    />
                    <span className="font-medium text-foreground">{displayName}</span>
                  </div>
                  <div className="mt-1 font-mono text-[0.7rem] text-foreground/80">
                    {node.formattedValue}
                  </div>
                </div>
              )
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
}

