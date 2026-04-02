"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { TestChartsIdeaPlayground } from "@/components/test-charts/idea-playground";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function TestChartsPage() {
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
          <TestChartsIdeaPlayground />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
