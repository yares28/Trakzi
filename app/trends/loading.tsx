"use client"

import { ChartCardSkeleton } from "@/components/ui/card-skeleton"
import { ShimmeringText } from "@/components/ui/shimmering-text"
import { TrendingUp, Loader2 } from "lucide-react"

export default function Loading() {
    return (
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            {/* Header section */}
            <section className="space-y-3 text-center pt-4 px-4 lg:px-6">
                <div className="flex items-center justify-center gap-3">
                    <TrendingUp className="h-8 w-8 text-primary" />
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                        <ShimmeringText
                            text="Category Trends"
                            duration={3}
                            spread={2}
                            color="hsl(var(--foreground))"
                            shimmerColor="hsl(var(--primary))"
                        />
                    </h1>
                </div>
                <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                    Each card below represents a category from your data. Cards are fixed to 6 columns wide,
                    with a taller layout to match the main Analytics charts, and can be freely rearranged.
                </p>
            </section>

            {/* Loading state */}
            <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="relative mb-6">
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                        <Loader2 className="h-10 w-10 text-primary animate-spin" />
                    </div>
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                    Loading Category Trends
                </h3>
                <p className="text-sm text-muted-foreground text-center max-w-md mb-8">
                    Fetching your spending categories and transaction data...
                </p>

                {/* Skeleton grid */}
                <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-4 px-4 lg:px-6">
                    <ChartCardSkeleton height={280} />
                    <ChartCardSkeleton height={280} />
                    <ChartCardSkeleton height={280} />
                    <ChartCardSkeleton height={280} />
                </div>
            </div>
        </div>
    )
}
