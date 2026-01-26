"use client"

// Home Food vs Outside Food Spending Chart - Monthly stacked bar chart comparing spending
import * as React from "react"
import { useMemo, useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { ResponsiveBar, BarDatum, BarTooltipProps } from "@nivo/bar"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import { ChartLoadingState } from "@/components/chart-loading-state"
import { deduplicatedFetch } from "@/lib/request-deduplication"
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"

interface ChartGroceryVsRestaurantFridgeProps {
    dateFilter?: string | null
    groceryVsRestaurantData?: MonthlyData[]
}

interface MonthlyData {
    month: string
    "Home Food": number
    "Outside Food": number
    [key: string]: string | number
}

export const ChartGroceryVsRestaurantFridge = React.memo(function ChartGroceryVsRestaurantFridge({ dateFilter, groceryVsRestaurantData }: ChartGroceryVsRestaurantFridgeProps) {
    const { resolvedTheme } = useTheme()
    const { getPalette } = useColorScheme()
    const { formatCurrency, symbol } = useCurrency()
    const [mounted, setMounted] = useState(false)
    const [data, setData] = useState<MonthlyData[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Fetch data from API (or use bundle data)
    useEffect(() => {
        // Use bundle data if available
        if (groceryVsRestaurantData && groceryVsRestaurantData.length > 0) {
            setData(groceryVsRestaurantData)
            setIsLoading(false)
            return
        }

        const fetchData = async () => {
            setIsLoading(true)
            try {
                const params = new URLSearchParams()
                if (dateFilter) {
                    params.append("filter", dateFilter)
                }

                const result = await deduplicatedFetch<{ data: MonthlyData[] }>(
                    `/api/analytics/grocery-vs-restaurant?${params.toString()}`
                )
                setData(result.data || [])
            } catch (error) {
                console.error("Error fetching grocery vs restaurant data:", error)
                setData([])
            } finally {
                setIsLoading(false)
            }
        }

        if (mounted) {
            fetchData()
        }
    }, [dateFilter, mounted, groceryVsRestaurantData])

    // Use specific colors for the two categories
    const palette = useMemo(() => {
        const base = getPalette().filter((color) => color !== "#c3c3c3")
        if (!base.length || base.length < 2) {
            return ["#22c55e", "#f97316"] // Green for groceries, orange for restaurants
        }
        // Use first two colors from palette
        return [base[0], base[2] || base[1]]
    }, [getPalette])

    const isDark = resolvedTheme === "dark"
    const textColor = isDark ? "#9ca3af" : "#6b7280"
    const gridColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"

    // Format currency using user's preferred currency
    const currencyFormatter = useMemo(
        () => ({
            format: (value: number) => formatCurrency(value, { maximumFractionDigits: 0 })
        }),
        [formatCurrency]
    )

    // Calculate totals for AI insights
    const totals = useMemo(() => {
        const homeFood = data.reduce((sum, d) => sum + (d["Home Food"] || 0), 0)
        const outsideFood = data.reduce((sum, d) => sum + (d["Outside Food"] || 0), 0)
        return { homeFood, outsideFood }
    }, [data])

    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title="Home Food vs Outside Food"
                description="Monthly comparison of home cooking vs eating out spending."
                details={[
                    "This chart shows spending from your transaction categories, not receipt items.",
                    "Home Food: Grocery/Groceries/Supermarket categories.",
                    "Outside Food: Restaurant/Dining/Food/Eating Out/Delivery/Takeout categories.",
                    "Each bar shows a month, with home and outside food stacked for comparison.",
                ]}
                ignoredFootnote="Only expense transactions (amount < 0) are included."
            />
            <ChartAiInsightButton
                chartId="fridge:groceryVsRestaurant"
                chartTitle="Home Food vs Outside Food"
                chartDescription="Monthly comparison of home cooking vs eating out spending from transaction categories."
                chartData={{
                    totalHomeFood: totals.homeFood,
                    totalOutsideFood: totals.outsideFood,
                    months: data.length,
                }}
                size="sm"
            />
        </div>
    )

    if (!mounted || isLoading) {
        return (
            <Card className="@container/card">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton
                            chartId="fridge:groceryVsRestaurant"
                            chartTitle="Home Food vs Outside Food"
                            size="md"
                        />
                        <CardTitle>Home Food vs Outside Food</CardTitle>
                    </div>
                    <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                        {renderInfoTrigger()}
                    </CardAction>
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                    <div className="h-full w-full min-h-[250px]">
                        <ChartLoadingState isLoading={isLoading} />
                    </div>
                </CardContent>
            </Card>
        )
    }

    const hasData = data.length > 0 && data.some(d => (d["Home Food"] || 0) > 0 || (d["Outside Food"] || 0) > 0)

    return (
        <Card className="@container/card">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <GridStackCardDragHandle />
                    <ChartFavoriteButton
                        chartId="fridge:groceryVsRestaurant"
                        chartTitle="Home Food vs Outside Food"
                        size="md"
                    />
                    <CardTitle>Home Food vs Outside Food</CardTitle>
                </div>
                <CardDescription>
                    <span className="hidden @[540px]/card:block">
                        Monthly comparison of home cooking vs eating out
                    </span>
                    <span className="@[540px]/card:hidden">Home vs Outside</span>
                </CardDescription>
                <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                    {renderInfoTrigger()}
                </CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                {hasData ? (
                    <div className="h-full w-full min-h-[250px] flex flex-col">
                        {/* Stacked Bar Chart */}
                        <div className="flex-1 min-h-0" style={{ minHeight: "200px" }}>
                            <ResponsiveBar
                                data={data as BarDatum[]}
                                keys={["Home Food", "Outside Food"]}
                                indexBy="month"
                                margin={{ top: 10, right: 20, bottom: 50, left: 60 }}
                                padding={0.3}
                                layout="vertical"
                                colors={palette}
                                borderRadius={2}
                                axisTop={null}
                                axisRight={null}
                                axisBottom={{
                                    tickSize: 5,
                                    tickPadding: 5,
                                    tickRotation: -45,
                                }}
                                axisLeft={{
                                    tickSize: 5,
                                    tickPadding: 5,
                                    tickRotation: 0,
                                    format: (v: number) => {
                                        if (v === 0) return `${symbol}0`
                                        if (Math.abs(v) >= 1000) {
                                            return `${symbol}${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`
                                        }
                                        return `${symbol}${v.toFixed(0)}`
                                    },
                                }}
                                labelSkipWidth={30}
                                labelSkipHeight={16}
                                labelTextColor="#ffffff"
                                label={(d) => d.value && d.value > 50 ? currencyFormatter.format(d.value as number) : ""}
                                enableGridX={false}
                                enableGridY={true}
                                gridYValues={5}
                                theme={{
                                    text: {
                                        fill: textColor,
                                        fontSize: 11,
                                    },
                                    axis: {
                                        domain: {
                                            line: {
                                                stroke: gridColor,
                                                strokeWidth: 1,
                                            },
                                        },
                                        ticks: {
                                            line: {
                                                stroke: gridColor,
                                                strokeWidth: 1,
                                            },
                                            text: {
                                                fill: textColor,
                                                fontSize: 10,
                                            },
                                        },
                                    },
                                    grid: {
                                        line: {
                                            stroke: gridColor,
                                            strokeWidth: 0.5,
                                        },
                                    },
                                }}
                                tooltip={({ id, value, color, indexValue }: BarTooltipProps<BarDatum>) => (
                                    <div className="rounded-md border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg">
                                        <div className="font-medium text-muted-foreground mb-1">{indexValue}</div>
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="h-2.5 w-2.5 rounded-sm border border-border/50"
                                                style={{ backgroundColor: color, borderColor: color }}
                                            />
                                            <span className="font-medium text-foreground whitespace-nowrap">
                                                {id}: {currencyFormatter.format(value as number)}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            />
                        </div>
                        {/* Legend at bottom */}
                        <div className="mt-2 flex justify-center gap-6 text-xs">
                            <div className="flex items-center gap-1.5">
                                <span
                                    className="h-3 w-3 rounded-sm"
                                    style={{ backgroundColor: palette[0] }}
                                />
                                <span className="text-muted-foreground">Home Food</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span
                                    className="h-3 w-3 rounded-sm"
                                    style={{ backgroundColor: palette[1] }}
                                />
                                <span className="text-muted-foreground">Outside Food</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full w-full min-h-[250px] flex items-center justify-center text-muted-foreground">
                        No home or outside food transactions found
                    </div>
                )}
            </CardContent>
        </Card>
    )
})

ChartGroceryVsRestaurantFridge.displayName = "ChartGroceryVsRestaurantFridge"
