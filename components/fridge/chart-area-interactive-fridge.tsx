"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, Tooltip, TooltipProps } from "recharts"
import { IconGripVertical } from "@tabler/icons-react"

import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
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
} from "@/components/ui/chart"
import { formatDateForDisplay } from "@/lib/date"
import { ChartExpandButton } from "@/components/chart-expand-button"
import { ChartFullscreenModal } from "@/components/chart-fullscreen-modal"

export const description = "An interactive area chart"

export const ChartAreaInteractiveFridge = React.memo(function ChartAreaInteractiveFridge({ data }: { data: { date: string; spend: number }[] }) {
    const { getPalette } = useColorScheme()
    const { formatCurrency } = useCurrency()
    const { resolvedTheme } = useTheme()
    const isDark = resolvedTheme === "dark"
    const gridStrokeColor = isDark ? "#e5e7eb" : "#e5e7eb"
    const [isFullscreen, setIsFullscreen] = React.useState(false)
    const [tooltip, setTooltip] = React.useState<{ date: string; spend: number } | null>(null)
    const [tooltipPosition, setTooltipPosition] = React.useState<{ x: number; y: number } | null>(null)
    const containerRef = React.useRef<HTMLDivElement>(null)
    const mousePositionRef = React.useRef<{ x: number; y: number } | null>(null)

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

    // Track mouse movement for smooth tooltip positioning
    React.useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const handleMouseMove = (e: MouseEvent) => {
            const rect = container.getBoundingClientRect()
            const position = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            }
            mousePositionRef.current = position
            if (tooltip) {
                setTooltipPosition(position)
            }
        }

        const handleMouseLeave = () => {
            setTooltip(null)
            setTooltipPosition(null)
            mousePositionRef.current = null
        }

        container.addEventListener("mousemove", handleMouseMove)
        container.addEventListener("mouseleave", handleMouseLeave)

        return () => {
            container.removeEventListener("mousemove", handleMouseMove)
            container.removeEventListener("mouseleave", handleMouseLeave)
        }
    }, [tooltip])

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
                                skeletonType="area"
                                emptyTitle="No data yet"
                                emptyDescription="Import your bank statements or receipts to see insights here"
                                emptyIcon="receipt"
                            />
                        </div>
                    ) : (
                        <div ref={containerRef} className="relative">
                            <ChartContainer
                                config={chartConfig}
                                className="aspect-auto h-[250px] w-full"
                            >
                                <AreaChart data={data}>
                                    <defs>
                                        <linearGradient id="fillSpendFridge" x1="0" y1="0" x2="0" y2="1">
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
                                    <Tooltip
                                        cursor={false}
                                        content={(props: TooltipProps<number, string>) => {
                                            const { active, payload, coordinate } = props

                                            if (!active || !payload || !payload.length || !coordinate) {
                                                queueMicrotask(() => {
                                                    setTooltip(null)
                                                    setTooltipPosition(null)
                                                })
                                                return null
                                            }

                                            const dataPoint = payload[0].payload
                                            const date = dataPoint.date
                                            const spend = dataPoint.spend || 0

                                            if (containerRef.current && coordinate) {
                                                const basePosition = mousePositionRef.current ?? {
                                                    x: coordinate.x ?? 0,
                                                    y: coordinate.y ?? 0,
                                                }

                                                queueMicrotask(() => {
                                                    setTooltipPosition(basePosition)
                                                    setTooltip({ date, spend })
                                                })
                                            }

                                            return null
                                        }}
                                    />
                                    <Area
                                        dataKey="spend"
                                        type="natural"
                                        fill="url(#fillSpendFridge)"
                                        stroke={spendColor}
                                        strokeWidth={1}
                                    />
                                </AreaChart>
                            </ChartContainer>
                            {tooltip && tooltipPosition && (
                                <div
                                    className="pointer-events-none absolute z-10 rounded-md border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg"
                                    style={{
                                        left: `${(tooltipPosition.x ?? 0) + 16}px`,
                                        top: `${(tooltipPosition.y ?? 0) - 16}px`,
                                        transform: 'translate(0, -100%)',
                                    }}
                                >
                                    <div className="font-medium text-foreground mb-2 whitespace-nowrap">
                                        {formatDateForDisplay(tooltip.date, "en-US", {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                        })}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="h-2.5 w-2.5 rounded-full border border-border/50"
                                            style={{ backgroundColor: spendColor, borderColor: spendColor }}
                                        />
                                        <span className="text-foreground/80">Spend:</span>
                                        <span className="font-mono text-[0.7rem] text-foreground font-medium">
                                            {formatCurrency(tooltip.spend)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    )
})

ChartAreaInteractiveFridge.displayName = "ChartAreaInteractiveFridge"
