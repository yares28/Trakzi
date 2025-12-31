import type { TxRow } from "@/lib/types/transactions"

export type ParsedRow = TxRow & { id: number }

export type Transaction = {
  id: number
  date: string
  description: string
  amount: number
  balance: number | null
  category: string
  receiptTransactionId?: number
  isReceipt?: boolean
}

export type Statement = {
  id: string
  name: string
  type: string
  date: string
  reviewer: string
  statementId: number | null
  fileId: string | null
  receiptId: string | null
}

export type ReceiptCategoryOption = {
  name: string
  color: string | null
  typeName: string
  typeColor: string | null
}

export type StatsResponse = {
  totalIncome: number
  totalExpenses: number
  savingsRate: number
  netWorth: number
  incomeChange: number
  expensesChange: number
  savingsRateChange: number
  netWorthChange: number
}

export type Category = {
  id: number
  name: string
  color: string | null
  transactionCount: number
  totalSpend: number
  totalAmount?: number
  createdAt: string
}

export type ReceiptCategoryType = {
  id: number
  name: string
  color: string | null
  createdAt: string
  categoryCount: number
  transactionCount: number
  totalSpend: number
}

export type ReceiptCategory = {
  id: number
  name: string
  color: string | null
  typeId: number
  typeName: string
  typeColor: string | null
  createdAt: string
  transactionCount: number
  totalSpend: number
}

export type UserFile = {
  id: string
  fileName: string
  mimeType: string
  extension: string | null
  sizeBytes: number
  source: string | null
  uploadedAt: string
  rawFormat: string | null
  bankName: string | null
  accountName: string | null
}
