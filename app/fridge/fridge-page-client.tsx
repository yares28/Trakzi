"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useUser } from "@clerk/nextjs"
// @dnd-kit for drag-and-drop with auto-scroll (replaces GridStack)
import { SortableGridProvider, SortableGridItem } from "@/components/sortable-grid"
import { ChevronDown, Minus, Plus, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"
import { TransactionLimitDialog, type TransactionLimitExceededData } from "@/components/limits/transaction-limit-dialog"
import { CategoryLimitDialog, type CategoryLimitExceededData } from "@/components/limits/category-limit-dialog"
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

import { AppSidebar } from "@/components/app-sidebar"
import { type DateFilterType } from "@/components/date-filter"
import { useDateFilter } from "@/components/date-filter-provider"
import { useFridgeBundleData } from "@/hooks/use-dashboard-data"
import { FileUpload01 } from "@/components/file-upload-01"
import { ChartAreaInteractiveFridge } from "@/components/fridge/chart-area-interactive-fridge"
import { ChartCategoryFlowFridge } from "@/components/fridge/chart-category-flow-fridge"
import { ChartExpenseBreakdownFridge } from "@/components/fridge/chart-expense-breakdown-fridge"
import { ChartMacronutrientBreakdownFridge } from "@/components/fridge/chart-macronutrient-breakdown-fridge"
import { ChartSnackPercentageFridge } from "@/components/fridge/chart-snack-percentage-fridge"
import { ChartEmptyVsNutritiousFridge } from "@/components/fridge/chart-empty-vs-nutritious-fridge"
import { ChartDailyActivityFridge } from "@/components/fridge/chart-daily-activity-fridge"
import { ChartDayOfWeekCategoryFridge } from "@/components/fridge/chart-day-of-week-category-fridge"
import { ChartSingleMonthCategoryFridge } from "@/components/fridge/chart-single-month-category-fridge"
import { ChartAllMonthsCategoryFridge } from "@/components/fridge/chart-all-months-category-fridge"
import { ChartDayOfWeekSpendingCategoryFridge } from "@/components/fridge/chart-day-of-week-spending-category-fridge"
import { ChartTimeOfDayShoppingFridge } from "@/components/fridge/chart-time-of-day-shopping-fridge"
import { ChartGroceryVsRestaurantFridge } from "@/components/fridge/chart-grocery-vs-restaurant-fridge"
import { ChartTransactionHistoryFridge } from "@/components/fridge/chart-transaction-history-fridge"
import { ChartPurchaseSizeComparisonFridge } from "@/components/fridge/chart-purchase-size-comparison-fridge"
import { ChartShoppingHeatmapHoursDaysFridge } from "@/components/fridge/chart-shopping-heatmap-hours-days-fridge"
import { ChartShoppingHeatmapDaysMonthsFridge } from "@/components/fridge/chart-shopping-heatmap-days-months-fridge"
import { ChartTreeMapFridge } from "@/components/fridge/chart-treemap-fridge"
import { DataTableFridge } from "@/components/fridge/data-table-fridge"
import { SectionCardsFridge } from "@/components/fridge/section-cards-fridge"
import { CardPriceComparisonFridge } from "@/components/fridge/card-price-comparison-fridge"
import { CardStoreAnalysisFridge } from "@/components/fridge/card-store-analysis-fridge"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getChartCardSize, type ChartId } from "@/lib/chart-card-sizes.config"
import { getReceiptCategoryByName, getReceiptBroadTypes } from "@/lib/receipt-categories"
// @dnd-kit handles auto-scroll natively
import { cn } from "@/lib/utils"
import { clearResponseCache } from "@/lib/request-deduplication"

type ReceiptTransactionRow = {
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

type UploadedReceiptTransaction = {
  id: string
  description: string
  quantity: number
  pricePerUnit: number
  totalPrice: number
  categoryName: string | null
  broadType?: string | null
  categoryTypeName?: string | null
}

type UploadedReceipt = {
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
}

type ReceiptCategoryOption = {
  name: string
  color: string | null
  typeName: string
  typeColor: string | null
  broadType: string
}

type FridgeChartId =
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

const FRIDGE_CHART_TO_ANALYTICS_CHART: Record<FridgeChartId, ChartId> = {
  grocerySpendTrend: "incomeExpensesTracking1",
  groceryCategoryRankings: "fridge:categoryRankings",
  groceryExpenseBreakdown: "expenseBreakdown",
  groceryMacronutrientBreakdown: "expenseBreakdown",
  grocerySnackPercentage: "expenseBreakdown",
  groceryEmptyVsNutritious: "fridge:emptyVsNutritious",
  groceryDailyActivity: "fridge:dailyActivity",
  groceryDayOfWeekCategory: "fridge:dayOfWeekCategory",
  grocerySingleMonthCategory: "fridge:singleMonthCategory",
  groceryAllMonthsCategory: "fridge:allMonthsCategory",
  groceryDayOfWeekSpending: "fridge:dayOfWeekSpending",
  groceryTimeOfDay: "fridge:time-of-day-spending",
  groceryVsRestaurant: "fridge:groceryVsRestaurant",
  groceryTransactionHistory: "fridge:transactionHistory",
  groceryPurchaseSizeComparison: "fridge:purchaseSizeComparison",
  groceryShoppingHeatmapHoursDays: "fridge:shoppingHeatmapHoursDays",
  groceryShoppingHeatmapDaysMonths: "fridge:shoppingHeatmapDaysMonths",
  groceryNetWorthAllocation: "netWorthAllocation",
}

const FRIDGE_CHART_ORDER: FridgeChartId[] = [
  "grocerySpendTrend",
  "groceryCategoryRankings",
  "groceryExpenseBreakdown",
  "groceryMacronutrientBreakdown",
  "grocerySnackPercentage",
  "groceryEmptyVsNutritious",
  "groceryDailyActivity",
  "groceryDayOfWeekCategory",
  "grocerySingleMonthCategory",
  "groceryAllMonthsCategory",
  "groceryDayOfWeekSpending",
  "groceryTimeOfDay",
  "groceryVsRestaurant",
  "groceryTransactionHistory",
  "groceryPurchaseSizeComparison",
  "groceryShoppingHeatmapHoursDays",
  "groceryShoppingHeatmapDaysMonths",
  "groceryNetWorthAllocation",
]

const DEFAULT_CHART_SIZES: Record<FridgeChartId, { w: number; h: number; x?: number; y?: number }> = {
  grocerySpendTrend: { w: 12, h: 6, x: 0, y: 0 },
  groceryCategoryRankings: { w: 12, h: 8, x: 0, y: 6 },
  groceryExpenseBreakdown: { w: 6, h: 10, x: 0, y: 14 },
  groceryMacronutrientBreakdown: { w: 6, h: 10, x: 6, y: 14 },
  grocerySnackPercentage: { w: 6, h: 10, x: 0, y: 24 },
  groceryEmptyVsNutritious: { w: 6, h: 10, x: 6, y: 24 },
  groceryDailyActivity: { w: 12, h: 6, x: 0, y: 34 },
  groceryDayOfWeekCategory: { w: 6, h: 8, x: 0, y: 40 },
  grocerySingleMonthCategory: { w: 6, h: 8, x: 6, y: 40 },
  groceryAllMonthsCategory: { w: 12, h: 8, x: 0, y: 48 },
  groceryDayOfWeekSpending: { w: 12, h: 8, x: 0, y: 56 },
  groceryTimeOfDay: { w: 12, h: 8, x: 0, y: 64 },
  groceryVsRestaurant: { w: 6, h: 8, x: 0, y: 72 },
  groceryTransactionHistory: { w: 12, h: 9, x: 0, y: 80 },
  groceryPurchaseSizeComparison: { w: 6, h: 8, x: 6, y: 72 },
  groceryShoppingHeatmapHoursDays: { w: 6, h: 10, x: 0, y: 89 },
  groceryShoppingHeatmapDaysMonths: { w: 6, h: 8, x: 6, y: 89 },
  groceryNetWorthAllocation: { w: 12, h: 10, x: 0, y: 99 },
}

const CHART_SIZES_STORAGE_KEY = "fridge-chart-sizes"
const CHART_SIZES_VERSION_KEY = "fridge-chart-sizes-version"
const DEFAULT_SIZES_VERSION = "1"

// Snap width to 6 or 12, keep height clamped.
function snapToAllowedSize(w: number, h: number) {
  const snappedWidth = Math.abs(w - 6) <= Math.abs(w - 12) ? 6 : 12
  const clampedHeight = Math.max(4, Math.min(20, h))
  return { w: snappedWidth, h: clampedHeight }
}

function normalizeCategoryName(value: string | null | undefined) {
  const trimmed = (value ?? "").trim()
  return trimmed || "Other"
}

function normalizeMerchantName(value: string | null | undefined) {
  const raw = (value ?? "").trim()
  if (!raw) return "Unknown"

  // Common statement formats: "PAYPAL *MERCHANT", "CARD PURCHASE - MERCHANT", etc.
  const cleaned = raw
    .replace(/^PAYPAL\s+\*/i, "")
    .replace(/^CARD\s+PURCHASE\s*-\s*/i, "")
    .replace(/^POS\s+/i, "")
    .replace(/^DEBIT\s+/i, "")
    .replace(/[\d]{2,}$/g, "")
    .replace(/\s+/g, " ")
    .trim()

  // Keep the label compact so legends remain readable
  const tokens = cleaned.split(" ").filter(Boolean)
  const compact = tokens.slice(0, 3).join(" ")
  return compact || "Unknown"
}

function parseIsoDateUtc(dateString: string) {
  return new Date(`${dateString}T00:00:00Z`)
}

function monthKey(dateString: string) {
  return dateString.slice(0, 7) // YYYY-MM
}

function formatMonthLabel(yyyyMm: string, includeYear: boolean) {
  const [y, m] = yyyyMm.split("-")
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, 1))
  const month = date.toLocaleString("en-US", { month: "short" })
  return includeYear ? `${month} '${String(y).slice(-2)}` : month
}

const RECEIPT_FILE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "heic", "heif", "pdf"])

function isSupportedReceiptFile(file: File) {
  const mime = (file.type || "").toLowerCase()
  if (mime.startsWith("image/")) return true
  if (mime === "application/pdf") return true
  const extension = file.name.split(".").pop()?.toLowerCase() ?? ""
  return RECEIPT_FILE_EXTENSIONS.has(extension)
}

function receiptUploadFileKey(file: File) {
  return `${file.name}::${file.size}::${file.lastModified}`
}

function stripFileExtension(filename: string) {
  const lastDot = filename.lastIndexOf(".")
  return lastDot > 0 ? filename.slice(0, lastDot) : filename
}

function defaultReceiptProjectName(files: File[]) {
  if (files.length === 1) return stripFileExtension(files[0].name)
  if (files.length > 1) return `Receipt batch (${files.length} files)`
  return ""
}

function isFileDragEvent(event: React.DragEvent) {
  const types = Array.from(event.dataTransfer.types || [])
  return types.includes("Files")
}

export function FridgePageClient() {
  const { user, isLoaded: isUserLoaded } = useUser()

  const { filter: dateFilter, setFilter: setDateFilter } = useDateFilter()

  // Bundle API data - pre-aggregated with Redis caching (single request)
  const { data: bundleData, isLoading: bundleLoading } = useFridgeBundleData()

  const [receiptTransactions, setReceiptTransactions] = useState<ReceiptTransactionRow[]>([])
  const [isLoadingReceiptTransactions, setIsLoadingReceiptTransactions] = useState(true)
  const [receiptsRefreshNonce, setReceiptsRefreshNonce] = useState(0)

  const dragCounterRef = useRef(0)
  const [isDraggingUpload, setIsDraggingUpload] = useState(false)

  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [fileProgresses, setFileProgresses] = useState<Record<string, number>>({})
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [projectName, setProjectName] = useState("")
  const [projectNameEdited, setProjectNameEdited] = useState(false)
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false)
  const [reviewReceipts, setReviewReceipts] = useState<UploadedReceipt[]>([])
  const [activeReviewReceiptIndex, setActiveReviewReceiptIndex] = useState(0)
  const [reviewUploadWarnings, setReviewUploadWarnings] = useState<
    Array<{ fileName: string; reason: string }>
  >([])
  const [reviewCategories, setReviewCategories] = useState<ReceiptCategoryOption[]>([])
  const [isCommittingReview, setIsCommittingReview] = useState(false)
  const [reviewCommitError, setReviewCommitError] = useState<string | null>(null)
  const [isCreateCategoryDialogOpen, setIsCreateCategoryDialogOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryTypeId, setNewCategoryTypeId] = useState<string>("")
  const [newCategoryBroadType, setNewCategoryBroadType] = useState<string>("Other")
  const [newCategoryTargetItemId, setNewCategoryTargetItemId] = useState<string | null>(null)
  const [receiptCategoryTypes, setReceiptCategoryTypes] = useState<Array<{ id: number; name: string; color: string | null }>>([])
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const availableBroadTypes = useMemo(() => {
    const broadTypes = new Set(getReceiptBroadTypes())
    reviewCategories.forEach((category) => {
      const value = category.broadType?.trim()
      if (value) broadTypes.add(value)
    })

    return Array.from(broadTypes).sort((a, b) => {
      if (a === "Other") return 1
      if (b === "Other") return -1
      return a.localeCompare(b)
    })
  }, [reviewCategories])
  const [activeReviewCategoryBroadType, setActiveReviewCategoryBroadType] = useState<string>("")
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
  const [limitExceededData, setLimitExceededData] = useState<TransactionLimitExceededData | null>(null)
  const [isLimitDialogOpen, setIsLimitDialogOpen] = useState(false)
  const [categoryLimitData, setCategoryLimitData] = useState<CategoryLimitExceededData | null>(null)
  const [isCategoryLimitDialogOpen, setIsCategoryLimitDialogOpen] = useState(false)

  const reviewCategoryByLowerName = useMemo(() => {
    const map = new Map<string, ReceiptCategoryOption>()
    reviewCategories.forEach((category) => {
      const key = category.name.trim().toLowerCase()
      if (!key) return
      map.set(key, category)
    })
    return map
  }, [reviewCategories])

  const reviewCategoryGroups = useMemo(() => {
    const grouped = new Map<string, ReceiptCategoryOption[]>()

    reviewCategories.forEach((category) => {
      const broadType = category.broadType || "Other"
      const bucket = grouped.get(broadType)
      if (bucket) bucket.push(category)
      else grouped.set(broadType, [category])
    })

    const groups = Array.from(grouped, ([broadType, categories]) => ({
      broadType,
      categories: categories.slice().sort((a, b) => a.name.localeCompare(b.name)),
    }))

    groups.sort((a, b) => {
      if (a.broadType === "Other") return 1
      if (b.broadType === "Other") return -1
      return a.broadType.localeCompare(b.broadType)
    })

    return groups
  }, [reviewCategories])

  useEffect(() => {
    if (reviewCategoryGroups.length === 0) return

    setActiveReviewCategoryBroadType((prev) => {
      if (prev && reviewCategoryGroups.some((group) => group.broadType === prev)) return prev
      const fallback =
        reviewCategoryGroups.find((group) => group.broadType !== "Other")?.broadType ||
        reviewCategoryGroups[0].broadType
      return fallback
    })
  }, [reviewCategoryGroups])

  // Stop scrolling and hide scrollbars while dragging files over the page.
  useLayoutEffect(() => {
    if (!isDraggingUpload) return

    const root = document.documentElement
    const body = document.body

    const previousRootOverflow = root.style.overflow
    const previousRootOverscrollBehavior = root.style.overscrollBehavior
    const previousBodyOverflow = body.style.overflow
    const previousBodyPaddingRight = body.style.paddingRight
    const previousDragAttribute = root.getAttribute("data-file-dragging")

    root.style.overflow = "hidden"
    root.style.overscrollBehavior = "none"
    body.style.overflow = "hidden"
    root.setAttribute("data-file-dragging", "true")

    const preventScroll = (event: Event) => {
      event.preventDefault()
    }

    window.addEventListener("wheel", preventScroll, { passive: false, capture: true })
    window.addEventListener("touchmove", preventScroll, { passive: false, capture: true })

    return () => {
      root.style.overflow = previousRootOverflow
      root.style.overscrollBehavior = previousRootOverscrollBehavior
      body.style.overflow = previousBodyOverflow
      body.style.paddingRight = previousBodyPaddingRight
      if (previousDragAttribute === null) root.removeAttribute("data-file-dragging")
      else root.setAttribute("data-file-dragging", previousDragAttribute)

      window.removeEventListener("wheel", preventScroll, true)
      window.removeEventListener("touchmove", preventScroll, true)
    }
  }, [isDraggingUpload])

  // Listen for date filter changes from SiteHeader
  useEffect(() => {
    const handleFilterChange = (event: CustomEvent) => {
      setDateFilter(event.detail ?? null)
    }

    window.addEventListener("dateFilterChanged", handleFilterChange as EventListener)
    const savedFilter = localStorage.getItem("dateFilter")
    if (savedFilter) setDateFilter(savedFilter as DateFilterType)

    return () => {
      window.removeEventListener("dateFilterChanged", handleFilterChange as EventListener)
    }
  }, [])

  // Listen for pending uploads from sidebar Upload button
  useEffect(() => {
    const pendingFile = (window as any).__pendingUploadFile
    const targetPage = (window as any).__pendingUploadTargetPage

    if (pendingFile && targetPage === "fridge") {
      // Clear the pending upload markers
      delete (window as any).__pendingUploadFile
      delete (window as any).__pendingUploadTargetPage

      // Open the upload dialog with the pending file
      openUploadDialogWithFiles([pendingFile])
    }
  }, [])

  const projectLead = useMemo(() => {
    if (!isUserLoaded || !user) return null

    const label =
      user.fullName ||
      user.username ||
      user.primaryEmailAddress?.emailAddress ||
      "You"

    return { id: user.id, name: label, imageUrl: user.imageUrl }
  }, [isUserLoaded, user])

  useEffect(() => {
    if (!isReviewDialogOpen) return

    let cancelled = false

    async function loadReceiptCategories() {
      try {
        const response = await fetch("/api/receipt-categories")
        if (!response.ok) return
        const payload = (await response.json()) as Array<{
          name?: string
          color?: string | null
          broadType?: string | null
          broad_type?: string | null
          typeName?: string
          typeColor?: string | null
          type_name?: string
          type_color?: string | null
        }>

        if (cancelled) return

        const normalized = Array.isArray(payload)
          ? payload
            .map((category) => {
              const name = typeof category?.name === "string" ? category.name : ""
              const defaultCategory = getReceiptCategoryByName(name)
              const broadTypeValue =
                typeof category?.broadType === "string"
                  ? category.broadType.trim()
                  : typeof category?.broad_type === "string"
                    ? category.broad_type.trim()
                    : defaultCategory?.broadType || "Other"

              return {
                name,
                color: typeof category?.color === "string" ? category.color : null,
                typeName:
                  typeof category?.typeName === "string"
                    ? category.typeName
                    : typeof category?.type_name === "string"
                      ? category.type_name
                      : "",
                typeColor:
                  typeof category?.typeColor === "string"
                    ? category.typeColor
                    : typeof category?.type_color === "string"
                      ? category.type_color
                      : null,
                broadType: broadTypeValue || "Other",
              }
            })
            .filter((category) => category.name.trim().length > 0)
          : []

        setReviewCategories(normalized)
      } catch {
        // Ignore — review can still render with existing category values.
      }
    }

    async function loadReceiptCategoryTypes() {
      try {
        const response = await fetch("/api/receipt-categories/types")
        if (!response.ok) return
        const payload = (await response.json()) as Array<{
          id?: number
          name?: string
          color?: string | null
        }>

        if (cancelled) return

        const types = Array.isArray(payload)
          ? payload
            .map((type) => ({
              id: typeof type?.id === "number" ? type.id : 0,
              name: typeof type?.name === "string" ? type.name : "",
              color: typeof type?.color === "string" ? type.color : null,
            }))
            .filter((type) => type.id > 0 && type.name.trim().length > 0)
          : []

        setReceiptCategoryTypes(types)
        if (types.length > 0 && !newCategoryTypeId) {
          setNewCategoryTypeId(String(types[0].id))
        }
      } catch {
        // Ignore
      }
    }

    void loadReceiptCategories()
    void loadReceiptCategoryTypes()

    return () => {
      cancelled = true
    }
  }, [isReviewDialogOpen])

  const handleCreateCategory = useCallback(async () => {
    const trimmedName = newCategoryName.trim()
    if (!trimmedName || !newCategoryTypeId) {
      toast.error("Please enter a category name and select a type")
      return
    }

    try {
      setIsCreatingCategory(true)
      const response = await fetch("/api/receipt-categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          typeId: Number(newCategoryTypeId),
          broadType: newCategoryBroadType || "Other",
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))

        // Check for category limit exceeded
        if (response.status === 403 && errorData.code === 'CATEGORY_LIMIT_EXCEEDED') {
          setCategoryLimitData({
            code: 'CATEGORY_LIMIT_EXCEEDED',
            type: 'receipt',
            plan: errorData.plan || 'free',
            transactionCap: errorData.capacity?.transactionCap,
            receiptCap: errorData.capacity?.receiptCap,
            transactionUsed: errorData.capacity?.transactionUsed,
            receiptUsed: errorData.capacity?.receiptUsed,
            transactionRemaining: errorData.capacity?.transactionRemaining,
            receiptRemaining: errorData.capacity?.receiptRemaining,
            message: errorData.message,
            upgradePlans: errorData.capacity?.upgradePlans
          })
          setIsCategoryLimitDialogOpen(true)
          setIsCreatingCategory(false)
          return
        }

        throw new Error(errorData.error || "Failed to create category")
      }

      const created = await response.json()

      // Reload categories
      const categoriesResponse = await fetch("/api/receipt-categories")
      if (categoriesResponse.ok) {
        const payload = (await categoriesResponse.json()) as Array<{
          name?: string
          color?: string | null
          broadType?: string | null
          broad_type?: string | null
          typeName?: string
          typeColor?: string | null
          type_name?: string
          type_color?: string | null
        }>

        const normalized = Array.isArray(payload)
          ? payload
            .map((category) => {
              const name = typeof category?.name === "string" ? category.name : ""
              const defaultCategory = getReceiptCategoryByName(name)
              const broadTypeValue =
                typeof category?.broadType === "string"
                  ? category.broadType.trim()
                  : typeof category?.broad_type === "string"
                    ? category.broad_type.trim()
                    : defaultCategory?.broadType || "Other"

              return {
                name,
                color: typeof category?.color === "string" ? category.color : null,
                typeName:
                  typeof category?.typeName === "string"
                    ? category.typeName
                    : typeof category?.type_name === "string"
                      ? category.type_name
                      : "",
                typeColor:
                  typeof category?.typeColor === "string"
                    ? category.typeColor
                    : typeof category?.type_color === "string"
                      ? category.type_color
                      : null,
                broadType: broadTypeValue || "Other",
              }
            })
            .filter((category) => category.name.trim().length > 0)
          : []

        setReviewCategories(normalized)
      }

      const createdName = typeof created?.name === "string" && created.name.trim().length > 0 ? created.name.trim() : trimmedName
      const targetItemId = newCategoryTargetItemId
      if (targetItemId) {
        setReviewReceipts((prev) =>
          prev.map((receipt) => ({
            ...receipt,
            transactions: receipt.transactions.map((item) =>
              item.id === targetItemId ? { ...item, categoryName: createdName } : item
            ),
          }))
        )
      }

      // Reset form
      setNewCategoryName("")
      setNewCategoryTargetItemId(null)
      setIsCreateCategoryDialogOpen(false)

      toast.success(`Category "${created.name || trimmedName}" created successfully`)
    } catch (error) {
      console.error("[Create Receipt Category] Error:", error)
      const message = error instanceof Error ? error.message : "Failed to create category"
      toast.error(message)
    } finally {
      setIsCreatingCategory(false)
    }
  }, [newCategoryName, newCategoryTypeId, newCategoryBroadType, newCategoryTargetItemId])

  const openUploadDialogWithFiles = useCallback((files: File[]) => {
    const supported = files.filter(isSupportedReceiptFile)
    const unsupported = files.filter((file) => !isSupportedReceiptFile(file))

    setUploadFiles(supported)
    setFileProgresses(() => {
      const initial: Record<string, number> = {}
      supported.forEach((file) => {
        initial[receiptUploadFileKey(file)] = 0
      })
      return initial
    })

    setUploadError(
      unsupported.length > 0
        ? `Unsupported file type(s): ${unsupported.map((f) => f.name).join(", ")}`
        : null
    )

    setProjectName(defaultReceiptProjectName(supported))
    setProjectNameEdited(false)
    setIsUploadDialogOpen(true)
  }, [])

  const resetUploadDialog = useCallback(() => {
    setIsUploadDialogOpen(false)
    setUploadFiles([])
    setFileProgresses({})
    setUploadError(null)
    setIsDraggingUpload(false)
    dragCounterRef.current = 0
    setProjectName("")
    setProjectNameEdited(false)
  }, [])

  const handleUploadDialogOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        if (isUploading) return
        resetUploadDialog()
        return
      }

      setIsUploadDialogOpen(true)
    },
    [isUploading, resetUploadDialog]
  )

  const resetReviewDialog = useCallback(() => {
    setIsReviewDialogOpen(false)
    setReviewReceipts([])
    setActiveReviewReceiptIndex(0)
    setReviewUploadWarnings([])
    setReviewCommitError(null)
    setIsCommittingReview(false)
  }, [])

  const handleReviewDialogOpenChange = useCallback((open: boolean) => {
    if (!open) {
      if (isCommittingReview) return
      resetReviewDialog()
      return
    }

    setIsReviewDialogOpen(true)
  }, [isCommittingReview, resetReviewDialog])

  const handleUploadFilesChange = useCallback(
    (nextFiles: File[]) => {
      const supported = nextFiles.filter(isSupportedReceiptFile)
      const unsupported = nextFiles.filter((file) => !isSupportedReceiptFile(file))

      setUploadFiles(supported)
      setFileProgresses((prev) => {
        const next: Record<string, number> = {}
        supported.forEach((file) => {
          const key = receiptUploadFileKey(file)
          next[key] = prev[key] ?? 0
        })
        return next
      })

      setUploadError(
        unsupported.length > 0
          ? `Unsupported file type(s): ${unsupported.map((f) => f.name).join(", ")}`
          : null
      )

      if (!projectNameEdited) {
        setProjectName(defaultReceiptProjectName(supported))
      }
    },
    [projectNameEdited]
  )

  const handleProjectNameChange = useCallback((next: string) => {
    setProjectName(next)
    setProjectNameEdited(true)
  }, [])

  const handleUploadDragEnter = useCallback((e: React.DragEvent) => {
    if (!isFileDragEvent(e)) return
    e.preventDefault()
    e.stopPropagation()

    dragCounterRef.current++
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDraggingUpload(true)
    }
  }, [])

  const handleUploadDragLeave = useCallback((e: React.DragEvent) => {
    if (!isFileDragEvent(e)) return
    e.preventDefault()
    e.stopPropagation()

    dragCounterRef.current--
    if (dragCounterRef.current === 0) {
      setIsDraggingUpload(false)
    }
  }, [])

  const handleUploadDragOver = useCallback((e: React.DragEvent) => {
    if (!isFileDragEvent(e)) return
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleUploadDrop = useCallback(
    (e: React.DragEvent) => {
      if (!isFileDragEvent(e)) return
      e.preventDefault()
      e.stopPropagation()

      setIsDraggingUpload(false)
      dragCounterRef.current = 0

      const files = Array.from(e.dataTransfer.files || [])
      if (files.length === 0) return

      openUploadDialogWithFiles(files)
    },
    [openUploadDialogWithFiles]
  )

  const setProgressForFile = useCallback((fileKey: string, progress: number) => {
    const next = Math.max(0, Math.min(100, progress))
    setFileProgresses((prev) => ({ ...prev, [fileKey]: next }))
  }, [])

  const activeReviewReceipt = useMemo(() => {
    if (reviewReceipts.length === 0) return null
    const clampedIndex = Math.min(Math.max(activeReviewReceiptIndex, 0), reviewReceipts.length - 1)
    return reviewReceipts[clampedIndex] ?? reviewReceipts[0]
  }, [activeReviewReceiptIndex, reviewReceipts])

  useEffect(() => {
    setActiveReviewReceiptIndex((prev) => {
      if (reviewReceipts.length === 0) return 0
      return Math.min(Math.max(prev, 0), reviewReceipts.length - 1)
    })
  }, [reviewReceipts.length])

  const hasMultipleReviewReceipts = reviewReceipts.length > 1
  const isFirstReviewReceipt = activeReviewReceiptIndex <= 0
  const isLastReviewReceipt = activeReviewReceiptIndex >= reviewReceipts.length - 1

  const updateReviewItemCategory = useCallback((itemId: string, value: string) => {
    const uncategorizedValue = "__uncategorized__"
    const categoryName = value === uncategorizedValue ? null : value

    setReviewReceipts((prev) =>
      prev.map((receipt) => ({
        ...receipt,
        transactions: receipt.transactions.map((item) =>
          item.id === itemId ? { ...item, categoryName } : item
        ),
      }))
    )
  }, [])

  const updateReviewItemBroadType = useCallback((itemId: string, value: string) => {
    const broadType = value === "" ? null : value

    setReviewReceipts((prev) =>
      prev.map((receipt) => ({
        ...receipt,
        transactions: receipt.transactions.map((item) =>
          item.id === itemId ? { ...item, broadType } : item
        ),
      }))
    )
  }, [])

  const updateReviewItemCategoryType = useCallback((itemId: string, value: string) => {
    const categoryTypeName = value === "" ? null : value

    setReviewReceipts((prev) =>
      prev.map((receipt) => ({
        ...receipt,
        transactions: receipt.transactions.map((item) =>
          item.id === itemId ? { ...item, categoryTypeName } : item
        ),
      }))
    )
  }, [])

  const updateReviewItemQuantity = useCallback((itemId: string, quantity: number) => {
    const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1

    setReviewReceipts((prev) =>
      prev.map((receipt) => ({
        ...receipt,
        transactions: receipt.transactions.map((item) => {
          if (item.id !== itemId) return item
          const nextTotalPrice = Number((item.pricePerUnit * safeQuantity).toFixed(2))
          return { ...item, quantity: Number(safeQuantity.toFixed(2)), totalPrice: nextTotalPrice }
        }),
      }))
    )
  }, [])

  const deleteReviewItem = useCallback((itemId: string) => {
    setReviewReceipts((prev) =>
      prev.map((receipt) => ({
        ...receipt,
        transactions: receipt.transactions.filter((item) => item.id !== itemId),
      })).filter((receipt) => receipt.transactions.length > 0)
    )
    setOpenDropdownId(null)
  }, [])

  const handleUploadContinue = useCallback(async () => {
    if (isUploading) return

    if (!isUserLoaded || !user) {
      setUploadError("Please sign in to upload receipts.")
      return
    }

    const filesToUpload = uploadFiles.filter(isSupportedReceiptFile)
    if (filesToUpload.length === 0) {
      setUploadError("Add a receipt image or PDF to upload.")
      return
    }

    setIsUploading(true)
    setUploadError(null)

    const processedReceipts: UploadedReceipt[] = []
    const failures: Array<{ fileName: string; reason: string }> = []

    try {
      for (const file of filesToUpload) {
        const fileKey = receiptUploadFileKey(file)
        try {
          setProgressForFile(fileKey, 10)

          const formData = new FormData()
          formData.append("file", file)

          setProgressForFile(fileKey, 30)

          const uploadResponse = await fetch("/api/receipts/upload", {
            method: "POST",
            body: formData,
          })

          if (!uploadResponse.ok) {
            const responseText = await uploadResponse.text()

            // Check if it's a limit exceeded response
            try {
              const parsed = JSON.parse(responseText)

              if (parsed.code === 'LIMIT_EXCEEDED' && uploadResponse.status === 403) {
                // Show limit exceeded dialog instead of generic error
                setLimitExceededData(parsed as TransactionLimitExceededData)
                setIsLimitDialogOpen(true)
                setIsUploading(false)
                return
              }

              const errorMessage = parsed.error || parsed.message || `HTTP error! status: ${uploadResponse.status}`
              throw new Error(errorMessage)
            } catch (parseError) {
              if (parseError instanceof Error && parseError.message.startsWith('HTTP error')) {
                throw parseError
              }
              throw new Error(responseText || `HTTP error! status: ${uploadResponse.status}`)
            }
          }

          const payload = (await uploadResponse.json()) as {
            receipts?: UploadedReceipt[]
            rejected?: Array<{ fileName: string; reason: string }>
          }

          const receipt = payload.receipts?.[0]
          const rejection = payload.rejected?.find((r) => r.fileName === file.name)

          if (!receipt?.receiptId) {
            throw new Error(rejection?.reason || "Receipt upload failed.")
          }

          processedReceipts.push(receipt)
          setProgressForFile(fileKey, 100)
        } catch (error) {
          const message = (error as Error)?.message || String(error)
          failures.push({ fileName: file.name, reason: message })
          setProgressForFile(fileKey, 0)
        }
      }
    } finally {
      setIsUploading(false)
    }

    if (processedReceipts.length === 0) {
      const summary =
        failures.length > 0
          ? `Failed to upload ${failures[0].fileName}: ${failures[0].reason}`
          : "Receipt upload failed."
      setUploadError(summary)
      return
    }

    resetUploadDialog()

    if (processedReceipts.length > 0) {
      setReviewReceipts(processedReceipts)
      setActiveReviewReceiptIndex(0)
      setReviewUploadWarnings(failures)
      setReviewCommitError(null)
      setIsCommittingReview(false)
      setIsReviewDialogOpen(true)

      if (failures.length > 0) {
        toast.warning(`Skipped ${failures.length} receipt(s) that failed to upload.`)
      }
    }
  }, [
    isUploading,
    isUserLoaded,
    resetUploadDialog,
    setProgressForFile,
    setReviewReceipts,
    setActiveReviewReceiptIndex,
    setReviewUploadWarnings,
    setReviewCommitError,
    setIsCommittingReview,
    setIsReviewDialogOpen,
    uploadFiles,
    user,
  ])

  const handleCommitReview = useCallback(async () => {
    if (isCommittingReview) return
    if (reviewReceipts.length === 0) {
      resetReviewDialog()
      return
    }

    setIsCommittingReview(true)
    setReviewCommitError(null)

    try {
      const response = await fetch("/api/receipts/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receipts: reviewReceipts.map((receipt) => ({
            fileId: receipt.fileId,
            fileName: receipt.fileName,
            storeName: receipt.storeName,
            receiptDate: receipt.receiptDate,
            receiptTime: receipt.receiptTime,
            currency: receipt.currency,
            totalAmount: receipt.totalAmount,
            transactions: receipt.transactions.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              pricePerUnit: item.pricePerUnit,
              totalPrice: item.totalPrice,
              categoryName: item.categoryName,
              broadType: item.broadType,
              categoryTypeName: item.categoryTypeName,
            })),
          })),
        }),
      })

      if (!response.ok) {
        const responseText = await response.text()
        try {
          const parsed = JSON.parse(responseText)

          // Check if it's a limit exceeded response
          if (parsed.code === 'LIMIT_EXCEEDED' && response.status === 403) {
            // Show limit exceeded dialog and close review dialog
            setLimitExceededData(parsed as TransactionLimitExceededData)
            setIsLimitDialogOpen(true)
            resetReviewDialog()
            return
          }

          setReviewCommitError(parsed.error || parsed.message || responseText || "Failed to import receipts.")
        } catch {
          setReviewCommitError(responseText || "Failed to import receipts.")
        }
        return
      }

      const payload = (await response.json()) as {
        receipts?: Array<{ receiptId: string; fileId: string; status: string }>
        rejected?: Array<{ fileId: string; reason: string }>
      }

      const committed = Array.isArray(payload?.receipts) ? payload.receipts : []
      const rejected = Array.isArray(payload?.rejected) ? payload.rejected : []

      const fileNameByFileId = new Map(reviewReceipts.map((receipt) => [receipt.fileId, receipt.fileName]))

      if (committed.length === 0) {
        if (rejected.length > 0) {
          setReviewCommitError(
            rejected
              .map((entry) => {
                const fileName = fileNameByFileId.get(entry.fileId) ?? entry.fileId
                return `${fileName}: ${entry.reason}`
              })
              .join(" • ")
          )
        } else {
          setReviewCommitError("Nothing was imported.")
        }
        return
      }

      // Clear all caches and notify charts that data has changed
      clearResponseCache()
      window.dispatchEvent(new CustomEvent("transactionsUpdated"))

      setReceiptsRefreshNonce((n) => n + 1)

      const committedFileIds = new Set(committed.map((entry) => entry.fileId))
      const remainingReceipts = reviewReceipts.filter((receipt) => !committedFileIds.has(receipt.fileId))

      if (rejected.length > 0) {
        setReviewReceipts(remainingReceipts)
        setActiveReviewReceiptIndex(0)
        setReviewCommitError(
          rejected
            .map((entry) => {
              const fileName = fileNameByFileId.get(entry.fileId) ?? entry.fileId
              return `${fileName}: ${entry.reason}`
            })
            .join(" • ")
        )
        toast.warning(`Imported ${committed.length} receipt(s), skipped ${rejected.length}.`)
        return
      }

      toast.success(`Imported ${committed.length} receipt(s).`)
      resetReviewDialog()
    } catch (error) {
      setReviewCommitError((error as Error)?.message || "Failed to import receipts.")
    } finally {
      setIsCommittingReview(false)
    }
  }, [
    isCommittingReview,
    resetReviewDialog,
    reviewReceipts,
    setActiveReviewReceiptIndex,
    setReviewReceipts,
    setReceiptsRefreshNonce,
  ])

  useEffect(() => {
    const controller = new AbortController()

    async function loadReceiptTransactions() {
      setIsLoadingReceiptTransactions(true)
      try {
        const url = dateFilter
          ? `/api/fridge?filter=${encodeURIComponent(dateFilter)}&all=true`
          : "/api/fridge?all=true"
        const response = await fetch(url, { signal: controller.signal })
        if (!response.ok) {
          console.error("[Fridge] Failed to fetch receipt transactions:", response.statusText)
          setReceiptTransactions([])
          return
        }
        const data = (await response.json()) as ReceiptTransactionRow[]
        setReceiptTransactions(Array.isArray(data) ? data : [])
      } catch (error) {
        if ((error as any)?.name === "AbortError") return
        console.error("[Fridge] Error fetching receipt transactions:", error)
        setReceiptTransactions([])
      } finally {
        setIsLoadingReceiptTransactions(false)
      }
    }

    void loadReceiptTransactions()

    return () => {
      controller.abort()
    }
  }, [dateFilter, receiptsRefreshNonce])

  const receiptLineItems = useMemo(() => receiptTransactions, [receiptTransactions])

  const metrics = useMemo(() => {
    const totalSpent = receiptLineItems.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0)
    const receiptCount = new Set(receiptLineItems.map((item) => item.receiptId)).size
    const storeCount = new Set(receiptLineItems.map((item) => normalizeMerchantName(item.storeName))).size
    const shoppingTrips = receiptCount
    const averageReceipt = shoppingTrips > 0 ? totalSpent / shoppingTrips : 0

    // Calculate average days between trips
    const uniqueDates = Array.from(new Set(receiptLineItems.map((item) => item.receiptDate)))
      .filter(Boolean)
      .sort()

    let tripsFrequency = 0
    if (uniqueDates.length >= 2) {
      let totalDaysBetweenTrips = 0
      for (let i = 1; i < uniqueDates.length; i++) {
        const prevDate = new Date(uniqueDates[i - 1])
        const currDate = new Date(uniqueDates[i])
        const daysDiff = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
        totalDaysBetweenTrips += daysDiff
      }
      tripsFrequency = Number((totalDaysBetweenTrips / (uniqueDates.length - 1)).toFixed(1))
    }

    return {
      totalSpent,
      shoppingTrips,
      storesVisited: storeCount,
      averageReceipt,
      tripsFrequency,
    }
  }, [receiptLineItems])

  // Calculate trend data for each metric (daily aggregation)
  const metricsTrends = useMemo(() => {
    // Group data by date
    const dateData = new Map<string, {
      totalSpent: number;
      receiptIds: Set<string>;
      storeNames: Set<string>;
    }>()

    receiptLineItems.forEach((item) => {
      const date = item.receiptDate
      if (!date) return

      if (!dateData.has(date)) {
        dateData.set(date, {
          totalSpent: 0,
          receiptIds: new Set(),
          storeNames: new Set(),
        })
      }

      const dayData = dateData.get(date)!
      dayData.totalSpent += Number(item.totalPrice) || 0
      dayData.receiptIds.add(item.receiptId)
      dayData.storeNames.add(normalizeMerchantName(item.storeName))
    })

    // Sort dates and create trend arrays
    const sortedDates = Array.from(dateData.keys()).sort()

    // Total Spent trend (cumulative daily spending)
    const totalSpentTrend = sortedDates.map(date => ({
      date,
      value: dateData.get(date)!.totalSpent
    }))

    // Shopping Trips trend (cumulative receipts per day)
    let cumulativeTrips = 0
    const shoppingTripsTrend = sortedDates.map(date => {
      cumulativeTrips += dateData.get(date)!.receiptIds.size
      return { date, value: cumulativeTrips }
    })

    // Stores Visited trend (cumulative unique stores)
    const allStoresSeen = new Set<string>()
    const storesVisitedTrend = sortedDates.map(date => {
      dateData.get(date)!.storeNames.forEach(store => allStoresSeen.add(store))
      return { date, value: allStoresSeen.size }
    })

    // Average Receipt trend (running average)
    let runningTotalSpent = 0
    let runningTripCount = 0
    const averageReceiptTrend = sortedDates.map(date => {
      runningTotalSpent += dateData.get(date)!.totalSpent
      runningTripCount += dateData.get(date)!.receiptIds.size
      const avg = runningTripCount > 0 ? runningTotalSpent / runningTripCount : 0
      return { date, value: avg }
    })

    // Trips Frequency trend (rolling average days between trips)
    // This shows the pattern of how often shopping happens
    const tripsFrequencyTrend = sortedDates.map((date, index) => {
      if (index === 0) return { date, value: 0 }
      const prevDate = new Date(sortedDates[index - 1])
      const currDate = new Date(date)
      const daysDiff = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
      return { date, value: daysDiff }
    })

    return {
      totalSpentTrend,
      shoppingTripsTrend,
      storesVisitedTrend,
      averageReceiptTrend,
      tripsFrequencyTrend,
    }
  }, [receiptLineItems])

  const spendTrendData = useMemo(() => {
    // Use bundle data if available (pre-computed by server)
    if (bundleData?.dailySpending && bundleData.dailySpending.length > 0) {
      return bundleData.dailySpending
        .map(d => ({ date: d.date, spend: Number(d.total.toFixed(2)) }))
        .sort((a, b) => a.date < b.date ? -1 : 1)
    }

    // Fallback to receiptLineItems
    const totals = new Map<string, number>()
    receiptLineItems.forEach((item) => {
      const date = item.receiptDate
      const spend = Number(item.totalPrice) || 0
      totals.set(date, (totals.get(date) || 0) + spend)
    })
    return Array.from(totals.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, spend]) => ({ date, spend: Number(spend.toFixed(2)) }))
  }, [bundleData?.dailySpending, receiptLineItems])

  const basketBreakdownData = useMemo(() => {
    // Use bundle data if available (pre-computed by server)
    if (bundleData?.categorySpending && bundleData.categorySpending.length > 0) {
      return bundleData.categorySpending
        .map(c => ({ id: c.category, label: c.category, value: Number(c.total.toFixed(2)) }))
        .sort((a, b) => b.value - a.value)
    }

    // Fallback to receiptLineItems
    const totals = new Map<string, number>()
    receiptLineItems.forEach((item) => {
      const category = normalizeCategoryName(item.categoryName)
      const spend = Number(item.totalPrice) || 0
      totals.set(category, (totals.get(category) || 0) + spend)
    })

    return Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([category, value]) => ({
        id: category,
        label: category,
        value: Number(value.toFixed(2)),
      }))
  }, [bundleData?.categorySpending, receiptLineItems])

  const categoryFlowData = useMemo(() => {
    const monthTotals = new Map<string, Map<string, number>>()
    const categoryTotals = new Map<string, number>()

    receiptLineItems.forEach((item) => {
      const mKey = monthKey(item.receiptDate)
      const category = normalizeCategoryName(item.categoryName)
      const spend = Number(item.totalPrice) || 0

      const bucket = monthTotals.get(mKey) ?? new Map<string, number>()
      bucket.set(category, (bucket.get(category) || 0) + spend)
      monthTotals.set(mKey, bucket)

      categoryTotals.set(category, (categoryTotals.get(category) || 0) + spend)
    })

    const months = Array.from(monthTotals.keys()).sort()
    const yearCount = new Set(months.map((m) => m.slice(0, 4))).size
    const includeYear = yearCount > 1

    const topCategories = Array.from(categoryTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([category]) => category)

    const monthRanks = new Map<string, Map<string, number>>()
    months.forEach((mKey) => {
      const totals = monthTotals.get(mKey) ?? new Map<string, number>()
      const ranked = topCategories
        .map((category) => ({ category, value: totals.get(category) || 0 }))
        .sort((a, b) => b.value - a.value)

      const ranks = new Map<string, number>()
      ranked.forEach((entry, idx) => {
        ranks.set(entry.category, idx + 1)
      })
      monthRanks.set(mKey, ranks)
    })

    return topCategories.map((category) => ({
      id: category,
      data: months.map((mKey) => ({
        x: formatMonthLabel(mKey, includeYear),
        y: monthRanks.get(mKey)?.get(category) ?? topCategories.length,
      })),
    }))
  }, [receiptLineItems])

  const tableData = useMemo(() => {
    const receipts = new Map<
      string,
      {
        id: string
        storeName: string
        date: string
        totalAmount: number
        items: Array<{
          id: string
          name: string
          category: string
          categoryId?: number | null
          categoryColor?: string | null
          price: number
          quantity: number
        }>
      }
    >()
    const sortKeys = new Map<string, string>()
    const receiptTotals = new Map<string, number>()

    receiptLineItems.forEach((item) => {
      const receiptId = item.receiptId
      const storeName = normalizeMerchantName(item.storeName)
      const receiptDate = item.receiptDate
      const receiptTime = item.receiptTime || "00:00:00"

      sortKeys.set(receiptId, `${receiptDate}T${receiptTime}`)
      receiptTotals.set(
        receiptId,
        Math.max(receiptTotals.get(receiptId) || 0, Number(item.receiptTotalAmount) || 0)
      )

      const existing =
        receipts.get(receiptId) ??
        {
          id: receiptId,
          storeName,
          date: receiptDate,
          totalAmount: 0,
          items: [],
        }

      const quantity = Math.max(1, Number(item.quantity) || 1)
      const pricePerUnit =
        Number(item.pricePerUnit) > 0
          ? Number(item.pricePerUnit)
          : Number(item.totalPrice) > 0
            ? Number(item.totalPrice) / quantity
            : 0

      existing.items.push({
        id: String(item.id),
        name: item.description,
        category: normalizeCategoryName(item.categoryName),
        categoryId: item.categoryId,
        categoryColor: item.categoryColor,
        price: Number(pricePerUnit.toFixed(2)),
        quantity,
      })

      existing.totalAmount += Number(item.totalPrice) || 0
      receipts.set(receiptId, existing)
    })

    return Array.from(receipts.values())
      .map((receipt) => {
        const totalFromDb = receiptTotals.get(receipt.id) || 0
        const totalAmount = totalFromDb > 0 ? totalFromDb : receipt.totalAmount
        return {
          ...receipt,
          totalAmount: Number(totalAmount.toFixed(2)),
        }
      })
      .sort((a, b) => {
        const aKey = sortKeys.get(a.id) || ""
        const bKey = sortKeys.get(b.id) || ""
        return aKey < bKey ? 1 : aKey > bKey ? -1 : 0
      })
  }, [receiptLineItems])

  // @dnd-kit: Chart order state with persistence (replaces GridStack refs)
  const CHART_ORDER_STORAGE_KEY = 'fridge-chart-order'
  const [chartOrder, setChartOrder] = useState<FridgeChartId[]>(FRIDGE_CHART_ORDER)

  // Load chart order from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CHART_ORDER_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length === FRIDGE_CHART_ORDER.length) {
          setChartOrder(parsed)
        }
      }
    } catch (e) {
      console.error("Failed to load chart order:", e)
    }
  }, [])

  // Handle chart order change from drag-and-drop
  const handleChartOrderChange = useCallback((newOrder: string[]) => {
    setChartOrder(newOrder as FridgeChartId[])
    try {
      localStorage.setItem(CHART_ORDER_STORAGE_KEY, JSON.stringify(newOrder))
    } catch (e) {
      console.error("Failed to save chart order:", e)
    }
  }, [])

  const loadChartSizes = useCallback((): Record<string, { w: number; h: number; x?: number; y?: number }> => {
    if (typeof window === "undefined") return {}
    try {
      const saved = localStorage.getItem(CHART_SIZES_STORAGE_KEY)
      const savedSizes = saved ? JSON.parse(saved) : {}
      const savedVersion = localStorage.getItem(CHART_SIZES_VERSION_KEY)
      const needsUpdate = savedVersion !== DEFAULT_SIZES_VERSION

      const result: Record<string, { w: number; h: number; x?: number; y?: number }> = {}
      let hasChanges = false

      Object.keys(DEFAULT_CHART_SIZES).forEach((chartId) => {
        const defaultSize = DEFAULT_CHART_SIZES[chartId as FridgeChartId]
        const savedSize = savedSizes[chartId]

        const finalSize =
          needsUpdate || !savedSize
            ? { w: defaultSize.w, h: defaultSize.h, x: savedSize?.x ?? defaultSize.x, y: savedSize?.y ?? defaultSize.y }
            : { w: savedSize.w, h: savedSize.h, x: savedSize.x ?? defaultSize.x, y: savedSize.y ?? defaultSize.y }

        result[chartId] = finalSize

        if (needsUpdate && (!savedSize || savedSize.w !== defaultSize.w || savedSize.h !== defaultSize.h)) {
          hasChanges = true
        }
      })

      if (needsUpdate || hasChanges) {
        localStorage.setItem(CHART_SIZES_STORAGE_KEY, JSON.stringify(result))
        localStorage.setItem(CHART_SIZES_VERSION_KEY, DEFAULT_SIZES_VERSION)
      }

      return result
    } catch (error) {
      console.error("Failed to load fridge chart sizes from localStorage:", error)
    }
    return {}
  }, [])

  const [savedChartSizes, setSavedChartSizes] = useState<Record<string, { w: number; h: number; x?: number; y?: number }>>({})
  const savedChartSizesRef = useRef<Record<string, { w: number; h: number; x?: number; y?: number }>>({})
  const [hasLoadedChartSizes, setHasLoadedChartSizes] = useState(false)

  const saveChartSizes = useCallback((sizes: Record<string, { w: number; h: number; x?: number; y?: number }>) => {
    savedChartSizesRef.current = sizes
    setSavedChartSizes(sizes)
    if (typeof window === "undefined") return
    try {
      localStorage.setItem(CHART_SIZES_STORAGE_KEY, JSON.stringify(sizes))
      localStorage.setItem(CHART_SIZES_VERSION_KEY, DEFAULT_SIZES_VERSION)
    } catch (error) {
      console.error("Failed to save fridge chart sizes to localStorage:", error)
    }
  }, [])

  // Load saved sizes after mount
  useEffect(() => {
    const loaded = loadChartSizes()
    savedChartSizesRef.current = loaded
    setSavedChartSizes(loaded)
    setHasLoadedChartSizes(true)
  }, [loadChartSizes])

  const handleChartResize = useCallback((id: string, w: number, h: number) => {
    const currentSizes = savedChartSizesRef.current
    const newSizes = { ...currentSizes, [id]: { ...currentSizes[id], w, h } }
    saveChartSizes(newSizes)
  }, [saveChartSizes])

  // NOTE: GridStack initialization removed - now using @dnd-kit for drag-and-drop
  // The SortableGridProvider handles all drag-and-drop functionality with built-in auto-scroll

  const renderChart = useCallback(
    (chartId: FridgeChartId) => {
      switch (chartId) {
        case "grocerySpendTrend":
          return <ChartAreaInteractiveFridge data={spendTrendData} />
        case "groceryCategoryRankings":
          return <ChartCategoryFlowFridge receiptTransactions={receiptTransactions} isLoading={isLoadingReceiptTransactions} dateFilter={dateFilter} />
        case "groceryExpenseBreakdown":
          return <ChartExpenseBreakdownFridge data={basketBreakdownData} isLoading={isLoadingReceiptTransactions} />
        case "groceryMacronutrientBreakdown":
          return <ChartMacronutrientBreakdownFridge receiptTransactions={receiptTransactions} isLoading={isLoadingReceiptTransactions} />
        case "grocerySnackPercentage":
          return <ChartSnackPercentageFridge receiptTransactions={receiptTransactions} isLoading={isLoadingReceiptTransactions} />
        case "groceryEmptyVsNutritious":
          return <ChartEmptyVsNutritiousFridge receiptTransactions={receiptTransactions} isLoading={isLoadingReceiptTransactions} />
        case "groceryDailyActivity":
          return <ChartDailyActivityFridge receiptTransactions={receiptTransactions} isLoading={isLoadingReceiptTransactions} />
        case "groceryDayOfWeekCategory":
          return <ChartDayOfWeekCategoryFridge receiptTransactions={receiptTransactions} dayOfWeekCategoryData={bundleData?.dayOfWeekCategory} isLoading={isLoadingReceiptTransactions} />
        case "grocerySingleMonthCategory":
          return <ChartSingleMonthCategoryFridge receiptTransactions={receiptTransactions} monthlyCategoriesData={bundleData?.monthlyCategories} isLoading={isLoadingReceiptTransactions} />
        case "groceryAllMonthsCategory":
          return <ChartAllMonthsCategoryFridge receiptTransactions={receiptTransactions} isLoading={isLoadingReceiptTransactions} />
        case "groceryDayOfWeekSpending":
          return <ChartDayOfWeekSpendingCategoryFridge receiptTransactions={receiptTransactions} isLoading={isLoadingReceiptTransactions} />
        case "groceryTimeOfDay":
          return <ChartTimeOfDayShoppingFridge receiptTransactions={receiptTransactions} hourlyActivityData={bundleData?.hourlyActivity} isLoading={isLoadingReceiptTransactions} />
        case "groceryVsRestaurant":
          return <ChartGroceryVsRestaurantFridge />
        case "groceryTransactionHistory":
          return <ChartTransactionHistoryFridge receiptTransactions={receiptTransactions} isLoading={isLoadingReceiptTransactions} />
        case "groceryPurchaseSizeComparison":
          return <ChartPurchaseSizeComparisonFridge receiptTransactions={receiptTransactions} isLoading={isLoadingReceiptTransactions} />
        case "groceryShoppingHeatmapHoursDays":
          return <ChartShoppingHeatmapHoursDaysFridge receiptTransactions={receiptTransactions} hourDayHeatmapData={bundleData?.hourDayHeatmap} isLoading={isLoadingReceiptTransactions} />
        case "groceryShoppingHeatmapDaysMonths":
          return <ChartShoppingHeatmapDaysMonthsFridge receiptTransactions={receiptTransactions} dayMonthHeatmapData={bundleData?.dayMonthHeatmap} isLoading={isLoadingReceiptTransactions} />
        case "groceryNetWorthAllocation":
          return <ChartTreeMapFridge receiptTransactions={receiptTransactions} isLoading={isLoadingReceiptTransactions} />
        default:
          return null
      }
    },
    [basketBreakdownData, categoryFlowData, isLoadingReceiptTransactions, receiptTransactions, spendTrendData, bundleData, dateFilter]
  )

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72 - 15px)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <main
          className="flex-1 space-y-4 pt-0 lg:pt-2"
          onDragEnter={handleUploadDragEnter}
          onDragLeave={handleUploadDragLeave}
          onDragOver={handleUploadDragOver}
          onDrop={handleUploadDrop}
        >
          {isDraggingUpload &&
            typeof document !== "undefined" &&
            createPortal(
              <>
                <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity duration-300 pointer-events-none" />
                <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none px-4 overflow-hidden">
                  <Card className="w-full max-w-md border-2 border-dashed border-primary/50 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-300">
                    <CardHeader className="text-center pb-4">
                      <div className="flex justify-center mb-4">
                        <div className="relative">
                          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                          <div className="relative bg-primary/10 p-6 rounded-full border-2 border-primary/30">
                            <Upload className="w-12 h-12 text-primary animate-bounce" />
                          </div>
                        </div>
                      </div>
                      <CardTitle className="text-2xl text-primary">Drop receipts here</CardTitle>
                      <CardDescription className="text-base mt-2">
                        Release to upload your receipt photo
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        <span>Ready to receive file</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>,
              document.body
            )}
          <div className="@container/main flex flex-1 flex-col gap-2 min-w-0">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 min-w-0 w-full">
              <SectionCardsFridge
                totalSpent={metrics.totalSpent}
                shoppingTrips={metrics.shoppingTrips}
                storesVisited={metrics.storesVisited}
                averageReceipt={metrics.averageReceipt}
                tripsFrequency={metrics.tripsFrequency}
                totalSpentTrend={metricsTrends.totalSpentTrend}
                shoppingTripsTrend={metricsTrends.shoppingTripsTrend}
                storesVisitedTrend={metricsTrends.storesVisitedTrend}
                averageReceiptTrend={metricsTrends.averageReceiptTrend}
                tripsFrequencyTrend={metricsTrends.tripsFrequencyTrend}
              />

              {/* @dnd-kit chart section */}
              <div className="w-full mb-4">
                <SortableGridProvider
                  chartOrder={chartOrder}
                  onOrderChange={handleChartOrderChange}
                  className="px-4 lg:px-6"
                >
                  {chartOrder.map((chartId) => {
                    const defaultSize = DEFAULT_CHART_SIZES[chartId]
                    const sizeConfig = getChartCardSize(FRIDGE_CHART_TO_ANALYTICS_CHART[chartId])

                    return (
                      <SortableGridItem
                        key={chartId}
                        id={chartId}
                        w={(savedChartSizes[chartId]?.w ?? defaultSize.w) as any}
                        h={savedChartSizes[chartId]?.h ?? defaultSize.h}
                        resizable
                        minW={sizeConfig.minW}
                        maxW={sizeConfig.maxW}
                        minH={sizeConfig.minH}
                        maxH={sizeConfig.maxH}
                        onResize={handleChartResize}
                      >
                        <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                          {renderChart(chartId)}
                        </div>
                      </SortableGridItem>
                    )
                  })}
                </SortableGridProvider>
              </div>

              <div className="w-full">
                <DataTableFridge
                  key={dateFilter ?? "all"}
                  data={tableData}
                  onReceiptsChanged={() => setReceiptsRefreshNonce((n) => n + 1)}
                />
              </div>

              {/* Price & Store Analysis Cards */}
              <div className="grid gap-4 md:grid-cols-2 px-4 lg:px-6 py-4 min-w-0">
                <CardPriceComparisonFridge
                  data={receiptTransactions.map(tx => ({
                    id: tx.id,
                    description: tx.description,
                    pricePerUnit: tx.pricePerUnit,
                    totalPrice: tx.totalPrice,
                    receiptDate: tx.receiptDate,
                    storeName: tx.storeName,
                  }))}
                  isLoading={isLoadingReceiptTransactions}
                />
                <CardStoreAnalysisFridge
                  data={receiptTransactions.map(tx => ({
                    id: tx.id,
                    description: tx.description,
                    pricePerUnit: tx.pricePerUnit,
                    totalPrice: tx.totalPrice,
                    receiptDate: tx.receiptDate,
                    storeName: tx.storeName,
                    categoryName: tx.categoryName,
                  }))}
                  isLoading={isLoadingReceiptTransactions}
                />
              </div>
            </div>
          </div>
        </main>

        <Dialog open={isUploadDialogOpen} onOpenChange={handleUploadDialogOpenChange}>
          <DialogContent className="p-0 border-0 bg-transparent shadow-none sm:max-w-[95vw] md:max-w-[720px]">
            <FileUpload01
              files={uploadFiles}
              fileProgresses={fileProgresses}
              isBusy={isUploading}
              error={uploadError}
              projectName={projectName}
              onProjectNameChange={handleProjectNameChange}
              projectLead={projectLead}
              onFilesChange={handleUploadFilesChange}
              onCancel={() => handleUploadDialogOpenChange(false)}
              onContinue={handleUploadContinue}
              continueLabel={isUploading ? "Uploading..." : "Upload receipts"}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={isReviewDialogOpen} onOpenChange={handleReviewDialogOpenChange}>
          <DialogContent className="border bg-background sm:max-w-[95vw] md:max-w-[1400px] max-h-[90vh] overflow-hidden">
            <div className="flex flex-col max-h-[85vh] overflow-hidden">
              <div className="flex flex-col gap-3 pb-4 border-b border-border/60">
                <div className="text-center">
                  <h2 className="text-2xl font-bold tracking-tight">Review Receipt Data</h2>
                  <p className="text-sm text-muted-foreground mt-2">
                    Adjust categories and quantities before your grocery insights update.
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center justify-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
                    AI extraction may not be perfect — please double-check for better tracking
                  </p>
                </div>

                {activeReviewReceipt ? (
                  <div className="flex items-start justify-between gap-3 text-sm text-muted-foreground">
                    <div className="min-w-0 truncate">
                      {activeReviewReceipt.storeName ? (
                        <span className="font-medium text-foreground">{activeReviewReceipt.storeName}</span>
                      ) : null}
                      {activeReviewReceipt.storeName && (activeReviewReceipt.receiptDate ?? activeReviewReceipt.fileName) ? " • " : null}
                      {activeReviewReceipt.receiptDate ?? activeReviewReceipt.fileName}
                    </div>
                    {reviewReceipts.length > 1 ? (
                      <div className="shrink-0 text-xs">
                        Receipt {activeReviewReceiptIndex + 1} of {reviewReceipts.length}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {reviewUploadWarnings.length > 0 ? (
                  <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
                    Skipped {reviewUploadWarnings.length} receipt(s) that failed to upload:{" "}
                    {reviewUploadWarnings.map((warning) => warning.fileName).join(", ")}
                  </div>
                ) : null}

                {reviewCommitError ? (
                  <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {reviewCommitError}
                  </div>
                ) : null}
              </div>

              <div className="flex-1 overflow-y-auto overflow-x-hidden pt-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40">
                {activeReviewReceipt ? (
                  <Table className="w-full table-fixed">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[20%]">Item</TableHead>
                        <TableHead className="w-[16%]">Category</TableHead>
                        <TableHead className="w-[14%]">Broad Type</TableHead>
                        <TableHead className="w-[14%]">Macronutrient</TableHead>
                        <TableHead className="w-[10%] text-center">Qty</TableHead>
                        <TableHead className="w-[10%] text-right">Unit</TableHead>
                        <TableHead className="w-[12%] text-right">Total</TableHead>
                        <TableHead className="w-[4%]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeReviewReceipt.transactions.map((item) => {
                        const rawCategoryName = (item.categoryName ?? "").trim()
                        const matchedCategory = rawCategoryName
                          ? (reviewCategoryByLowerName.get(rawCategoryName.toLowerCase()) ?? null)
                          : null
                        const categoryValue = rawCategoryName
                          ? matchedCategory?.name ?? rawCategoryName
                          : "__uncategorized__"
                        const selectedBroadType = matchedCategory?.broadType ?? null
                        const activeCategoryGroup =
                          reviewCategoryGroups.find((group) => group.broadType === activeReviewCategoryBroadType) ??
                          reviewCategoryGroups[0] ??
                          null
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="truncate">
                              <div className="truncate font-medium" title={item.description}>
                                {item.description}
                              </div>
                            </TableCell>
                            <TableCell className="truncate">
                              <Select
                                value={categoryValue}
                                open={openDropdownId === `category-${item.id}`}
                                onOpenChange={(open) => {
                                  if (open) {
                                    setOpenDropdownId(`category-${item.id}`)
                                    const nextBroadType = matchedCategory?.broadType
                                    if (nextBroadType) {
                                      setActiveReviewCategoryBroadType(nextBroadType)
                                    }
                                  } else {
                                    setOpenDropdownId(null)
                                  }
                                }}
                                onValueChange={(value) => {
                                  if (value === "__create_new__") {
                                    const inferredBroadType =
                                      activeReviewCategoryBroadType ||
                                      selectedBroadType ||
                                      "Other"

                                    setNewCategoryBroadType(inferredBroadType)
                                    setNewCategoryTargetItemId(item.id)
                                    setIsCreateCategoryDialogOpen(true)
                                  } else {
                                    updateReviewItemCategory(item.id, value)
                                  }
                                  setOpenDropdownId(null)
                                }}
                                disabled={isCommittingReview}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select category">
                                    {matchedCategory ? (
                                      <span className="flex items-center gap-2">
                                        <span
                                          className="h-2 w-2 rounded-full shrink-0"
                                          style={{ backgroundColor: matchedCategory.color ?? "#64748b" }}
                                        />
                                        <span className="truncate">{matchedCategory.name}</span>
                                      </span>
                                    ) : categoryValue && categoryValue !== "__uncategorized__" ? (
                                      <span className="truncate">{categoryValue}</span>
                                    ) : null}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__uncategorized__">Uncategorized</SelectItem>
                                  {reviewCategoryGroups.length > 0 ? (
                                    <>
                                      <Separator className="my-1" />
                                      <div className="px-1 pb-1">
                                        <div className="flex flex-wrap gap-1">
                                          {reviewCategoryGroups.map((group) => {
                                            const isActive = group.broadType === activeReviewCategoryBroadType
                                            return (
                                              <button
                                                key={group.broadType}
                                                type="button"
                                                className={cn(
                                                  "inline-flex items-center rounded-md border px-2 py-1 text-[0.7rem] font-medium transition-colors",
                                                  isActive
                                                    ? "border-primary/30 bg-primary/10 text-primary"
                                                    : "border-border/60 bg-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                                )}
                                                onPointerDown={(event) => event.preventDefault()}
                                                onClick={() => setActiveReviewCategoryBroadType(group.broadType)}
                                              >
                                                {group.broadType}
                                              </button>
                                            )
                                          })}
                                        </div>
                                      </div>
                                      <Separator className="my-1" />
                                      {activeCategoryGroup ? (
                                        <div className="space-y-0.5">
                                          {activeCategoryGroup.categories.map((category) => (
                                            <SelectItem
                                              key={`${activeCategoryGroup.broadType}-${category.name}`}
                                              value={category.name}
                                            >
                                              <span className="flex items-center gap-2">
                                                <span
                                                  className="h-2 w-2 rounded-full border border-border/50"
                                                  style={{
                                                    backgroundColor: category.color ?? undefined,
                                                    borderColor: category.color ?? undefined,
                                                  }}
                                                />
                                                <span className="truncate">{category.name}</span>
                                              </span>
                                            </SelectItem>
                                          ))}
                                        </div>
                                      ) : null}
                                    </>
                                  ) : null}

                                  {matchedCategory &&
                                    activeCategoryGroup &&
                                    matchedCategory.broadType !== activeCategoryGroup.broadType ? (
                                    <SelectItem value={matchedCategory.name} className="hidden">
                                      <span className="flex items-center gap-2">
                                        <span
                                          className="h-2 w-2 rounded-full border border-border/50"
                                          style={{
                                            backgroundColor: matchedCategory.color ?? undefined,
                                            borderColor: matchedCategory.color ?? undefined,
                                          }}
                                        />
                                        <span className="truncate">{matchedCategory.name}</span>
                                      </span>
                                    </SelectItem>
                                  ) : null}

                                  {rawCategoryName && !matchedCategory ? (
                                    <SelectItem value={rawCategoryName} className="hidden">
                                      {rawCategoryName}
                                    </SelectItem>
                                  ) : null}
                                  <Separator className="my-1" />
                                  <SelectItem value="__create_new__">
                                    <span className="flex items-center gap-2">
                                      <Plus className="h-3 w-3" />
                                      Create new category
                                    </span>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="truncate">
                              <Select
                                value={item.broadType ?? selectedBroadType ?? ""}
                                open={openDropdownId === `broadtype-${item.id}`}
                                onOpenChange={(open) => {
                                  if (open) {
                                    setOpenDropdownId(`broadtype-${item.id}`)
                                  } else {
                                    setOpenDropdownId(null)
                                  }
                                }}
                                onValueChange={(value) => {
                                  updateReviewItemBroadType(item.id, value)
                                  setOpenDropdownId(null)
                                }}
                                disabled={isCommittingReview}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableBroadTypes.map((broadType) => (
                                    <SelectItem key={broadType} value={broadType}>
                                      {broadType}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="truncate">
                              <Select
                                value={item.categoryTypeName ?? matchedCategory?.typeName ?? ""}
                                open={openDropdownId === `macrotype-${item.id}`}
                                onOpenChange={(open) => {
                                  if (open) {
                                    setOpenDropdownId(`macrotype-${item.id}`)
                                  } else {
                                    setOpenDropdownId(null)
                                  }
                                }}
                                onValueChange={(value) => {
                                  updateReviewItemCategoryType(item.id, value)
                                  setOpenDropdownId(null)
                                }}
                                disabled={isCommittingReview}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select macro" />
                                </SelectTrigger>
                                <SelectContent>
                                  {receiptCategoryTypes.map((type) => (
                                    <SelectItem key={type.id} value={type.name}>
                                      {type.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-center">
                              {(() => {
                                const quantityValue = Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 1
                                const formattedQuantity = Number.isInteger(quantityValue) ? String(quantityValue) : quantityValue.toFixed(2)
                                const isAtMin = quantityValue <= 1
                                return (
                                  <div className="flex items-center justify-center gap-0.5 group/qty">
                                    {!isAtMin && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 shrink-0 opacity-0 pointer-events-none group-hover/qty:opacity-100 group-hover/qty:pointer-events-auto transition-opacity"
                                        onClick={() => updateReviewItemQuantity(item.id, Math.max(1, quantityValue - 1))}
                                        disabled={isCommittingReview}
                                        aria-label="Decrease quantity"
                                      >
                                        <Minus className="h-3.5 w-3.5" />
                                      </Button>
                                    )}
                                    {isAtMin && <div className="h-7 w-7 shrink-0" />}
                                    <span className="w-8 text-center tabular-nums font-medium">{formattedQuantity}</span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 shrink-0 opacity-0 pointer-events-none group-hover/qty:opacity-100 group-hover/qty:pointer-events-auto transition-opacity"
                                      onClick={() => updateReviewItemQuantity(item.id, quantityValue + 1)}
                                      disabled={isCommittingReview}
                                      aria-label="Increase quantity"
                                    >
                                      <Plus className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                )
                              })()}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              ${item.pricePerUnit.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums font-medium">
                              ${item.totalPrice.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                onClick={() => deleteReviewItem(item.id)}
                                disabled={isCommittingReview}
                                aria-label="Delete item"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-sm text-muted-foreground">No receipt selected.</div>
                )}
              </div>

              <div className="pt-4 border-t border-border/60 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {activeReviewReceipt ? (
                    <>
                      {activeReviewReceipt.transactions.length} item(s) • Total{" "}
                      <span className="font-medium text-foreground">
                        $
                        {activeReviewReceipt.transactions
                          .reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0)
                          .toFixed(2)}
                      </span>
                    </>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  {hasMultipleReviewReceipts ? (
                    <Button
                      variant="outline"
                      onClick={() =>
                        setActiveReviewReceiptIndex((prev) => Math.max(0, prev - 1))
                      }
                      disabled={isCommittingReview || isFirstReviewReceipt}
                    >
                      Back
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (isLastReviewReceipt) {
                        handleCommitReview()
                        return
                      }
                      setActiveReviewReceiptIndex((prev) =>
                        Math.min(reviewReceipts.length - 1, prev + 1)
                      )
                    }}
                    disabled={isCommittingReview || reviewReceipts.length === 0}
                  >
                    {isCommittingReview
                      ? "Importing..."
                      : isLastReviewReceipt
                        ? "Done"
                        : "Next"}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isCreateCategoryDialogOpen} onOpenChange={setIsCreateCategoryDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Receipt Category</DialogTitle>
              <DialogDescription>
                Add a new category to organize your receipt items. Select a macronutrient type and optionally choose a broad category to group it properly.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="category-name">Category Name</Label>
                <Input
                  id="category-name"
                  placeholder="e.g., Organic Vegetables"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newCategoryName.trim() && newCategoryTypeId) {
                      handleCreateCategory()
                    }
                  }}
                  disabled={isCreatingCategory}
                  autoFocus
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category-type">Macronutrient Type</Label>
                <Select
                  value={newCategoryTypeId}
                  onValueChange={setNewCategoryTypeId}
                  disabled={isCreatingCategory}
                >
                  <SelectTrigger id="category-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {receiptCategoryTypes.map((type) => (
                      <SelectItem key={type.id} value={String(type.id)}>
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full border border-border/50"
                            style={{
                              backgroundColor: type.color ?? undefined,
                              borderColor: type.color ?? undefined,
                            }}
                          />
                          {type.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category-broad-type">Broad Category</Label>
                <Select
                  value={newCategoryBroadType}
                  onValueChange={setNewCategoryBroadType}
                  disabled={isCreatingCategory}
                >
                  <SelectTrigger id="category-broad-type">
                    <SelectValue placeholder="Select broad category (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBroadTypes.map((broadType) => (
                      <SelectItem key={broadType} value={broadType}>
                        {broadType}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateCategoryDialogOpen(false)
                  setNewCategoryName("")
                  setNewCategoryTargetItemId(null)
                }}
                disabled={isCreatingCategory}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateCategory}
                disabled={isCreatingCategory || !newCategoryName.trim() || !newCategoryTypeId}
              >
                {isCreatingCategory ? "Creating..." : "Create Category"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Transaction Limit Exceeded Dialog */}
        {limitExceededData && (
          <TransactionLimitDialog
            open={isLimitDialogOpen}
            onOpenChange={(open) => {
              setIsLimitDialogOpen(open)
              if (!open) {
                setLimitExceededData(null)
              }
            }}
            data={limitExceededData}
            onUpgrade={() => {
              window.location.href = '/billing'
            }}
            onDeleteOld={() => {
              setIsLimitDialogOpen(false)
              setLimitExceededData(null)
              window.location.href = '/data-library'
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
              window.location.href = '/billing'
            }}
            onDeleteUnused={() => {
              setIsCategoryLimitDialogOpen(false)
              setCategoryLimitData(null)
              toast.info("Go to settings to manage your categories")
            }}
          />
        )}
      </SidebarInset>
    </SidebarProvider>
  )
}
