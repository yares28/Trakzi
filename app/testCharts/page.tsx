"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { GridStack, type GridStackOptions } from "gridstack"
import "gridstack/dist/gridstack.min.css"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { deduplicatedFetch } from "@/lib/request-deduplication"
import { getChartCardSize, type ChartId } from "@/lib/chart-card-sizes.config"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"
import { toast } from "sonner"
import { normalizeTransactions } from "@/lib/utils"
import { useDateFilter } from "@/components/date-filter-provider"

// Import all test chart components
import {
    ChartWeekendVsWeekday,
    ChartAvgTransactionTrend,
    ChartSpendingVelocity,
    ChartCategoryDiversity,
    ChartMoMGrowth,
    ChartTransactionHeatmap,
    ChartSpendingDistribution,
    ChartIncomeExpenseRatio,
    ChartRolling7DayAvg,
    ChartTopMerchantsRace,
    ChartLargestTransactions,
    ChartRecurringVsOneTime,
    ChartHourlySpending,
    ChartCumulativeSpending,
    ChartCategoryGrowth,
    ChartSpendingStreak,
    ChartPaydayImpact,
    ChartSavingsRateTrend,
    ChartSpendingScore,
    ChartSmallVsLargePurchases,
    ChartCategoryBubbles,
    ChartWeeklyComparison,
    ChartMonthlyBudgetPace,
    ChartTransactionCountTrend,
    ChartQuickStats,
    ChartTopCategoriesPie,
    ChartSeasonalSpending,
    ChartBudgetBurndown,
    ChartCashFlowIndicator,
    ChartCategoryRanking,
    ChartIncomeSources,
    // New batch of 20 charts
    ChartExpenseVelocityGauge,
    ChartSpendingByMerchant,
    ChartDailyHighLow,
    ChartMonthlyTrend,
    ChartWeekdayRadar,
    ChartMonthCompare,
    ChartNeedsVsWantsDonut,
    ChartBudgetMilestone,
    ChartYearOverYear,
    ChartSpendingByHourHeatmap,
    ChartCategoryProgress,
    ChartNetWorthTrend,
    ChartFinancialSummary,
    ChartDailyAverageByMonth,
    ChartPaymentMethods,
    ChartBiggestExpenseCategories,
    ChartSpendingAlerts,
    ChartQuarterlyComparison,
    ChartBalanceHistory,
    ChartMonthlyInsights,
} from "@/components/test-charts"

type TestChartsTransaction = {
    id: number
    date: string
    description: string
    amount: number
    balance: number | null
    category: string
}

type TestChartsCacheEntry = {
    transactions: TestChartsTransaction[]
    fetchedAt: number
}

const TEST_CHARTS_CACHE_TTL_MS = 5 * 60 * 1000
const testChartsDataCache = new Map<string, TestChartsCacheEntry>()

const getTestChartsCacheKey = (filter?: string | null) => filter ?? "all"

const getTestChartsCacheEntry = (filter?: string | null) => {
    const cacheKey = getTestChartsCacheKey(filter)
    return testChartsDataCache.get(cacheKey) || null
}

const isTestChartsCacheFresh = (entry: TestChartsCacheEntry) =>
    Date.now() - entry.fetchedAt < TEST_CHARTS_CACHE_TTL_MS

export default function TestChartsPage() {
    // GridStack ref and instance
    const gridRef = useRef<HTMLDivElement>(null)
    const gridStackRef = useRef<GridStack | null>(null)

    // Chart order for rendering (31 charts total)
    const testChartsOrder = useMemo(
        () => [
            // Row 1: Quick overview cards
            "testCharts:quickStats",
            "testCharts:spendingScore",
            // Row 2: Cash flow
            "testCharts:cashFlowIndicator",
            "testCharts:incomeExpenseRatio",
            // Row 3: Spending patterns
            "testCharts:weekendVsWeekday",
            "testCharts:hourlySpending",
            // Row 4: Trends
            "testCharts:savingsRateTrend",
            "testCharts:cumulativeSpending",
            // Row 5: Budget tracking
            "testCharts:budgetBurndown",
            "testCharts:monthlyBudgetPace",
            // Row 6: Velocity and streaks
            "testCharts:spendingVelocity",
            "testCharts:spendingStreak",
            // Row 7: Categories
            "testCharts:topCategoriesPie",
            "testCharts:categoryBubbles",
            // Row 8: Purchase analysis
            "testCharts:smallVsLargePurchases",
            "testCharts:recurringVsOneTime",
            // Row 9: Rankings
            "testCharts:categoryRanking",
            "testCharts:categoryGrowth",
            // Row 10: Comparisons
            "testCharts:weeklyComparison",
            "testCharts:seasonalSpending",
            // Row 11: Diversity and trends
            "testCharts:categoryDiversity",
            "testCharts:momGrowth",
            // Row 12: Time-based
            "testCharts:avgTransactionTrend",
            "testCharts:transactionCountTrend",
            // Row 13: Full width charts
            "testCharts:rolling7DayAvg",
            // Row 14: Heatmap and payday
            "testCharts:transactionHeatmap",
            "testCharts:paydayImpact",
            // Row 15: Merchants and sources
            "testCharts:topMerchantsRace",
            "testCharts:incomeSources",
            // Row 16: Distribution
            "testCharts:spendingDistribution",
            "testCharts:largestTransactions",
            // NEW CHARTS (20 additional)
            // Row 17: Gauges and comparisons
            "testCharts:expenseVelocityGauge",
            "testCharts:monthCompare",
            // Row 18: Daily stats
            "testCharts:dailyHighLow",
            "testCharts:financialSummary",
            // Row 19: Trends
            "testCharts:monthlyTrend",
            "testCharts:netWorthTrend",
            // Row 20: Radar and heatmap
            "testCharts:weekdayRadar",
            "testCharts:spendingByHourHeatmap",
            // Row 21: Budgets
            "testCharts:budgetMilestone",
            "testCharts:categoryProgress",
            // Row 22: Needs and merchants
            "testCharts:needsVsWantsDonut",
            "testCharts:spendingByMerchant",
            // Row 23: Year comparisons
            "testCharts:yearOverYear",
            "testCharts:quarterlyComparison",
            // Row 24: Averages and payments
            "testCharts:dailyAverageByMonth",
            "testCharts:paymentMethods",
            // Row 25: Categories and alerts
            "testCharts:biggestExpenseCategories",
            "testCharts:spendingAlerts",
            // Row 26: History and insights
            "testCharts:balanceHistory",
            "testCharts:monthlyInsights",
        ] as ChartId[],
        [],
    )

    // Default chart sizes and positions
    const DEFAULT_CHART_SIZES: Record<string, { w: number; h: number; x?: number; y?: number }> = {
        // Row 1
        "testCharts:quickStats": { w: 6, h: 6, x: 0, y: 0 },
        "testCharts:spendingScore": { w: 6, h: 8, x: 6, y: 0 },
        // Row 2
        "testCharts:cashFlowIndicator": { w: 6, h: 7, x: 0, y: 6 },
        "testCharts:incomeExpenseRatio": { w: 6, h: 8, x: 6, y: 8 },
        // Row 3
        "testCharts:weekendVsWeekday": { w: 6, h: 8, x: 0, y: 13 },
        "testCharts:hourlySpending": { w: 6, h: 8, x: 6, y: 16 },
        // Row 4
        "testCharts:savingsRateTrend": { w: 6, h: 7, x: 0, y: 21 },
        "testCharts:cumulativeSpending": { w: 6, h: 7, x: 6, y: 24 },
        // Row 5
        "testCharts:budgetBurndown": { w: 6, h: 7, x: 0, y: 28 },
        "testCharts:monthlyBudgetPace": { w: 6, h: 7, x: 6, y: 31 },
        // Row 6
        "testCharts:spendingVelocity": { w: 6, h: 8, x: 0, y: 35 },
        "testCharts:spendingStreak": { w: 6, h: 7, x: 6, y: 38 },
        // Row 7
        "testCharts:topCategoriesPie": { w: 6, h: 8, x: 0, y: 43 },
        "testCharts:categoryBubbles": { w: 6, h: 8, x: 6, y: 45 },
        // Row 8
        "testCharts:smallVsLargePurchases": { w: 6, h: 8, x: 0, y: 51 },
        "testCharts:recurringVsOneTime": { w: 6, h: 8, x: 6, y: 53 },
        // Row 9
        "testCharts:categoryRanking": { w: 6, h: 8, x: 0, y: 59 },
        "testCharts:categoryGrowth": { w: 6, h: 8, x: 6, y: 61 },
        // Row 10
        "testCharts:weeklyComparison": { w: 6, h: 7, x: 0, y: 67 },
        "testCharts:seasonalSpending": { w: 6, h: 7, x: 6, y: 68 },
        // Row 11
        "testCharts:categoryDiversity": { w: 6, h: 10, x: 0, y: 74 },
        "testCharts:momGrowth": { w: 6, h: 8, x: 6, y: 75 },
        // Row 12
        "testCharts:avgTransactionTrend": { w: 6, h: 8, x: 0, y: 84 },
        "testCharts:transactionCountTrend": { w: 6, h: 7, x: 6, y: 83 },
        // Row 13
        "testCharts:rolling7DayAvg": { w: 12, h: 8, x: 0, y: 90 },
        // Row 14
        "testCharts:transactionHeatmap": { w: 6, h: 10, x: 0, y: 98 },
        "testCharts:paydayImpact": { w: 6, h: 8, x: 6, y: 98 },
        // Row 15
        "testCharts:topMerchantsRace": { w: 6, h: 10, x: 0, y: 108 },
        "testCharts:incomeSources": { w: 6, h: 8, x: 6, y: 106 },
        // Row 16
        "testCharts:spendingDistribution": { w: 6, h: 8, x: 0, y: 118 },
        "testCharts:largestTransactions": { w: 12, h: 10, x: 0, y: 126 },
        // NEW CHARTS - Row 17
        "testCharts:expenseVelocityGauge": { w: 6, h: 6, x: 0, y: 136 },
        "testCharts:monthCompare": { w: 6, h: 7, x: 6, y: 136 },
        // Row 18
        "testCharts:dailyHighLow": { w: 6, h: 6, x: 0, y: 143 },
        "testCharts:financialSummary": { w: 6, h: 7, x: 6, y: 143 },
        // Row 19
        "testCharts:monthlyTrend": { w: 6, h: 8, x: 0, y: 150 },
        "testCharts:netWorthTrend": { w: 6, h: 8, x: 6, y: 150 },
        // Row 20
        "testCharts:weekdayRadar": { w: 6, h: 8, x: 0, y: 158 },
        "testCharts:spendingByHourHeatmap": { w: 6, h: 8, x: 6, y: 158 },
        // Row 21
        "testCharts:budgetMilestone": { w: 6, h: 6, x: 0, y: 166 },
        "testCharts:categoryProgress": { w: 6, h: 8, x: 6, y: 166 },
        // Row 22
        "testCharts:needsVsWantsDonut": { w: 6, h: 8, x: 0, y: 174 },
        "testCharts:spendingByMerchant": { w: 6, h: 8, x: 6, y: 174 },
        // Row 23
        "testCharts:yearOverYear": { w: 6, h: 8, x: 0, y: 182 },
        "testCharts:quarterlyComparison": { w: 6, h: 8, x: 6, y: 182 },
        // Row 24
        "testCharts:dailyAverageByMonth": { w: 6, h: 8, x: 0, y: 190 },
        "testCharts:paymentMethods": { w: 6, h: 8, x: 6, y: 190 },
        // Row 25
        "testCharts:biggestExpenseCategories": { w: 6, h: 8, x: 0, y: 198 },
        "testCharts:spendingAlerts": { w: 6, h: 6, x: 6, y: 198 },
        // Row 26
        "testCharts:balanceHistory": { w: 6, h: 8, x: 0, y: 206 },
        "testCharts:monthlyInsights": { w: 6, h: 7, x: 6, y: 206 },
    }

    // Snap to nearest allowed size (snap width, keep height as-is)
    const snapToAllowedSize = useCallback((w: number, h: number) => {
        const widthDistanceToSmall = Math.abs(w - 6)
        const widthDistanceToLarge = Math.abs(w - 12)
        const snappedWidth = widthDistanceToSmall <= widthDistanceToLarge ? 6 : 12
        const clampedHeight = Math.max(4, Math.min(20, h))
        return { w: snappedWidth, h: clampedHeight }
    }, [])

    // localStorage key for chart sizes and positions
    const CHART_SIZES_STORAGE_KEY = 'testcharts-chart-sizes'
    const CHART_SIZES_VERSION_KEY = 'testcharts-chart-sizes-version'
    const DEFAULT_SIZES_VERSION = '3' // Increment to reset layout with new charts

    // Load saved chart sizes and positions from localStorage
    const loadChartSizes = useCallback((): Record<string, { w: number; h: number; x?: number; y?: number }> => {
        if (typeof window === 'undefined') return {}
        try {
            const saved = localStorage.getItem(CHART_SIZES_STORAGE_KEY)
            const savedSizes = saved ? JSON.parse(saved) : {}
            const savedVersion = localStorage.getItem(CHART_SIZES_VERSION_KEY)
            const needsUpdate = savedVersion !== DEFAULT_SIZES_VERSION

            const result: Record<string, { w: number; h: number; x?: number; y?: number }> = {}
            let hasChanges = false

            Object.keys(DEFAULT_CHART_SIZES).forEach(chartId => {
                const defaultSize = DEFAULT_CHART_SIZES[chartId]
                const savedSize = savedSizes[chartId]

                const finalSize = needsUpdate || !savedSize
                    ? {
                        w: defaultSize.w,
                        h: defaultSize.h,
                        x: savedSize?.x ?? defaultSize.x,
                        y: savedSize?.y ?? defaultSize.y
                    }
                    : {
                        w: savedSize.w,
                        h: savedSize.h,
                        x: savedSize.x ?? defaultSize.x,
                        y: savedSize.y ?? defaultSize.y
                    }

                result[chartId] = finalSize

                if (needsUpdate && (!savedSize || savedSize.w !== defaultSize.w || savedSize.h !== defaultSize.h)) {
                    hasChanges = true
                }
            })

            if (needsUpdate || hasChanges) {
                localStorage.setItem(CHART_SIZES_STORAGE_KEY, JSON.stringify(result))
                localStorage.setItem(CHART_SIZES_VERSION_KEY, DEFAULT_SIZES_VERSION)
            }

            return result
        } catch (error) {
            console.error('Failed to load chart sizes from localStorage:', error)
        }
        return {}
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [DEFAULT_SIZES_VERSION])

    const [savedChartSizes, setSavedChartSizes] = useState<Record<string, { w: number; h: number; x?: number; y?: number }>>({})
    const savedChartSizesRef = useRef<Record<string, { w: number; h: number; x?: number; y?: number }>>({})
    const [hasLoadedChartSizes, setHasLoadedChartSizes] = useState(false)

    // Save chart sizes and positions to localStorage AND React state
    const saveChartSizes = useCallback(
        (sizes: Record<string, { w: number; h: number; x?: number; y?: number }>) => {
            savedChartSizesRef.current = sizes
            setSavedChartSizes(sizes)

            if (typeof window === "undefined") return
            try {
                localStorage.setItem(CHART_SIZES_STORAGE_KEY, JSON.stringify(sizes))
                localStorage.setItem(CHART_SIZES_VERSION_KEY, DEFAULT_SIZES_VERSION)
            } catch (error) {
                console.error("Failed to save chart sizes to localStorage:", error)
            }
        },
        [],
    )

    // Load saved sizes after mount (client-side only)
    useEffect(() => {
        const loaded = loadChartSizes()
        savedChartSizesRef.current = loaded
        setSavedChartSizes(loaded)
        setHasLoadedChartSizes(true)
    }, [loadChartSizes])

    // Initialize GridStack
    useEffect(() => {
        if (!hasLoadedChartSizes) return
        if (!gridRef.current) return

        const initializeGridStack = () => {
            if (!gridRef.current) return
            const items = gridRef.current.querySelectorAll('.grid-stack-item')
            if (items.length === 0) return

            const gridOptions: GridStackOptions & { disableOneColumnMode?: boolean } = {
                column: 12,
                cellHeight: 70,
                margin: 0,
                minRow: 1,
                float: true,
                animate: true,
                resizable: {
                    handles: 'se',
                },
                draggable: {
                    handle: ".gridstack-drag-handle"
                },
                disableOneColumnMode: true,
            }
            gridStackRef.current = GridStack.init(gridOptions, gridRef.current)

            if (gridStackRef.current && items.length > 0) {
                const currentSavedChartSizes = savedChartSizesRef.current

                const widgetData = Array.from(items).map((item) => {
                    const el = item as HTMLElement
                    const chartId = el.getAttribute('data-chart-id') || ''

                    let w = 12
                    let h = 6
                    let x = 0
                    let y = 0

                    if (chartId && currentSavedChartSizes[chartId]) {
                        const saved = currentSavedChartSizes[chartId]
                        const snapped = snapToAllowedSize(saved.w, saved.h)
                        w = snapped.w
                        h = saved.h
                        if (typeof saved.x === 'number') x = saved.x
                        if (typeof saved.y === 'number') y = saved.y
                    } else {
                        const defaultSize = DEFAULT_CHART_SIZES[chartId]
                        if (defaultSize) {
                            const snapped = snapToAllowedSize(defaultSize.w, defaultSize.h)
                            w = snapped.w
                            h = defaultSize.h
                            if (typeof defaultSize.x === 'number') x = defaultSize.x
                            if (typeof defaultSize.y === 'number') y = defaultSize.y
                        }
                    }

                    const sizeConfig = getChartCardSize(chartId as ChartId)
                    h = Math.max(sizeConfig.minH, Math.min(sizeConfig.maxH, h))
                    w = Math.max(sizeConfig.minW, Math.min(sizeConfig.maxW, w))

                    return { el, w, h, x, y, chartId, minW: sizeConfig.minW, maxW: sizeConfig.maxW, minH: sizeConfig.minH, maxH: sizeConfig.maxH }
                })

                const widgets = widgetData.map((data) => {
                    const widget = {
                        el: data.el,
                        w: data.w,
                        h: data.h,
                        x: data.x,
                        y: data.y,
                        minW: data.minW || 6,
                        maxW: data.maxW || 12,
                        minH: data.minH || 4,
                        maxH: data.maxH || 20,
                        chartId: data.chartId,
                    }
                    if (data.chartId) {
                        data.el.setAttribute('data-chart-id', data.chartId)
                    }
                    return widget
                })

                gridStackRef.current.removeAll(false)
                gridStackRef.current.load(widgets)

                setTimeout(() => {
                    if (gridStackRef.current) {
                        gridStackRef.current.engine.nodes.forEach((node) => {
                            if (node.el) {
                                const chartId = node.el.getAttribute('data-chart-id')
                                if (chartId) {
                                    const sizeConfig = getChartCardSize(chartId as ChartId)
                                    node.minW = sizeConfig.minW
                                    node.maxW = sizeConfig.maxW
                                    node.minH = sizeConfig.minH
                                    node.maxH = sizeConfig.maxH
                                }
                            }
                        })
                    }
                }, 100)

                // Keep saved positions intact; don't auto-compact after loading.

                // Handle resize events
                gridStackRef.current.on('resizestop', (event, item) => {
                    if (item && gridStackRef.current) {
                        const chartId = item.getAttribute('data-chart-id')
                        if (chartId) {
                            const node = gridStackRef.current.engine.nodes.find(n => n.el === item)
                            if (node) {
                                const minH = node.minH ?? 4
                                const maxH = node.maxH ?? 20
                                const clampedH = Math.max(minH, Math.min(maxH, node.h || 6))
                                const snapped = snapToAllowedSize(node.w || 6, clampedH)

                                const newSizes = { ...savedChartSizesRef.current }
                                newSizes[chartId] = {
                                    w: snapped.w,
                                    h: clampedH,
                                    x: node.x || 0,
                                    y: node.y || 0
                                }
                                saveChartSizes(newSizes)
                            }
                        }
                    }
                })

                gridStackRef.current.on('dragstop', (event, items) => {
                    if (items && gridStackRef.current) {
                        const itemsArray = Array.isArray(items) ? items : [items]
                        const newSizes = { ...savedChartSizesRef.current }
                        itemsArray.forEach((item) => {
                            const el = (item as any).el || item
                            const node = gridStackRef.current!.engine.nodes.find(n => n.el === el)
                            if (node) {
                                const chartId = el.getAttribute('data-chart-id')
                                if (chartId && node.w && node.h) {
                                    const snapped = snapToAllowedSize(node.w, node.h)
                                    newSizes[chartId] = {
                                        w: snapped.w,
                                        h: snapped.h,
                                        x: node.x || 0,
                                        y: node.y || 0
                                    }
                                }
                            }
                        })
                        saveChartSizes(newSizes)
                    }
                })
            }
        }

        const timer = setTimeout(() => {
            if (!gridRef.current) return
            requestAnimationFrame(() => {
                if (!gridRef.current) return
                if (gridStackRef.current) {
                    gridStackRef.current.destroy(false)
                    gridStackRef.current = null
                }
                initializeGridStack()
            })
        }, 100)

        return () => {
            clearTimeout(timer)
            if (gridStackRef.current) {
                gridStackRef.current.destroy(false)
                gridStackRef.current = null
            }
        }
    }, [testChartsOrder, snapToAllowedSize, saveChartSizes, hasLoadedChartSizes])

    // Date filter state
    const { filter: dateFilter, setFilter: setDateFilter } = useDateFilter()
    const testChartsCacheEntry = getTestChartsCacheEntry(dateFilter)

    // Transactions state
    const [rawTransactions, setRawTransactions] = useState<TestChartsTransaction[]>(
        () => testChartsCacheEntry?.transactions ?? [],
    )
    const [isLoadingTransactions, setIsLoadingTransactions] = useState(
        () => !testChartsCacheEntry,
    )

    // Fetch all data
    const fetchAllData = useCallback(async () => {
        const cacheKey = getTestChartsCacheKey(dateFilter)
        const cachedEntry = getTestChartsCacheEntry(dateFilter)
        const hasFreshCache = cachedEntry ? isTestChartsCacheFresh(cachedEntry) : false

        if (cachedEntry) {
            setRawTransactions(cachedEntry.transactions)
            setIsLoadingTransactions(false)
            if (hasFreshCache) {
                return
            }
        } else {
            setIsLoadingTransactions(true)
        }

        try {
            const transactionsData = await deduplicatedFetch<any[]>(
                dateFilter
                    ? `/api/transactions?filter=${encodeURIComponent(dateFilter)}`
                    : "/api/transactions"
            ).catch(err => {
                console.error("[TestCharts] Transactions fetch error:", err)
                return []
            })

            if (Array.isArray(transactionsData)) {
                const normalized = normalizeTransactions(transactionsData) as TestChartsTransaction[]
                setRawTransactions(normalized)
                testChartsDataCache.set(cacheKey, {
                    transactions: normalized,
                    fetchedAt: Date.now(),
                })
            }
        } catch (error) {
            console.error("Error fetching data:", error)
            toast.error("Network Error", {
                description: "Failed to fetch data. Check your database connection.",
                duration: 8000,
            })
        } finally {
            setIsLoadingTransactions(false)
        }
    }, [dateFilter])

    // Fetch all data on mount and when filter changes
    useEffect(() => {
        fetchAllData()
    }, [fetchAllData])

    // Listen for date filter changes from SiteHeader
    useEffect(() => {
        const handleFilterChange = (event: CustomEvent) => {
            setDateFilter(event.detail)
        }

        window.addEventListener("dateFilterChanged", handleFilterChange as EventListener)

        const savedFilter = localStorage.getItem("dateFilter")
        if (savedFilter) {
            setDateFilter(savedFilter)
        }

        return () => {
            window.removeEventListener("dateFilterChanged", handleFilterChange as EventListener)
        }
    }, [])

    // Render chart based on chartId
    const renderChart = (chartId: ChartId) => {
        const chartProps = {
            data: rawTransactions,
            isLoading: isLoadingTransactions,
        }

        switch (chartId) {
            case "testCharts:weekendVsWeekday":
                return <ChartWeekendVsWeekday {...chartProps} />
            case "testCharts:avgTransactionTrend":
                return <ChartAvgTransactionTrend {...chartProps} />
            case "testCharts:spendingVelocity":
                return <ChartSpendingVelocity {...chartProps} />
            case "testCharts:categoryDiversity":
                return <ChartCategoryDiversity {...chartProps} />
            case "testCharts:momGrowth":
                return <ChartMoMGrowth {...chartProps} />
            case "testCharts:transactionHeatmap":
                return <ChartTransactionHeatmap {...chartProps} />
            case "testCharts:spendingDistribution":
                return <ChartSpendingDistribution {...chartProps} />
            case "testCharts:incomeExpenseRatio":
                return <ChartIncomeExpenseRatio {...chartProps} />
            case "testCharts:rolling7DayAvg":
                return <ChartRolling7DayAvg {...chartProps} />
            case "testCharts:topMerchantsRace":
                return <ChartTopMerchantsRace {...chartProps} />
            case "testCharts:largestTransactions":
                return <ChartLargestTransactions {...chartProps} />
            case "testCharts:recurringVsOneTime":
                return <ChartRecurringVsOneTime {...chartProps} />
            case "testCharts:hourlySpending":
                return <ChartHourlySpending {...chartProps} />
            case "testCharts:cumulativeSpending":
                return <ChartCumulativeSpending {...chartProps} />
            case "testCharts:categoryGrowth":
                return <ChartCategoryGrowth {...chartProps} />
            case "testCharts:spendingStreak":
                return <ChartSpendingStreak {...chartProps} />
            case "testCharts:paydayImpact":
                return <ChartPaydayImpact {...chartProps} />
            case "testCharts:savingsRateTrend":
                return <ChartSavingsRateTrend {...chartProps} />
            case "testCharts:spendingScore":
                return <ChartSpendingScore {...chartProps} />
            case "testCharts:smallVsLargePurchases":
                return <ChartSmallVsLargePurchases {...chartProps} />
            case "testCharts:categoryBubbles":
                return <ChartCategoryBubbles {...chartProps} />
            case "testCharts:weeklyComparison":
                return <ChartWeeklyComparison {...chartProps} />
            case "testCharts:monthlyBudgetPace":
                return <ChartMonthlyBudgetPace {...chartProps} />
            case "testCharts:transactionCountTrend":
                return <ChartTransactionCountTrend {...chartProps} />
            case "testCharts:quickStats":
                return <ChartQuickStats {...chartProps} />
            case "testCharts:topCategoriesPie":
                return <ChartTopCategoriesPie {...chartProps} />
            case "testCharts:seasonalSpending":
                return <ChartSeasonalSpending {...chartProps} />
            case "testCharts:budgetBurndown":
                return <ChartBudgetBurndown {...chartProps} />
            case "testCharts:cashFlowIndicator":
                return <ChartCashFlowIndicator {...chartProps} />
            case "testCharts:categoryRanking":
                return <ChartCategoryRanking {...chartProps} />
            case "testCharts:incomeSources":
                return <ChartIncomeSources {...chartProps} />
            // NEW CHARTS (20 additional)
            case "testCharts:expenseVelocityGauge":
                return <ChartExpenseVelocityGauge {...chartProps} />
            case "testCharts:spendingByMerchant":
                return <ChartSpendingByMerchant {...chartProps} />
            case "testCharts:dailyHighLow":
                return <ChartDailyHighLow {...chartProps} />
            case "testCharts:monthlyTrend":
                return <ChartMonthlyTrend {...chartProps} />
            case "testCharts:weekdayRadar":
                return <ChartWeekdayRadar {...chartProps} />
            case "testCharts:monthCompare":
                return <ChartMonthCompare {...chartProps} />
            case "testCharts:needsVsWantsDonut":
                return <ChartNeedsVsWantsDonut {...chartProps} />
            case "testCharts:budgetMilestone":
                return <ChartBudgetMilestone {...chartProps} />
            case "testCharts:yearOverYear":
                return <ChartYearOverYear {...chartProps} />
            case "testCharts:spendingByHourHeatmap":
                return <ChartSpendingByHourHeatmap {...chartProps} />
            case "testCharts:categoryProgress":
                return <ChartCategoryProgress {...chartProps} />
            case "testCharts:netWorthTrend":
                return <ChartNetWorthTrend {...chartProps} />
            case "testCharts:financialSummary":
                return <ChartFinancialSummary {...chartProps} />
            case "testCharts:dailyAverageByMonth":
                return <ChartDailyAverageByMonth {...chartProps} />
            case "testCharts:paymentMethods":
                return <ChartPaymentMethods {...chartProps} />
            case "testCharts:biggestExpenseCategories":
                return <ChartBiggestExpenseCategories {...chartProps} />
            case "testCharts:spendingAlerts":
                return <ChartSpendingAlerts {...chartProps} />
            case "testCharts:quarterlyComparison":
                return <ChartQuarterlyComparison {...chartProps} />
            case "testCharts:balanceHistory":
                return <ChartBalanceHistory {...chartProps} />
            case "testCharts:monthlyInsights":
                return <ChartMonthlyInsights {...chartProps} />
            default:
                return null
        }
    }

    return (
        <SidebarProvider
            style={
                {
                    "--sidebar-width": "calc(var(--spacing) * 72 - 15px)",
                    "--header-height": "calc(var(--spacing) * 12)",
                } as React.CSSProperties
            }
        >
            <AppSidebar variant="inset" />
            <SidebarInset>
                <SiteHeader />
                <main className="flex-1 space-y-4 p-4 pt-0 lg:p-6 lg:pt-2">
                    <div className="@container/main flex flex-1 flex-col gap-2">
                        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                            {/* GridStack test charts section */}
                            <div className="w-full mb-4">
                                <div ref={gridRef} className="grid-stack w-full px-4 lg:px-6">
                                    {testChartsOrder.map((chartId) => {
                                        const defaultSize = DEFAULT_CHART_SIZES[chartId] || { w: 12, h: 6, x: 0, y: 0 }
                                        const sizeConfig = getChartCardSize(chartId as ChartId)
                                        const initialW = defaultSize.w
                                        const initialH = defaultSize.h

                                        return (
                                            <div
                                                key={chartId}
                                                className="grid-stack-item overflow-visible"
                                                data-chart-id={chartId}
                                                data-gs-w={initialW}
                                                data-gs-h={initialH}
                                                data-gs-x={defaultSize.x ?? 0}
                                                data-gs-y={defaultSize.y ?? 0}
                                                data-gs-min-w={sizeConfig.minW}
                                                data-gs-max-w={sizeConfig.maxW}
                                                data-gs-min-h={sizeConfig.minH}
                                                data-gs-max-h={sizeConfig.maxH}
                                            >
                                                <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                                                    {renderChart(chartId)}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </SidebarInset>
        </SidebarProvider>
    )
}
