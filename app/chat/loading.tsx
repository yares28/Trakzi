import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function Loading() {
    return (
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
                {/* Chat interface skeleton */}
                <Card className="h-[calc(100vh-200px)] min-h-[500px]">
                    <CardHeader className="border-b">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-4 w-64" />
                    </CardHeader>
                    <CardContent className="flex flex-col h-full">
                        {/* Chat messages area */}
                        <div className="flex-1 space-y-4 py-4">
                            {/* AI message */}
                            <div className="flex gap-3">
                                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                                <div className="space-y-2 flex-1 max-w-[80%]">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-3/4" />
                                </div>
                            </div>

                            {/* User message */}
                            <div className="flex gap-3 justify-end">
                                <div className="space-y-2 max-w-[80%]">
                                    <Skeleton className="h-4 w-48 ml-auto" />
                                </div>
                                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                            </div>

                            {/* AI message */}
                            <div className="flex gap-3">
                                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                                <div className="space-y-2 flex-1 max-w-[80%]">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-5/6" />
                                    <Skeleton className="h-4 w-2/3" />
                                </div>
                            </div>
                        </div>

                        {/* Input area */}
                        <div className="border-t pt-4">
                            <div className="flex gap-2">
                                <Skeleton className="h-10 flex-1 rounded-md" />
                                <Skeleton className="h-10 w-10 rounded-md" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
