"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
// @dnd-kit for drag-and-drop (replaces GridStack)
import { SortableGridProvider, SortableGridItem } from "@/components/sortable-grid"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { deduplicatedFetch } from "@/lib/request-deduplication"
import { getChartCardSize, type ChartId } from "@/lib/chart-card-sizes.config"
import type { TestChartsSummary, TestChartsReceiptTransaction } from "@/lib/charts/aggregations"
// @dnd-kit has built-in auto-scroll
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useDateFilter } from "@/components/date-filter-provider"
import { Button } from "@/components/ui/button"
import { Activity, Wallet, Refrigerator, ChevronRight } from "lucide-react"

// Import all test chart components
import {
    ChartWeekendVsWeekday,
    ChartAvgTransactionTrend,
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

// Fridge charts
import { ChartAreaInteractiveFridge } from "@/components/fridge/chart-area-interactive-fridge"
import { ChartCategoryFlowFridge } from "@/components/fridge/chart-category-flow-fridge"
import { ChartExpenseBreakdownFridge } from "@/components/fridge/chart-expense-breakdown-fridge"
import { ChartMacronutrientBreakdownFridge } from "@/components/fridge/chart-macronutrient-breakdown-fridge"
import { ChartSnackPercentageFridge } from "@/components/fridge/chart-snack-percentage-fridge"

type TestChartsTransaction = {
    id: number
    date: string
    description: string
    amount: number
    balance: number | null
    category: string
}

type ReceiptTransaction = {
    id: number
    date: string
    description: string
    amount: number
    category: string
    spend?: number // For ChartAreaInteractiveFridge
}

export default function TestChartsPage() {
    // @dnd-kit: Chart order state for each section
    const [analyticsOrder, setAnalyticsOrder] = useState<string[]>([
        "testCharts:quickStats", "testCharts:spendingScore", "testCharts:cashFlowIndicator",
        "testCharts:incomeExpenseRatio", "testCharts:weekendVsWeekday", "testCharts:hourlySpending",
        "testCharts:cumulativeSpending", "testCharts:budgetBurndown", "testCharts:monthlyBudgetPace",
        "testCharts:spendingStreak", "testCharts:topCategoriesPie",
        "testCharts:categoryBubbles", "testCharts:smallVsLargePurchases", "testCharts:recurringVsOneTime",
        "testCharts:categoryRanking", "testCharts:categoryGrowth", "testCharts:weeklyComparison",
        "testCharts:seasonalSpending", "testCharts:categoryDiversity", "testCharts:momGrowth",
        "testCharts:avgTransactionTrend", "testCharts:transactionCountTrend", "testCharts:rolling7DayAvg",
        "testCharts:transactionHeatmap", "testCharts:paydayImpact", "testCharts:topMerchantsRace",
        "testCharts:incomeSources", "testCharts:spendingDistribution", "testCharts:largestTransactions",
        "testCharts:expenseVelocityGauge", "testCharts:monthCompare", "testCharts:dailyHighLow",
        "testCharts:financialSummary", "testCharts:monthlyTrend", "testCharts:weekdayRadar",
        "testCharts:spendingByHourHeatmap", "testCharts:categoryProgress",
        "testCharts:needsVsWantsDonut", "testCharts:spendingByMerchant", "testCharts:yearOverYear",
        "testCharts:quarterlyComparison", "testCharts:dailyAverageByMonth", "testCharts:paymentMethods",
        "testCharts:biggestExpenseCategories", "testCharts:spendingAlerts", "testCharts:balanceHistory",
        "testCharts:monthlyInsights"
    ])

    const [savingsOrder, setSavingsOrder] = useState<string[]>([
        "testCharts:savingsRateTrend", "testCharts:netWorthTrend", "testCharts:budgetMilestone"
    ])

    const [fridgeOrder, setFridgeOrder] = useState<string[]>([
        "fridge:spend-trend", "fridge:category-flow", "fridge:expense-breakdown",
        "fridge:macronutrient-breakdown", "fridge:snack-percentage"
    ])

    // Load saved orders and sizes from localStorage
    const [analyticsSizes, setAnalyticsSizes] = useState<Record<string, { w: number; h: number }>>({})
    const [savingsSizes, setSavingsSizes] = useState<Record<string, { w: number; h: number }>>({})
    const [fridgeSizes, setFridgeSizes] = useState<Record<string, { w: number; h: number }>>({})

    useEffect(() => {
        const savedAnalytics = localStorage.getItem('testCharts-analytics-order')
        if (savedAnalytics) setAnalyticsOrder(JSON.parse(savedAnalytics))

        const savedAnalyticsSizes = localStorage.getItem('testCharts-analytics-sizes')
        if (savedAnalyticsSizes) setAnalyticsSizes(JSON.parse(savedAnalyticsSizes))

        const savedSavings = localStorage.getItem('testCharts-savings-order')
        if (savedSavings) setSavingsOrder(JSON.parse(savedSavings))

        const savedSavingsSizes = localStorage.getItem('testCharts-savings-sizes')
        if (savedSavingsSizes) setSavingsSizes(JSON.parse(savedSavingsSizes))

        const savedFridge = localStorage.getItem('testCharts-fridge-order')
        if (savedFridge) setFridgeOrder(JSON.parse(savedFridge))

        const savedFridgeSizes = localStorage.getItem('testCharts-fridge-sizes')
        if (savedFridgeSizes) setFridgeSizes(JSON.parse(savedFridgeSizes))
    }, [])

    const handleAnalyticsOrderChange = (newOrder: string[]) => {
        setAnalyticsOrder(newOrder)
        localStorage.setItem('testCharts-analytics-order', JSON.stringify(newOrder))
    }

    const handleAnalyticsResize = (id: string, w: number, h: number) => {
        setAnalyticsSizes(prev => {
            const next = { ...prev, [id]: { w, h } }
            localStorage.setItem('testCharts-analytics-sizes', JSON.stringify(next))
            return next
        })
    }

    const handleSavingsOrderChange = (newOrder: string[]) => {
        setSavingsOrder(newOrder)
        localStorage.setItem('testCharts-savings-order', JSON.stringify(newOrder))
    }

    const handleSavingsResize = (id: string, w: number, h: number) => {
        setSavingsSizes(prev => {
            const next = { ...prev, [id]: { w, h } }
            localStorage.setItem('testCharts-savings-sizes', JSON.stringify(next))
            return next
        })
    }

    const handleFridgeOrderChange = (newOrder: string[]) => {
        setFridgeOrder(newOrder)
        localStorage.setItem('testCharts-fridge-order', JSON.stringify(newOrder))
    }

    const handleFridgeResize = (id: string, w: number, h: number) => {
        setFridgeSizes(prev => {
            const next = { ...prev, [id]: { w, h } }
            localStorage.setItem('testCharts-fridge-sizes', JSON.stringify(next))
            return next
        })
    }


    // Date filter state
    const { filter: dateFilter, setFilter: setDateFilter } = useDateFilter()

    // Data state
    const [rawTransactions, setRawTransactions] = useState<TestChartsTransaction[]>([])
    const [receiptTransactions, setReceiptTransactions] = useState<ReceiptTransaction[]>([])
    const [isLoading, setIsLoading] = useState(true)
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4263eedd-8a99-4193-82ad-974d6be54ab8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'testCharts/page.tsx:204',message:'state initialization',data:{receiptTransactionsInitial:receiptTransactions.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

    // Memoized data for specific charts (like Fridge Breakdown)
    const fridgeBreakdownData = useMemo(() => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4263eedd-8a99-4193-82ad-974d6be54ab8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'testCharts/page.tsx:208',message:'fridgeBreakdownData useMemo entry',data:{receiptTransactionsLength:receiptTransactions?.length,receiptTransactionsType:typeof receiptTransactions,receiptTransactionsIsArray:Array.isArray(receiptTransactions)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        if (!receiptTransactions || receiptTransactions.length === 0) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/4263eedd-8a99-4193-82ad-974d6be54ab8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'testCharts/page.tsx:210',message:'fridgeBreakdownData early return',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
            return []
        }
        const totals = new Map<string, number>()
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4263eedd-8a99-4193-82ad-974d6be54ab8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'testCharts/page.tsx:213',message:'before forEach',data:{firstItem:receiptTransactions[0]?JSON.stringify(receiptTransactions[0]):null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        receiptTransactions.forEach((item) => {
            if (!item) return
            const category = item.category || "Other"
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/4263eedd-8a99-4193-82ad-974d6be54ab8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'testCharts/page.tsx:216',message:'forEach item processing',data:{itemAmount:item.amount,itemAmountType:typeof item.amount,category},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
            const spend = Number(item.amount) || 0
            totals.set(category, (totals.get(category) || 0) + spend)
        })

        const entries = Array.from(totals.entries())
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4263eedd-8a99-4193-82ad-974d6be54ab8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'testCharts/page.tsx:220',message:'before map',data:{entriesLength:entries.length,firstEntry:entries[0]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        const sorted = entries.sort((a, b) => b[1] - a[1])
        const result = sorted.map(([category, value]) => {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/4263eedd-8a99-4193-82ad-974d6be54ab8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'testCharts/page.tsx:222',message:'map callback',data:{category,value,valueType:typeof value,hasToFixed:typeof value?.toFixed},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
            return {
                id: category,
                label: category,
                value: Number(value.toFixed(2)),
            }
        })
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4263eedd-8a99-4193-82ad-974d6be54ab8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'testCharts/page.tsx:227',message:'fridgeBreakdownData useMemo exit',data:{resultLength:result.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        return result
    }, [receiptTransactions])

    const fridgeSpendTrendData = useMemo(() => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4263eedd-8a99-4193-82ad-974d6be54ab8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'testCharts/page.tsx:229',message:'fridgeSpendTrendData useMemo entry',data:{receiptTransactionsLength:receiptTransactions?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        if (!receiptTransactions || receiptTransactions.length === 0) {
            return []
        }
        const dailyTotals = new Map<string, number>()
        receiptTransactions.forEach(item => {
            if (!item) return
            const date = item.date
            if (!date) return
            dailyTotals.set(date, (dailyTotals.get(date) || 0) + (Number(item.amount) || 0))
        })
        const entries = Array.from(dailyTotals.entries())
        const mapped = entries.map(([date, spend]) => {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/4263eedd-8a99-4193-82ad-974d6be54ab8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'testCharts/page.tsx:241',message:'fridgeSpendTrendData map callback',data:{date,spend,spendType:typeof spend},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
            return { date, spend: Number(spend.toFixed(2)) }
        })
        return mapped.sort((a, b) => a.date.localeCompare(b.date))
    }, [receiptTransactions])

    // Fetch all data from bundle API
    const fetchAllData = useCallback(async () => {
        setIsLoading(true)
        try {
            const bundleUrl = dateFilter 
                ? `/api/charts/test-charts-bundle?filter=${encodeURIComponent(dateFilter)}`
                : "/api/charts/test-charts-bundle"
            
            const bundleData = await deduplicatedFetch<TestChartsSummary>(bundleUrl).catch(() => ({ 
                transactions: [], 
                receiptTransactions: [] 
            }))

            // Set transactions (already normalized from bundle)
            if (bundleData && Array.isArray(bundleData.transactions)) {
                setRawTransactions(bundleData.transactions)
            } else {
                setRawTransactions([])
            }

            // Set receipt transactions (map to expected format)
            if (bundleData && Array.isArray(bundleData.receiptTransactions)) {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/4263eedd-8a99-4193-82ad-974d6be54ab8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'testCharts/page.tsx:255',message:'before receiptTransactions map',data:{receiptTransactionsLength:bundleData.receiptTransactions.length,firstTx:bundleData.receiptTransactions[0]?JSON.stringify(bundleData.receiptTransactions[0]):null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                // #endregion
                const normalizedRx: ReceiptTransaction[] = bundleData.receiptTransactions.map((tx) => {
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/4263eedd-8a99-4193-82ad-974d6be54ab8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'testCharts/page.tsx:267',message:'receiptTransactions map callback',data:{txId:tx.id,txTotalPrice:tx.totalPrice,txTotalPriceType:typeof tx.totalPrice},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                    // #endregion
                    return {
                        id: tx.id || 0,
                        date: tx.receiptDate || "",
                        description: tx.description || "",
                        amount: Number(tx.totalPrice) || 0,
                        category: tx.categoryName || "Other",
                        spend: Number(tx.totalPrice) || 0
                    }
                })
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/4263eedd-8a99-4193-82ad-974d6be54ab8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'testCharts/page.tsx:275',message:'after receiptTransactions map',data:{normalizedRxLength:normalizedRx.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                // #endregion
                setReceiptTransactions(normalizedRx)
            } else {
                setReceiptTransactions([])
            }
        } catch (error) {
            console.error("Error fetching test charts bundle:", error)
            setRawTransactions([])
            setReceiptTransactions([])
        } finally {
            setIsLoading(false)
        }
    }, [dateFilter])

    useEffect(() => {
        fetchAllData()
    }, [fetchAllData])

    // Render chart based on chartId
    const renderChart = (chartId: string) => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4263eedd-8a99-4193-82ad-974d6be54ab8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'testCharts/page.tsx:340',message:'renderChart called',data:{chartId,rawTransactionsLength:rawTransactions?.length,isLoading},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        const chartProps = {
            data: rawTransactions,
            isLoading: isLoading,
        }

        switch (chartId) {
            case "testCharts:weekendVsWeekday": return <ChartWeekendVsWeekday {...chartProps} />
            case "testCharts:avgTransactionTrend": return <ChartAvgTransactionTrend {...chartProps} />
            case "testCharts:categoryDiversity": return <ChartCategoryDiversity {...chartProps} />
            case "testCharts:momGrowth": return <ChartMoMGrowth {...chartProps} />
            case "testCharts:transactionHeatmap": return <ChartTransactionHeatmap {...chartProps} />
            case "testCharts:spendingDistribution": return <ChartSpendingDistribution {...chartProps} />
            case "testCharts:incomeExpenseRatio": return <ChartIncomeExpenseRatio {...chartProps} />
            case "testCharts:rolling7DayAvg": return <ChartRolling7DayAvg {...chartProps} />
            case "testCharts:topMerchantsRace": return <ChartTopMerchantsRace {...chartProps} />
            case "testCharts:largestTransactions": return <ChartLargestTransactions {...chartProps} />
            case "testCharts:recurringVsOneTime": return <ChartRecurringVsOneTime {...chartProps} />
            case "testCharts:hourlySpending": return <ChartHourlySpending {...chartProps} />
            case "testCharts:cumulativeSpending": return <ChartCumulativeSpending {...chartProps} />
            case "testCharts:categoryGrowth": return <ChartCategoryGrowth {...chartProps} />
            case "testCharts:spendingStreak": return <ChartSpendingStreak {...chartProps} />
            case "testCharts:paydayImpact": return <ChartPaydayImpact {...chartProps} />
            case "testCharts:savingsRateTrend": return <ChartSavingsRateTrend {...chartProps} />
            case "testCharts:spendingScore": return <ChartSpendingScore {...chartProps} />
            case "testCharts:smallVsLargePurchases": return <ChartSmallVsLargePurchases {...chartProps} />
            case "testCharts:categoryBubbles": return <ChartCategoryBubbles {...chartProps} />
            case "testCharts:weeklyComparison": return <ChartWeeklyComparison {...chartProps} />
            case "testCharts:monthlyBudgetPace": return <ChartMonthlyBudgetPace {...chartProps} />
            case "testCharts:transactionCountTrend": return <ChartTransactionCountTrend {...chartProps} />
            case "testCharts:quickStats": return <ChartQuickStats {...chartProps} />
            case "testCharts:topCategoriesPie": return <ChartTopCategoriesPie {...chartProps} />
            case "testCharts:seasonalSpending": return <ChartSeasonalSpending {...chartProps} />
            case "testCharts:budgetBurndown": return <ChartBudgetBurndown {...chartProps} />
            case "testCharts:cashFlowIndicator": return <ChartCashFlowIndicator {...chartProps} />
            case "testCharts:categoryRanking": return <ChartCategoryRanking {...chartProps} />
            case "testCharts:incomeSources": return <ChartIncomeSources {...chartProps} />
            case "testCharts:expenseVelocityGauge": return <ChartExpenseVelocityGauge {...chartProps} />
            case "testCharts:spendingByMerchant": return <ChartSpendingByMerchant {...chartProps} />
            case "testCharts:dailyHighLow": return <ChartDailyHighLow {...chartProps} />
            case "testCharts:monthlyTrend": return <ChartMonthlyTrend {...chartProps} />
            case "testCharts:weekdayRadar": return <ChartWeekdayRadar {...chartProps} />
            case "testCharts:monthCompare": return <ChartMonthCompare {...chartProps} />
            case "testCharts:needsVsWantsDonut": return <ChartNeedsVsWantsDonut {...chartProps} />
            case "testCharts:budgetMilestone": return <ChartBudgetMilestone {...chartProps} />
            case "testCharts:yearOverYear": return <ChartYearOverYear {...chartProps} />
            case "testCharts:spendingByHourHeatmap": return <ChartSpendingByHourHeatmap {...chartProps} />
            case "testCharts:categoryProgress": return <ChartCategoryProgress {...chartProps} />
            case "testCharts:netWorthTrend": return <ChartNetWorthTrend {...chartProps} />
            case "testCharts:financialSummary": return <ChartFinancialSummary {...chartProps} />
            case "testCharts:dailyAverageByMonth": return <ChartDailyAverageByMonth {...chartProps} />
            case "testCharts:paymentMethods": return <ChartPaymentMethods {...chartProps} />
            case "testCharts:biggestExpenseCategories": return <ChartBiggestExpenseCategories {...chartProps} />
            case "testCharts:spendingAlerts": return <ChartSpendingAlerts {...chartProps} />
            case "testCharts:quarterlyComparison": return <ChartQuarterlyComparison {...chartProps} />
            case "testCharts:balanceHistory": return <ChartBalanceHistory {...chartProps} />
            case "testCharts:monthlyInsights": return <ChartMonthlyInsights {...chartProps} />
            // Fridge charts
            case "fridge:spend-trend": return <ChartAreaInteractiveFridge data={fridgeSpendTrendData} />
            case "fridge:category-flow": return <ChartCategoryFlowFridge receiptTransactions={receiptTransactions.map(tx => ({ ...tx, totalPrice: tx.amount, categoryName: tx.category, receiptDate: tx.date })) as any} isLoading={isLoading} />
            case "fridge:expense-breakdown": return <ChartExpenseBreakdownFridge data={fridgeBreakdownData} isLoading={isLoading} />
            case "fridge:macronutrient-breakdown": return <ChartMacronutrientBreakdownFridge receiptTransactions={receiptTransactions.map(tx => ({ ...tx, totalPrice: tx.amount, categoryName: tx.category, receiptDate: tx.date })) as any} isLoading={isLoading} />
            case "fridge:snack-percentage": return <ChartSnackPercentageFridge receiptTransactions={receiptTransactions.map(tx => ({ ...tx, totalPrice: tx.amount, categoryName: tx.category, receiptDate: tx.date })) as any} isLoading={isLoading} />
            default: return null
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
                <main className="flex-1 space-y-8 p-4 pt-0 lg:p-6 lg:pt-2">
                    {/* Sticky Navigation Bar */}
                    <div className="sticky top-[var(--header-height)] z-30 -mx-4 px-4 py-3 bg-background/80 backdrop-blur-md border-b border-border/40 lg:-mx-6 lg:px-6">
                        <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                            <Button
                                variant="outline"
                                size="sm"
                                className="rounded-full bg-background/50 border-border/60 hover:border-primary/50 transition-all gap-2 shrink-0 shadow-sm"
                                onClick={() => document.getElementById('analytics-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                            >
                                <Activity className="w-3.5 h-3.5 text-primary" />
                                <span className="text-xs font-semibold">Analytics</span>
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="rounded-full bg-background/50 border-border/60 hover:border-primary/50 transition-all gap-2 shrink-0 shadow-sm"
                                onClick={() => document.getElementById('savings-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                            >
                                <Wallet className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-xs font-semibold">Savings</span>
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="rounded-full bg-background/50 border-border/60 hover:border-primary/50 transition-all gap-2 shrink-0 shadow-sm"
                                onClick={() => document.getElementById('fridge-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                            >
                                <Refrigerator className="w-3.5 h-3.5 text-amber-500" />
                                <span className="text-xs font-semibold">Fridge</span>
                            </Button>
                            <div className="ml-auto flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-muted-foreground/60 px-2">
                                <span>Playground</span>
                                <ChevronRight className="w-3 h-3" />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-8 pb-12">
                        {/* Analytics Section */}
                        <section id="analytics-section" className="space-y-4 scroll-mt-24">
                            <div className="px-4 lg:px-6">
                                <h2 className="text-2xl font-bold tracking-tight">Analytics Playground</h2>
                                <p className="text-muted-foreground text-sm">General spending analysis and trend components.</p>
                            </div>
                            <SortableGridProvider
                                chartOrder={analyticsOrder}
                                onOrderChange={handleAnalyticsOrderChange}
                                className="w-full px-4 lg:px-6"
                            >
                                {analyticsOrder.map((chartId) => {
                                    const sizeConfig = getChartCardSize(chartId as ChartId)
                                    const savedSize = analyticsSizes[chartId]
                                    return (
                                        <SortableGridItem
                                            key={chartId}
                                            id={chartId}
                                            w={(savedSize?.w ?? sizeConfig.minW) as any}
                                            h={savedSize?.h ?? sizeConfig.minH}
                                            resizable
                                            onResize={handleAnalyticsResize}
                                        >
                                            {renderChart(chartId)}
                                        </SortableGridItem>
                                    )
                                })}
                            </SortableGridProvider>
                        </section>

                        {/* Savings Section */}
                        <section id="savings-section" className="space-y-4 scroll-mt-24">
                            <div className="px-4 lg:px-6 pt-8 border-t">
                                <h2 className="text-2xl font-bold tracking-tight">Savings & Wealth</h2>
                                <p className="text-muted-foreground text-sm">Components for tracking net worth, savings rates, and goals.</p>
                            </div>
                            <SortableGridProvider
                                chartOrder={savingsOrder}
                                onOrderChange={handleSavingsOrderChange}
                                className="w-full px-4 lg:px-6"
                            >
                                {savingsOrder.map((chartId) => {
                                    const sizeConfig = getChartCardSize(chartId as ChartId)
                                    const savedSize = savingsSizes[chartId]
                                    return (
                                        <SortableGridItem
                                            key={chartId}
                                            id={chartId}
                                            w={(savedSize?.w ?? sizeConfig.minW) as any}
                                            h={savedSize?.h ?? sizeConfig.minH}
                                            resizable
                                            onResize={handleSavingsResize}
                                        >
                                            {renderChart(chartId)}
                                        </SortableGridItem>
                                    )
                                })}
                            </SortableGridProvider>
                        </section>

                        {/* Fridge Section */}
                        <section id="fridge-section" className="space-y-4 scroll-mt-24">
                            <div className="px-4 lg:px-6 pt-8 border-t">
                                <h2 className="text-2xl font-bold tracking-tight">Fridge & Groceries</h2>
                                <p className="text-muted-foreground text-sm">Specialized components for food spending and nutrition data.</p>
                            </div>
                            <SortableGridProvider
                                chartOrder={fridgeOrder}
                                onOrderChange={handleFridgeOrderChange}
                                className="w-full px-4 lg:px-6"
                            >
                                {fridgeOrder.map((chartId) => {
                                    const sizeConfig = getChartCardSize(chartId as ChartId)
                                    const savedSize = fridgeSizes[chartId]
                                    return (
                                        <SortableGridItem
                                            key={chartId}
                                            id={chartId}
                                            w={(savedSize?.w ?? sizeConfig.minW) as any}
                                            h={savedSize?.h ?? sizeConfig.minH}
                                            resizable
                                            onResize={handleFridgeResize}
                                        >
                                            {renderChart(chartId)}
                                        </SortableGridItem>
                                    )
                                })}
                            </SortableGridProvider>
                        </section>
                    </div>
                </main>
            </SidebarInset>
        </SidebarProvider>
    )
}
