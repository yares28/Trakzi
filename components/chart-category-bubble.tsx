"use client"

import * as React from "react"
import ReactECharts from "echarts-for-react"
import { pack, stratify } from "d3-hierarchy"
import { useTheme } from "next-themes"

import { ChartInfoPopover } from "@/components/chart-info-popover"
import { useColorScheme } from "@/components/color-scheme-provider"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
}

export function ChartCategoryBubble({ data = [] }: ChartCategoryBubbleProps) {
  const { resolvedTheme } = useTheme()
  const { getPalette } = useColorScheme()
  const [mounted, setMounted] = React.useState(false)
  const chartRef = React.useRef<any>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const renderInfoTrigger = () => (
    <ChartInfoPopover
      title="Category Bubble Map"
      description="Bubble pack of your expense categories, sized by total spending."
      details={[
        "Each bubble represents an expense category; larger bubbles mean higher total spending.",
        "Inner bubbles represent common merchant or description groups within each category.",
      ]}
      ignoredFootnote="Only expense transactions (amount < 0) are included when aggregating totals, grouped by a shortened description label inside each category."
    />
  )

  React.useEffect(() => {
    setMounted(true)
    return () => {
      // Cleanup on unmount - handle React Strict Mode double-mounting
      if (chartRef.current) {
        try {
          const instance = chartRef.current.getEchartsInstance()
          if (instance && !instance.isDisposed()) {
            instance.dispose()
          }
        } catch (e) {
          // Ignore disposal errors (common in React Strict Mode)
        }
        chartRef.current = null
      }
    }
  }, [])

  const palette = React.useMemo(() => {
    const base = getPalette().filter((color) => color !== "#c3c3c3")
    if (!base.length) {
      return ["#0f766e", "#14b8a6", "#22c55e", "#84cc16", "#eab308"]
    }
    // Reverse so darker colors are used for larger bubbles
    return [...base].reverse()
  }, [getPalette])

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
      ;(displayRoot as any).descendants().forEach((node: any) => {
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
            width: node.r * 1.3,
            overflow: "truncate",
            fontSize: node.r / 3,
          },
          emphasis: {
            style: {
              overflow: null,
              fontSize: Math.max(node.r / 3, 12),
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
        formatter: (params: any) => {
          const id: string = params.data?.id || ""
          const value: number = params.data?.value || 0
          const fullName =
            (id && labelMap[id]) ||
            (id.includes(".") ? id.split(".").pop() : id || "Expenses")

          return `${fullName}<br/>$${value.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} spent`
        },
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
          <div>
            <CardTitle>Category Bubble Map</CardTitle>
            <CardDescription>Bubble pack of your expense categories</CardDescription>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px] flex items-center justify-center text-muted-foreground">
          Loading bubble chart...
        </CardContent>
      </Card>
    )
  }

  if (!option || !seriesData.length) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <div>
            <CardTitle>Category Bubble Map</CardTitle>
            <CardDescription>Bubble pack of your expense categories</CardDescription>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px] flex items-center justify-center text-muted-foreground">
          No data available
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Category Bubble Map</CardTitle>
          <CardDescription>Bubble pack of your expense categories</CardDescription>
        </div>
        <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          {renderInfoTrigger()}
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px]">
        <div ref={containerRef} className="h-full w-full" style={{ minHeight: 0, minWidth: 0 }}>
          <ReactECharts
            ref={chartRef}
            option={option}
            style={{ height: "100%", width: "100%" }}
            opts={{ renderer: "svg" }}
            notMerge={true}
          />
        </div>
      </CardContent>
    </Card>
  )
}


