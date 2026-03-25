"use client"
import { memo, useMemo, useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { ResponsiveBar } from "@nivo/bar"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardAction,
} from "@/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { ChartExpandButton } from "@/components/chart-expand-button"
import { ChartFullscreenModal } from "@/components/chart-fullscreen-modal"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import { ChartLoadingState } from "@/components/chart-loading-state"
import { NivoChartTooltip } from "@/components/chart-tooltip"
import { getChartTextColor, getChartAxisLineColor } from "@/lib/chart-colors"
import { HoverableBar } from "@/components/chart-hoverable-bar"

const CHART_TITLE = "Payday Impact"
const CHART_DESCRIPTION = "See how your spending changes in the 7 days before and after payday."

type IncomeType = "all" | "salary" | "freelance" | "investments" | "refunds"

const SALARY_KEYWORDS = ["payroll", "salary", "wage", "direct deposit", "employer", "paycheque", "paycheck", "net pay", "gross pay"]
const FREELANCE_KEYWORDS = ["freelance", "consulting", "invoice", "client payment", "contract", "self-employed", "upwork", "fiverr"]
const INVESTMENT_KEYWORDS = ["dividend", "interest", "return", "capital gain", "investment", "etf", "stock", "bond", "crypto"]
const REFUND_KEYWORDS = ["refund", "return", "reimbursement", "cashback", "cash back", "rebate", "credit"]

function classifyIncome(description: string): IncomeType | null {
    const lower = (description || "").toLowerCase()
    if (SALARY_KEYWORDS.some(k => lower.includes(k))) return "salary"
    if (FREELANCE_KEYWORDS.some(k => lower.includes(k))) return "freelance"
    if (INVESTMENT_KEYWORDS.some(k => lower.includes(k))) return "investments"
    if (REFUND_KEYWORDS.some(k => lower.includes(k))) return "refunds"
    return null
}

function matchesIncomeType(
    selectedType: string,
    incomeClass: IncomeType | null,
    txCategory: string
): boolean {
    if (selectedType === "all") return true
    if (selectedType === "salary") {
        return incomeClass === "salary" || txCategory.includes("salary") || txCategory.includes("wage") || txCategory.includes("payroll")
    }
    if (selectedType === "freelance") {
        return incomeClass === "freelance" || txCategory.includes("freelance") || txCategory.includes("consult")
    }
    if (selectedType === "investments") {
        return incomeClass === "investments" || txCategory.includes("invest") || txCategory.includes("dividend")
    }
    if (selectedType === "refunds") {
        return incomeClass === "refunds" || txCategory.includes("refund")
    }
    // Custom category — match by category field
    return txCategory === selectedType.toLowerCase()
}

interface ChartPaydayImpactProps {
    data: Array<{
        date: string
        amount: number
        description?: string
        category?: string
    }>
    isLoading?: boolean
    emptyTitle?: string
    emptyDescription?: string
}

export const ChartPaydayImpact = memo(function ChartPaydayImpact({
    data,
    isLoading = false,
    emptyTitle,
    emptyDescription,
}: ChartPaydayImpactProps) {
    const { resolvedTheme } = useTheme()
    const { colorScheme, getShuffledPalette } = useColorScheme()
    const { formatCurrency } = useCurrency()
    const palette = useMemo(() => getShuffledPalette(), [getShuffledPalette])
    const [mounted, setMounted] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [selectedType, setSelectedType] = useState<string>("all")

    useEffect(() => {
        setMounted(true)
    }, [])

    const availableIncomeTypes = useMemo(() => {
        const customCategories = new Set<string>()
        if (data) {
            data.forEach((tx) => {
                if (tx.amount <= 0) return
                if (tx.amount < 50) return
                const cat = (tx.category || "").trim()
                if (cat && cat.toLowerCase() !== "income") {
                    customCategories.add(cat)
                }
            })
        }
        const standard: { value: string; label: string }[] = [
            { value: "all", label: "All" },
            { value: "salary", label: "Salary" },
            { value: "freelance", label: "Freelance" },
            { value: "investments", label: "Invest" },
            { value: "refunds", label: "Refunds" },
        ]
        const custom = Array.from(customCategories)
            .sort()
            .map(cat => ({ value: cat.toLowerCase(), label: cat }))
        return [...standard, ...custom]
    }, [data])

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return []

        // Detect paydays filtered by selected income type
        const paydays = new Set<string>()
        data.forEach((tx) => {
            if (tx.amount <= 0) return
            const incomeClass = classifyIncome(tx.description || "")
            const txCategory = (tx.category || "").toLowerCase()
            const matches = matchesIncomeType(selectedType, incomeClass, txCategory)

            // Minimum income threshold — avoid tiny refunds being treated as paydays when "all" selected
            const minAmount = selectedType === "refunds" ? 1 : 100
            if (matches && tx.amount >= minAmount) {
                paydays.add(tx.date.split("T")[0])
            }
        })

        if (paydays.size === 0) return []

        // Aggregate spending per relative day [-7, +7]
        const relativeDaySpending = new Map<number, { total: number; count: number }>()

        data.forEach((tx) => {
            if (tx.amount >= 0) return
            const txDate = new Date(tx.date.split("T")[0])
            const paydayDates = Array.from(paydays).map(pd => new Date(pd))

            // Find nearest payday
            let nearestPayday: Date | null = null
            let minDiff = Infinity
            for (const paydayDate of paydayDates) {
                const diff = Math.abs(txDate.getTime() - paydayDate.getTime())
                if (diff < minDiff) {
                    minDiff = diff
                    nearestPayday = paydayDate
                }
            }

            if (nearestPayday !== null) {
                const daysDiff = Math.round((txDate.getTime() - nearestPayday.getTime()) / (1000 * 60 * 60 * 24))
                if (daysDiff >= -7 && daysDiff <= 7) {
                    const existing = relativeDaySpending.get(daysDiff) || { total: 0, count: 0 }
                    relativeDaySpending.set(daysDiff, {
                        total: existing.total + Math.abs(tx.amount),
                        count: existing.count + 1,
                    })
                }
            }
        })

        const result = []
        for (let day = -7; day <= 7; day++) {
            const dayData = relativeDaySpending.get(day) || { total: 0, count: 0 }
            // Color: pre-payday muted, payday accent, post-payday gradient
            const color = day === 0 ? palette[0] : day < 0 ? palette[2] : palette[1]
            result.push({
                day: day === 0 ? "Payday" : day > 0 ? `+${day}` : `${day}`,
                dayNum: day,
                total: dayData.total,
                avg: dayData.count > 0 ? dayData.total / dayData.count : 0,
                color,
            })
        }
        return result
    }, [data, palette, selectedType])

    const isDark = resolvedTheme === "dark"
    const textColor = getChartTextColor(isDark)
    const gridColor = getChartAxisLineColor(isDark)

    const renderTypePicker = () => (
        <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="h-7 text-xs w-[140px]">
                <SelectValue placeholder="Income type" />
            </SelectTrigger>
            <SelectContent>
                {availableIncomeTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value} className="text-xs">
                        {t.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )

    const renderInfoTrigger = (forFullscreen = false) => (
        <div className={`flex items-center gap-2 ${forFullscreen ? "" : "hidden md:flex flex-col"}`}>
            <ChartInfoPopover
                title={CHART_TITLE}
                description={CHART_DESCRIPTION}
                details={[
                    "Day 0 = Payday",
                    "Negative = days before payday",
                    "Positive = days after payday",
                    "Select income type to filter paydays",
                ]}
            />
            <ChartAiInsightButton
                chartId="paydayImpact"
                chartTitle={CHART_TITLE}
                chartDescription={CHART_DESCRIPTION}
                chartData={{ days: chartData, incomeType: selectedType }}
                size="sm"
            />
        </div>
    )

    const renderChart = () => (
        <ResponsiveBar
            data={chartData}
            keys={["total"]}
            indexBy="day"
            margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
            padding={0.2}
            colors={({ data: d }) => d.color as string}
            borderRadius={4}
            enableLabel={true}
            label={(d) => {
                const v = Number(d.value)
                return v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v > 0 ? String(Math.round(v)) : ''
            }}
            labelSkipWidth={50}
            labelSkipHeight={16}
            labelTextColor={{ from: 'color', modifiers: [['brighter', 3]] }}
            barComponent={HoverableBar as any}
            axisBottom={{
                tickSize: 0,
                tickPadding: 8,
                tickRotation: -45,
            }}
            axisLeft={{
                tickSize: 0,
                tickPadding: 8,
                format: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : formatCurrency(v, { maximumFractionDigits: 0 }),
            }}
            theme={{
                text: { fill: textColor, fontSize: 11 },
                axis: { ticks: { text: { fill: textColor } } },
                grid: { line: { stroke: gridColor } },
            }}
            tooltip={({ indexValue, value, color }) => (
                <NivoChartTooltip
                    title={String(indexValue) === "Payday" ? "Payday" : `${String(indexValue)} days`}
                    titleColor={color}
                    value={formatCurrency(value as number)}
                />
            )}
            animate={true}
            motionConfig="gentle"
        />
    )

    if (!mounted || chartData.length === 0 || chartData.every(d => d.total === 0)) {
        return (
            <Card className="@container/card h-full relative" suppressHydrationWarning>
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartExpandButton onClick={() => setIsFullscreen(true)} />
                        <ChartFavoriteButton chartId="paydayImpact" chartTitle={CHART_TITLE} size="md" />
                        <CardTitle>{CHART_TITLE}</CardTitle>
                    </div>
                    <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                        {renderInfoTrigger()}
                    </CardAction>
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex flex-col flex-1 min-h-0">
                    <div className="mb-3">{renderTypePicker()}</div>
                    <div className="h-full w-full min-h-[250px]">
                        <ChartLoadingState
                            isLoading={isLoading || !mounted}
                            skeletonType="bar"
                            emptyTitle={emptyTitle || "No payday data detected"}
                            emptyDescription={emptyDescription || "Import your bank statements to see how your spending changes around payday."}
                        />
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <>
            <ChartFullscreenModal
                isOpen={isFullscreen}
                onClose={() => setIsFullscreen(false)}
                title={CHART_TITLE}
                description={CHART_DESCRIPTION}
                headerActions={renderInfoTrigger(true)}
            >
                <div className="h-full w-full min-h-[400px]" key={colorScheme}>
                    {renderChart()}
                </div>
            </ChartFullscreenModal>
            <Card className="@container/card h-full relative">
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartExpandButton onClick={() => setIsFullscreen(true)} />
                        <ChartFavoriteButton chartId="paydayImpact" chartTitle={CHART_TITLE} size="md" />
                        <CardTitle>{CHART_TITLE}</CardTitle>
                    </div>
                    <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                        {renderInfoTrigger()}
                    </CardAction>
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex flex-col flex-1 min-h-0">
                    <div className="mb-3">{renderTypePicker()}</div>
                    <div className="h-full w-full min-h-[230px]" key={`${colorScheme}-${selectedType}`}>
                        {renderChart()}
                    </div>
                </CardContent>
            </Card>
        </>
    )
})
ChartPaydayImpact.displayName = "ChartPaydayImpact"
