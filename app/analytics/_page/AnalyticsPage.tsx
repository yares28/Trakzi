"use client"

import { useCallback, useState } from "react"
import { useTheme } from "next-themes"
import { useQueryClient } from "@tanstack/react-query"

import { useColorScheme } from "@/components/color-scheme-provider"
import { useDateFilter } from "@/components/date-filter-provider"
import { useAnalyticsBundleData } from "@/hooks/use-dashboard-data"
import { usePlanFeatures } from "@/hooks/use-plan-features"
import { FeatureGateBlur } from "@/components/feature-gate-blur"
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
import { getChartCardSize, type ChartId } from "@/lib/chart-card-sizes.config"
import { SortableGridItem, SortableGridProvider } from "@/components/sortable-grid"
import { ChartSpendingPyramid } from "@/components/chart-spending-pyramid"
import { DEFAULT_ADVANCED_CHART_ORDER, DEFAULT_ADVANCED_CHART_SIZES } from "./constants"

type AnalyticsViewMode = "analytics" | "advanced" | "trends"

export default function AnalyticsPage() {
  const { resolvedTheme } = useTheme()
  const [viewMode, setViewMode] = useState<AnalyticsViewMode>("analytics")
  const [advancedChartOrder, setAdvancedChartOrder] = useState(DEFAULT_ADVANCED_CHART_ORDER)
  const { getPalette } = useColorScheme()
  const { filter: dateFilter } = useDateFilter()
  const planFeatures = usePlanFeatures()

  // Bundle API data - pre-aggregated with Redis caching (single request)
  const { data: bundleData, isLoading: bundleLoading, isError: bundleError } = useAnalyticsBundleData()
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
            dateFilter={dateFilter}
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
              isError={bundleError}
            />
          )}

          {viewMode === "advanced" && (
            <FeatureGateBlur
              enabled={planFeatures?.advancedChartsEnabled ?? false}
              featureName="Advanced Charts"
              description="Upgrade to Pro or Max to unlock advanced analytics charts"
              className="w-full mb-4"
            >
            <div className="w-full mb-4 px-4 lg:px-6">
              <SortableGridProvider
                chartOrder={advancedChartOrder}
                onOrderChange={setAdvancedChartOrder}
              >
                {advancedChartOrder.map((chartId) => {
                  const defaultSize = DEFAULT_ADVANCED_CHART_SIZES[chartId] || { w: 6, h: 8 }
                  const sizeConfig = getChartCardSize(chartId as ChartId)
                  const w = (chartLayout.savedSizes[chartId]?.w ?? defaultSize.w) as 6 | 12
                  const h = chartLayout.savedSizes[chartId]?.h ?? defaultSize.h

                  if (chartId === "spendingPyramid") {
                    return (
                      <SortableGridItem
                        key={chartId}
                        id={chartId}
                        w={w}
                        h={h}
                        mobileH={sizeConfig.mobileH}
                        resizable
                        minW={sizeConfig.minW}
                        maxW={sizeConfig.maxW}
                        minH={sizeConfig.minH}
                        maxH={sizeConfig.maxH}
                        onResize={chartLayout.handleChartResize}
                      >
                        <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                          <ChartSpendingPyramid
                            data={bundleData?.spendingPyramid}
                            isLoading={bundleLoading}
                            emptyTitle="No data yet"
                            emptyDescription="Import your bank statements to compare your spending with the average user"
                          />
                        </div>
                      </SortableGridItem>
                    )
                  }

                  return null
                })}
              </SortableGridProvider>
            </div>
            </FeatureGateBlur>
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
