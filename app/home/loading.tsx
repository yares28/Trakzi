import {
    SectionCardsSkeleton,
    ChartCardSkeleton,
    TableCardSkeleton,
} from "@/components/ui/card-skeleton"

export default function Loading() {
    return (
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            {/* Section cards skeleton */}
            <SectionCardsSkeleton count={4} />

            {/* Main charts skeleton */}
            <div className="grid gap-4 px-4 lg:px-6">
                <ChartCardSkeleton height={350} />
                <ChartCardSkeleton height={350} />
            </div>

            {/* Data table skeleton */}
            <div className="px-4 lg:px-6">
                <TableCardSkeleton rows={8} columns={5} />
            </div>
        </div>
    )
}
