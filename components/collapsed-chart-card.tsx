"use client"

import { memo } from "react"
import { ChartLine } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"
import { type ChartId } from "@/lib/chart-card-sizes.config"
import { cn } from "@/lib/utils"

interface CollapsedChartCardProps {
  chartId: string
  chartTitle: string
  className?: string
}

export const CollapsedChartCard = memo(function CollapsedChartCard({
  chartId,
  chartTitle,
  className,
}: CollapsedChartCardProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-xl border bg-card h-[60px]",
        className,
      )}
    >
      <GridStackCardDragHandle />
      <ChartLine className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-sm font-medium text-foreground truncate flex-1">
        {chartTitle}
      </span>
      <Badge variant="secondary" className="text-xs shrink-0">
        No data
      </Badge>
      <ChartFavoriteButton
        chartId={chartId as ChartId}
        chartTitle={chartTitle}
        size="sm"
      />
    </div>
  )
})

CollapsedChartCard.displayName = "CollapsedChartCard"
