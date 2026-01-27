"use client"

import { useMemo, memo } from "react"
import { useTheme } from "next-themes"
import { ResponsiveCirclePacking } from "@nivo/circle-packing"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { ChartInfoPopover, ChartInfoPopoverCategoryControls } from "@/components/chart-info-popover"
import { NivoChartTooltip } from "@/components/chart-tooltip"
import { useCurrency } from "@/components/currency-provider"
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
  isLoading?: boolean
  emptyTitle?: string
  emptyDescription?: string
}

export const ChartCirclePacking = memo(function ChartCirclePacking({
  data = { name: "", children: [] },
  categoryControls,
  isLoading = false,
  emptyTitle,
  emptyDescription
}: ChartCirclePackingProps) {
  const { resolvedTheme } = useTheme()
  const { getPalette } = useColorScheme()
  const { formatCurrency } = useCurrency()
  const sanitizedData = useMemo(() => sanitizeCirclePackingNode(data), [data])

  const renderInfoTrigger = () => (
    <div className="flex flex-col items-center gap-2">
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
      <ChartAiInsightButton
        chartId="budgetDistribution"
        chartTitle="Budget Distribution"
        chartDescription="Visualizes how your budget or spending is allocated across each category."
        size="sm"
      />
    </div>
  )

  // Check if data is empty
  if (!sanitizedData || !sanitizedData.children || sanitizedData.children.length === 0) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <div>
            <CardTitle>Budget Distribution</CardTitle>
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
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Budget Distribution</CardTitle>
        </div>
        <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          {renderInfoTrigger()}
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px]">
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
          tooltip={({ id, value, color }) => (
            <NivoChartTooltip
              title={String(id)}
              titleColor={color}
              value={value !== undefined ? formatCurrency(value) : undefined}
            />
          )}
        />
      </CardContent>
    </Card>
  )
})

ChartCirclePacking.displayName = "ChartCirclePacking"

