"use client"

// Transaction History (Swarm Plot) for Fridge Page - Shows receipt transactions grouped by food category
import { useCallback, useEffect, useMemo, useState, useRef, memo } from "react"
import { ChevronDownIcon } from "lucide-react"
import { ResponsiveSwarmPlot } from "@nivo/swarmplot"
import { useTheme } from "next-themes"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { useColorScheme } from "@/components/color-scheme-provider"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatDateForDisplay } from "@/lib/date"
import { toNumericValue } from "@/lib/utils"
import { ChartLoadingState } from "@/components/chart-loading-state"
import { NivoChartTooltip } from "@/components/chart-tooltip"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"
import { isChartResizePaused, useChartResizeResume } from "@/lib/chart-resize-context"

// Receipt transaction type from fridge page
interface ReceiptTransaction {
    id: string | number
    description: string
    quantity: number
    pricePerUnit: number
    totalPrice: number
    categoryId: string | number | null
    categoryName: string | null
    categoryColor: string | null
    categoryTypeId?: string | number | null
    categoryTypeName?: string | null
    categoryTypeColor?: string | null
    receiptId: string
    receiptDate: string
    receiptTime: string | null
    storeName: string | null
    receiptStatus: string
    receiptTotalAmount: number
}

type ChartSwarmPlotDatum = {
    id: string
    group: string
    price: number
    volume: number
    category?: string
    color?: string | null
    date?: string
    description?: string
    storeName?: string
}

type EnhancedChartDatum = ChartSwarmPlotDatum & { categoryLabel: string }

// Same resize-based max categories as Transaction History (chart-swarm-plot)
const getMaxCategoriesForWidth = (width: number): number => {
    if (width < 400) return 1
    if (width < 500) return 2
    if (width < 600) return 3
    if (width < 750) return 4
    if (width < 900) return 5
    if (width < 1100) return 7
    return Infinity
}

interface ChartTransactionHistoryFridgeProps {
    receiptTransactions?: ReceiptTransaction[]
    categorySpendingData?: Array<{ category: string; total: number }>
    isLoading?: boolean
}

export const ChartTransactionHistoryFridge = memo(function ChartTransactionHistoryFridge({
    receiptTransactions = [],
    categorySpendingData,
    isLoading = false
}: ChartTransactionHistoryFridgeProps) {
    const { resolvedTheme } = useTheme()
    const { getShuffledPalette } = useColorScheme()
    const [visibleGroups, setVisibleGroups] = useState<string[]>([])
    const [isGroupSelectorOpen, setIsGroupSelectorOpen] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [containerWidth, setContainerWidth] = useState(1200)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Track container width for responsive category limiting (same as Transaction History chart)
    // Respect chart-resize pause during sidebar animation (CHART_PERFORMANCE.md)
    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const observer = new ResizeObserver((entries) => {
            if (isChartResizePaused()) return
            for (const entry of entries) {
                setContainerWidth(entry.contentRect.width)
            }
        })

        observer.observe(container)
        if (!isChartResizePaused()) setContainerWidth(container.offsetWidth)

        return () => observer.disconnect()
    }, [])

    const handleResizeResume = useCallback(() => {
        const container = containerRef.current
        if (container && !isChartResizePaused()) setContainerWidth(container.offsetWidth)
    }, [])
    useChartResizeResume(handleResizeResume)

    const maxCategories = useMemo(() => getMaxCategoriesForWidth(containerWidth), [containerWidth])

    // In dark mode, use lighter colors (reverse the palette so lightest colors come first)
    const chartColors = useMemo(() => {
        const palette = getShuffledPalette()
        return resolvedTheme === "dark" ? [...palette].reverse() : palette
    }, [getShuffledPalette, resolvedTheme])

    // Theme for axis labels and text
    const swarmTheme = useMemo(() => {
        const textColor = resolvedTheme === "dark"
            ? "oklch(0.6268 0 0)"
            : "oklch(0.551 0.0234 264.3637)"
        return {
            axis: {
                ticks: {
                    text: {
                        fill: textColor,
                    },
                },
                legend: {
                    text: {
                        fill: textColor,
                    },
                },
            },
            labels: {
                text: {
                    fill: textColor,
                },
            },
        }
    }, [resolvedTheme])

    const normalizeCategoryValue = (value?: string | null) => {
        const trimmed = (value ?? "").trim()
        return trimmed || "Other"
    }

    // Transform receipt transactions into swarm plot data
    const sanitizedData = useMemo<EnhancedChartDatum[]>(() => {
        if (!receiptTransactions || receiptTransactions.length === 0) return []

        return receiptTransactions
            .map((tx, index) => {
                const price = toNumericValue(tx.totalPrice)
                // Volume based on quantity - affects dot size
                const volume = Math.min(Math.max(tx.quantity * 2, 4), 20)
                const categoryLabel = normalizeCategoryValue(tx.categoryName || tx.categoryTypeName || "Other")

                return {
                    id: tx.id || `tx-${index}`,
                    group: categoryLabel,
                    price: Math.abs(price),
                    volume,
                    category: categoryLabel,
                    categoryLabel,
                    color: tx.categoryColor || tx.categoryTypeColor || null,
                    date: tx.receiptDate,
                    description: tx.description,
                    storeName: tx.storeName || undefined,
                }
            })
            .filter(item => item.price > 0) as EnhancedChartDatum[]
    }, [receiptTransactions])

    // Get unique categories sorted by total spend
    const chartGroups = useMemo(() => {
        if (!sanitizedData.length) return []

        const totals = new Map<string, number>()
        sanitizedData.forEach(item => {
            const currentTotal = totals.get(item.categoryLabel) || 0
            totals.set(item.categoryLabel, currentTotal + item.price)
        })

        return Array.from(totals.entries())
            .filter(([, total]) => total > 0)
            .sort((a, b) => b[1] - a[1])
            .map(([name]) => name)
    }, [sanitizedData])

    // Initialize visible groups when chart groups or maxCategories change (same as Transaction History)
    useEffect(() => {
        if (chartGroups.length === 0) return
        setVisibleGroups(prev => {
            const filtered = prev.filter(group => chartGroups.includes(group))
            if (filtered.length === 0) {
                return chartGroups.slice(0, maxCategories)
            }
            if (filtered.length > maxCategories) {
                return filtered.slice(0, maxCategories)
            }
            return filtered
        })
    }, [chartGroups, maxCategories])

    const filteredData = useMemo(() => {
        if (!sanitizedData.length) return []
        if (!visibleGroups.length) return sanitizedData
        return sanitizedData.filter(item => visibleGroups.includes(item.categoryLabel))
    }, [sanitizedData, visibleGroups])

    const dynamicValueScale = useMemo(() => {
        if (!filteredData.length) {
            return { type: "linear" as const, min: 0, max: 50, nice: true }
        }

        const sortedPrices = filteredData
            .map(item => (Number.isFinite(item.price) ? Math.max(0, item.price) : 0))
            .filter(value => value >= 0)
            .sort((a, b) => a - b)

        if (!sortedPrices.length) {
            return { type: "linear" as const, min: 0, max: 50, nice: true }
        }

        const quantile = (p: number) => {
            if (sortedPrices.length === 1) return sortedPrices[0]
            const idx = (sortedPrices.length - 1) * p
            const lower = Math.floor(idx)
            const upper = Math.ceil(idx)
            const weight = idx - lower
            if (upper >= sortedPrices.length) return sortedPrices[lower]
            return sortedPrices[lower] * (1 - weight) + sortedPrices[upper] * weight
        }

        const q05 = quantile(0.05)
        const q5 = quantile(0.5)
        const q9 = quantile(0.9)
        const q95 = quantile(0.95)
        const maxValue = sortedPrices[sortedPrices.length - 1]
        const minValue = sortedPrices[0]
        const denseSpan = Math.max(5, q9 - q05 || q5 || 5)

        const minFocus = Math.max(0, q05 - denseSpan * 0.15)
        let maxFocus = q95 + denseSpan * 0.25

        if (maxValue > maxFocus) {
            const outlierExtension = (maxValue - q95) * 0.3
            maxFocus = Math.max(maxFocus, q95 + outlierExtension)
        }

        const domainMin = Math.min(0, minValue, minFocus)
        const domainMax = Math.max(maxValue, maxFocus, domainMin + 5)

        return {
            type: "linear" as const,
            min: domainMin,
            max: domainMax,
            nice: true,
        }
    }, [filteredData])

    // On mobile (maxCategories === 1), single-select; on larger screens, multi-select (same as Transaction History)
    const toggleGroup = (group: string) => {
        setVisibleGroups(prev => {
            if (maxCategories === 1) {
                return [group]
            }
            if (prev.includes(group)) {
                return prev.filter(item => item !== group)
            }
            return [...prev, group]
        })
    }

    const selectAllGroups = () => {
        const allSelected = visibleGroups.length === chartGroups.length &&
            chartGroups.every(group => visibleGroups.includes(group))
        if (allSelected) {
            setVisibleGroups([])
        } else {
            setVisibleGroups([...chartGroups])
        }
    }

    const selectionSummary =
        visibleGroups.length === 0 || visibleGroups.length === chartGroups.length
            ? "All categories"
            : visibleGroups.length === 1
                ? visibleGroups[0]
                : `${visibleGroups.length} categories`

    const triggerClassName =
        "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 w-40"

    // Format currency value
    const valueFormatter = useMemo(
        () =>
            new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
                maximumFractionDigits: 2,
            }),
        []
    )

    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title="Grocery Transaction History"
                description="Recent grocery purchases by food category"
                details={[
                    "Each dot represents a grocery item; its vertical position is the price and the group shows which food category it belongs to.",
                    "Dot size reflects the quantity purchased.",
                    "Use the category selector to filter which categories are shown."
                ]}
                ignoredFootnote="Data comes from scanned receipts and their item categories."
            />
            <ChartAiInsightButton
                chartId="fridge:transactionHistory"
                chartTitle="Grocery Transaction History"
                chartDescription="Recent grocery purchases by food category"
                chartData={{
                    totalItems: filteredData.length,
                    categories: chartGroups.length,
                    totalSpent: filteredData.reduce((sum, d) => sum + d.price, 0),
                }}
                size="sm"
            />
        </div>
    )

    if (!mounted || (isLoading && filteredData.length === 0)) {
        return (
            <Card ref={containerRef} className="@container/card">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton
                            chartId="fridge:transactionHistory"
                            chartTitle="Grocery Transaction History"
                            size="md"
                        />
                        <CardTitle>Grocery Transaction History</CardTitle>
                    </div>
                    <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                        {renderInfoTrigger()}
                    </CardAction>
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                    <div className="h-full w-full min-h-[250px]">
                        <ChartLoadingState isLoading={true} />
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (!filteredData || filteredData.length === 0) {
        return (
            <Card ref={containerRef} className="@container/card">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton
                            chartId="fridge:transactionHistory"
                            chartTitle="Grocery Transaction History"
                            size="md"
                        />
                        <CardTitle>Grocery Transaction History</CardTitle>
                    </div>
                    <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                        {renderInfoTrigger()}
                    </CardAction>
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                    <div className="h-full w-full min-h-[250px]">
                        <ChartLoadingState isLoading={false} />
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card ref={containerRef} className="@container/card">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <GridStackCardDragHandle />
                    <ChartFavoriteButton
                        chartId="fridge:transactionHistory"
                        chartTitle="Grocery Transaction History"
                        size="md"
                    />
                    <CardTitle>Grocery Transaction History</CardTitle>
                </div>
                <CardDescription>
                </CardDescription>
                <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                    {renderInfoTrigger()}
                    {chartGroups.length > 0 && (
                        <DropdownMenu open={isGroupSelectorOpen} onOpenChange={setIsGroupSelectorOpen}>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    className={triggerClassName}
                                    aria-label="Select categories to display"
                                >
                                    <span className="truncate">{selectionSummary}</span>
                                    <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <p className="px-2 pb-1 pt-1.5 text-xs font-medium text-muted-foreground">
                                    Select categories to display
                                </p>
                                <DropdownMenuItem
                                    onSelect={(e) => {
                                        e.preventDefault()
                                        selectAllGroups()
                                    }}
                                    className="cursor-pointer font-medium"
                                >
                                    {visibleGroups.length === chartGroups.length &&
                                        chartGroups.every(group => visibleGroups.includes(group))
                                        ? "Deselect all"
                                        : "Select all"}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <div className="max-h-64 overflow-y-auto">
                                    {chartGroups.map(group => {
                                        const checked = visibleGroups.includes(group)
                                        return (
                                            <DropdownMenuCheckboxItem
                                                key={group}
                                                checked={checked}
                                                onCheckedChange={() => toggleGroup(group)}
                                                onSelect={(event) => event.preventDefault()}
                                                className="capitalize"
                                            >
                                                <span className="truncate">{group}</span>
                                            </DropdownMenuCheckboxItem>
                                        )
                                    })}
                                    {chartGroups.length === 0 && (
                                        <div className="px-2 py-4 text-sm text-muted-foreground">No categories</div>
                                    )}
                                </div>
                                <div className="border-t px-2 py-1 text-xs text-muted-foreground">
                                    {visibleGroups.length === chartGroups.length
                                        ? "All categories selected"
                                        : `${visibleGroups.length}/${chartGroups.length} selected`}
                                </div>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                <div className="h-full w-full min-h-[250px]">
                    <ResponsiveSwarmPlot
                        data={filteredData}
                        colors={chartColors}
                        groups={visibleGroups.length ? visibleGroups : chartGroups}
                        value="price"
                        valueScale={dynamicValueScale}
                        size={{ key: "volume", values: [4, 20], sizes: [6, 20] }}
                        forceStrength={4}
                        simulationIterations={100}
                        margin={{ top: 80, right: 100, bottom: 80, left: 100 }}
                        axisBottom={{ legend: "category vs. price", legendOffset: 40 }}
                        axisLeft={{ legend: "price ($)", legendOffset: -60 }}
                        theme={swarmTheme}
                        tooltip={(node) => {
                            const datum = node.data as EnhancedChartDatum
                            const category = datum.categoryLabel || datum.group || "Other"
                            const color = (datum.color || node.color || chartColors[0]) as string

                            return (
                                <NivoChartTooltip>
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="h-2.5 w-2.5 rounded-full border border-border/50"
                                            style={{ backgroundColor: color, borderColor: color }}
                                        />
                                        <span className="font-medium text-foreground whitespace-nowrap">
                                            {category}
                                        </span>
                                    </div>
                                    <div className="mt-1 font-mono text-[0.7rem] text-foreground/80">
                                        {valueFormatter.format(datum.price || 0)}
                                    </div>
                                    {datum.description && (
                                        <div className="mt-1 text-[0.7rem] text-foreground/60 max-w-[200px]">
                                            {datum.description}
                                        </div>
                                    )}
                                    {datum.storeName && (
                                        <div className="mt-0.5 text-[0.7rem] text-foreground/50">
                                            {datum.storeName}
                                        </div>
                                    )}
                                    {datum.date && (
                                        <div className="mt-0.5 text-[0.7rem] text-foreground/50">
                                            {formatDateForDisplay(datum.date, undefined, {})}
                                        </div>
                                    )}
                                </NivoChartTooltip>
                            )
                        }}
                    />
                </div>
            </CardContent>
        </Card>
    )
})

ChartTransactionHistoryFridge.displayName = "ChartTransactionHistoryFridge"
