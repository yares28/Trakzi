"use client"

import { useMemo } from "react"
import { ResponsiveTreeMap } from "@nivo/treemap"
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

interface ChartTreeMapProps {
  data?: {
    name: string
    children: Array<{
      name: string
      children: Array<{ name: string; loc: number; fullDescription?: string }>
    }>
  }
  categoryControls?: ChartInfoPopoverCategoryControls
  isExpanded?: boolean
  onToggleExpand?: () => void
}

export function ChartTreeMap({ data = { name: "", children: [] }, categoryControls, isExpanded = false, onToggleExpand }: ChartTreeMapProps) {
  const { getPalette } = useColorScheme()
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
  )
  
  if (!sanitizedData || !sanitizedData.children || sanitizedData.children.length === 0) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Net Worth Allocation</CardTitle>
          <CardDescription>Breakdown of your total assets</CardDescription>
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
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Net Worth Allocation</CardTitle>
        <CardDescription>Breakdown of your total assets - Click on a category to see transactions</CardDescription>
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
        <ResponsiveTreeMap
          data={sanitizedData}
          colors={getPalette()}
          identity="name"
          value="loc"
          valueFormat=".02s"
          margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
          labelSkipSize={12}
          labelTextColor="#000000"
          label={(node) => {
            if (node.width <= 28 || node.height <= 49) {
              return ""
            }
            const name = node.data.name || ""
            const words = name.trim().split(/\s+/)
            return words.length > 1 ? words[0] : name
          }}
          parentLabelPosition="left"
          parentLabelTextColor="#000000"
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
            const displayName = (node.data as any).fullDescription || node.data.name
            return (
              <div style={{
                background: 'white',
                padding: '8px 12px',
                borderRadius: '4px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                fontSize: '12px',
                maxWidth: '300px',
                wordWrap: 'break-word'
              }}>
                <strong>{node.formattedValue}</strong>
                <div style={{ color: '#666', marginTop: '4px' }}>
                  {displayName}
                </div>
              </div>
            )
          }}
        />
      </CardContent>
    </Card>
  )
}

