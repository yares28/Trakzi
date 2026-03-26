"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Activity, Refrigerator, PiggyBank, ChevronRight } from "lucide-react";

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
          {/* Sticky Navigation Bar */}
          <div className="sticky top-[var(--header-height)] z-30 -mx-4 px-4 py-3 bg-background/80 backdrop-blur-md border-b border-border/40 lg:-mx-6 lg:px-6">
            <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full bg-background/50 border-border/60 hover:border-primary/50 transition-all gap-2 shrink-0 shadow-sm"
                onClick={() =>
                  document
                    .getElementById("analytics-section")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              >
                <Activity className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold">Analytics</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full bg-background/50 border-border/60 hover:border-primary/50 transition-all gap-2 shrink-0 shadow-sm"
                onClick={() =>
                  document
                    .getElementById("fridge-section")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              >
                <Refrigerator className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold">Fridge</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full bg-background/50 border-border/60 hover:border-primary/50 transition-all gap-2 shrink-0 shadow-sm"
                onClick={() =>
                  document
                    .getElementById("savings-section")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              >
                <PiggyBank className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold">Savings</span>
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
                <h2 className="text-2xl font-bold tracking-tight">
                  Analytics charts
                </h2>
              </div>
            </section>

            {/* Fridge Section */}
            <section id="fridge-section" className="space-y-4 scroll-mt-24">
              <div className="px-4 lg:px-6">
                <h2 className="text-2xl font-bold tracking-tight">
                  Fridge charts
                </h2>
              </div>
            </section>

            {/* Savings Section */}
            <section id="savings-section" className="space-y-4 scroll-mt-24">
              <div className="px-4 lg:px-6">
                <h2 className="text-2xl font-bold tracking-tight">
                  Savings charts
                </h2>
              </div>
            </section>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
