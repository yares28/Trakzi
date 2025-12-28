"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

interface CategoryGaugeProps {
    label: string
    used: number
    cap: number
    color: string
    className?: string
}

function CategoryGauge({ label, used, cap, color, className }: CategoryGaugeProps) {
    const percentage = cap > 0 ? (used / cap) * 100 : 0
    const remaining = Math.max(0, cap - used)

    // Color based on usage
    const gaugeColor = percentage >= 90 ? "text-red-600" :
        percentage >= 70 ? "text-orange-500" :
            "text-green-600"

    return (
        <div className={className}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">{label}</span>
                <span className={`text-sm font-bold tabular-nums ${gaugeColor}`}>
                    {used} / {cap}
                </span>
            </div>
            <Progress
                value={percentage}
                className="h-2"
                style={{
                    // @ts-ignore
                    '--progress-background': color
                } as React.CSSProperties}
            />
            <p className="text-xs text-muted-foreground mt-1">
                {remaining} remaining
            </p>
        </div>
    )
}

export function CategoryGauges() {
    const [categoryData, setCategoryData] = useState<{
        transactions: number
        receipts: number
        total: number
        capacity: {
            transactionCap: number
            receiptCap: number
            transactionRemaining: number
            receiptRemaining: number
        }
        plan: string
    } | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        async function fetchCategoryData() {
            try {
                const response = await fetch("/api/categories/count")
                if (response.ok) {
                    const data = await response.json()
                    setCategoryData(data)
                }
            } catch (error) {
                console.error("Failed to fetch category data:", error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchCategoryData()
    }, [])

    if (isLoading) {
        return (
            <Card className="w-full shadow-sm">
                <CardContent className="py-4">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Loading categories...</span>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (!categoryData) {
        return null
    }

    const totalCap = categoryData.capacity.transactionCap + categoryData.capacity.receiptCap
    const totalUsed = categoryData.transactions + categoryData.receipts

    return (
        <Card className="w-full shadow-sm">
            <CardContent className="py-4 space-y-4">
                {/* Overall categories header */}
                <div className="flex items-center justify-between">
                    <p className="text-base text-muted-foreground">
                        Categories tracked{" "}
                        <span className="font-semibold tabular-nums text-foreground">
                            {totalUsed}
                        </span>{" "}
                        of {totalCap} max
                    </p>
                </div>

                {/* Individual gauges */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CategoryGauge
                        label="Spending Categories"
                        used={categoryData.transactions}
                        cap={categoryData.capacity.transactionCap}
                        color="hsl(var(--chart-1))"
                    />
                    <CategoryGauge
                        label="Receipt Categories"
                        used={categoryData.receipts}
                        cap={categoryData.capacity.receiptCap}
                        color="hsl(var(--chart-3))"
                    />
                </div>
            </CardContent>
        </Card>
    )
}
