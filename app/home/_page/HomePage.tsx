"use client"

import { DataTable } from "@/components/data-table"
import { useDateFilter } from "@/components/date-filter-provider"

import { AiReparseDialog } from "./components/AiReparseDialog"
import { ChartsGrid } from "./components/ChartsGrid"
import { StatementUploadDialog } from "./components/StatementUploadDialog"
import { HomeStatementReviewDialog } from "./components/HomeStatementReviewDialog"
import { FavoritesGrid } from "./components/FavoritesGrid"
import { HomeLayout } from "./components/HomeLayout"
import { StatsCards } from "./components/StatsCards"
import { useStatementImport } from "./hooks/useStatementImport"
import { useFavoritesLayout } from "./hooks/useFavoritesLayout"
import { useHomeChartData } from "./hooks/useHomeChartData"
import { useHomeData } from "./hooks/useHomeData"
import { useHomeStats } from "./hooks/useHomeStats"

export default function Page() {
  const { filter: dateFilter } = useDateFilter()

  const {
    transactions,
    fetchTransactions,
    isTransactionDialogOpen,
    setIsTransactionDialogOpen,
  } = useHomeData({ dateFilter })

  const { stats, statsTrends, transactionSummary } = useHomeStats(transactions)
  const chartData = useHomeChartData({ transactions, dateFilter })

  const {
    favorites,
    favoritesOrder,
    savedFavoriteSizes,
    handleFavoritesOrderChange,
    handleFavoritesResize,
  } = useFavoritesLayout()

  const statementImport = useStatementImport({ refreshAnalyticsData: fetchTransactions })

  return (
    <HomeLayout
      isDragging={statementImport.isDragging}
      onDragEnter={statementImport.handleDragEnter}
      onDragLeave={statementImport.handleDragLeave}
      onDragOver={statementImport.handleDragOver}
      onDrop={statementImport.handleDrop}
    >
      <div className="@container/main flex flex-1 flex-col gap-2">
        <main className="flex-1 space-y-4 p-4 pt-0 lg:p-6 lg:pt-2">
          <StatsCards
            stats={stats}
            trends={statsTrends}
            transactionSummary={transactionSummary}
          />

          <FavoritesGrid
            favorites={favorites}
            favoritesOrder={favoritesOrder}
            savedFavoriteSizes={savedFavoriteSizes}
            onOrderChange={handleFavoritesOrderChange}
            onResize={handleFavoritesResize}
            chartData={chartData}
            dateFilter={dateFilter}
          />

          {false && <ChartsGrid chartData={chartData} dateFilter={dateFilter} />}

          <DataTable
            data={[]}
            transactions={transactions}
            onTransactionAdded={fetchTransactions}
            transactionDialogOpen={isTransactionDialogOpen}
            onTransactionDialogOpenChange={setIsTransactionDialogOpen}
          />
        </main>
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

      <HomeStatementReviewDialog
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
    </HomeLayout>
  )
}
