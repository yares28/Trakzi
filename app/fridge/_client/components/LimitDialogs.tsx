import { toast } from "sonner"

import { TransactionLimitDialog, type TransactionLimitExceededData } from "@/components/limits/transaction-limit-dialog"
import { CategoryLimitDialog, type CategoryLimitExceededData } from "@/components/limits/category-limit-dialog"

type LimitDialogsProps = {
  limitExceededData: TransactionLimitExceededData | null
  isLimitDialogOpen: boolean
  setIsLimitDialogOpen: (open: boolean) => void
  onClearLimitExceeded: () => void
  categoryLimitData: CategoryLimitExceededData | null
  isCategoryLimitDialogOpen: boolean
  setIsCategoryLimitDialogOpen: (open: boolean) => void
  onClearCategoryLimit: () => void
}

export function LimitDialogs({
  limitExceededData,
  isLimitDialogOpen,
  setIsLimitDialogOpen,
  onClearLimitExceeded,
  categoryLimitData,
  isCategoryLimitDialogOpen,
  setIsCategoryLimitDialogOpen,
  onClearCategoryLimit,
}: LimitDialogsProps) {
  return (
    <>
      {limitExceededData && (
        <TransactionLimitDialog
          open={isLimitDialogOpen}
          onOpenChange={(open) => {
            setIsLimitDialogOpen(open)
            if (!open) {
              onClearLimitExceeded()
            }
          }}
          data={limitExceededData}
          onUpgrade={() => {
            window.location.href = "/billing"
          }}
          onDeleteOld={() => {
            setIsLimitDialogOpen(false)
            window.location.href = "/data-library"
          }}
        />
      )}

      {categoryLimitData && (
        <CategoryLimitDialog
          open={isCategoryLimitDialogOpen}
          onOpenChange={(open) => {
            setIsCategoryLimitDialogOpen(open)
            if (!open) {
              onClearCategoryLimit()
            }
          }}
          data={categoryLimitData}
          onUpgrade={() => {
            window.location.href = "/billing"
          }}
          onDeleteUnused={() => {
            setIsCategoryLimitDialogOpen(false)
            toast.info("Go to settings to manage your categories")
          }}
        />
      )}
    </>
  )
}
