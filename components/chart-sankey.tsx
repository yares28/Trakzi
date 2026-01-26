"use client"

import { useMemo, useState, memo } from "react"
import { useTheme } from "next-themes"
import { ResponsiveSankey } from "@nivo/sankey"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { ChartInfoPopover, ChartInfoPopoverCategoryControls } from "@/components/chart-info-popover"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import { toNumericValue } from "@/lib/utils"
import { ChartLoadingState } from "@/components/chart-loading-state"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"
import { ChartExpandButton } from "@/components/chart-expand-button"
import { ChartFullscreenModal } from "@/components/chart-fullscreen-modal"
import { useIsMobile } from "@/hooks/use-mobile"

interface SankeyNode {
  id: string
  label?: string
}

interface ChartSankeyProps {
  data?: {
    nodes: SankeyNode[]
    links: Array<{ source: string; target: string; value: number }>
  }
  categoryControls?: ChartInfoPopoverCategoryControls
  isLoading?: boolean
  emptyTitle?: string
  emptyDescription?: string
}

const formatNodeId = (id: string) => {
  if (!id) return ""
  let value = id

  // Remove namespace prefixes like inflow:, outflow:, root:
  if (value.includes(":")) {
    value = value.substring(value.lastIndexOf(":") + 1)
  } else {
    value = value.replace(/^(inflow|outflow|root|node)(?=[A-Z_-]|$)/i, "")
  }

  // Insert spaces for camelCase and replace separators with spaces
  value = value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .trim()

  if (!value) {
    value = id
  }

  return value.replace(/\b\w/g, char => char.toUpperCase())
}

export const ChartSankey = memo(function ChartSankey({
  data = { nodes: [], links: [] },
  categoryControls,
  isLoading = false,
  emptyTitle,
  emptyDescription
}: ChartSankeyProps) {
  const { getPalette } = useColorScheme()
  const { resolvedTheme } = useTheme()
  const { formatCurrency } = useCurrency()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const isMobile = useIsMobile()

  // Use full palette colors, filtering out the neutral gray for more distinct flows
  const chartColors = useMemo(() => {
    const palette = getPalette()
    // Remove the neutral gray (#c3c3c3) for more color variety
    return palette.filter(color => color !== "#c3c3c3")
  }, [getPalette])

  // ACTUAL ROOT CAUSE FIX: Nivo theme controls link colors
  const chartTheme = useMemo(() => ({
    // This prevents Nivo from applying default darkening to links
    background: 'transparent',
  }), [])



  const sanitizedData = useMemo(() => {
    const nodes = (data?.nodes || []).map(node => {
      const label = node.label?.trim() || formatNodeId(node.id)
      return {
        id: node.id,
        label,
        data: { label }
      }
    })
    const links = data?.links?.map(link => ({
      ...link,
      value: toNumericValue(link.value)
    })) || []
    return { nodes, links }
  }, [data])

  const nodeLabelMap = useMemo(() => {
    const map = new Map<string, string>()
    sanitizedData.nodes.forEach(node => {
      map.set(node.id, (node.data?.label as string) ?? node.label ?? formatNodeId(node.id))
    })
    return map
  }, [sanitizedData.nodes])

  const getNodeLabel = (id: string) => nodeLabelMap.get(id) ?? formatNodeId(id)

  const renderInfoTrigger = (forFullscreen = false) => (
    <div className={`flex items-center gap-2 ${forFullscreen ? '' : 'hidden md:flex flex-col'}`}>
      <ChartInfoPopover
        title="Cash Flow Sankey"
        description="Follow revenue as it moves through the org"
        details={[
          "Each link represents cash flowing from income sources through expense categories, eventually reaching savings or surplus.",
          "We cap the visualization to the most significant inflow sources and expense categories to keep it legible."
        ]}
        ignoredFootnote="Smaller categories are aggregated into 'Other' so the diagram stays readable."
        categoryControls={categoryControls}
      />
      <ChartAiInsightButton
        chartId="cashFlowSankey"
        chartTitle="Cash Flow Sankey"
        chartDescription="Follow revenue as it moves through the org"
        chartData={{
          nodes: sanitizedData.nodes.map(n => n.id),
          links: sanitizedData.links.length
        }}
        size="sm"
      />
    </div>
  )

  if (!sanitizedData.nodes.length || !sanitizedData.links.length) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton
              chartId="cashFlowSankey"
              chartTitle="Cash Flow Sankey"
              size="md"
            />
            <CardTitle>Cash Flow Sankey</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
          <div className="h-full w-full min-h-[250px]">
            <ChartLoadingState
              isLoading={isLoading}
              emptyTitle={emptyTitle}
              emptyDescription={emptyDescription}
            />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Helper to get truncated label for mobile
  const getMobileLabel = (id: string) => {
    const label = getNodeLabel(id)
    return label.length > 8 ? label.slice(0, 7) + '…' : label
  }

  // Render chart function for FULLSCREEN (full fidelity)
  const renderFullChart = () => (
    <div
      key={resolvedTheme}
      className="h-full w-full"
      style={{
        isolation: 'isolate',
        mixBlendMode: 'normal'
      }}
    >
      <ResponsiveSankey
        data={sanitizedData}
        margin={{ top: 40, right: 160, bottom: 90, left: 100 }}
        align="justify"
        label={node => getNodeLabel(node.id)}
        nodeTooltip={({ node }) => {
          const label = getNodeLabel(node.id)
          const value = typeof node.value === "number" ? node.value : 0
          return (
            <div className="rounded-md border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg">
              <div className="font-medium text-foreground">{label}</div>
              <div className="text-muted-foreground">{formatCurrency(value)}</div>
            </div>
          )
        }}
        linkTooltip={({ link }) => {
          const sourceLabel = getNodeLabel(link.source.id)
          const targetLabel = getNodeLabel(link.target.id)
          return (
            <div className="rounded-md border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg">
              <div className="font-medium text-foreground">{sourceLabel} → {targetLabel}</div>
              <div className="text-muted-foreground">{formatCurrency(toNumericValue(link.value))}</div>
            </div>
          )
        }}
        colors={chartColors}
        theme={chartTheme}
        nodeOpacity={1}
        nodeHoverOthersOpacity={0.7}
        nodeThickness={18}
        nodeSpacing={32}
        nodeBorderWidth={0}
        nodeBorderRadius={3}
        linkOpacity={0.95}
        linkHoverOthersOpacity={0.6}
        linkContract={3}
        labelPosition="outside"
        labelOrientation="horizontal"
        labelPadding={20}
        labelTextColor={resolvedTheme === "dark" ? "#ffffff" : { from: "color", modifiers: [["darker", 1]] }}
        legends={[]}
        enableLinkGradient={true}
        animate={false}
      />
    </div>
  )

  // Render chart function for MOBILE (optimized: reduced margins, vertical labels, smaller spacing)
  const renderMobileChart = () => (
    <div
      key={resolvedTheme}
      className="h-full w-full"
      style={{
        isolation: 'isolate',
        mixBlendMode: 'normal'
      }}
    >
      <ResponsiveSankey
        data={sanitizedData}
        margin={{ top: 20, right: 50, bottom: 20, left: 50 }}
        align="justify"
        label={node => getMobileLabel(node.id)}
        nodeTooltip={({ node }) => {
          const label = getNodeLabel(node.id)
          const value = typeof node.value === "number" ? node.value : 0
          return (
            <div className="rounded-md border border-border/60 bg-background/95 px-2 py-1.5 text-xs shadow-lg">
              <div className="font-medium text-foreground">{label}</div>
              <div className="text-muted-foreground">{formatCurrency(value)}</div>
            </div>
          )
        }}
        linkTooltip={({ link }) => {
          const sourceLabel = getNodeLabel(link.source.id)
          const targetLabel = getNodeLabel(link.target.id)
          return (
            <div className="rounded-md border border-border/60 bg-background/95 px-2 py-1.5 text-xs shadow-lg">
              <div className="font-medium text-foreground">{sourceLabel} → {targetLabel}</div>
              <div className="text-muted-foreground">{formatCurrency(toNumericValue(link.value))}</div>
            </div>
          )
        }}
        colors={chartColors}
        theme={chartTheme}
        nodeOpacity={1}
        nodeHoverOthersOpacity={0.7}
        nodeThickness={12}
        nodeSpacing={16}
        nodeBorderWidth={0}
        nodeBorderRadius={2}
        linkOpacity={0.95}
        linkHoverOthersOpacity={0.6}
        linkContract={2}
        labelPosition="outside"
        labelOrientation="vertical"
        labelPadding={8}
        labelTextColor={resolvedTheme === "dark" ? "#ffffff" : { from: "color", modifiers: [["darker", 1]] }}
        legends={[]}
        enableLinkGradient={true}
        animate={false}
      />
    </div>
  )

  // Legend component for mobile (shows node labels since they're truncated)
  const renderMobileLegend = () => (
    <div className="flex flex-wrap gap-x-3 gap-y-1.5 px-2 pt-2 pb-1 text-[10px] text-muted-foreground">
      {sanitizedData.nodes.slice(0, 8).map((node, index) => (
        <div key={node.id} className="flex items-center gap-1">
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: chartColors[index % chartColors.length] }}
          />
          <span className="truncate max-w-[70px]">{node.label || formatNodeId(node.id)}</span>
        </div>
      ))}
      {sanitizedData.nodes.length > 8 && (
        <span className="text-muted-foreground/70">+{sanitizedData.nodes.length - 8} more</span>
      )}
    </div>
  )

  return (
    <>
      <ChartFullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title="Cash Flow Sankey"
        description="Follow how your income flows through expenses to savings"
        headerActions={renderInfoTrigger(true)}
      >
        <div className="h-full w-full min-h-[400px]">
          {renderFullChart()}
        </div>
      </ChartFullscreenModal>

      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton
              chartId="cashFlowSankey"
              chartTitle="Cash Flow Sankey"
              size="md"
            />
            <CardTitle>Cash Flow Sankey</CardTitle>
          </div>
          <CardDescription>
            <span className="hidden @[540px]/card:block">Follow how your income flows through expenses to savings</span>
            <span className="@[540px]/card:hidden">Income flow visualization</span>
          </CardDescription>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
          <div className="h-full w-full min-h-[250px]">
            {isMobile ? renderMobileChart() : renderFullChart()}
          </div>
          {/* Mobile legend below chart */}
          {isMobile && renderMobileLegend()}
        </CardContent>
      </Card>
    </>
  )
})

ChartSankey.displayName = "ChartSankey"

