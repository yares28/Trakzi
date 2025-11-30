"use client"

import { useMemo } from "react"
import { ResponsiveCirclePacking } from "@nivo/circle-packing"
import { ChartInfoPopover, ChartInfoPopoverCategoryControls } from "@/components/chart-info-popover"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Maximize2Icon, Minimize2Icon } from "lucide-react"
import { useColorScheme } from "@/components/color-scheme-provider"
import { toNumericValue } from "@/lib/utils"

interface CirclePackingNode {
  name: string
  value?: number
  children?: CirclePackingNode[]
}

const sanitizeCirclePackingNode = (node?: CirclePackingNode | null): CirclePackingNode => {
  if (!node) {
    return { name: "", children: [] }
  }
  return {
    name: node.name,
    value: node.value !== undefined ? toNumericValue(node.value) : undefined,
    children: node.children?.map(sanitizeCirclePackingNode) || []
  }
}

interface ChartCirclePackingProps {
  data?: CirclePackingNode
  categoryControls?: ChartInfoPopoverCategoryControls
  isExpanded?: boolean
  onToggleExpand?: () => void
}

export function ChartCirclePacking({ data = { name: "", children: [] }, categoryControls, isExpanded = false, onToggleExpand }: ChartCirclePackingProps) {
  const { getPalette } = useColorScheme()
  const sanitizedData = useMemo(() => sanitizeCirclePackingNode(data), [data])
  const renderInfoTrigger = () => (
    <ChartInfoPopover
      title="Budget Distribution"
      description="Visualizes how your budget or spending is allocated across each category."
      details={[
        "Each circle represents an expense category; the larger the bubble, the more you spend there.",
        "We hide inflow-oriented categories so you only see real expenses."
      ]}
      ignoredFootnote="Only expense transactions are aggregated before building the hierarchy."
      categoryControls={categoryControls}
    />
  )
  
  // Check if data is empty
  if (!sanitizedData || !sanitizedData.children || sanitizedData.children.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Budget Distribution</CardTitle>
            <CardDescription>Visualizes how your budget is allocated across categories</CardDescription>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
            {onToggleExpand && (
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="ml-auto"
                onClick={onToggleExpand}
                aria-label={isExpanded ? "Shrink chart" : "Expand chart"}
              >
                {isExpanded ? (
                  <Minimize2Icon className="h-4 w-4" />
                ) : (
                  <Maximize2Icon className="h-4 w-4" />
                )}
              </Button>
            )}
          </CardAction>
        </CardHeader>
        <CardContent className="h-[420px] flex items-center justify-center text-muted-foreground">
          No data available
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Budget Distribution</CardTitle>
          <CardDescription>Visualizes how your budget is allocated across categories</CardDescription>
        </div>
        <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          {renderInfoTrigger()}
          {onToggleExpand && (
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="ml-auto"
              onClick={onToggleExpand}
              aria-label={isExpanded ? "Shrink chart" : "Expand chart"}
            >
              {isExpanded ? (
                <Minimize2Icon className="h-4 w-4" />
              ) : (
                <Maximize2Icon className="h-4 w-4" />
              )}
            </Button>
          )}
        </CardAction>
      </CardHeader>
      <CardContent className="h-[420px]">
        <ResponsiveCirclePacking
          data={sanitizedData}
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          id="name"
          padding={4}
          enableLabels={true}
          // Our data is a single level of category nodes, so show labels for depth 1 leaves
          labelsFilter={(e) => e.node.depth === 1}
          labelsSkipRadius={10}
          colors={getPalette()}
        />
      </CardContent>
    </Card>
  )
}

