import {
    SectionCardsSkeleton,
    ChartCardSkeleton,
} from "@/components/ui/card-skeleton"

export default function Loading() {
    return (
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            {/* Section cards skeleton */}
            <SectionCardsSkeleton count={4} />

            {/* Savings chart skeleton */}
            <div className="px-4 lg:px-6">
                <ChartCardSkeleton height={400} />
            </div>
        </div>
    )
}
