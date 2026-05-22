import { memo } from "react"
import { Skeleton } from "@/components/ui/skeleton"

export const LoadingSkeleton = memo(function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-start gap-4 rounded-xl border border-border bg-card p-5">
          {/* Vote rail skeleton */}
          <div className="flex w-9 flex-shrink-0 flex-col items-center gap-2 pt-0.5">
            <Skeleton className="h-7 w-7 animate-pulse bg-muted" />
            <Skeleton className="h-4 w-5 animate-pulse bg-muted" />
            <Skeleton className="h-7 w-7 animate-pulse bg-muted" />
          </div>
          {/* Content skeleton */}
          <div className="flex-1 space-y-2 pt-0.5">
            <Skeleton className="h-4 w-3/4 animate-pulse bg-muted" />
            <Skeleton className="h-3 w-full animate-pulse bg-muted" />
            <Skeleton className="mt-2 h-3 w-1/3 animate-pulse bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
})

LoadingSkeleton.displayName = "LoadingSkeleton"
