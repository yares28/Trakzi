import { DataTableFridge } from "@/components/fridge/data-table-fridge"
import { CardPriceComparisonFridge } from "@/components/fridge/card-price-comparison-fridge"
import { CardStoreAnalysisFridge } from "@/components/fridge/card-store-analysis-fridge"

import type { ReceiptTransactionRow } from "../types"
import type { ReceiptTableRow } from "../hooks/useFridgeData"

type ReceiptsTableProps = {
  dateFilter: string | null
  tableData: ReceiptTableRow[]
  receiptTransactions: ReceiptTransactionRow[]
  isLoading: boolean
  onReceiptsChanged: () => void
}

export function ReceiptsTable({
  dateFilter,
  tableData,
  receiptTransactions,
  isLoading,
  onReceiptsChanged,
}: ReceiptsTableProps) {
  return (
    <>
      <div className="w-full">
        <DataTableFridge
          key={dateFilter ?? "all"}
          data={tableData}
          onReceiptsChanged={onReceiptsChanged}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 px-4 lg:px-6 py-4 min-w-0">
        <CardPriceComparisonFridge
          data={receiptTransactions.map((tx) => ({
            id: tx.id,
            description: tx.description,
            pricePerUnit: tx.pricePerUnit,
            totalPrice: tx.totalPrice,
            receiptDate: tx.receiptDate,
            storeName: tx.storeName,
          }))}
          isLoading={isLoading}
        />
        <CardStoreAnalysisFridge
          data={receiptTransactions.map((tx) => ({
            id: tx.id,
            description: tx.description,
            pricePerUnit: tx.pricePerUnit,
            totalPrice: tx.totalPrice,
            receiptDate: tx.receiptDate,
            storeName: tx.storeName,
            categoryName: tx.categoryName,
          }))}
          isLoading={isLoading}
        />
      </div>
    </>
  )
}
