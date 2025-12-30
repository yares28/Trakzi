import { TrendingDown, TrendingUp } from "lucide-react"

type TrendIndicatorProps = {
  direction: "improving" | "stable" | "declining"
  change: number
}

export function TrendIndicator({ direction, change }: TrendIndicatorProps) {
  if (direction === "stable") {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <span>Stable</span>
      </div>
    )
  }

  if (direction === "improving") {
    return (
      <div className="flex items-center gap-1 text-xs text-green-600">
        <TrendingUp className="h-3 w-3" />
        <span>+{Math.abs(change)}% from last month</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1 text-xs text-red-600">
      <TrendingDown className="h-3 w-3" />
      <span>{change}% from last month</span>
    </div>
  )
}
