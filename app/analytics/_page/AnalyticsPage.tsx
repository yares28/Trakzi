"use client"

import { useCallback, useState } from "react"
import { useTheme } from "next-themes"
import { useQueryClient } from "@tanstack/react-query"

import { useColorScheme } from "@/components/color-scheme-provider"
import { useDateFilter } from "@/components/date-filter-provider"
import { useAnalyticsBundleData } from "@/hooks/use-dashboard-data"

import { AnalyticsLayout } from "./components/AnalyticsLayout"
import { AnalyticsTrendsTab } from "./components/AnalyticsTrendsTab"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type AnalyticsViewMode = "analytics" | "advanced" | "trends"

export default function AnalyticsPage() {
  const { resolvedTheme } = useTheme()
  const [viewMode, setViewMode] = useState<AnalyticsViewMode>("analytics")
  const { getPalette } = useColorScheme()
  const { filter: dateFilter, setFilter: setDateFilter } = useDateFilter()

  // Bundle API data - pre-aggregated with Redis caching (single request)
  const { data: bundleData, isLoading: bundleLoading } = useAnalyticsBundleData()
  const palette = getPalette()

  const queryClient = useQueryClient()
  const {
    rawTransactions,
    isLoadingTransactions,
    ringLimits,
    setRingLimits,
    fetchAllAnalyticsData,
  } = useAnalyticsData(dateFilter)

  const chartLayout = useChartLayout()
  const { stats, statsTrends, transactionSummary } = useAnalyticsStats(rawTransactions)
  const chartData = useAnalyticsChartData({
    rawTransactions,
    bundleData: bundleData ?? null,
    dateFilter,
    palette,
    ringLimits,
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
    ])
  }, [fetchAllAnalyticsData, queryClient])

  const statementImport = useStatementImport({ refreshAnalyticsData })

  const handleViewModeChange = useCallback((mode: AnalyticsViewMode) => {
    setViewMode(mode)
  }, [])

  return (
    <AnalyticsLayout
      isDragging={statementImport.isDragging}
      onDragEnter={statementImport.handleDragEnter}
      onDragLeave={statementImport.handleDragLeave}
      onDragOver={statementImport.handleDragOver}
      onDrop={statementImport.handleDrop}
    >
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          {/* Top analytics summary cards (shared across modes) */}
          <StatsCards
            stats={stats}
            statsTrends={statsTrends}
            transactionSummary={transactionSummary}
          />

          {/* Analytics / Advanced / Trends switch */}
          <section>
            <div className="relative flex items-center justify-center">
              <div className="inline-flex items-center gap-1 p-1 rounded-full bg-muted/50 border">
                <button
                  type="button"
                  onClick={() => handleViewModeChange("analytics")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
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
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
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
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                    viewMode === "trends"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Trends
                </button>
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
            />
          )}

          {viewMode === "advanced" && (
            <section>
              <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-1">
                <Card className="@container/card h-full flex flex-col">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-medium">
                        Advanced Analytics
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1">
                    <div className="h-[250px] w-full flex items-center justify-center text-sm text-muted-foreground">
                      This area is ready for advanced analytics cards and tools.
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>
          )}

          {viewMode === "trends" && <AnalyticsTrendsTab />}
        </div>
      </div>

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
        droppedFile={statementImport.droppedFile}
        isParsing={statementImport.isParsing}
        parsingProgress={statementImport.parsingProgress}
        parseError={statementImport.parseError}
        projectName={statementImport.projectName}
        onProjectNameChange={statementImport.setProjectName}
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
