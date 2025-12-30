import { Users } from "lucide-react"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

import type { DashboardStats } from "../types"
import { getScoreColor } from "../score-style"

type ComparisonPopoverProps = {
  pageKey: string
  comparison: DashboardStats["comparison"]
  userScore: number
}

export function ComparisonPopover({ pageKey, comparison, userScore }: ComparisonPopoverProps) {
  const compData = comparison[pageKey as keyof typeof comparison] as {
    userRank: number
    avgScore: number
    percentile: number
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 rounded-full hover:bg-primary/10"
        >
          <Users className="h-4 w-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h4 className="font-semibold">Compare to Others</h4>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Your Score</span>
              <span className={`font-bold ${getScoreColor(userScore)}`}>{userScore}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Average Score</span>
              <span className="font-medium text-foreground">{compData.avgScore}</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Your Percentile</span>
                <span className="font-medium text-primary">{compData.percentile}%</span>
              </div>
              <Progress value={compData.percentile} className="h-2" />
              <p className="text-xs text-muted-foreground">
                You're doing better than {compData.percentile}% of users
              </p>
            </div>

            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                Based on {comparison.userCount} active users
              </p>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
