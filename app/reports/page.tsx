import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"
import { ReportsDataTable } from "@/components/reports-data-table"

import dashboardData from "../dashboard/data.json"
import fridgeData from "../fridge/fridge-data.json"

export default function ReportsPage() {
    // Combine data from both sources
    const incomeExpensesData = dashboardData.map((item) => ({
        id: `ie-${item.id}`,
        name: item.header,
        type: "Income/Expenses",
        date: new Date().toISOString(), // Using current date as placeholder
        reviewer: item.reviewer,
    }))

    const fridgeReceiptsData = fridgeData.receipts.map((receipt) => ({
        id: `fr-${receipt.id}`,
        name: receipt.storeName,
        type: "Fridge/Receipts",
        date: receipt.date,
        reviewer: "N/A",
    }))

    const combinedData = [...incomeExpensesData, ...fridgeReceiptsData]

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
                            <div className="px-4 lg:px-6">
                                <div className="mb-6">
                                    <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
                                    <p className="text-muted-foreground mt-2">
                                        View all imported documents from Income/Expenses and Fridge/Receipts
                                    </p>
                                </div>
                                <ReportsDataTable data={combinedData} />
                            </div>
                        </div>
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
