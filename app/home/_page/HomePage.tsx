"use client"

import { DataTable } from "@/components/data-table"
import { useDateFilter } from "@/components/date-filter-provider"

import { AiReparseDialog } from "./components/AiReparseDialog"
import { ChartsGrid } from "./components/ChartsGrid"
import { CsvUploadDialog } from "./components/CsvUploadDialog"
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

  const {
    isDragging,
    droppedFile,
    isDialogOpen,
    setIsDialogOpen,
    isParsing,
    isImporting,
    importProgress,
    parsingProgress,
    parsedCsv,
    parsedRows,
    parseError,
    isAiReparseOpen,
    setIsAiReparseOpen,
    aiReparseContext,
    setAiReparseContext,
    isAiReparsing,
    selectedParsedRowIds,
    transactionCount,
    handleCategoryChange,
    handleToggleParsedRow,
    handleSelectAllParsedRows,
    handleDeleteRow,
    handleDeleteSelectedRows,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleAiReparse,
    handleConfirm,
    handleCancel,
    formatFileSize,
  } = useCsvImport({ fetchTransactions })

  return (
    <HomeLayout
      isDragging={isDragging}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
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
        open={isAiReparseOpen}
        onOpenChange={setIsAiReparseOpen}
        aiReparseContext={aiReparseContext}
        onContextChange={setAiReparseContext}
        onConfirm={handleAiReparse}
        isAiReparsing={isAiReparsing}
        hasFile={!!droppedFile}
      />
      <CsvUploadDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        droppedFile={droppedFile}
        transactionCount={transactionCount}
        parsedCsv={parsedCsv}
        parsedRows={parsedRows}
        selectedParsedRowIds={selectedParsedRowIds}
        isParsing={isParsing}
        parsingProgress={parsingProgress}
        parseError={parseError}
        isImporting={isImporting}
        importProgress={importProgress}
        isAiReparsing={isAiReparsing}
        onOpenAiReparse={() => setIsAiReparseOpen(true)}
        onDeleteSelectedRows={handleDeleteSelectedRows}
        onSelectAll={handleSelectAllParsedRows}
        onToggleRow={handleToggleParsedRow}
        onCategoryChange={handleCategoryChange}
        onDeleteRow={handleDeleteRow}
        onCancel={handleCancel}
        onConfirm={handleConfirm}
        formatFileSize={formatFileSize}
      />
    </HomeLayout>
  )
}
