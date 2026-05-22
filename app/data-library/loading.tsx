import {
    TableCardSkeleton,
} from "@/components/ui/card-skeleton"

export default function Loading() {
    return (
        <div className="relative flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="pointer-events-none fixed inset-0" style={{ background: "radial-gradient(ellipse 60% 40% at 50% 20%, oklch(0.6716 0.1368 48.513 / 0.05) 0%, transparent 70%)" }} />
            {/* Data library table skeleton */}
            <div className="px-4 lg:px-6">
                <TableCardSkeleton rows={10} columns={5} />
            </div>
        </div>
    )
}
