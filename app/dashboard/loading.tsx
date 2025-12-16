import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function Loading() {
    return (
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
                {/* Dashboard cards skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Card key={i} className="overflow-hidden">
                            <CardHeader className="pb-2">
                                <Skeleton className="h-5 w-32" />
                                <Skeleton className="h-4 w-48" />
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Circular progress skeleton */}
                                <div className="flex justify-center">
                                    <Skeleton className="h-24 w-24 rounded-full" />
                                </div>
                                {/* Score text */}
                                <div className="flex flex-col items-center gap-2">
                                    <Skeleton className="h-8 w-16" />
                                    <Skeleton className="h-4 w-24" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    )
}
