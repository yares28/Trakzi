import { DEFAULT_CATEGORIES } from "@/lib/categories"
import {
  DEFAULT_RECEIPT_CATEGORIES,
  DEFAULT_RECEIPT_CATEGORY_TYPES,
} from "@/lib/receipt-categories"

export const isDefaultCategory = (categoryName: string): boolean => {
  return DEFAULT_CATEGORIES.includes(categoryName)
}

export const isDefaultReceiptType = (typeName: string): boolean => {
  const key = typeName.trim().toLowerCase()
  return DEFAULT_RECEIPT_CATEGORY_TYPES.some(
    (type) => type.name.toLowerCase() === key
  )
}

export const isDefaultReceiptCategory = (categoryName: string): boolean => {
  const key = categoryName.trim().toLowerCase()
  return DEFAULT_RECEIPT_CATEGORIES.some(
    (category) => category.name.toLowerCase() === key
  )
}
