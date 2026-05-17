"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useTheme } from "next-themes"
import { useQueryClient } from "@tanstack/react-query"

import { useColorScheme } from "@/components/color-scheme-provider"
import { useDateFilter } from "@/components/date-filter-provider"
import { AlertTriangle, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAnalyticsBundleData } from "@/hooks/use-dashboard-data"
import { usePlanFeatures } from "@/hooks/use-plan-features"
import { useDemoMode } from "@/lib/demo/demo-context"
import { FeatureGateBlur } from "@/components/feature-gate-blur"
import { AnalyticsLayout } from "./components/AnalyticsLayout"
import { AnalyticsTrendsTab } from "./components/AnalyticsTrendsTab"
import { AdvancedChartsGrid } from "./components/AdvancedChartsGrid"
import { AiReparseDialog } from "./components/AiReparseDialog"
import { ChartsGrid } from "./components/ChartsGrid"
import { StatementUploadDialog } from "./components/StatementUploadDialog"
import { AnalyticsStatementReviewDialog } from "./components/AnalyticsStatementReviewDialog"
import { StatsCards } from "./components/StatsCards"
import { useAnalyticsChartData } from "./hooks/useAnalyticsChartData"
import { useAnalyticsData } from "./hooks/useAnalyticsData"
import { useAnalyticsStats } from "./hooks/useAnalyticsStats"
import { useChartLayout } from "./hooks/useChartLayout"
import { useStatementImport } from "./hooks/useStatementImport"
import { cn } from "@/lib/utils"
import { DEFAULT_ADVANCED_CHART_ORDER } from "./constants"
import { OnboardingTour } from "@/components/onboarding/onboarding-tour"
import { useOnboarding } from "@/components/onboarding/onboarding-context"

type AnalyticsViewMode = "analytics" | "advanced" | "trends"

export default function AnalyticsPage() {
  const searchParams = useSearchParams()
  const { resolvedTheme } = useTheme()
  const [viewMode, setViewMode] = useState<AnalyticsViewMode>("analytics")
  const [advancedChartOrder, setAdvancedChartOrder] = useState(DEFAULT_ADVANCED_CHART_ORDER)
  const { getPalette } = useColorScheme()
  const { filter: dateFilter, setFilter } = useDateFilter()
  const planFeatures = usePlanFeatures()
  const { isDemoMode } = useDemoMode()

  // Effective cost toggle — default ON, persisted to localStorage.
  const [showEffectiveCosts, setShowEffectiveCosts] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    const stored = localStorage.getItem('analytics:showEffectiveCosts')
    return stored === null ? true : stored !== 'false'
  })

  useEffect(() => {
    // Keep this page in sync with the Settings->Preferences toggle.
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ showEffectiveCosts?: boolean }>
      const next = ce.detail?.showEffectiveCosts
      if (typeof next === "boolean") {
        setShowEffectiveCosts(next)
        return
      }

      const stored = localStorage.getItem("analytics:showEffectiveCosts")
      setShowEffectiveCosts(stored === null ? true : stored !== "false")
    }

    window.addEventListener("analytics:showEffectiveCostsChanged", handler as EventListener)
    return () => window.removeEventListener("analytics:showEffectiveCostsChanged", handler as EventListener)
  }, [])

  // Bundle API data - pre-aggregated with Redis caching (single request)
  const { data: bundleData, isLoading: bundleLoading, isError: bundleError } = useAnalyticsBundleData(showEffectiveCosts)
  const palette = getPalette()

  const queryClient = useQueryClient()
  const {
    rawTransactions,
    isLoadingTransactions,
    ringLimits,
    setRingLimits,
    fetchAllAnalyticsData,
  } = useAnalyticsData(dateFilter)

  // Cyclic barrier: all data sources must be ready before revealing numbers
  const isDataReady = !bundleLoading && !isLoadingTransactions

  const chartLayout = useChartLayout({ isDemoMode })
  const { stats, statsTrends, transactionSummary } = useAnalyticsStats(rawTransactions)
  const chartData = useAnalyticsChartData({
    rawTransactions,
    bundleData: bundleData ?? null,
    dateFilter,
    palette,
    ringLimits,
    isDemoMode,
    savedChartSizes: chartLayout.savedChartSizes,
    resolvedTheme,
  })

  const refreshAnalyticsData = useCallback(async () => {
    // Force refetch transactions data (in-memory cache was already cleared)
    await fetchAllAnalyticsData()

    // Invalidate AND refetch all related React Query caches
    // Using refetchQueries ensures data is fetched immediately, not just marked stale
    await Promise.all([
      queryClient.refetchQueries({ queryKey: ["analytics-bundle"] }),
      queryClient.invalidateQueries({ queryKey: ["transactions"] }),
      queryClient.invalidateQueries({ queryKey: ["home-bundle"] }),
      queryClient.invalidateQueries({ queryKey: ["trends-bundle"] }),
      queryClient.invalidateQueries({ queryKey: ["savings-bundle"] }),
      queryClient.invalidateQueries({ queryKey: ["data-library-bundle"] }),
      queryClient.invalidateQueries({ queryKey: ["total-transaction-count"] }),
    ])
  }, [fetchAllAnalyticsData, queryClient])

  const { completeChecklistItem } = useOnboarding()

  const statementImport = useStatementImport({
    refreshAnalyticsData,
    onImportSuccess: () => completeChecklistItem("upload_statement"),
  })

  useEffect(() => {
    completeChecklistItem("explore_analytics")
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleViewModeChange = useCallback((mode: AnalyticsViewMode) => {
    setViewMode(mode)
  }, [])

  useEffect(() => {
    const v = searchParams.get("view")
    if (v === "trends" || v === "advanced" || v === "analytics") {
      setViewMode(v)
    }
  }, [searchParams])

  return (
    <AnalyticsLayout
      isDragging={statementImport.isDragging}
      onDragEnter={statementImport.handleDragEnter}
      onDragLeave={statementImport.handleDragLeave}
      onDragOver={statementImport.handleDragOver}
      onDrop={statementImport.handleDrop}
    >
      <div className="@container/main flex flex-1 flex-col gap-2 min-w-0">
        <div className="flex flex-col gap-4 pb-4 md:gap-6 md:pb-6 min-w-0 w-full">
          {/* Empty-state banner: visible when data is loaded but the filter returns nothing */}
          {isDataReady && transactionSummary.count === 0 && (
            <div className="mx-4 lg:mx-6 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-800/50 dark:bg-amber-950/30">
              <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span className="flex-1 text-amber-800 dark:text-amber-300">
                No transactions found for <strong>{dateFilter ?? "all time"}</strong>. Try a wider date range.
              </span>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 gap-1.5 border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/40"
                onClick={() => setFilter("last6months")}
              >
                <RotateCcw className="size-3.5" />
                Reset to last 6 months
              </Button>
            </div>
          )}

          {/* Top analytics summary cards (shared across modes) */}
          <StatsCards
            stats={stats}
            statsTrends={statsTrends}
            transactionSummary={transactionSummary}
            dateFilter={dateFilter}
            isLoading={!isDataReady}
          />

          {/* Analytics / Advanced / Trends switch - Horizontal scroll on mobile */}
          <section>
            <div className="overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden -mx-4 px-4 sm:mx-0 sm:px-0">
              <div className="relative flex items-center justify-center">
                <div className="inline-flex items-center gap-1 p-1 rounded-full bg-muted/50 border w-max min-w-0">
                  <button
                    type="button"
                    onClick={() => handleViewModeChange("analytics")}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap shrink-0",
                      viewMode === "analytics"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Analytics
                  </button>
                  <button
                    type="button"
                    onClick={() => handleViewModeChange("advanced")}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap shrink-0",
                      viewMode === "advanced"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Advanced
                  </button>
                  <button
                    type="button"
                    onClick={() => handleViewModeChange("trends")}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap shrink-0",
                      viewMode === "trends"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Trends
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Main content per mode */}
          {viewMode === "analytics" && (
            <ChartsGrid
              analyticsChartOrder={chartLayout.analyticsChartOrder}
              handleChartOrderChange={chartLayout.handleChartOrderChange}
              savedSizes={chartLayout.savedSizes}
              handleChartResize={chartLayout.handleChartResize}
              bundleData={bundleData}
              bundleLoading={bundleLoading}
              rawTransactions={rawTransactions}
              isLoadingTransactions={isLoadingTransactions}
              dateFilter={dateFilter}
              ringLimits={ringLimits}
              setRingLimits={setRingLimits}
              chartData={chartData}
              isError={bundleError}
              isDemoMode={isDemoMode}
            />
          )}

          {viewMode === "advanced" && (
            <FeatureGateBlur
              enabled={(planFeatures?.advancedChartsEnabled ?? false) || isDemoMode}
              featureName="Advanced Charts"
              description="Upgrade to Pro or Max to unlock advanced analytics charts"
              className="w-full mb-4"
            >
              <div className="w-full mb-4 px-4 lg:px-6">
                <AdvancedChartsGrid
                  chartOrder={advancedChartOrder}
                  onChartOrderChange={setAdvancedChartOrder}
                  savedSizes={chartLayout.savedSizes}
                  onChartResize={chartLayout.handleChartResize}
                  bundleData={bundleData}
                  bundleLoading={bundleLoading}
                  rawTransactions={rawTransactions}
                  isLoadingTransactions={isLoadingTransactions}
                  dateFilter={dateFilter}
                />
              </div>
            </FeatureGateBlur>
          )}

          {viewMode === "trends" && <AnalyticsTrendsTab />}
        </div>
      </div>

      <OnboardingTour pageId="analytics" />

      <AiReparseDialog
        open={statementImport.isAiReparseOpen}
        onOpenChange={statementImport.setIsAiReparseOpen}
        aiReparseContext={statementImport.aiReparseContext}
        onContextChange={statementImport.setAiReparseContext}
        onConfirm={statementImport.handleAiReparse}
        isAiReparsing={statementImport.isAiReparsing}
        hasFile={!!statementImport.droppedFile}
      />

      <StatementUploadDialog
        open={statementImport.isUploadDialogOpen}
        onOpenChange={statementImport.setIsUploadDialogOpen}
        pendingFiles={statementImport.pendingFiles}
        isParsing={statementImport.isParsing}
        parsingProgress={statementImport.parsingProgress}
        parseError={statementImport.parseError}
        projectName={statementImport.projectName}
        onProjectNameChange={statementImport.setProjectName}
        accountId={statementImport.accountId}
        onAccountChange={statementImport.setAccountId}
        onFilesChange={(files) => statementImport.handleFilesChange(files)}
        onCancel={statementImport.handleCancelUpload}
        onContinue={statementImport.handleContinueUpload}
      />

      <AnalyticsStatementReviewDialog
        open={statementImport.isReviewDialogOpen}
        onOpenChange={statementImport.setIsReviewDialogOpen}
        fileName={statementImport.droppedFile?.name || null}
        parsedRows={statementImport.parsedRows}
        parseQuality={statementImport.parseQuality}
        selectedParsedRowIds={statementImport.selectedParsedRowIds}
        isImporting={statementImport.isImporting}
        importProgress={statementImport.importProgress}
        onSelectAll={statementImport.handleSelectAllParsedRows}
        onToggleRow={statementImport.handleToggleParsedRow}
        onCategoryChange={statementImport.handleCategoryChange}
        onDeleteRow={statementImport.handleDeleteRow}
        onDeleteSelectedRows={statementImport.handleDeleteSelectedRows}
        onCommitImport={statementImport.handleConfirm}
        onCancel={statementImport.handleCancelReview}
      />
    </AnalyticsLayout>
  )
}
