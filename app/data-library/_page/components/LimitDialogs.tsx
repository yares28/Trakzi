import { toast } from "sonner"

import { CategoryLimitDialog, type CategoryLimitExceededData } from "@/components/limits/category-limit-dialog"
import { TransactionLimitDialog, type TransactionLimitExceededData } from "@/components/limits/transaction-limit-dialog"

type LimitDialogsProps = {
  transactionLimitData: TransactionLimitExceededData | null
  isTransactionLimitDialogOpen: boolean
  setIsTransactionLimitDialogOpen: (open: boolean) => void
  setTransactionLimitData: (data: TransactionLimitExceededData | null) => void
  categoryLimitData: CategoryLimitExceededData | null
  isCategoryLimitDialogOpen: boolean
  setIsCategoryLimitDialogOpen: (open: boolean) => void
  setCategoryLimitData: (data: CategoryLimitExceededData | null) => void
}

export function LimitDialogs({
  transactionLimitData,
  isTransactionLimitDialogOpen,
  setIsTransactionLimitDialogOpen,
  setTransactionLimitData,
  categoryLimitData,
  isCategoryLimitDialogOpen,
  setIsCategoryLimitDialogOpen,
  setCategoryLimitData,
}: LimitDialogsProps) {
  return (
    <>
      {/* Transaction Limit Exceeded Dialog */}
      {transactionLimitData && (
        <TransactionLimitDialog
          open={isTransactionLimitDialogOpen}
          onOpenChange={(open) => {
            setIsTransactionLimitDialogOpen(open)
            if (!open) {
              setTransactionLimitData(null)
            }
          }}
          data={transactionLimitData}
          onUpgrade={() => {
            window.location.href = "/billing"
          }}
          onDeleteOld={() => {
            setIsTransactionLimitDialogOpen(false)
            setTransactionLimitData(null)
            toast.info("Go to Data Library to delete old transactions")
          }}
        />
      )}

      {/* Category Limit Exceeded Dialog */}
      {categoryLimitData && (
        <CategoryLimitDialog
          open={isCategoryLimitDialogOpen}
          onOpenChange={(open) => {
            setIsCategoryLimitDialogOpen(open)
            if (!open) {
              setCategoryLimitData(null)
            }
          }}
          data={categoryLimitData}
          onUpgrade={() => {
            window.location.href = "/billing"
          }}
          onDeleteUnused={() => {
            setIsCategoryLimitDialogOpen(false)
            setCategoryLimitData(null)
            toast.info("Review your categories in the tables below")
          }}
        />
      )}
    </>
  )
}
