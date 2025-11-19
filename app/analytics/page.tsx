"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import {
  ChartCirclePacking,
  ChartPolarBar,
  ChartRadar,
  ChartRadialBar,
  ChartSankey,
  ChartStream,
  ChartSwarmPlot,
  ChartTreeMap,
} from "@/components/analytics-advanced-charts"
import { ChartCategoryFlow } from "@/components/chart-category-flow"
import { ChartExpensesPie } from "@/components/chart-expenses-pie"
import { ChartSpendingFunnel } from "@/components/chart-spending-funnel"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default function AnalyticsPage() {
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
              <SectionCards />
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive />
              </div>
              <div className="px-4 lg:px-6">
                <ChartCategoryFlow />
              </div>
              <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @3xl/main:grid-cols-2">
                <ChartSpendingFunnel />
                <ChartExpensesPie />
              </div>
              <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @3xl/main:grid-cols-2">
                <ChartCirclePacking />
                <ChartPolarBar />
              </div>
              <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @3xl/main:grid-cols-2">
                <ChartRadar />
                <ChartRadialBar />
              </div>
              <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @3xl/main:grid-cols-2">
                <ChartTreeMap />
                <ChartStream />
              </div>
              <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @3xl/main:grid-cols-2">
                <ChartSwarmPlot />
              </div>
              <div className="px-4 lg:px-6">
                <ChartSankey />
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}


