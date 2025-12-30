import type { CSSProperties, DragEvent, ReactNode } from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { IconUpload } from "@tabler/icons-react"

type HomeLayoutProps = {
  children: ReactNode
  isDragging: boolean
  onDragEnter: (event: DragEvent) => void
  onDragLeave: (event: DragEvent) => void
  onDragOver: (event: DragEvent) => void
  onDrop: (event: DragEvent) => void
}

export function HomeLayout({
  children,
  isDragging,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
}: HomeLayoutProps) {
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
        <div
          className="flex-1 space-y-4 p-4 pt-0 lg:p-6 lg:pt-2"
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          {/* Dark overlay when dragging */}
          {isDragging && (
            <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity duration-300 pointer-events-none" />
          )}

          {/* Modern drop indicator with Card */}
          {isDragging && (
            <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
              <Card className="w-full max-w-md mx-4 border-2 border-dashed border-primary/50 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-300">
                <CardHeader className="text-center pb-4">
                  <div className="flex justify-center mb-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                      <div className="relative bg-primary/10 p-6 rounded-full border-2 border-primary/30">
                        <IconUpload className="w-12 h-12 text-primary animate-bounce" />
                      </div>
                    </div>
                  </div>
                  <CardTitle className="text-2xl text-primary">Drop your file here</CardTitle>
                  <CardDescription className="text-base mt-2">
                    Release to upload your file
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    <span>Ready to receive file</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
