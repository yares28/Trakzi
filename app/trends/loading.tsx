import {
    ChartCardSkeleton,
} from "@/components/ui/card-skeleton"

export default function Loading() {
    return (
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            {/* Trends grid skeleton */}
            <div className="grid gap-4 px-4 lg:px-6">
                {/* Row 1: Two half-width charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ChartCardSkeleton height={280} />
                    <ChartCardSkeleton height={280} />
                </div>

                {/* Row 2: Two half-width charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ChartCardSkeleton height={280} />
                    <ChartCardSkeleton height={280} />
                </div>

                {/* Row 3: Two half-width charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ChartCardSkeleton height={280} />
                    <ChartCardSkeleton height={280} />
                </div>
            </div>
        </div>
    )
}
