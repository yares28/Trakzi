"use client"

import {
  createElement,
  useCallback,
  useMemo,
  useState,
  memo,
  type MouseEvent,
  type ReactElement,
} from "react"
import { useTheme } from "next-themes"
import {
  ResponsiveSankey,
  type CustomSankeyLayerProps,
  type SankeyLayer,
  type SankeyNodeDatum,
} from "@nivo/sankey"
import { useTooltip } from "@nivo/tooltip"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { ChartInfoPopover, ChartInfoPopoverCategoryControls } from "@/components/chart-info-popover"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import { toNumericValue } from "@/lib/utils"
import { ChartLoadingState } from "@/components/chart-loading-state"
import { NivoChartTooltip } from "@/components/chart-tooltip"
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

type SankeyChartNode = {
  id: string
  label: string
  data: { label: string }
}

type SankeyChartLink = {
  source: string
  target: string
  value: number
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

interface SankeyInfoTriggerProps {
  categoryControls?: ChartInfoPopoverCategoryControls
  sanitizedNodes: Array<{ id: string }>
  sanitizedLinks: Array<unknown>
}

type SankeyHoverTargetLayerProps = CustomSankeyLayerProps<SankeyChartNode, SankeyChartLink> & {
  tooltip: ({ node }: { node: SankeyNodeDatum<SankeyChartNode, SankeyChartLink> }) => ReactElement
}

type SankeyVisualNodeLayerProps = CustomSankeyLayerProps<SankeyChartNode, SankeyChartLink>

const TERMINAL_NODE_FIXED_VALUE = 150
const MIN_NODE_HOVER_HEIGHT = 18
const NODE_HOVER_PADDING_X = 6

const isTerminalNode = (node: SankeyNodeDatum<SankeyChartNode, SankeyChartLink>) =>
  node.sourceLinks.length === 0 || node.targetLinks.length === 0

const getDisplayedNodeHeight = (node: SankeyNodeDatum<SankeyChartNode, SankeyChartLink>) => {
  if (!isTerminalNode(node) || node.value <= 0 || node.value > TERMINAL_NODE_FIXED_VALUE) {
    return node.height
  }

  return node.height * (TERMINAL_NODE_FIXED_VALUE / node.value)
}

const SankeyVisualNodeLayer = memo(function SankeyVisualNodeLayer({
  nodes,
  currentNode,
  currentLink,
  isCurrentNode,
}: SankeyVisualNodeLayerProps) {
  return (
    <g>
      {nodes.map((node) => {
        const displayHeight = getDisplayedNodeHeight(node)

        if (displayHeight <= node.height) return null

        const displayY = node.y + node.height / 2 - displayHeight / 2
        const fillOpacity =
          currentNode || currentLink
            ? isCurrentNode(node)
              ? 0.9
              : 0.85
            : 1

        return (
          <rect
            key={`visual-node-${node.id}`}
            x={node.x}
            y={displayY}
            width={node.width}
            height={displayHeight}
            rx={3}
            ry={3}
            fill={node.color}
            fillOpacity={fillOpacity}
            pointerEvents="none"
          />
        )
      })}
    </g>
  )
})

SankeyVisualNodeLayer.displayName = "SankeyVisualNodeLayer"

const SankeyHoverTargetLayer = memo(function SankeyHoverTargetLayer({
  nodes,
  setCurrentNode,
  isInteractive,
  tooltip,
}: SankeyHoverTargetLayerProps) {
  const { showTooltipFromEvent, hideTooltip } = useTooltip()

  const handleMouseEnter = useCallback(
    (
      event: MouseEvent<SVGRectElement>,
      node: SankeyNodeDatum<SankeyChartNode, SankeyChartLink>
    ) => {
      setCurrentNode(node)
      showTooltipFromEvent(createElement(tooltip, { node }), event, "left")
    },
    [setCurrentNode, showTooltipFromEvent, tooltip]
  )

  const handleMouseMove = useCallback(
    (
      event: MouseEvent<SVGRectElement>,
      node: SankeyNodeDatum<SankeyChartNode, SankeyChartLink>
    ) => {
      showTooltipFromEvent(createElement(tooltip, { node }), event, "left")
    },
    [showTooltipFromEvent, tooltip]
  )

  const handleMouseLeave = useCallback(() => {
    setCurrentNode(null)
    hideTooltip()
  }, [setCurrentNode, hideTooltip])

  if (!isInteractive) return null

  return (
    <g>
      {nodes.map((node) => {
        const hoverHeight = Math.max(getDisplayedNodeHeight(node), MIN_NODE_HOVER_HEIGHT)
        const hoverY = node.y + node.height / 2 - hoverHeight / 2

        return (
          <rect
            key={`hover-target-${node.id}`}
            x={node.x - NODE_HOVER_PADDING_X}
            y={hoverY}
            width={node.width + NODE_HOVER_PADDING_X * 2}
            height={hoverHeight}
            fill="transparent"
            pointerEvents="all"
            onMouseEnter={(event) => handleMouseEnter(event, node)}
            onMouseMove={(event) => handleMouseMove(event, node)}
            onMouseLeave={handleMouseLeave}
          />
        )
      })}
    </g>
  )
})

SankeyHoverTargetLayer.displayName = "SankeyHoverTargetLayer"

const SankeyInfoTrigger = memo(function SankeyInfoTrigger({
  categoryControls,
  sanitizedNodes,
  sanitizedLinks,
}: SankeyInfoTriggerProps) {
  return (
    <div className="flex items-center gap-2">
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
          nodes: sanitizedNodes.map(n => n.id),
          links: sanitizedLinks.length
        }}
        size="sm"
      />
    </div>
  )
})

SankeyInfoTrigger.displayName = "SankeyInfoTrigger"

export const ChartSankey = memo(function ChartSankey({
  data = { nodes: [], links: [] },
  categoryControls,
  isLoading = false,
  emptyTitle,
  emptyDescription
}: ChartSankeyProps) {
  const { getShuffledPalette } = useColorScheme()
  const { resolvedTheme } = useTheme()
  const { formatCurrency } = useCurrency()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const isMobile = useIsMobile()

  // getShuffledPalette() filters, trims by theme, and shuffles for visual variety
  const chartColors = useMemo(() => getShuffledPalette(), [getShuffledPalette])

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

  const renderNodeTooltip = useCallback(
    ({ node }: { node: SankeyNodeDatum<SankeyChartNode, SankeyChartLink> }) => {
      const label = getNodeLabel(node.id)
      const value = typeof node.value === "number" ? node.value : 0
      return (
        <NivoChartTooltip
          title={label}
          hideTitleIndicator
          value={formatCurrency(value)}
        />
      )
    },
    [formatCurrency, getNodeLabel]
  )

  const sankeyLayers = useMemo<readonly SankeyLayer<SankeyChartNode, SankeyChartLink>[]>(
    () => [
      "links" as const,
      "nodes" as const,
      (layerProps: CustomSankeyLayerProps<SankeyChartNode, SankeyChartLink>) => (
        <SankeyVisualNodeLayer {...layerProps} />
      ),
      (layerProps: CustomSankeyLayerProps<SankeyChartNode, SankeyChartLink>) => (
        <SankeyHoverTargetLayer
          {...layerProps}
          tooltip={renderNodeTooltip}
        />
      ),
      "labels" as const,
      "legends" as const,
    ],
    [renderNodeTooltip]
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
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
          <div className="h-full w-full min-h-[180px] md:min-h-[250px]">
            <ChartLoadingState
              isLoading={isLoading}
              skeletonType="flow"
              emptyTitle={emptyTitle}
              emptyDescription={emptyDescription}
            />
          </div>
        </CardContent>
        <CardFooter className="pb-3 gap-2">
          <SankeyInfoTrigger sanitizedNodes={sanitizedData.nodes} sanitizedLinks={sanitizedData.links} categoryControls={categoryControls} />
        </CardFooter>
      </Card>
    )
  }

  // Helper to get truncated label for mobile
  const getMobileLabel = (id: string) => {
    const label = getNodeLabel(id)
    return label.length > 8 ? label.slice(0, 7) + '…' : label
  }

  const fullChartElement = (
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
        nodeTooltip={renderNodeTooltip}
        linkTooltip={({ link }) => {
          const sourceLabel = getNodeLabel(link.source.id)
          const targetLabel = getNodeLabel(link.target.id)
          return (
            <NivoChartTooltip
              title={`${sourceLabel} → ${targetLabel}`}
              hideTitleIndicator
              value={formatCurrency(toNumericValue(link.value))}
            />
          )
        }}
        colors={chartColors}
        theme={chartTheme}
        nodeOpacity={1}
        nodeHoverOpacity={0.9}
        nodeHoverOthersOpacity={0.85}
        nodeThickness={18}
        nodeSpacing={32}
        nodeBorderWidth={0}
        nodeBorderRadius={3}
        linkOpacity={0.85}
        linkHoverOpacity={0.9}
        linkHoverOthersOpacity={0.7}
        linkContract={1}
        linkBlendMode="normal"
        labelPosition="outside"
        labelOrientation="horizontal"
        labelPadding={20}
        labelTextColor={resolvedTheme === "dark" ? "#ffffff" : { from: "color", modifiers: [["darker", 1]] }}
        legends={[]}
        layers={sankeyLayers}
        enableLinkGradient={true}
        animate={true}
        motionConfig="gentle"
      />
    </div>
  )

  const mobileChartElement = (
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
        nodeTooltip={renderNodeTooltip}
        linkTooltip={({ link }) => {
          const sourceLabel = getNodeLabel(link.source.id)
          const targetLabel = getNodeLabel(link.target.id)
          return (
            <NivoChartTooltip
              title={`${sourceLabel} → ${targetLabel}`}
              hideTitleIndicator
              value={formatCurrency(toNumericValue(link.value))}
            />
          )
        }}
        colors={chartColors}
        theme={chartTheme}
        nodeOpacity={1}
        nodeHoverOpacity={0.9}
        nodeHoverOthersOpacity={0.85}
        nodeThickness={12}
        nodeSpacing={16}
        nodeBorderWidth={0}
        nodeBorderRadius={2}
        linkOpacity={0.85}
        linkHoverOpacity={0.9}
        linkHoverOthersOpacity={0.7}
        linkContract={0}
        labelPosition="outside"
        labelOrientation="vertical"
        labelPadding={8}
        labelTextColor={resolvedTheme === "dark" ? "#ffffff" : { from: "color", modifiers: [["darker", 1]] }}
        legends={[]}
        layers={sankeyLayers}
        enableLinkGradient={true}
        animate={true}
        motionConfig="gentle"
      />
    </div>
  )

  const mobileLegendElement = (
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
        description=""
        headerActions={<SankeyInfoTrigger sanitizedNodes={sanitizedData.nodes} sanitizedLinks={sanitizedData.links} categoryControls={categoryControls} />}
      >
        <div className="h-full w-full min-h-[400px]">
          {fullChartElement}
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
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
          <div className="h-full w-full min-h-[280px] md:min-h-[250px]">
            {isMobile ? mobileChartElement : fullChartElement}
          </div>
          {/* Mobile legend below chart */}
          {isMobile && mobileLegendElement}
        </CardContent>
        <CardFooter className="pb-3 gap-2">
          <SankeyInfoTrigger sanitizedNodes={sanitizedData.nodes} sanitizedLinks={sanitizedData.links} categoryControls={categoryControls} />
        </CardFooter>
      </Card>
    </>
  )
})

ChartSankey.displayName = "ChartSankey"
