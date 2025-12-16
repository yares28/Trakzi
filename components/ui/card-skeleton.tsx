import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Card,
    CardContent,
    CardHeader,
} from "@/components/ui/card"

interface CardSkeletonProps {
    className?: string
    /** Whether to show a header skeleton */
    showHeader?: boolean
    /** Whether to show a description skeleton in the header */
    showDescription?: boolean
    /** Number of content lines to show */
    contentLines?: number
    /** Whether to show a chart-like skeleton */
    showChart?: boolean
    /** Chart height in pixels */
    chartHeight?: number
}

/**
 * A skeleton loading state for Card components.
 * Matches the shadcn/ui Card design with animated pulse effect.
 */
export function CardSkeleton({
    className,
    showHeader = true,
    showDescription = true,
    contentLines = 0,
    showChart = false,
    chartHeight = 200,
}: CardSkeletonProps) {
    return (
        <Card className={cn("overflow-hidden", className)}>
            {showHeader && (
                <CardHeader className="space-y-2">
                    {/* Title skeleton */}
                    <Skeleton className="h-5 w-1/3" />
                    {/* Description skeleton */}
                    {showDescription && <Skeleton className="h-4 w-2/3" />}
                </CardHeader>
            )}
            <CardContent className="space-y-3">
                {/* Content line skeletons */}
                {Array.from({ length: contentLines }).map((_, i) => (
                    <Skeleton
                        key={i}
                        className="h-4"
                        style={{ width: `${Math.max(40, 100 - i * 15)}%` }}
                    />
                ))}
                {/* Chart skeleton */}
                {showChart && (
                    <Skeleton
                        className="w-full rounded-md"
                        style={{ height: chartHeight }}
                    />
                )}
            </CardContent>
        </Card>
    )
}

interface StatCardSkeletonProps {
    className?: string
}

/**
 * A skeleton for stat/metric cards (like SectionCards).
 */
export function StatCardSkeleton({ className }: StatCardSkeletonProps) {
    return (
        <Card className={cn("", className)}>
            <CardHeader className="pb-2">
                {/* Title */}
                <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent className="space-y-2">
                {/* Large number */}
                <Skeleton className="h-8 w-32" />
                {/* Change indicator */}
                <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                </div>
                {/* Mini trend line */}
                <Skeleton className="h-12 w-full rounded-md" />
            </CardContent>
        </Card>
    )
}

interface ChartCardSkeletonProps {
    className?: string
    /** Approximate chart height */
    height?: number
    /** Show the header with title and actions */
    showHeader?: boolean
}

/**
 * A skeleton for chart cards used in analytics/home pages.
 */
export function ChartCardSkeleton({
    className,
    height = 300,
    showHeader = true,
}: ChartCardSkeletonProps) {
    return (
        <Card className={cn("overflow-hidden", className)}>
            {showHeader && (
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="space-y-1.5">
                        {/* Title */}
                        <Skeleton className="h-5 w-40" />
                        {/* Description */}
                        <Skeleton className="h-4 w-64" />
                    </div>
                    {/* Actions area (info, favorite buttons) */}
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-8 rounded-md" />
                        <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                </CardHeader>
            )}
            <CardContent>
                {/* Chart area */}
                <Skeleton
                    className="w-full rounded-md"
                    style={{ height }}
                />
            </CardContent>
        </Card>
    )
}

interface TableCardSkeletonProps {
    className?: string
    /** Number of rows to show */
    rows?: number
    /** Number of columns to show */
    columns?: number
}

/**
 * A skeleton for table/data table cards.
 */
export function TableCardSkeleton({
    className,
    rows = 5,
    columns = 4,
}: TableCardSkeletonProps) {
    return (
        <Card className={cn("overflow-hidden", className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="space-y-1.5">
                    {/* Title */}
                    <Skeleton className="h-5 w-32" />
                    {/* Description */}
                    <Skeleton className="h-4 w-48" />
                </div>
                {/* Filter/search area */}
                <div className="flex items-center gap-2">
                    <Skeleton className="h-9 w-[200px] rounded-md" />
                    <Skeleton className="h-9 w-24 rounded-md" />
                </div>
            </CardHeader>
            <CardContent>
                {/* Table header */}
                <div className="flex gap-4 border-b pb-3 mb-3">
                    {Array.from({ length: columns }).map((_, i) => (
                        <Skeleton
                            key={`header-${i}`}
                            className="h-4 flex-1"
                        />
                    ))}
                </div>
                {/* Table rows */}
                <div className="space-y-3">
                    {Array.from({ length: rows }).map((_, rowIndex) => (
                        <div key={`row-${rowIndex}`} className="flex gap-4">
                            {Array.from({ length: columns }).map((_, colIndex) => (
                                <Skeleton
                                    key={`cell-${rowIndex}-${colIndex}`}
                                    className="h-4 flex-1"
                                />
                            ))}
                        </div>
                    ))}
                </div>
                {/* Pagination skeleton */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <Skeleton className="h-4 w-32" />
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-8 rounded-md" />
                        <Skeleton className="h-8 w-8 rounded-md" />
                        <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

interface SectionCardsSkeletonProps {
    className?: string
    /** Number of stat cards to show */
    count?: number
}

/**
 * A skeleton for the SectionCards component (stat cards row).
 */
export function SectionCardsSkeleton({
    className,
    count = 4,
}: SectionCardsSkeletonProps) {
    return (
        <div className={cn("grid gap-4 px-4 lg:px-6", className)}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: count }).map((_, i) => (
                    <StatCardSkeleton key={i} />
                ))}
            </div>
        </div>
    )
}

export { Skeleton }
