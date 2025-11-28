import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

type TransactionLike = {
  amount: number | string | null | undefined
  balance?: number | string | null | undefined
  category?: string | null | undefined
}

type NormalizedTransaction<T extends TransactionLike> = Omit<
  T,
  keyof TransactionLike
> & {
  amount: number
  balance: number | null
  category: string
}

export const toNumericValue = (value: unknown): number => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0
  }
  if (typeof value === "string") {
    const normalized = value.replace(/,/g, "").trim()
    if (!normalized) return 0
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : 0
  }
  if (value === null || value === undefined) {
    return 0
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function normalizeTransactions<T extends TransactionLike>(
  rows: T[]
): NormalizedTransaction<T>[] {
  return rows.map((tx) => {
    const amount = toNumericValue(tx.amount)
    const balance =
      tx.balance === null || tx.balance === undefined
        ? null
        : toNumericValue(tx.balance)
    const category =
      typeof tx.category === "string" && tx.category.trim().length > 0
        ? tx.category.trim()
        : "Other"

    return {
      ...tx,
      amount,
      balance,
      category,
    }
  })
}
