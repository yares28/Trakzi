"use client"

import { memo } from "react"
import { BarChart3 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { cn } from "@/lib/utils"

type CollapsedChartCardProps = {
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
        "flex items-center gap-3 rounded-xl border bg-card px-4 py-3 h-full min-h-[52px]",
        className,
      )}
    >
      <GridStackCardDragHandle />
      <BarChart3 className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="text-sm font-medium text-foreground truncate">
        {chartTitle}
      </span>
      <Badge variant="secondary" className="ml-auto shrink-0 text-xs">
        No data
      </Badge>
      <ChartFavoriteButton chartId={chartId} />
    </div>
  )
})

CollapsedChartCard.displayName = "CollapsedChartCard"
