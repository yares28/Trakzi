"use client"

import { useEffect } from "react"
import { useTheme } from "next-themes"

import { useColorScheme } from "@/components/color-scheme-provider"
import { useDateFilter } from "@/components/date-filter-provider"
import { useAnalyticsBundleData } from "@/hooks/use-dashboard-data"

import { AnalyticsLayout } from "./components/AnalyticsLayout"
import { AiReparseDialog } from "./components/AiReparseDialog"
import { ChartsGrid } from "./components/ChartsGrid"
import { CsvUploadDialog } from "./components/CsvUploadDialog"
import { AnalyticsCsvReviewDialog } from "./components/AnalyticsCsvReviewDialog"
import { StatsCards } from "./components/StatsCards"
import { useAnalyticsChartData } from "./hooks/useAnalyticsChartData"
import { useAnalyticsData } from "./hooks/useAnalyticsData"
import { useAnalyticsStats } from "./hooks/useAnalyticsStats"
import { useChartLayout } from "./hooks/useChartLayout"
import { useCsvImport } from "./hooks/useCsvImport"

export default function AnalyticsPage() {
  const { resolvedTheme } = useTheme()
  const { getPalette } = useColorScheme()
  const { filter: dateFilter, setFilter: setDateFilter } = useDateFilter()

  // Bundle API data - pre-aggregated with Redis caching (single request)
  const { data: bundleData, isLoading: bundleLoading } = useAnalyticsBundleData()
  const palette = getPalette()

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

  const csvImport = useCsvImport({ refreshAnalyticsData: fetchAllAnalyticsData })

  // Listen for date filter changes from SiteHeader
  useEffect(() => {
    const handleFilterChange = (event: CustomEvent) => {
      setDateFilter(event.detail)
    }

    window.addEventListener("dateFilterChanged", handleFilterChange as EventListener)

    // Load initial filter from localStorage
    const savedFilter = localStorage.getItem("dateFilter")
    if (savedFilter) {
      setDateFilter(savedFilter)
    }

    return () => {
      window.removeEventListener("dateFilterChanged", handleFilterChange as EventListener)
    }
  }, [setDateFilter])

  return (
    <AnalyticsLayout
      isDragging={csvImport.isDragging}
      onDragEnter={csvImport.handleDragEnter}
      onDragLeave={csvImport.handleDragLeave}
      onDragOver={csvImport.handleDragOver}
      onDrop={csvImport.handleDrop}
    >
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <StatsCards
            stats={stats}
            statsTrends={statsTrends}
            transactionSummary={transactionSummary}
          />

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
        </div>
      </div>

      <AiReparseDialog
        open={csvImport.isAiReparseOpen}
        onOpenChange={csvImport.setIsAiReparseOpen}
        aiReparseContext={csvImport.aiReparseContext}
        onContextChange={csvImport.setAiReparseContext}
        onConfirm={csvImport.handleAiReparse}
        isAiReparsing={csvImport.isAiReparsing}
        hasFile={!!csvImport.droppedFile}
      />

      <CsvUploadDialog
        open={csvImport.isUploadDialogOpen}
        onOpenChange={csvImport.setIsUploadDialogOpen}
        droppedFile={csvImport.droppedFile}
        isParsing={csvImport.isParsing}
        parsingProgress={csvImport.parsingProgress}
        parseError={csvImport.parseError}
        projectName={csvImport.projectName}
        onProjectNameChange={csvImport.setProjectName}
        onFilesChange={(files) => csvImport.handleFilesChange(files)}
        onCancel={csvImport.handleCancelUpload}
        onContinue={csvImport.handleContinueUpload}
      />

      <AnalyticsCsvReviewDialog
        open={csvImport.isReviewDialogOpen}
        onOpenChange={csvImport.setIsReviewDialogOpen}
        fileName={csvImport.droppedFile?.name || null}
        parsedRows={csvImport.parsedRows}
        parseQuality={csvImport.parseQuality}
        selectedParsedRowIds={csvImport.selectedParsedRowIds}
        isImporting={csvImport.isImporting}
        importProgress={csvImport.importProgress}
        onSelectAll={csvImport.handleSelectAllParsedRows}
        onToggleRow={csvImport.handleToggleParsedRow}
        onCategoryChange={csvImport.handleCategoryChange}
        onDeleteRow={csvImport.handleDeleteRow}
        onDeleteSelectedRows={csvImport.handleDeleteSelectedRows}
        onCommitImport={csvImport.handleConfirm}
        onCancel={csvImport.handleCancelReview}
      />
    </AnalyticsLayout>
  )
}
