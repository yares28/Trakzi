import type { CSSProperties, ReactNode } from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

type WorldMapLayoutProps = {
  children: ReactNode
}

export function WorldMapLayout({ children }: WorldMapLayoutProps) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72 - 15px)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <main className="flex-1 space-y-4 p-4 pt-0 lg:p-6 lg:pt-2">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
