import {
    TableCardSkeleton,
} from "@/components/ui/card-skeleton"

export default function Loading() {
    return (
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            {/* Data library table skeleton */}
            <div className="px-4 lg:px-6">
                <TableCardSkeleton rows={10} columns={5} />
            </div>
        </div>
    )
}
