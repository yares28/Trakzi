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

export default function Page() {

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
                                totalSpent={0}
                                shoppingTrips={0}
                                itemsPurchased={0}
                                averageReceipt={0}
                            />
                            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-1 px-4 lg:px-6">
                                <ChartAreaInteractiveFridge data={[]} />
                            </div>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 px-4 lg:px-6">
                                <ChartCategoryFlowFridge data={[]} />
                                <ChartExpensesPieFridge data={[]} />
                            </div>
                            <DataTableFridge data={[]} />
                        </div>
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}

