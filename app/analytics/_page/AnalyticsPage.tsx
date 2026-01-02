"use client"

import { useEffect } from "react"
import { useTheme } from "next-themes"

import { useColorScheme } from "@/components/color-scheme-provider"
import { useDateFilter } from "@/components/date-filter-provider"
import { useAnalyticsBundleData } from "@/hooks/use-dashboard-data"

import { AnalyticsLayout } from "./components/AnalyticsLayout"
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

  const statementImport = useStatementImport({ refreshAnalyticsData: fetchAllAnalyticsData })

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
