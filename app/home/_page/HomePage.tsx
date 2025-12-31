"use client"

import { DataTable } from "@/components/data-table"
import { useDateFilter } from "@/components/date-filter-provider"

import { AiReparseDialog } from "./components/AiReparseDialog"
import { ChartsGrid } from "./components/ChartsGrid"
import { CsvUploadDialog } from "./components/CsvUploadDialog"
import { HomeCsvReviewDialog } from "./components/HomeCsvReviewDialog"
import { FavoritesGrid } from "./components/FavoritesGrid"
import { HomeLayout } from "./components/HomeLayout"
import { StatsCards } from "./components/StatsCards"
import { useCsvImport } from "./hooks/useCsvImport"
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

  const csvImport = useCsvImport({ refreshAnalyticsData: fetchTransactions })

  return (
    <HomeLayout
      isDragging={csvImport.isDragging}
      onDragEnter={csvImport.handleDragEnter}
      onDragLeave={csvImport.handleDragLeave}
      onDragOver={csvImport.handleDragOver}
      onDrop={csvImport.handleDrop}
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

      <HomeCsvReviewDialog
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
    </HomeLayout>
  )
}
