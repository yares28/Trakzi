import { useEffect, useMemo, useState } from "react"

import { DEFAULT_PAGE_SIZE } from "../constants"
import type {
  Category,
  ReceiptCategory,
  ReceiptCategoryType,
  Statement,
} from "../types"

type UseSearchPaginationOptions = {
  categories: Category[]
  receiptCategoryTypes: ReceiptCategoryType[]
  receiptCategories: ReceiptCategory[]
  statements: Statement[]
}

export const useSearchPagination = ({
  categories,
  receiptCategoryTypes,
  receiptCategories,
  statements,
}: UseSearchPaginationOptions) => {
  const [categorySearch, setCategorySearch] = useState("")
  const [categoryPage, setCategoryPage] = useState(0)
  const [categoryPageSize, setCategoryPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<number>>(
    new Set()
  )

  const [receiptTypeSearch, setReceiptTypeSearch] = useState("")
  const [receiptTypePage, setReceiptTypePage] = useState(0)
  const [receiptTypePageSize, setReceiptTypePageSize] =
    useState(DEFAULT_PAGE_SIZE)
  const [selectedReceiptTypeIds, setSelectedReceiptTypeIds] = useState<
    Set<number>
  >(new Set())

  const [receiptCategorySearch, setReceiptCategorySearch] = useState("")
  const [receiptCategoryPage, setReceiptCategoryPage] = useState(0)
  const [receiptCategoryPageSize, setReceiptCategoryPageSize] =
    useState(DEFAULT_PAGE_SIZE)
  const [selectedReceiptCategoryIds, setSelectedReceiptCategoryIds] = useState<
    Set<number>
  >(new Set())

  const [reportsSearch, setReportsSearch] = useState("")
  const [reportsPage, setReportsPage] = useState(0)
  const [reportsPageSize, setReportsPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [selectedReportIds, setSelectedReportIds] = useState<Set<string>>(
    new Set()
  )

  const [selectedReportType, setSelectedReportType] = useState("all")

  const filteredCategories = useMemo(() => {
    let result = categories
    if (categorySearch.trim()) {
      const searchLower = categorySearch.toLowerCase().trim()
      result = result.filter((cat) =>
        cat.name.toLowerCase().includes(searchLower)
      )
    }
    return [...result].sort(
      (a, b) => Math.abs(b.totalAmount ?? 0) - Math.abs(a.totalAmount ?? 0)
    )
  }, [categories, categorySearch])

  const filteredReceiptTypes = useMemo(() => {
    let result = receiptCategoryTypes
    if (receiptTypeSearch.trim()) {
      const searchLower = receiptTypeSearch.toLowerCase().trim()
      result = result.filter((type) =>
        type.name.toLowerCase().includes(searchLower)
      )
    }
    return [...result].sort(
      (a, b) => Math.abs(b.totalSpend ?? 0) - Math.abs(a.totalSpend ?? 0)
    )
  }, [receiptCategoryTypes, receiptTypeSearch])

  const filteredReceiptCategories = useMemo(() => {
    let result = receiptCategories
    if (receiptCategorySearch.trim()) {
      const searchLower = receiptCategorySearch.toLowerCase().trim()
      result = result.filter(
        (cat) =>
          cat.name.toLowerCase().includes(searchLower) ||
          cat.typeName.toLowerCase().includes(searchLower)
      )
    }
    return [...result].sort(
      (a, b) => Math.abs(b.totalSpend ?? 0) - Math.abs(a.totalSpend ?? 0)
    )
  }, [receiptCategories, receiptCategorySearch])

  useEffect(() => {
    setCategoryPage(0)
  }, [categorySearch])

  useEffect(() => {
    setReceiptTypePage(0)
  }, [receiptTypeSearch])

  useEffect(() => {
    setReceiptCategoryPage(0)
  }, [receiptCategorySearch])

  useEffect(() => {
    setReportsPage(0)
  }, [reportsSearch])

  const uniqueReportTypes = useMemo(() => {
    const types = new Set(statements.map((stmt) => stmt.type).filter(Boolean))
    return Array.from(types).sort()
  }, [statements])

  const filteredStatements = useMemo(() => {
    let result = statements
    if (selectedReportType !== "all") {
      result = result.filter((stmt) => stmt.type === selectedReportType)
    }
    if (reportsSearch.trim()) {
      const searchLower = reportsSearch.toLowerCase().trim()
      result = result.filter(
        (stmt) =>
          stmt.name.toLowerCase().includes(searchLower) ||
          (stmt.type && stmt.type.toLowerCase().includes(searchLower))
      )
    }
    return result
  }, [statements, selectedReportType, reportsSearch])

  return {
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
  }
}
