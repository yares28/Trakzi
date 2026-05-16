"use client"

import type { CSSProperties } from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { IconArrowLeft } from "@tabler/icons-react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { useFeatures } from "./hooks/useFeatures"
import { FeatureCard } from "./components/FeatureCard"
import { NewFeatureDialog } from "./components/NewFeatureDialog"
import { SortTabs } from "./components/SortTabs"
import { EmptyState } from "./components/EmptyState"
import { LoadingSkeleton } from "./components/LoadingSkeleton"
import type { SortKey } from "./types"

export default function FeedbackPage() {
  const router = useRouter()
  const { user } = useUser()
  const [sort, setSort] = useState<SortKey>("top")
  const [dialogOpen, setDialogOpen] = useState(false)

  const {
    data,
    isLoading,
    isError,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useFeatures(sort)

  const features = data?.pages.flatMap((page) => page.items) ?? []

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
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="@container/main flex flex-1 flex-col pt-[72px] md:pt-0 overflow-y-auto overflow-x-hidden min-w-0">
            <div className="px-4 py-10 md:px-8">
              <div className="mx-auto max-w-2xl space-y-8">
                <div>
                  <button
                    onClick={() => router.back()}
                    className="group inline-flex h-7 items-center gap-1.5 rounded-full border border-border px-3 text-[13px] tracking-tight text-muted-foreground transition-all duration-200 hover:border-primary/30 hover:bg-muted/60 hover:text-foreground"
                  >
                    <IconArrowLeft className="size-3.5 transition-transform duration-200 ease-out group-hover:-translate-x-0.5" />
                    Back
                  </button>
                  <div className="mt-3 space-y-1">
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                      Feedback
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      Suggest a feature or vote on what matters.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <SortTabs value={sort} onChange={setSort} />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDialogOpen(true)}
                  >
                    + Suggest idea
                  </Button>
                </div>

                {isLoading ? (
                  <LoadingSkeleton />
                ) : isError ? (
                  <p className="py-10 text-center text-sm text-destructive">
                    Failed to load. Please refresh.
                  </p>
                ) : features.length === 0 ? (
                  <EmptyState onSuggest={() => setDialogOpen(true)} />
                ) : (
                  <div className="space-y-3">
                    {features.map((feature) => (
                      <FeatureCard
                        key={feature.id}
                        feature={feature}
                        currentUserId={user?.id ?? null}
                      />
                    ))}

                    {hasNextPage && (
                      <div className="flex justify-center pt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => fetchNextPage()}
                          disabled={isFetchingNextPage}
                          className="text-muted-foreground"
                        >
                          {isFetchingNextPage ? "Loading…" : "Load more"}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>

      <NewFeatureDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </SidebarProvider>
  )
}
