"use client"

import { useMemo } from "react"
import { ResponsiveSankey } from "@nivo/sankey"
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
import { toNumericValue } from "@/lib/utils"

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

export function ChartSankey({ data = { nodes: [], links: [] }, categoryControls }: ChartSankeyProps) {
  const { getPalette } = useColorScheme()
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      }),
    []
  )

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
  
  const renderInfoTrigger = () => (
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
  )

  if (!sanitizedData.nodes.length || !sanitizedData.links.length) {
    return (
      <Card className="col-span-full">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Cash Flow Sankey</CardTitle>
            <CardDescription>Follow revenue as it moves through the org</CardDescription>
          </div>
          <CardAction>{renderInfoTrigger()}</CardAction>
        </CardHeader>
        <CardContent className="h-[500px] flex items-center justify-center text-muted-foreground">
          No data available
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Cash Flow Sankey</CardTitle>
          <CardDescription>Follow revenue as it moves through the org</CardDescription>
        </div>
        <CardAction>{renderInfoTrigger()}</CardAction>
      </CardHeader>
      <CardContent className="h-[540px] pb-6">
        <ResponsiveSankey
          data={sanitizedData}
          margin={{ top: 40, right: 160, bottom: 90, left: 100 }}
          align="justify"
          label={node => getNodeLabel(node.id)}
          nodeTooltip={({ node }) => {
            const label = getNodeLabel(node.id)
            const value = typeof node.value === "number" ? node.value : 0
            return (
              <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-lg">
                <div className="font-medium text-foreground">{label}</div>
                <div className="text-muted-foreground">{currencyFormatter.format(value)}</div>
              </div>
            )
          }}
          linkTooltip={({ link }) => {
            const sourceLabel = getNodeLabel(link.source.id)
            const targetLabel = getNodeLabel(link.target.id)
            return (
              <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-lg">
                <div className="font-medium text-foreground">
                  {sourceLabel} → {targetLabel}
                </div>
                <div className="text-muted-foreground">
                  {currencyFormatter.format(toNumericValue(link.value))}
                </div>
              </div>
            )
          }}
          colors={getPalette()}
          nodeOpacity={1}
          nodeHoverOthersOpacity={0.35}
          nodeThickness={18}
          nodeSpacing={32}
          nodeBorderWidth={0}
          nodeBorderRadius={3}
          linkOpacity={0.5}
          linkHoverOthersOpacity={0.1}
          linkContract={3}
          labelPosition="outside"
          labelOrientation="horizontal"
          labelPadding={20}
          labelTextColor={{ from: "color", modifiers: [["darker", 1]] }}
          legends={[]}
        />
      </CardContent>
    </Card>
  )
}

