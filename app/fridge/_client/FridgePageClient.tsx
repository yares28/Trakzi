"use client"

import { useCallback, useMemo, useState } from "react"
import { useUser } from "@clerk/nextjs"

import type { CategoryLimitExceededData } from "@/components/limits/category-limit-dialog"
import type { TransactionLimitExceededData } from "@/components/limits/transaction-limit-dialog"
import type { FileUpload01Lead } from "@/components/file-upload-01"
import { useDateFilter } from "@/components/date-filter-provider"
import { useFridgeBundleData } from "@/hooks/use-dashboard-data"

import { FridgeLayout } from "./components/FridgeLayout"
import { MetricsCards } from "./components/MetricsCards"
import { ChartsGrid } from "./components/ChartsGrid"
import { ReceiptsTable } from "./components/ReceiptsTable"
import { UploadDialog } from "./components/UploadDialog"
import { ReviewDialog } from "./components/ReviewDialog"
import { CreateCategoryDialog } from "./components/CreateCategoryDialog"
import { LimitDialogs } from "./components/LimitDialogs"
import { useChartLayout } from "./hooks/useChartLayout"
import { useFridgeChartData } from "./hooks/useFridgeChartData"
import { useFridgeData } from "./hooks/useFridgeData"
import { useFridgeMetrics } from "./hooks/useFridgeMetrics"
import { useReceiptCategoryManagement } from "./hooks/useReceiptCategoryManagement"
import { useReceiptUpload } from "./hooks/useReceiptUpload"
import { useReviewDialog } from "./hooks/useReviewDialog"

export function FridgePageClient() {
  const { user, isLoaded: isUserLoaded } = useUser()
  const { filter: dateFilter } = useDateFilter()
  const { data: bundleData, isLoading: bundleLoading, refetch: refetchBundle } = useFridgeBundleData()

  const [receiptsRefreshNonce, setReceiptsRefreshNonce] = useState(0)
  const [limitExceededData, setLimitExceededData] = useState<TransactionLimitExceededData | null>(null)
  const [isLimitDialogOpen, setIsLimitDialogOpen] = useState(false)
  const [categoryLimitData, setCategoryLimitData] = useState<CategoryLimitExceededData | null>(null)
  const [isCategoryLimitDialogOpen, setIsCategoryLimitDialogOpen] = useState(false)

  const { receiptTransactions, isLoadingReceiptTransactions, tableData } = useFridgeData({
    dateFilter,
    refreshNonce: receiptsRefreshNonce,
  })

  const { metrics, metricsTrends } = useFridgeMetrics({
    bundleData,
    receiptTransactions,
  })

  const chartData = useFridgeChartData({
    bundleData,
    receiptTransactions,
  })

  const { chartOrder, handleChartOrderChange, savedChartSizes, handleChartResize } = useChartLayout()

  const handleLimitExceeded = useCallback((data: TransactionLimitExceededData) => {
    setLimitExceededData(data)
    setIsLimitDialogOpen(true)
  }, [])

  const handleCategoryLimit = useCallback((data: CategoryLimitExceededData) => {
    setCategoryLimitData(data)
    setIsCategoryLimitDialogOpen(true)
  }, [])

  const receiptCategoryManagement = useReceiptCategoryManagement({
    onCategoryLimit: handleCategoryLimit,
  })

  const reviewDialog = useReviewDialog({
    reviewCategories: receiptCategoryManagement.reviewCategories,
    onCommitSuccess: () => {
      setReceiptsRefreshNonce((prev) => prev + 1)
      refetchBundle()
    },
    onLimitExceeded: handleLimitExceeded,
  })

  const upload = useReceiptUpload({
    onUploadComplete: (result) => {
      reviewDialog.handleUploadResults(result.receipts, result.rejected)
    },
    onLimitExceeded: handleLimitExceeded,
  })

  const projectLead = useMemo<FileUpload01Lead | null>(() => {
    if (!isUserLoaded || !user) return null
    return {
      id: user.id,
      name: user.fullName || user.username || user.primaryEmailAddress?.emailAddress || "You",
      imageUrl: user.imageUrl,
    }
  }, [isUserLoaded, user])

  const handleCreateCategoryRequest = useCallback((broadType: string, itemId: string) => {
    receiptCategoryManagement.setNewCategoryBroadType(broadType)
    receiptCategoryManagement.setNewCategoryTargetItemId(itemId)
    receiptCategoryManagement.setIsCreateCategoryDialogOpen(true)
  }, [
    receiptCategoryManagement,
  ])

  const handleCreateCategory = useCallback(async () => {
    const targetItemId = receiptCategoryManagement.newCategoryTargetItemId
    const created = await receiptCategoryManagement.handleCreateCategory()
    if (created && targetItemId) {
      reviewDialog.updateReviewItemCategory(targetItemId, created.name)
    }
  }, [receiptCategoryManagement, reviewDialog])

  const handleCancelCreateCategory = useCallback(() => {
    receiptCategoryManagement.setIsCreateCategoryDialogOpen(false)
    receiptCategoryManagement.setNewCategoryName("")
    receiptCategoryManagement.setNewCategoryTargetItemId(null)
  }, [receiptCategoryManagement])

  const isChartsLoading = bundleLoading || isLoadingReceiptTransactions

  return (
    <FridgeLayout
      isDragging={upload.isDraggingUpload}
      onDragEnter={upload.handleUploadDragEnter}
      onDragLeave={upload.handleUploadDragLeave}
      onDragOver={upload.handleUploadDragOver}
      onDrop={upload.handleUploadDrop}
    >
      <div className="@container/main flex flex-1 flex-col gap-2 min-w-0">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 min-w-0 w-full">
          <MetricsCards metrics={metrics} metricsTrends={metricsTrends} />

          <ChartsGrid
            chartOrder={chartOrder}
            onOrderChange={handleChartOrderChange}
            savedChartSizes={savedChartSizes}
            onResize={handleChartResize}
            chartData={chartData}
            receiptTransactions={receiptTransactions}
            dateFilter={dateFilter}
            isLoading={isChartsLoading}
          />

          <ReceiptsTable
            dateFilter={dateFilter}
            tableData={tableData}
            receiptTransactions={receiptTransactions}
            isLoading={isLoadingReceiptTransactions}
            onReceiptsChanged={() => setReceiptsRefreshNonce((prev) => prev + 1)}
          />
        </div>
      </div>

      <UploadDialog
        open={upload.isUploadDialogOpen}
        onOpenChange={upload.handleUploadDialogOpenChange}
        files={upload.uploadFiles}
        fileProgresses={upload.fileProgresses}
        isUploading={upload.isUploading}
        error={upload.uploadError}
        projectName={upload.projectName}
        onProjectNameChange={upload.handleProjectNameChange}
        projectLead={projectLead}
        onFilesChange={upload.handleUploadFilesChange}
        onCancel={() => upload.handleUploadDialogOpenChange(false)}
        onContinue={upload.handleUploadContinue}
      />

      <ReviewDialog
        open={reviewDialog.isReviewDialogOpen}
        onOpenChange={reviewDialog.handleReviewDialogOpenChange}
        reviewReceipts={reviewDialog.reviewReceipts}
        activeReviewReceiptIndex={reviewDialog.activeReviewReceiptIndex}
        setActiveReviewReceiptIndex={reviewDialog.setActiveReviewReceiptIndex}
        reviewUploadWarnings={reviewDialog.reviewUploadWarnings}
        reviewCommitError={reviewDialog.reviewCommitError}
        isCommittingReview={reviewDialog.isCommittingReview}
        reviewCategoryByLowerName={reviewDialog.reviewCategoryByLowerName}
        reviewCategoryGroups={reviewDialog.reviewCategoryGroups}
        availableBroadTypes={receiptCategoryManagement.availableBroadTypes}
        receiptCategoryTypes={receiptCategoryManagement.receiptCategoryTypes}
        activeReviewCategoryBroadType={reviewDialog.activeReviewCategoryBroadType}
        setActiveReviewCategoryBroadType={reviewDialog.setActiveReviewCategoryBroadType}
        openDropdownId={reviewDialog.openDropdownId}
        setOpenDropdownId={reviewDialog.setOpenDropdownId}
        hasMultipleReviewReceipts={reviewDialog.hasMultipleReviewReceipts}
        isFirstReviewReceipt={reviewDialog.isFirstReviewReceipt}
        isLastReviewReceipt={reviewDialog.isLastReviewReceipt}
        showReviewOnly={reviewDialog.showReviewOnly}
        setShowReviewOnly={reviewDialog.setShowReviewOnly}
        reviewQueueCount={reviewDialog.reviewQueueCount}
        storeLanguageValue={reviewDialog.storeLanguageValue}
        isStoreLanguageLoading={reviewDialog.isStoreLanguageLoading}
        storeLanguageError={reviewDialog.storeLanguageError}
        onStoreLanguageChange={reviewDialog.handleStoreLanguageChange}
        onUpdateItemCategory={reviewDialog.updateReviewItemCategory}
        onUpdateItemBroadType={reviewDialog.updateReviewItemBroadType}
        onUpdateItemCategoryType={reviewDialog.updateReviewItemCategoryType}
        onUpdateItemQuantity={reviewDialog.updateReviewItemQuantity}
        onDeleteItem={reviewDialog.deleteReviewItem}
        onCommitReview={reviewDialog.handleCommitReview}
        onCreateCategoryRequest={handleCreateCategoryRequest}
      />

      <CreateCategoryDialog
        open={receiptCategoryManagement.isCreateCategoryDialogOpen}
        onOpenChange={receiptCategoryManagement.setIsCreateCategoryDialogOpen}
        newCategoryName={receiptCategoryManagement.newCategoryName}
        setNewCategoryName={receiptCategoryManagement.setNewCategoryName}
        newCategoryTypeId={receiptCategoryManagement.newCategoryTypeId}
        setNewCategoryTypeId={receiptCategoryManagement.setNewCategoryTypeId}
        newCategoryBroadType={receiptCategoryManagement.newCategoryBroadType}
        setNewCategoryBroadType={receiptCategoryManagement.setNewCategoryBroadType}
        availableBroadTypes={receiptCategoryManagement.availableBroadTypes}
        receiptCategoryTypes={receiptCategoryManagement.receiptCategoryTypes}
        isCreatingCategory={receiptCategoryManagement.isCreatingCategory}
        onCreateCategory={handleCreateCategory}
        onCancel={handleCancelCreateCategory}
      />

      <LimitDialogs
        limitExceededData={limitExceededData}
        isLimitDialogOpen={isLimitDialogOpen}
        setIsLimitDialogOpen={setIsLimitDialogOpen}
        onClearLimitExceeded={() => setLimitExceededData(null)}
        categoryLimitData={categoryLimitData}
        isCategoryLimitDialogOpen={isCategoryLimitDialogOpen}
        setIsCategoryLimitDialogOpen={setIsCategoryLimitDialogOpen}
        onClearCategoryLimit={() => setCategoryLimitData(null)}
      />
    </FridgeLayout>
  )
}
