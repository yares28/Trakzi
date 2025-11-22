import { AppSidebar } from "@/components/app-sidebar"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"
import { SiteHeader } from "@/components/site-header"
import { ChartAreaInteractiveFridge } from "@/components/fridge/chart-area-interactive-fridge"
import { ChartCategoryFlowFridge } from "@/components/fridge/chart-category-flow-fridge"
import { ChartExpensesPieFridge } from "@/components/fridge/chart-expenses-pie-fridge"
import { DataTableFridge } from "@/components/fridge/data-table-fridge"
import { SectionCardsFridge } from "@/components/fridge/section-cards-fridge"
import fridgeData from "./fridge-data.json"

export default function Page() {
    // Transform data for ChartAreaInteractiveFridge (Daily Expenses)
    const dailyExpenses = fridgeData.receipts.reduce((acc, receipt) => {
        const date = receipt.date.split("T")[0]
        acc[date] = (acc[date] || 0) + receipt.totalAmount
        return acc
    }, {} as Record<string, number>)

    // Generate a range of dates to ensure continuity (optional, but good for charts)
    // For now, we'll just use the dates present in the data + some padding if needed
    // Or better, map the existing dates.
    const areaChartData = Object.entries(dailyExpenses).map(([date, amount]) => ({
        date,
        desktop: 0, // No daily income data, setting to 0 or could mock it
        mobile: amount,
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Transform data for ChartCategoryFlowFridge (Category Rankings over time)
    // We need to aggregate spending by category by month
    const categoryMonthlySpending: Record<string, Record<string, number>> = {}
    const months = new Set<string>()

    fridgeData.receipts.forEach(receipt => {
        const date = new Date(receipt.date)
        const month = date.toLocaleString('default', { month: 'short' })
        months.add(month)

        receipt.items.forEach(item => {
            if (!categoryMonthlySpending[item.category]) {
                categoryMonthlySpending[item.category] = {}
            }
            categoryMonthlySpending[item.category][month] = (categoryMonthlySpending[item.category][month] || 0) + (item.price * item.quantity)
        })
    })

    // Convert to rank data
    // This is a bit complex because we need ranks.
    // For simplicity, let's just pass the raw values if the chart supported it, but it expects ranks or we calculate them.
    // Let's calculate ranks for each month.
    const sortedMonths = Array.from(months).sort((a, b) => {
        const monthsOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        return monthsOrder.indexOf(a) - monthsOrder.indexOf(b)
    })

    const categoryFlowData = Object.entries(categoryMonthlySpending).map(([categoryId, monthlyData]) => {
        return {
            id: categoryId,
            data: sortedMonths.map(month => ({
                x: month,
                y: monthlyData[month] || 0
            }))
        }
    })

    // Now convert values to ranks for each month
    // This part is tricky without a proper ranking algorithm across all categories for each month.
    // Simplified: We will just use the spending values directly for now, assuming the chart can handle it or we might need to adjust the chart to show values instead of ranks if it's a bump chart.
    // Actually, Bump charts expect ranks (y=1 is top).
    // Let's rank them.
    const rankedCategoryFlowData = categoryFlowData.map(cat => ({
        ...cat,
        data: cat.data.map(d => ({ ...d, y: 0 })) // Initialize ranks
    }))

    sortedMonths.forEach((month, monthIndex) => {
        // Get all categories' spending for this month
        const monthSpending = categoryFlowData.map(cat => ({
            id: cat.id,
            value: cat.data.find(d => d.x === month)?.y || 0
        })).sort((a, b) => b.value - a.value) // Higher spending = better rank (lower y)

        // Assign ranks
        monthSpending.forEach((item, rank) => {
            const catIndex = rankedCategoryFlowData.findIndex(c => c.id === item.id)
            if (catIndex !== -1) {
                rankedCategoryFlowData[catIndex].data[monthIndex].y = rank + 1
            }
        })
    })


    // Transform data for ChartExpensesPieFridge (Total Expenses by Category)
    const categoryTotalSpending: Record<string, number> = {}
    fridgeData.receipts.forEach(receipt => {
        receipt.items.forEach(item => {
            categoryTotalSpending[item.category] = (categoryTotalSpending[item.category] || 0) + (item.price * item.quantity)
        })
    })

    const expensesPieData = Object.entries(categoryTotalSpending).map(([label, value]) => ({
        id: label,
        label,
        value: parseFloat(value.toFixed(2)),
    }))

    // Calculate stats for SectionCardsFridge
    const totalSpent = fridgeData.receipts.reduce((acc, receipt) => acc + receipt.totalAmount, 0)
    const shoppingTrips = fridgeData.receipts.length
    const itemsPurchased = fridgeData.receipts.reduce((acc, receipt) => {
        return acc + receipt.items.reduce((itemAcc, item) => itemAcc + item.quantity, 0)
    }, 0)
    const averageReceipt = shoppingTrips > 0 ? totalSpent / shoppingTrips : 0

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
                <div className="flex flex-1 flex-col">
                    <div className="@container/main flex flex-1 flex-col gap-2">
                        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                            <SectionCardsFridge
                                totalSpent={totalSpent}
                                shoppingTrips={shoppingTrips}
                                itemsPurchased={itemsPurchased}
                                averageReceipt={averageReceipt}
                            />
                            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-1 px-4 lg:px-6">
                                <ChartAreaInteractiveFridge data={areaChartData} />
                            </div>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 px-4 lg:px-6">
                                <ChartCategoryFlowFridge data={rankedCategoryFlowData} />
                                <ChartExpensesPieFridge data={expensesPieData} />
                            </div>
                            <DataTableFridge data={fridgeData.receipts} />
                        </div>
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}

