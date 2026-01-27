"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import ReactECharts from "echarts-for-react"
import { pack, stratify } from "d3-hierarchy"
import { useTheme } from "next-themes"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"

import { ChartInfoPopover } from "@/components/chart-info-popover"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import { ChartLoadingState } from "@/components/chart-loading-state"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"
import { ChartExpandButton } from "@/components/chart-expand-button"
import { ChartFullscreenModal } from "@/components/chart-fullscreen-modal"
type Transaction = {
  id: number
  date: string
  description: string
  amount: number
  balance: number | null
  category: string
}

type SeriesDatum = {
  id: string
  value: number
  depth: number
  index: number
}

interface ChartCategoryBubbleProps {
  data?: Transaction[]
  isLoading?: boolean
  emptyTitle?: string
  emptyDescription?: string
}

export const ChartCategoryBubble = React.memo(function ChartCategoryBubble({
  data = [],
  isLoading = false,
  emptyTitle,
  emptyDescription
}: ChartCategoryBubbleProps) {
  const { resolvedTheme } = useTheme()
  const { getPalette } = useColorScheme()
  const { formatCurrency } = useCurrency()
  const [mounted, setMounted] = React.useState(false)
  const chartRef = React.useRef<any>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = React.useState<{ label: string; value: number; color: string } | null>(null)
  const [tooltipPosition, setTooltipPosition] = React.useState<{ x: number; y: number } | null>(null)
  const [isFullscreen, setIsFullscreen] = React.useState(false)

  const renderInfoTrigger = (forFullscreen = false) => (
    <div className={`flex items-center gap-2 ${forFullscreen ? '' : 'hidden md:flex flex-col'}`}>
      <ChartInfoPopover
        title="Category Bubble Map"
        description="Bubble pack of your expense categories, sized by total spending."
        details={[
          "Each bubble represents an expense category; larger bubbles mean higher total spending.",
          "Inner bubbles represent common merchant or description groups within each category.",
        ]}
        ignoredFootnote="Only expense transactions (amount < 0) are included when aggregating totals, grouped by a shortened description label inside each category."
      />
      <ChartAiInsightButton
        chartId="categoryBubbleMap"
        chartTitle="Category Bubble Map"
        chartDescription="Bubble pack of your expense categories, sized by total spending."
        size="sm"
      />
    </div>
  )

  React.useEffect(() => {
    // Mark as mounted to avoid rendering chart on server
    setMounted(true)
  }, [])

  const palette = React.useMemo(() => {
    const base = getPalette().filter((color) => color !== "#c3c3c3")
    if (!base.length) {
      return ["#0f766e", "#14b8a6", "#22c55e", "#84cc16", "#eab308"]
    }
    // Replace "#fe680e" with "#fe9e64" and "#331300" with "#893401" in the palette
    const modifiedBase = base.map(color => {
      if (color === "#fe680e") return "#fe9e64"
      if (color === "#331300") return "#893401"
      return color
    })
    // Reverse so darker colors are used for larger bubbles
    return [...modifiedBase].reverse()
  }, [getPalette])


  // ECharts event handlers for custom tooltip
  const handleChartMouseOver = (params: any, event?: any) => {
    if (!containerRef.current) return

    const echartsInstance = chartRef.current?.getEchartsInstance()
    if (!echartsInstance) return

    const rect = containerRef.current.getBoundingClientRect()
    let mouseX = 0
    let mouseY = 0

    if (event && event.offsetX !== undefined && event.offsetY !== undefined) {
      mouseX = event.offsetX
      mouseY = event.offsetY
    } else if (event && event.clientX !== undefined && event.clientY !== undefined) {
      mouseX = event.clientX - rect.left
      mouseY = event.clientY - rect.top
    } else {
      const zr = echartsInstance.getZr()
      const handler = zr.handler
      if (handler && handler.lastOffset) {
        mouseX = handler.lastOffset[0]
        mouseY = handler.lastOffset[1]
      }
    }

    setTooltipPosition({
      x: mouseX,
      y: mouseY,
    })

    if (params && params.data) {
      const id: string = params.data?.id || ""
      const value: number = params.data?.value || 0

      // Ensure fullName is always a string
      let fullName: string = "Expenses"
      if (id) {
        const mappedLabel = labelMap[id]
        if (mappedLabel) {
          fullName = mappedLabel
        } else if (id.includes(".")) {
          const lastPart = id.split(".").pop()
          fullName = lastPart || id
        } else {
          fullName = id
        }
      }

      // Get color from visual map or use palette
      const depth = params.data?.depth || 0
      const color = palette[Math.min(depth, palette.length - 1)] || palette[0]

      setTooltip({
        label: fullName,
        value,
        color,
      })
    }
  }

  const handleChartMouseOut = () => {
    setTooltip(null)
    setTooltipPosition(null)
  }

  // Track mouse movement for tooltip positioning (viewport coordinates for portal)
  React.useEffect(() => {
    if (tooltip) {
      const handleMouseMove = (e: MouseEvent) => {
        // Store viewport coordinates directly for portal-based rendering
        setTooltipPosition({
          x: e.clientX,
          y: e.clientY,
        })
      }

      window.addEventListener('mousemove', handleMouseMove)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
      }
    }
  }, [tooltip])

  const { seriesData, maxDepth, labelMap } = React.useMemo(() => {
    if (!data || data.length === 0) {
      return { seriesData: [] as SeriesDatum[], maxDepth: 0, labelMap: {} as Record<string, string> }
    }

    // Group by category, then by a shortened description "name" inside that category.
    const categoryMap = new Map<
      string,
      { total: number; subgroups: Map<string, { amount: number; fullDescription: string }> }
    >()
    const localLabelMap: Record<string, string> = {}

    const getSubgroupLabel = (description?: string) => {
      if (!description) return "Misc"
      const delimiterSplit = description.split(/[-–|]/)[0] ?? description
      const trimmed = delimiterSplit.trim()
      return trimmed.length > 24 ? `${trimmed.slice(0, 21)}…` : trimmed || "Misc"
    }

    data
      .filter((tx) => tx.amount < 0)
      .forEach((tx) => {
        const category = (tx.category || "Other").trim() || "Other"
        const amount = Math.abs(tx.amount)

        if (!categoryMap.has(category)) {
          categoryMap.set(category, { total: 0, subgroups: new Map() })
        }

        const entry = categoryMap.get(category)!
        entry.total += amount

        const subgroupLabel = getSubgroupLabel(tx.description)
        const existing = entry.subgroups.get(subgroupLabel)
        if (existing) {
          existing.amount += amount
        } else {
          entry.subgroups.set(subgroupLabel, {
            amount,
            fullDescription: tx.description || subgroupLabel,
          })
        }
      })

    const series: SeriesDatum[] = []
    let index = 0

    const grandTotal = Array.from(categoryMap.values()).reduce(
      (sum, entry) => sum + entry.total,
      0,
    )

    // Root node
    series.push({
      id: "expenses",
      value: grandTotal,
      depth: 0,
      index: index++,
    })
    localLabelMap["expenses"] = "All Expenses"

    const maxSubgroups = 8

    // Category and subgroup nodes
    for (const [categoryName, { total, subgroups }] of categoryMap.entries()) {
      const safeCategory = categoryName.replace(/\./g, "_") || "Other"

      // Category bubble
      series.push({
        id: `expenses.${safeCategory}`,
        value: total,
        depth: 1,
        index: index++,
      })
      localLabelMap[`expenses.${safeCategory}`] = categoryName

      // Subgroups inside category
      const sortedSubs = Array.from(subgroups.entries()).sort(
        (a, b) => b[1].amount - a[1].amount,
      )
      const topSubs = sortedSubs.slice(0, maxSubgroups)
      const remainingTotal = sortedSubs
        .slice(maxSubgroups)
        .reduce((sum, [, v]) => sum + v.amount, 0)

      topSubs.forEach(([label, { amount, fullDescription }]) => {
        const safeLabel = label.replace(/\./g, "_") || "Misc"
        series.push({
          id: `expenses.${safeCategory}.${safeLabel}`,
          value: amount,
          depth: 2,
          index: index++,
        })
        localLabelMap[`expenses.${safeCategory}.${safeLabel}`] = fullDescription
      })

      if (remainingTotal > 0) {
        series.push({
          id: `expenses.${safeCategory}.Other`,
          value: remainingTotal,
          depth: 2,
          index: index++,
        })
        localLabelMap[`expenses.${safeCategory}.Other`] = `Other transactions in ${categoryName}`
      }
    }

    return { seriesData: series, maxDepth: 2, labelMap: localLabelMap }
  }, [data])

  const option = React.useMemo(() => {
    if (!seriesData.length) return null

    let displayRoot = stratify<SeriesDatum>()
      .parentId((d) => {
        const lastDot = d.id.lastIndexOf(".")
        return lastDot === -1 ? "" : d.id.substring(0, lastDot)
      })(seriesData)
      .sum((d) => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0))

    const overallLayout = (params: any, api: any) => {
      const context = params.context

      pack<any>()
        .size([api.getWidth() - 2, api.getHeight() - 2])
        .padding(3)(displayRoot as any)

      context.nodes = {}
        ; (displayRoot as any).descendants().forEach((node: any) => {
          context.nodes[node.data.id] = node
        })
    }

    const renderItem = (params: any, api: any) => {
      const context = params.context

      if (!context.layout) {
        context.layout = true
        overallLayout(params, api)
      }

      const nodePath = api.value("id")
      const node = context.nodes[nodePath]
      if (!node) {
        return
      }

      const isLeaf = !node.children || !node.children.length
      const focus = new Uint32Array(
        node
          .descendants()
          .map((n: any) => n.data.index),
      )

      const nodeName = isLeaf
        ? nodePath
          .slice(nodePath.lastIndexOf(".") + 1)
          .split(/(?=[A-Z][^A-Z])/g)
          .join("\n")
        : ""

      const isSingleWordLabel =
        !!nodeName && !nodeName.includes(" ") && !nodeName.includes("\n")

      // Try to keep single-word labels fully visible inside the bubble by:
      // - allowing the text to wrap instead of truncating
      // - slightly increasing the available width
      // - capping font size based on radius and character count
      const baseFontSize = node.r / 3
      const autoSizedFont =
        isSingleWordLabel && nodeName.length > 0
          ? Math.min(baseFontSize, (node.r * 1.6) / nodeName.length)
          : baseFontSize

      const z2 = api.value("depth") * 2

      return {
        type: "circle",
        focus,
        shape: {
          cx: node.x,
          cy: node.y,
          r: node.r,
        },
        transition: ["shape"],
        z2,
        textContent: {
          type: "text",
          style: {
            text: nodeName,
            fontFamily: "Arial",
            width: isSingleWordLabel ? node.r * 1.8 : node.r * 1.3,
            overflow: isSingleWordLabel ? "breakAll" : "truncate",
            fontSize: autoSizedFont,
          },
          emphasis: {
            style: {
              overflow: null,
              fontSize: Math.max(autoSizedFont, 12),
            },
          },
        },
        textConfig: {
          position: "inside",
        },
        style: {
          fill: api.visual("color"),
        },
        emphasis: {
          style: {
            fontFamily: "Arial",
            fontSize: 12,
            shadowBlur: 20,
            shadowOffsetX: 3,
            shadowOffsetY: 5,
            shadowColor: "rgba(0,0,0,0.3)",
          },
        },
      }
    }

    const backgroundColor =
      resolvedTheme === "dark" ? "rgba(15,23,42,0)" : "rgba(248,250,252,0)"

    return {
      backgroundColor,
      dataset: {
        source: seriesData,
      },
      tooltip: {
        show: false, // Disable default ECharts tooltip
      },
      visualMap: [
        {
          show: false,
          min: 0,
          max: maxDepth,
          dimension: "depth",
          inRange: {
            color: palette,
          },
        },
      ],
      hoverLayerThreshold: Infinity,
      series: {
        type: "custom",
        renderItem,
        progressive: 0,
        coordinateSystem: "none",
        encode: {
          tooltip: "value",
          itemName: "id",
        },
      },
    }
  }, [seriesData, maxDepth, palette, resolvedTheme, labelMap])

  if (!mounted) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartFavoriteButton
              chartId="categoryBubbleMap"
              chartTitle="Category Bubble Map"
              size="md"
            />
            <CardTitle>Category Bubble Map</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px]">
          <ChartLoadingState isLoading />
        </CardContent>
      </Card>
    )
  }

  if (!option || !seriesData.length) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartFavoriteButton
              chartId="categoryBubbleMap"
              chartTitle="Category Bubble Map"
              size="md"
            />
            <CardTitle>Category Bubble Map</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px]">
          <ChartLoadingState
            isLoading={isLoading}
            emptyTitle={emptyTitle}
            emptyDescription={emptyDescription}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <ChartFullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title="Category Bubble Map"
        description="Bubble pack of your expense categories"
        headerActions={renderInfoTrigger(true)}
      >
        <div className="h-full w-full min-h-[400px] text-center flex items-center justify-center text-muted-foreground">
          Fullscreen view - Bubble pack shows category spending hierarchy
        </div>
      </ChartFullscreenModal>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton
              chartId="categoryBubbleMap"
              chartTitle="Category Bubble Map"
              size="md"
            />
            <CardTitle>Category Bubble Map</CardTitle>
          </div>
          <CardDescription>Bubble pack of your expense categories</CardDescription>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px]">
          <div ref={containerRef} className="relative h-full w-full" style={{ minHeight: 0, minWidth: 0 }}>
            <ReactECharts
              ref={chartRef}
              option={option}
              style={{ height: "100%", width: "100%" }}
              opts={{ renderer: "svg" }}
              notMerge={true}
              onEvents={{
                mouseover: handleChartMouseOver,
                mouseout: handleChartMouseOut,
              }}
            />
            {/* Tooltip rendered via portal for proper viewport boundary handling */}
            {mounted && tooltip && tooltipPosition && createPortal(
              <div
                className="pointer-events-none fixed z-[9999] rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl select-none"
                style={{
                  // Smart positioning: flip when near viewport edges
                  left: tooltipPosition.x + 12 + 200 > window.innerWidth
                    ? tooltipPosition.x - 12 - 200
                    : tooltipPosition.x + 12,
                  top: tooltipPosition.y - 60 < 0
                    ? tooltipPosition.y + 12
                    : tooltipPosition.y - 60,
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full border border-border/50"
                    style={{ backgroundColor: tooltip.color, borderColor: tooltip.color }}
                  />
                  <span className="font-medium text-foreground whitespace-nowrap">{tooltip.label}</span>
                </div>
                <div className="mt-1 font-mono text-[0.7rem] text-foreground/80">
                  {formatCurrency(tooltip.value)}
                </div>
              </div>,
              document.body
            )}
          </div>
        </CardContent>
      </Card>
    </>
  )
})

ChartCategoryBubble.displayName = "ChartCategoryBubble"

