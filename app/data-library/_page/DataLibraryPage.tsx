"use client"

import { useCallback, useState, useTransition } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { IconAlertTriangle, IconDatabase } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import type { TransactionLimitExceededData } from "@/components/limits/transaction-limit-dialog"
import type { CategoryLimitExceededData } from "@/components/limits/category-limit-dialog"
import { useCurrency } from "@/components/currency-provider"

import { AiReparseDialog } from "./components/AiReparseDialog"
import { CategoriesTable } from "./components/CategoriesTable"
import { CategoryDialogs } from "./components/CategoryDialogs"
import { StatementUploadDialog } from "./components/StatementUploadDialog"
import { DataLibraryStatementReviewDialog } from "./components/DataLibraryStatementReviewDialog"
import { DataLibraryLayout } from "./components/DataLibraryLayout"
import { LimitDialogs } from "./components/LimitDialogs"
import { ReceiptCategoriesTable } from "./components/ReceiptCategoriesTable"
import { ReceiptCategoryDialogs } from "./components/ReceiptCategoryDialogs"
import { ReceiptTypeDialogs } from "./components/ReceiptTypeDialogs"
import { ReceiptTypesTable } from "./components/ReceiptTypesTable"
import { ReportsTable } from "./components/ReportsTable"
import { StatsCards } from "./components/StatsCards"
import { TransactionsTable } from "./components/TransactionsTable"
import { ViewStatementDialog } from "./components/ViewStatementDialog"
import {
  isDefaultCategory,
  isDefaultReceiptCategory,
  isDefaultReceiptType,
} from "./utils/defaults"

import { useCategoryManagement } from "./hooks/useCategoryManagement"
import { useCategoryPreferences } from "./hooks/useCategoryPreferences"
import { useStatementImport } from "./hooks/useStatementImport"
import { useLibraryData } from "./hooks/useLibraryData"
import { useReceiptCategoryManagement } from "./hooks/useReceiptCategoryManagement"
import { useReceiptTypeManagement } from "./hooks/useReceiptTypeManagement"
import { useSearchPagination } from "./hooks/useSearchPagination"
import { useStatementViewer } from "./hooks/useStatementViewer"

export default function DataLibraryPage() {
  const { formatCurrency } = useCurrency()
  const [, startTransition] = useTransition()

  const queryClient = useQueryClient()
  const {
    transactions,
    statements,
    categories,
    receiptCategoryTypes,
    receiptCategories,
    receiptTransactionsCount,
    totalUserCategoriesCount,
    error,
    fetchLibraryData,
    setCategories,
    setReceiptCategories,
    setStatements,
  } = useLibraryData()

  const {
    categorySearch,
    setCategorySearch,
    categoryPage,
    setCategoryPage,
    categoryPageSize,
    setCategoryPageSize,
    selectedCategoryIds,
    setSelectedCategoryIds,
    receiptTypeSearch,
    setReceiptTypeSearch,
    receiptTypePage,
    setReceiptTypePage,
    receiptTypePageSize,
    setReceiptTypePageSize,
    selectedReceiptTypeIds,
    setSelectedReceiptTypeIds,
    receiptCategorySearch,
    setReceiptCategorySearch,
    receiptCategoryPage,
    setReceiptCategoryPage,
    receiptCategoryPageSize,
    setReceiptCategoryPageSize,
    selectedReceiptCategoryIds,
    setSelectedReceiptCategoryIds,
    reportsSearch,
    setReportsSearch,
    reportsPage,
    setReportsPage,
    reportsPageSize,
    setReportsPageSize,
    selectedReportIds,
    setSelectedReportIds,
    selectedReportType,
    setSelectedReportType,
    uniqueReportTypes,
    filteredCategories,
    filteredReceiptTypes,
    filteredReceiptCategories,
    filteredStatements,
  } = useSearchPagination({
    categories,
    receiptCategoryTypes,
    receiptCategories,
    statements,
  })

  const [transactionLimitData, setTransactionLimitData] =
    useState<TransactionLimitExceededData | null>(null)
  const [isTransactionLimitDialogOpen, setIsTransactionLimitDialogOpen] =
    useState(false)
  const [categoryLimitData, setCategoryLimitData] =
    useState<CategoryLimitExceededData | null>(null)
  const [isCategoryLimitDialogOpen, setIsCategoryLimitDialogOpen] =
    useState(false)

  const handleTransactionLimit = (data: TransactionLimitExceededData) => {
    setTransactionLimitData(data)
    setIsTransactionLimitDialogOpen(true)
  }

  const handleCategoryLimit = (data: CategoryLimitExceededData) => {
    setCategoryLimitData(data)
    setIsCategoryLimitDialogOpen(true)
  }

  const { schedulePreferenceUpdate, resetPreferenceUpdates } =
    useCategoryPreferences()

  const refreshAnalyticsData = useCallback(async () => {
    // Force refetch library data
    await fetchLibraryData()

    // Invalidate AND refetch all related React Query caches
    await Promise.all([
      queryClient.refetchQueries({ queryKey: ["data-library-bundle"] }),
      queryClient.invalidateQueries({ queryKey: ["analytics-bundle"] }),
      queryClient.invalidateQueries({ queryKey: ["home-bundle"] }),
      queryClient.invalidateQueries({ queryKey: ["transactions"] }),
      queryClient.invalidateQueries({ queryKey: ["trends-bundle"] }),
      queryClient.invalidateQueries({ queryKey: ["savings-bundle"] }),
    ])
  }, [fetchLibraryData, queryClient])

  const statementImport = useStatementImport({
    refreshAnalyticsData,
  })

  const {
    addCategoryDialogOpen,
    setAddCategoryDialogOpen,
    newCategoryName,
    setNewCategoryName,
    newCategoryTier,
    setNewCategoryTier,
    addCategoryLoading,
    deleteCategoryDialogOpen,
    setDeleteCategoryDialogOpen,
    categoryToDelete,
    setCategoryToDelete,
    deleteCategoryLoading,
    handleAddCategory,
    handleDeleteCategory,
  } = useCategoryManagement({
    setCategories,
    onCategoryLimit: handleCategoryLimit,
  })

  const {
    addReceiptTypeDialogOpen,
    setAddReceiptTypeDialogOpen,
    newReceiptTypeName,
    setNewReceiptTypeName,
    addReceiptTypeLoading,
    deleteReceiptTypeDialogOpen,
    setDeleteReceiptTypeDialogOpen,
    receiptTypeToDelete,
    setReceiptTypeToDelete,
    deleteReceiptTypeLoading,
    handleAddReceiptType,
    handleDeleteReceiptType,
  } = useReceiptTypeManagement({
    fetchLibraryData,
  })

  const {
    addReceiptCategoryDialogOpen,
    setAddReceiptCategoryDialogOpen,
    newReceiptCategoryName,
    setNewReceiptCategoryName,
    newReceiptCategoryTypeId,
    setNewReceiptCategoryTypeId,
    addReceiptCategoryLoading,
    deleteReceiptCategoryDialogOpen,
    setDeleteReceiptCategoryDialogOpen,
    receiptCategoryToDelete,
    setReceiptCategoryToDelete,
    deleteReceiptCategoryLoading,
    handleAddReceiptCategory,
    handleDeleteReceiptCategory,
  } = useReceiptCategoryManagement({
    setReceiptCategories,
    onCategoryLimit: handleCategoryLimit,
  })

  const {
    viewDialogOpen,
    setViewDialogOpen,
    viewLoading,
    selectedStatement,
    setSelectedStatement,
    statementTransactions,
    setStatementTransactions,
    dialogReceiptCategories,
    dialogReceiptCategoryTypes,
    isCreateReceiptCategoryDialogOpen,
    setIsCreateReceiptCategoryDialogOpen,
    newDialogReceiptCategoryName,
    setNewDialogReceiptCategoryName,
    newDialogReceiptCategoryTypeId,
    setNewDialogReceiptCategoryTypeId,
    isCreatingReceiptCategory,
    deleteDialogOpen,
    setDeleteDialogOpen,
    statementToDelete,
    setStatementToDelete,
    deleteLoading,
    sortDirection,
    setSortDirection,
    handleViewStatementTransactions,
    handleCreateDialogReceiptCategory,
    handleDeleteStatement,
  } = useStatementViewer({
    setStatements,
    fetchLibraryData,
    onCategoryLimit: handleCategoryLimit,
  })

  return (
    <DataLibraryLayout
      isDragging={statementImport.isDragging}
      onDragEnter={statementImport.handleDragEnter}
      onDragLeave={statementImport.handleDragLeave}
      onDragOver={statementImport.handleDragOver}
      onDrop={statementImport.handleDrop}
    >
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <section className="px-4 lg:px-6">
            <div className="flex flex-col justify-between gap-4 rounded-3xl border bg-muted/30 px-6 py-6 lg:flex-row lg:items-center">
              <div className="space-y-2">
                <Badge variant="outline" className="gap-1 px-3 py-1 text-sm">
                  <IconDatabase className="size-4" />
                  Unified Library
                </Badge>
                <h1 className="text-3xl font-semibold tracking-tight">
                  Data Library
                </h1>
                <p className="text-muted-foreground max-w-2xl">
                  Live view of every dataset powered by your statements,
                  ledger, and AI interpretations. Tap into real backend
                  telemetry without leaving the dashboard.
                </p>
              </div>
            </div>
            {error && !error.toLowerCase().includes("authentication") && (
              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <IconAlertTriangle className="size-4" />
                <span>
                  {(() => {
                    // Try to parse JSON error messages
                    try {
                      const parsed = JSON.parse(error)
                      return parsed.error || parsed.message || "Something went wrong"
                    } catch {
                      // If not JSON, show as-is but clean up common technical messages
                      if (error.includes("Unauthorized")) {
                        return "Please sign in to access your data"
                      }
                      return error
                    }
                  })()}
                </span>
              </div>
            )}
          </section>

          <StatsCards
            transactions={transactions}
            statements={statements}
            categories={categories}
            receiptCategoryTypes={receiptCategoryTypes}
            receiptCategories={receiptCategories}
            receiptTransactionsCount={receiptTransactionsCount}
            totalUserCategoriesCount={totalUserCategoriesCount}
          />


          <section className="px-4 lg:px-6">
            <div className="grid gap-4 lg:grid-cols-2">
              <ReportsTable
                statements={statements}
                filteredStatements={filteredStatements}
                uniqueReportTypes={uniqueReportTypes}
                selectedReportType={selectedReportType}
                onReportTypeChange={setSelectedReportType}
                reportsSearch={reportsSearch}
                onReportsSearchChange={setReportsSearch}
                reportsPage={reportsPage}
                onReportsPageChange={setReportsPage}
                reportsPageSize={reportsPageSize}
                onReportsPageSizeChange={setReportsPageSize}
                selectedReportIds={selectedReportIds}
                setSelectedReportIds={setSelectedReportIds}
                onViewStatement={handleViewStatementTransactions}
                onRequestDelete={(statement) => {
                  setStatementToDelete(statement)
                  setDeleteDialogOpen(true)
                }}
                viewLoading={viewLoading}
                selectedStatementId={selectedStatement?.id ?? null}
                deleteLoading={deleteLoading}
                statementToDelete={statementToDelete}
                deleteDialogOpen={deleteDialogOpen}
                onDeleteDialogOpenChange={(open) => {
                  setDeleteDialogOpen(open)
                  if (!open) {
                    setStatementToDelete(null)
                  }
                }}
                onDeleteStatement={handleDeleteStatement}
              />
              <TransactionsTable transactions={transactions} />
              <CategoriesTable
                categories={categories}
                filteredCategories={filteredCategories}
                categorySearch={categorySearch}
                onCategorySearchChange={setCategorySearch}
                categoryPage={categoryPage}
                onCategoryPageChange={setCategoryPage}
                categoryPageSize={categoryPageSize}
                onCategoryPageSizeChange={setCategoryPageSize}
                selectedCategoryIds={selectedCategoryIds}
                setSelectedCategoryIds={setSelectedCategoryIds}
                onAddCategory={() => setAddCategoryDialogOpen(true)}
                onRequestDeleteCategory={(category) => {
                  setCategoryToDelete(category)
                  setDeleteCategoryDialogOpen(true)
                }}
                isDefaultCategory={isDefaultCategory}
                formatCurrency={formatCurrency}
                onCategoryBroadTypeChange={async (categoryId, tier) => {
                  try {
                    const res = await fetch("/api/categories/needs-wants", {
                      method: "PATCH",
                      headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                      },
                      body: JSON.stringify({ id: categoryId, tier }),
                    })
                    if (!res.ok) {
                      console.error(
                        "[DataLibrary] Failed to update broad type:",
                        await res.text(),
                      )
                      return
                    }
                    const payload = await res.json()
                    setCategories((prev) =>
                      prev.map((cat) =>
                        cat.id === categoryId
                          ? {
                              ...cat,
                              broadType: (payload.tier as any) ?? tier,
                            }
                          : cat,
                      ),
                    )
                  } catch (error) {
                    console.error("[DataLibrary] Error updating broad type:", error)
                  }
                }}
              />
              <ReceiptTypesTable
                receiptCategoryTypes={receiptCategoryTypes}
                filteredReceiptTypes={filteredReceiptTypes}
                receiptTypeSearch={receiptTypeSearch}
                onReceiptTypeSearchChange={setReceiptTypeSearch}
                receiptTypePage={receiptTypePage}
                onReceiptTypePageChange={setReceiptTypePage}
                receiptTypePageSize={receiptTypePageSize}
                onReceiptTypePageSizeChange={setReceiptTypePageSize}
                selectedReceiptTypeIds={selectedReceiptTypeIds}
                setSelectedReceiptTypeIds={setSelectedReceiptTypeIds}
                onRequestDeleteReceiptType={(type) => {
                  setReceiptTypeToDelete(type)
                  setDeleteReceiptTypeDialogOpen(true)
                }}
                isDefaultReceiptType={isDefaultReceiptType}
                formatCurrency={formatCurrency}
              />
              <ReceiptCategoriesTable
                receiptCategories={receiptCategories}
                filteredReceiptCategories={filteredReceiptCategories}
                receiptCategorySearch={receiptCategorySearch}
                onReceiptCategorySearchChange={setReceiptCategorySearch}
                receiptCategoryPage={receiptCategoryPage}
                onReceiptCategoryPageChange={setReceiptCategoryPage}
                receiptCategoryPageSize={receiptCategoryPageSize}
                onReceiptCategoryPageSizeChange={setReceiptCategoryPageSize}
                selectedReceiptCategoryIds={selectedReceiptCategoryIds}
                setSelectedReceiptCategoryIds={setSelectedReceiptCategoryIds}
                onAddReceiptCategory={() => {
                  if (!newReceiptCategoryTypeId && receiptCategoryTypes.length > 0) {
                    setNewReceiptCategoryTypeId(String(receiptCategoryTypes[0].id))
                  }
                  setAddReceiptCategoryDialogOpen(true)
                }}
                onRequestDeleteReceiptCategory={(category) => {
                  setReceiptCategoryToDelete(category)
                  setDeleteReceiptCategoryDialogOpen(true)
                }}
                isDefaultReceiptCategory={isDefaultReceiptCategory}
                formatCurrency={formatCurrency}
              />
            </div>
          </section>

        </div>
      </div>


      <ViewStatementDialog
        open={viewDialogOpen}
        onOpenChange={(open) => {
          setViewDialogOpen(open)
          if (!open) {
            setStatementTransactions([])
            setSelectedStatement(null)
          }
        }}
        viewLoading={viewLoading}
        selectedStatement={selectedStatement}
        statementTransactions={statementTransactions}
        setStatementTransactions={setStatementTransactions}
        sortDirection={sortDirection}
        setSortDirection={setSortDirection}
        dialogReceiptCategories={dialogReceiptCategories}
        dialogReceiptCategoryTypes={dialogReceiptCategoryTypes}
        isCreateReceiptCategoryDialogOpen={isCreateReceiptCategoryDialogOpen}
        onCreateReceiptCategoryOpenChange={(open) => {
          setIsCreateReceiptCategoryDialogOpen(open)
          if (!open) {
            setNewDialogReceiptCategoryName("")
            if (dialogReceiptCategoryTypes.length > 0) {
              setNewDialogReceiptCategoryTypeId(String(dialogReceiptCategoryTypes[0].id))
            }
          }
        }}
        newDialogReceiptCategoryName={newDialogReceiptCategoryName}
        onNewDialogReceiptCategoryNameChange={setNewDialogReceiptCategoryName}
        newDialogReceiptCategoryTypeId={newDialogReceiptCategoryTypeId}
        onNewDialogReceiptCategoryTypeIdChange={setNewDialogReceiptCategoryTypeId}
        isCreatingReceiptCategory={isCreatingReceiptCategory}
        onCreateDialogReceiptCategory={handleCreateDialogReceiptCategory}
        formatCurrency={formatCurrency}
        startTransition={startTransition}
      />


      <CategoryDialogs
        addOpen={addCategoryDialogOpen}
        onAddOpenChange={setAddCategoryDialogOpen}
        newCategoryName={newCategoryName}
        onNewCategoryNameChange={setNewCategoryName}
        newCategoryTier={newCategoryTier}
        onCategoryTierChange={setNewCategoryTier}
        addCategoryLoading={addCategoryLoading}
        onAddCategory={handleAddCategory}
        onCancelAdd={() => {
          setAddCategoryDialogOpen(false)
          setNewCategoryName("")
        }}
        deleteOpen={deleteCategoryDialogOpen}
        onDeleteOpenChange={(open) => {
          setDeleteCategoryDialogOpen(open)
          if (!open) {
            setCategoryToDelete(null)
          }
        }}
        categoryToDelete={categoryToDelete}
        deleteCategoryLoading={deleteCategoryLoading}
        onDeleteCategory={handleDeleteCategory}
      />

      <ReceiptTypeDialogs
        addOpen={addReceiptTypeDialogOpen}
        onAddOpenChange={setAddReceiptTypeDialogOpen}
        newReceiptTypeName={newReceiptTypeName}
        onNewReceiptTypeNameChange={setNewReceiptTypeName}
        addReceiptTypeLoading={addReceiptTypeLoading}
        onAddReceiptType={handleAddReceiptType}
        onCancelAdd={() => {
          setAddReceiptTypeDialogOpen(false)
          setNewReceiptTypeName("")
        }}
        deleteOpen={deleteReceiptTypeDialogOpen}
        onDeleteOpenChange={(open) => {
          setDeleteReceiptTypeDialogOpen(open)
          if (!open) {
            setReceiptTypeToDelete(null)
          }
        }}
        receiptTypeToDelete={receiptTypeToDelete}
        deleteReceiptTypeLoading={deleteReceiptTypeLoading}
        onDeleteReceiptType={handleDeleteReceiptType}
      />

      <ReceiptCategoryDialogs
        addOpen={addReceiptCategoryDialogOpen}
        onAddOpenChange={setAddReceiptCategoryDialogOpen}
        newReceiptCategoryName={newReceiptCategoryName}
        onNewReceiptCategoryNameChange={setNewReceiptCategoryName}
        newReceiptCategoryTypeId={newReceiptCategoryTypeId}
        onNewReceiptCategoryTypeIdChange={setNewReceiptCategoryTypeId}
        receiptCategoryTypes={receiptCategoryTypes}
        addReceiptCategoryLoading={addReceiptCategoryLoading}
        onAddReceiptCategory={handleAddReceiptCategory}
        onCancelAdd={() => {
          setAddReceiptCategoryDialogOpen(false)
          setNewReceiptCategoryName("")
        }}
        deleteOpen={deleteReceiptCategoryDialogOpen}
        onDeleteOpenChange={(open) => {
          setDeleteReceiptCategoryDialogOpen(open)
          if (!open) {
            setReceiptCategoryToDelete(null)
          }
        }}
        receiptCategoryToDelete={receiptCategoryToDelete}
        deleteReceiptCategoryLoading={deleteReceiptCategoryLoading}
        onDeleteReceiptCategory={handleDeleteReceiptCategory}
      />

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

      <DataLibraryStatementReviewDialog
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

      <LimitDialogs
        transactionLimitData={transactionLimitData}
        isTransactionLimitDialogOpen={isTransactionLimitDialogOpen}
        setIsTransactionLimitDialogOpen={setIsTransactionLimitDialogOpen}
        setTransactionLimitData={setTransactionLimitData}
        categoryLimitData={categoryLimitData}
        isCategoryLimitDialogOpen={isCategoryLimitDialogOpen}
        setIsCategoryLimitDialogOpen={setIsCategoryLimitDialogOpen}
        setCategoryLimitData={setCategoryLimitData}
      />
    </DataLibraryLayout>
  )
}
