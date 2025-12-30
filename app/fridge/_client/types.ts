import type { ReceiptParseMeta, ReceiptParseWarning } from "@/lib/receipts/parsers/types"

export type ReceiptTransactionRow = {
  id: number
  receiptId: string
  storeName: string | null
  receiptDate: string
  receiptTime: string
  receiptTotalAmount: number
  receiptStatus: string
  description: string
  quantity: number
  pricePerUnit: number
  totalPrice: number
  categoryId: number | null
  categoryTypeId?: number | null
  categoryName: string | null
  categoryColor: string | null
  categoryTypeName?: string | null
  categoryTypeColor?: string | null
}

export type UploadedReceiptTransaction = {
  id: string
  description: string
  quantity: number
  pricePerUnit: number
  totalPrice: number
  categoryName: string | null
  broadType?: string | null
  categoryTypeName?: string | null
  aiCategoryRaw?: string | null
  aiCategoryResolved?: string | null
  heuristicCategory?: string | null
  needsReview?: boolean
  reviewReason?: string | null
  categoryConfidence?: number
  confidenceSource?: string | null
}

export type UploadedReceipt = {
  receiptId: string
  status: string
  fileId: string
  fileName: string
  storeName: string | null
  receiptDate: string | null
  receiptTime: string | null
  totalAmount: number
  currency: string
  transactions: UploadedReceiptTransaction[]
  languageOverride?: string | null
  languageDetected?: string | null
  languageSource?: "override" | "detected" | "unknown"
  warnings?: ReceiptParseWarning[]
  meta?: ReceiptParseMeta
}

export type ReceiptCategoryOption = {
  name: string
  color: string | null
  typeName: string
  typeColor: string | null
  broadType: string
}

export type FridgeChartId =
  | "grocerySpendTrend"
  | "groceryCategoryRankings"
  | "groceryExpenseBreakdown"
  | "groceryMacronutrientBreakdown"
  | "grocerySnackPercentage"
  | "groceryEmptyVsNutritious"
  | "groceryDailyActivity"
  | "groceryDayOfWeekCategory"
  | "grocerySingleMonthCategory"
  | "groceryAllMonthsCategory"
  | "groceryDayOfWeekSpending"
  | "groceryTimeOfDay"
  | "groceryVsRestaurant"
  | "groceryTransactionHistory"
  | "groceryPurchaseSizeComparison"
  | "groceryShoppingHeatmapHoursDays"
  | "groceryShoppingHeatmapDaysMonths"
  | "groceryNetWorthAllocation"
