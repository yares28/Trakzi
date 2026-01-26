"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { IconGripVertical } from "@tabler/icons-react"

import { useColorScheme } from "@/components/color-scheme-provider"
import { useTheme } from "next-themes"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { ChartLoadingState } from "@/components/chart-loading-state"
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart"
import { formatDateForDisplay } from "@/lib/date"
import { ChartExpandButton } from "@/components/chart-expand-button"
import { ChartFullscreenModal } from "@/components/chart-fullscreen-modal"

export const description = "An interactive area chart"

export const ChartAreaInteractiveFridge = React.memo(function ChartAreaInteractiveFridge({ data }: { data: { date: string; spend: number }[] }) {
    const { getPalette } = useColorScheme()
    const { resolvedTheme } = useTheme()
    const isDark = resolvedTheme === "dark"
    const gridStrokeColor = isDark ? "#e5e7eb" : "#e5e7eb"
    const [isFullscreen, setIsFullscreen] = React.useState(false)
    const palette = getPalette().filter((color) => color !== "#c3c3c3")
    const reversedPalette = [...palette].reverse()
    const spendColor = reversedPalette[reversedPalette.length - 1] || "#8884d8"

    const chartConfig = {
        spend: {
            label: "Spend",
            color: spendColor,
        },
    } satisfies ChartConfig

    const totalSpend = React.useMemo(
        () => data.reduce((sum, point) => sum + (Number(point.spend) || 0), 0),
        [data]
    )

    const peakDay = React.useMemo(() => {
        return data.reduce(
            (best, point) => (Number(point.spend) > Number(best.spend) ? point : best),
            { date: "", spend: 0 }
        )
    }, [data])

    const infoAction = (forFullscreen = false) => (
        <div className={`flex items-center gap-2 ${forFullscreen ? '' : 'hidden md:flex flex-col'}`}>
            <ChartInfoPopover
                title="Grocery Spend Trend"
                description="Daily grocery totals across the selected time filter."
                details={[
                    "Each point represents the total spend across all receipts for that day.",
                    "Use this to spot expensive restock days and weekly patterns.",
                ]}
                ignoredFootnote="Totals are based on receipt totals (tax included)."
            />
            <ChartAiInsightButton
                chartId="fridge:spend-trend"
                chartTitle="Grocery Spend Trend"
                chartDescription="Daily grocery spend across the selected time filter."
                chartData={{
                    totalSpend,
                    days: data.length,
                    peakDay,
                }}
                size="sm"
            />
        </div>
    )

    return (
        <>
            <ChartFullscreenModal
                isOpen={isFullscreen}
                onClose={() => setIsFullscreen(false)}
                title="Grocery Spend Trend"
                description="Daily grocery totals across the selected time filter"
                headerActions={infoAction(true)}
            >
                <div className="h-full w-full min-h-[400px] text-center flex items-center justify-center text-muted-foreground">
                    Fullscreen view - Daily grocery spend trend
                </div>
            </ChartFullscreenModal>

            <Card className="@container/card">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <span className="gridstack-drag-handle -m-1 inline-flex cursor-grab touch-none select-none items-center justify-center rounded p-1 active:cursor-grabbing">
                            <IconGripVertical className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        </span>
                        <ChartExpandButton onClick={() => setIsFullscreen(true)} />
                        <CardTitle>Grocery Spend Trend</CardTitle>
                    </div>
                    <CardDescription>
                        <span className="hidden @[540px]/card:block">
                            Daily grocery totals across the selected time filter
                        </span>
                        <span className="@[540px]/card:hidden">Daily totals</span>
                    </CardDescription>
                    <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                        {infoAction()}
                    </CardAction>
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                    {data.length === 0 ? (
                        <div className="h-[250px] w-full flex items-center justify-center">
                            <ChartLoadingState
                                isLoading={false}
                                emptyTitle="No data yet"
                                emptyDescription="Import your bank statements or receipts to see insights here"
                                emptyIcon="receipt"
                            />
                        </div>
                    ) : (
                        <ChartContainer
                            config={chartConfig}
                            className="aspect-auto h-[250px] w-full"
                        >
                            <AreaChart data={data}>
                                <defs>
                                    <linearGradient id="fillSpend" x1="0" y1="0" x2="0" y2="1">
                                        <stop
                                            offset="5%"
                                            stopColor="var(--color-spend)"
                                            stopOpacity={0.8}
                                        />
                                        <stop
                                            offset="95%"
                                            stopColor="var(--color-spend)"
                                            stopOpacity={0.1}
                                        />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} stroke={gridStrokeColor} strokeDasharray="3 3" opacity={0.3} />
                                <XAxis
                                    dataKey="date"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    minTickGap={32}
                                    tickFormatter={(value) => {
                                        return formatDateForDisplay(String(value), "en-US", {
                                            month: "short",
                                            day: "numeric",
                                        })
                                    }}
                                />
                                <ChartTooltip
                                    cursor={false}
                                    content={
                                        <ChartTooltipContent
                                            labelFormatter={(value) => {
                                                return formatDateForDisplay(String(value), "en-US", {
                                                    month: "short",
                                                    day: "numeric",
                                                })
                                            }}
                                            indicator="dot"
                                        />
                                    }
                                />
                                <Area
                                    dataKey="spend"
                                    type="natural"
                                    fill="url(#fillSpend)"
                                    stroke={spendColor}
                                    strokeWidth={1}
                                />
                            </AreaChart>
                        </ChartContainer>
                    )}
                </CardContent>
            </Card>
        </>
    )
})

ChartAreaInteractiveFridge.displayName = "ChartAreaInteractiveFridge"
