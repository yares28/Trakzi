"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
  useRef,
  type CSSProperties,
} from "react"
import { flushSync } from "react-dom"
import {
  IconAlertTriangle,
  IconCategory,
  IconCloudUpload,
  IconDatabase,
  IconDownload,
  IconEye,
  IconFolders,
  IconLoader2,
  IconPlus,
  IconRefresh,
  IconShieldCheck,
  IconTrash,
  IconUpload,
  IconFile,
  IconCircleCheck,
  IconAlertCircle,
  IconSearch,
  IconX,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
} from "@tabler/icons-react"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CategorySelect } from "@/components/category-select"
import { DataTable } from "@/components/data-table"
import { DEFAULT_CATEGORIES } from "@/lib/categories"
import {
  DEFAULT_RECEIPT_CATEGORIES,
  DEFAULT_RECEIPT_CATEGORY_TYPES,
} from "@/lib/receipt-categories"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { TransactionLimitDialog, type TransactionLimitExceededData } from "@/components/limits/transaction-limit-dialog"
import { CategoryLimitDialog, type CategoryLimitExceededData } from "@/components/limits/category-limit-dialog"
import { useCurrency } from "@/components/currency-provider"
import { formatDateForDisplay } from "@/lib/date"
import { normalizeTransactions, cn } from "@/lib/utils"
import { parseCsvToRows } from "@/lib/parsing/parseCsvToRows"
import { rowsToCanonicalCsv } from "@/lib/parsing/rowsToCanonicalCsv"
import { TxRow } from "@/lib/types/transactions"
import { memo } from "react"
import { safeCapture } from "@/lib/posthog-safe"

type ParsedRow = TxRow & { id: number }

// Memoized table row component to prevent unnecessary re-renders
const MemoizedTableRow = memo(function MemoizedTableRow({
  row,
  amount,
  category,
  isSelected,
  onSelectChange,
  onCategoryChange,
  onDelete,
  formatCurrency
}: {
  row: ParsedRow
  amount: number
  category: string
  isSelected: boolean
  onSelectChange: (value: boolean) => void
  onCategoryChange: (value: string) => void
  onDelete: () => void
  formatCurrency: (amount: number) => string
}) {
  return (
    <TableRow>
      <TableCell className="w-12">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelectChange(checked === true)}
          aria-label="Select transaction"
        />
      </TableCell>
      <TableCell className="w-28 flex-shrink-0">
        <div className="flex flex-col">
          <span>{row.date}</span>
          {row.time ? (
            <span className="text-xs text-muted-foreground">{row.time}</span>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="min-w-[350px] max-w-[600px]">
        <div className="truncate" title={row.description}>
          {row.description}
        </div>
      </TableCell>
      <TableCell className={cn("text-right font-medium w-24 flex-shrink-0", amount < 0 ? "text-red-500" : "text-green-500")}>
        {formatCurrency(amount)}
      </TableCell>
      <TableCell className="w-[140px] flex-shrink-0">
        <CategorySelect
          value={category}
          onValueChange={onCategoryChange}
        />
      </TableCell>
      <TableCell className="w-12 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={onDelete}
        >
          <IconTrash className="h-4 w-4" />
          <span className="sr-only">Delete</span>
        </Button>
      </TableCell>
    </TableRow>
  )
}, (prevProps, nextProps) => {
  return (
    prevProps.category === nextProps.category &&
    prevProps.row.id === nextProps.row.id &&
    prevProps.isSelected === nextProps.isSelected
  )
})

type Transaction = {
  id: number
  date: string
  description: string
  amount: number
  balance: number | null
  category: string
  receiptTransactionId?: number // For receipt transactions
  isReceipt?: boolean // Flag to identify receipt transactions
}

type Statement = {
  id: string
  name: string
  type: string
  date: string
  reviewer: string
  statementId: number | null
  fileId: string | null
  receiptId: string | null
}

type ReceiptCategoryOption = {
  name: string
  color: string | null
  typeName: string
  typeColor: string | null
}

type StatsResponse = {
  totalIncome: number
  totalExpenses: number
  savingsRate: number
  netWorth: number
  incomeChange: number
  expensesChange: number
  savingsRateChange: number
  netWorthChange: number
}

type Category = {
  id: number
  name: string
  color: string | null
  transactionCount: number
  totalSpend: number
  totalAmount?: number
  createdAt: string
}

type ReceiptCategoryType = {
  id: number
  name: string
  color: string | null
  createdAt: string
  categoryCount: number
  transactionCount: number
  totalSpend: number
}

type ReceiptCategory = {
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

type UserFile = {
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

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    Math.round(value)
  )

const formatFreshness = (input?: string | null) => {
  if (!input) return "Awaiting sync"
  const timestamp = new Date(input).getTime()
  if (Number.isNaN(timestamp)) return "Awaiting sync"
  const diffMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000))
  if (diffMinutes < 1) return "Updated just now"
  if (diffMinutes < 60) return `Updated ${diffMinutes}m ago`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `Updated ${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `Updated ${diffDays}d ago`
}

const formatBytes = (bytes: number) => {
  if (!bytes) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const idx = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024))
  )
  const value = bytes / Math.pow(1024, idx)
  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${units[idx]}`
}

const formatDateLabel = (input: string) =>
  formatDateForDisplay(input, [], {
    year: "numeric",
    month: "short",
    day: "numeric",
  })

export default function DataLibraryPage() {
  const { formatCurrency } = useCurrency()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isPending, startTransition] = useTransition()
  const [statements, setStatements] = useState<Statement[]>([])
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [receiptCategoryTypes, setReceiptCategoryTypes] = useState<ReceiptCategoryType[]>([])
  const [receiptCategories, setReceiptCategories] = useState<ReceiptCategory[]>([])
  const [userFiles, setUserFiles] = useState<UserFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [viewLoading, setViewLoading] = useState(false)
  const [selectedStatement, setSelectedStatement] = useState<Statement | null>(null)
  const [statementTransactions, setStatementTransactions] = useState<Transaction[]>([])
  const [dialogReceiptCategories, setDialogReceiptCategories] = useState<ReceiptCategoryOption[]>([])
  const [dialogReceiptCategoryTypes, setDialogReceiptCategoryTypes] = useState<Array<{ id: number; name: string; color: string | null }>>([])
  const [isCreateReceiptCategoryDialogOpen, setIsCreateReceiptCategoryDialogOpen] = useState(false)
  const [newDialogReceiptCategoryName, setNewDialogReceiptCategoryName] = useState("")
  const [newDialogReceiptCategoryTypeId, setNewDialogReceiptCategoryTypeId] = useState<string>("")
  const [isCreatingReceiptCategory, setIsCreatingReceiptCategory] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [statementToDelete, setStatementToDelete] = useState<Statement | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [addCategoryDialogOpen, setAddCategoryDialogOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryTier, setNewCategoryTier] = useState<"Essentials" | "Mandatory" | "Wants">("Wants")
  const [addCategoryLoading, setAddCategoryLoading] = useState(false)
  const [deleteCategoryDialogOpen, setDeleteCategoryDialogOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)
  const [deleteCategoryLoading, setDeleteCategoryLoading] = useState(false)

  const [addReceiptTypeDialogOpen, setAddReceiptTypeDialogOpen] = useState(false)
  const [newReceiptTypeName, setNewReceiptTypeName] = useState("")
  const [addReceiptTypeLoading, setAddReceiptTypeLoading] = useState(false)
  const [deleteReceiptTypeDialogOpen, setDeleteReceiptTypeDialogOpen] = useState(false)
  const [receiptTypeToDelete, setReceiptTypeToDelete] = useState<ReceiptCategoryType | null>(null)
  const [deleteReceiptTypeLoading, setDeleteReceiptTypeLoading] = useState(false)

  const [addReceiptCategoryDialogOpen, setAddReceiptCategoryDialogOpen] = useState(false)
  const [newReceiptCategoryName, setNewReceiptCategoryName] = useState("")
  const [newReceiptCategoryTypeId, setNewReceiptCategoryTypeId] = useState<string>("")
  const [addReceiptCategoryLoading, setAddReceiptCategoryLoading] = useState(false)
  const [deleteReceiptCategoryDialogOpen, setDeleteReceiptCategoryDialogOpen] = useState(false)
  const [receiptCategoryToDelete, setReceiptCategoryToDelete] = useState<ReceiptCategory | null>(null)
  const [deleteReceiptCategoryLoading, setDeleteReceiptCategoryLoading] = useState(false)

  // Search, pagination, and selection state for Categories table
  const [categorySearch, setCategorySearch] = useState("")
  const [categoryPage, setCategoryPage] = useState(0)
  const [categoryPageSize, setCategoryPageSize] = useState(10)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<number>>(new Set())

  // Search, pagination, and selection state for Receipt Category Types table
  const [receiptTypeSearch, setReceiptTypeSearch] = useState("")
  const [receiptTypePage, setReceiptTypePage] = useState(0)
  const [receiptTypePageSize, setReceiptTypePageSize] = useState(10)
  const [selectedReceiptTypeIds, setSelectedReceiptTypeIds] = useState<Set<number>>(new Set())

  // Search, pagination, and selection state for Receipt Categories table
  const [receiptCategorySearch, setReceiptCategorySearch] = useState("")
  const [receiptCategoryPage, setReceiptCategoryPage] = useState(0)
  const [receiptCategoryPageSize, setReceiptCategoryPageSize] = useState(10)
  const [selectedReceiptCategoryIds, setSelectedReceiptCategoryIds] = useState<Set<number>>(new Set())

  // Search, pagination, and selection state for Reports table
  const [reportsSearch, setReportsSearch] = useState("")
  const [reportsPage, setReportsPage] = useState(0)
  const [reportsPageSize, setReportsPageSize] = useState(10)
  const [selectedReportIds, setSelectedReportIds] = useState<Set<string>>(new Set())

  // CSV drop-to-import state
  const [isDragging, setIsDragging] = useState(false)
  const [droppedFile, setDroppedFile] = useState<File | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [parsingProgress, setParsingProgress] = useState(0)
  const [parsedCsv, setParsedCsv] = useState<string | null>(null)
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [fileId, setFileId] = useState<string | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [isAiReparseOpen, setIsAiReparseOpen] = useState(false)
  const [aiReparseContext, setAiReparseContext] = useState("")
  const [isAiReparsing, setIsAiReparsing] = useState(false)
  const [selectedParsedRowIds, setSelectedParsedRowIds] = useState<Set<number>>(new Set())
  const [transactionCount, setTransactionCount] = useState<number>(0)

  // Limit dialog state
  const [transactionLimitData, setTransactionLimitData] = useState<TransactionLimitExceededData | null>(null)
  const [isTransactionLimitDialogOpen, setIsTransactionLimitDialogOpen] = useState(false)
  const [categoryLimitData, setCategoryLimitData] = useState<CategoryLimitExceededData | null>(null)
  const [isCategoryLimitDialogOpen, setIsCategoryLimitDialogOpen] = useState(false)

  const dragCounterRef = useRef(0)
  const csvRegenerationTimerRef = useRef<NodeJS.Timeout | null>(null)
  const latestParsedRowsRef = useRef<ParsedRow[]>([])
  const preferenceUpdateTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pendingPreferenceEntriesRef = useRef<Array<{ description: string; category: string }>>([])

  const CATEGORY_TIER_STORAGE_KEY = "needsWantsCategoryTier"

  const saveCategoryTier = (categoryName: string, tier: "Essentials" | "Mandatory" | "Wants") => {
    if (typeof window === "undefined") return
    try {
      const key = categoryName.trim().toLowerCase()
      const raw = window.localStorage.getItem(CATEGORY_TIER_STORAGE_KEY)
      const map: Record<string, "Essentials" | "Mandatory" | "Wants"> = raw ? JSON.parse(raw) : {}
      map[key] = tier
      window.localStorage.setItem(CATEGORY_TIER_STORAGE_KEY, JSON.stringify(map))
    } catch {
      // ignore storage errors
    }
  }

  const totalTransactions = transactions.length
  const categorizedTransactions = transactions.filter(
    (tx) => tx.category && tx.category !== "Other"
  ).length
  const latestTransactionDate = transactions.reduce<string | null>(
    (latest, tx) => {
      if (!latest) return tx.date
      return new Date(tx.date) > new Date(latest) ? tx.date : latest
    },
    null
  )

  const latestStatementDate = statements.reduce<string | null>(
    (latest, stmt) => {
      if (!latest) return stmt.date
      return new Date(stmt.date) > new Date(latest) ? stmt.date : latest
    },
    null
  )

  const statementDistribution = useMemo(() => {
    return statements.reduce<Record<string, number>>((acc, stmt) => {
      acc[stmt.type] = (acc[stmt.type] || 0) + 1
      return acc
    }, {})
  }, [statements])

  // Filtered and sorted categories (by totalAmount descending)
  const filteredCategories = useMemo(() => {
    let result = categories
    if (categorySearch.trim()) {
      const searchLower = categorySearch.toLowerCase().trim()
      result = result.filter(cat =>
        cat.name.toLowerCase().includes(searchLower)
      )
    }
    // Sort by totalAmount descending (most spending first)
    return [...result].sort((a, b) => Math.abs(b.totalAmount ?? 0) - Math.abs(a.totalAmount ?? 0))
  }, [categories, categorySearch])

  // Filtered and sorted receipt category types (by totalSpend descending)
  const filteredReceiptTypes = useMemo(() => {
    let result = receiptCategoryTypes
    if (receiptTypeSearch.trim()) {
      const searchLower = receiptTypeSearch.toLowerCase().trim()
      result = result.filter(type =>
        type.name.toLowerCase().includes(searchLower)
      )
    }
    // Sort by totalSpend descending
    return [...result].sort((a, b) => Math.abs(b.totalSpend ?? 0) - Math.abs(a.totalSpend ?? 0))
  }, [receiptCategoryTypes, receiptTypeSearch])

  // Filtered and sorted receipt categories (by totalSpend descending)
  const filteredReceiptCategories = useMemo(() => {
    let result = receiptCategories
    if (receiptCategorySearch.trim()) {
      const searchLower = receiptCategorySearch.toLowerCase().trim()
      result = result.filter(cat =>
        cat.name.toLowerCase().includes(searchLower) ||
        cat.typeName.toLowerCase().includes(searchLower)
      )
    }
    // Sort by totalSpend descending
    return [...result].sort((a, b) => Math.abs(b.totalSpend ?? 0) - Math.abs(a.totalSpend ?? 0))
  }, [receiptCategories, receiptCategorySearch])

  // Reset pagination when search changes
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

  const [selectedReportType, setSelectedReportType] = useState<string>("all")

  // Get unique types from statements
  const uniqueReportTypes = useMemo(() => {
    const types = new Set(statements.map(stmt => stmt.type).filter(Boolean))
    return Array.from(types).sort()
  }, [statements])

  // Filter statements based on selected type and search
  const filteredStatements = useMemo(() => {
    let result = statements
    if (selectedReportType !== "all") {
      result = result.filter(stmt => stmt.type === selectedReportType)
    }
    if (reportsSearch.trim()) {
      const searchLower = reportsSearch.toLowerCase().trim()
      result = result.filter(stmt =>
        stmt.name.toLowerCase().includes(searchLower) ||
        (stmt.type && stmt.type.toLowerCase().includes(searchLower))
      )
    }
    return result
  }, [statements, selectedReportType, reportsSearch])

  const fetchLibraryData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Use the new bundle API instead of 7 separate calls
      const bundleRes = await fetch("/api/charts/data-library-bundle")

      if (!bundleRes.ok) {
        throw new Error(
          (await bundleRes.text()) || "Unable to load data library."
        )
      }

      const bundleData = await bundleRes.json()

      // Set all state from bundle response
      setTransactions(normalizeTransactions(bundleData.transactions) as Transaction[])
      setStats(bundleData.stats)
      setStatements(bundleData.statements)
      setCategories(bundleData.categories)
      setUserFiles(bundleData.userFiles)
      setReceiptCategoryTypes(bundleData.receiptCategoryTypes)
      setReceiptCategories(bundleData.receiptCategories)
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "We hit a snag while syncing the library."
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLibraryData()
  }, [fetchLibraryData])

  // Parse CSV when it changes
  useEffect(() => {
    if (parsedCsv) {
      const rows = parseCsvToRows(parsedCsv)
      const rowsWithId: ParsedRow[] = rows.map((row, index) => ({
        ...row,
        id: index,
        category: row.category || undefined
      }))
      setParsedRows(rowsWithId)
    } else {
      setParsedRows([])
    }
  }, [parsedCsv])

  // Keep ref in sync with parsedRows
  useEffect(() => {
    latestParsedRowsRef.current = parsedRows
  }, [parsedRows])

  useEffect(() => {
    return () => {
      if (preferenceUpdateTimerRef.current) {
        clearTimeout(preferenceUpdateTimerRef.current)
      }
    }
  }, [])

  const flushPreferenceUpdates = useCallback(async () => {
    const pending = pendingPreferenceEntriesRef.current
    if (pending.length === 0) return
    pendingPreferenceEntriesRef.current = []

    try {
      await fetch("/api/transactions/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: pending }),
      })
    } catch (error) {
      console.warn("[Data Library] Failed to store category preferences", error)
    }
  }, [])

  const schedulePreferenceUpdate = useCallback((entry: { description: string; category: string }) => {
    pendingPreferenceEntriesRef.current.push(entry)
    if (preferenceUpdateTimerRef.current) {
      clearTimeout(preferenceUpdateTimerRef.current)
    }
    preferenceUpdateTimerRef.current = setTimeout(() => {
      void flushPreferenceUpdates()
    }, 800)
  }, [flushPreferenceUpdates])

  const handleCategoryChange = useCallback((rowId: number, newCategory: string) => {
    flushSync(() => {
      setParsedRows((prevRows) => {
        const updatedRows = prevRows.map((row) => {
          if (row.id === rowId) {
            return { ...row, category: newCategory }
          }
          return row
        })
        latestParsedRowsRef.current = updatedRows
        return updatedRows
      })
    })

    const updatedRow = latestParsedRowsRef.current.find((row) => row.id === rowId)
    if (updatedRow && updatedRow.description.trim() && newCategory.trim()) {
      schedulePreferenceUpdate({ description: updatedRow.description, category: newCategory })
    }

    if (csvRegenerationTimerRef.current) {
      clearTimeout(csvRegenerationTimerRef.current)
    }

    csvRegenerationTimerRef.current = setTimeout(() => {
      const rowsForCsv = latestParsedRowsRef.current.map((row) => {
        const { id: _ignored, ...rest } = row
        void _ignored
        return rest as TxRow
      })
      const newCsv = rowsToCanonicalCsv(rowsForCsv)
      setParsedCsv(newCsv)
    }, 300)
  }, [schedulePreferenceUpdate])

  const handleToggleParsedRow = useCallback((rowId: number, value: boolean) => {
    setSelectedParsedRowIds((prev) => {
      const next = new Set(prev)
      if (value) {
        next.add(rowId)
      } else {
        next.delete(rowId)
      }
      return next
    })
  }, [])

  const handleSelectAllParsedRows = useCallback((value: boolean) => {
    if (!value) {
      setSelectedParsedRowIds(new Set())
      return
    }
    setSelectedParsedRowIds(new Set(parsedRows.map((row) => row.id)))
  }, [parsedRows])

  const handleDeleteRow = useCallback((rowId: number) => {
    flushSync(() => {
      setParsedRows((prevRows) => {
        const updatedRows = prevRows.filter((row) => row.id !== rowId)
        latestParsedRowsRef.current = updatedRows
        setTransactionCount(updatedRows.length)
        return updatedRows
      })
    })
    setSelectedParsedRowIds((prev) => {
      const next = new Set(prev)
      next.delete(rowId)
      return next
    })

    if (csvRegenerationTimerRef.current) {
      clearTimeout(csvRegenerationTimerRef.current)
    }

    csvRegenerationTimerRef.current = setTimeout(() => {
      const rowsForCsv = latestParsedRowsRef.current.map((row) => {
        const { id: _ignored, ...rest } = row
        void _ignored
        return rest as TxRow
      })
      const newCsv = rowsToCanonicalCsv(rowsForCsv)
      setParsedCsv(newCsv)
    }, 100)
  }, [])

  const handleDeleteSelectedRows = useCallback(() => {
    if (selectedParsedRowIds.size === 0) return
    const selectedIds = new Set(selectedParsedRowIds)

    flushSync(() => {
      setParsedRows((prevRows) => {
        const updatedRows = prevRows.filter((row) => !selectedIds.has(row.id))
        latestParsedRowsRef.current = updatedRows
        setTransactionCount(updatedRows.length)
        return updatedRows
      })
      setSelectedParsedRowIds(new Set())
    })

    if (csvRegenerationTimerRef.current) {
      clearTimeout(csvRegenerationTimerRef.current)
    }

    csvRegenerationTimerRef.current = setTimeout(() => {
      const rowsForCsv = latestParsedRowsRef.current.map((row) => {
        const { id: _ignored, ...rest } = row
        void _ignored
        return rest as TxRow
      })
      const newCsv = rowsToCanonicalCsv(rowsForCsv)
      setParsedCsv(newCsv)
    }, 100)
  }, [selectedParsedRowIds])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current++
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const parseFile = useCallback(async (file: File, options?: { parseMode?: "auto" | "ai"; aiContext?: string }) => {
    const parseMode = options?.parseMode ?? "auto"
    const aiContext = options?.aiContext?.trim()

    setDroppedFile(file)
    setIsDialogOpen(true)
    setIsParsing(true)
    setParsingProgress(0)
    setParseError(null)
    setParsedCsv(null)
    setFileId(null)
    setTransactionCount(0)
    setSelectedParsedRowIds(new Set())
    pendingPreferenceEntriesRef.current = []
    if (preferenceUpdateTimerRef.current) {
      clearTimeout(preferenceUpdateTimerRef.current)
      preferenceUpdateTimerRef.current = null
    }

    setParsingProgress(5)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("bankName", "Unknown")
      formData.append("parseMode", parseMode)
      if (aiContext) {
        formData.append("aiContext", aiContext)
      }

      let currentCategories = DEFAULT_CATEGORIES
      try {
        const categoriesResponse = await fetch("/api/categories")
        if (categoriesResponse.ok) {
          const payload = await categoriesResponse.json()
          const categoriesArray: Array<{ name?: string }> = Array.isArray(payload) ? payload : []
          const names = categoriesArray
            .map((cat) => cat?.name)
            .filter((name): name is string => typeof name === "string" && name.trim().length > 0)
          if (names.length > 0) {
            currentCategories = names
          }
        }
      } catch (categoriesError) {
        console.warn("[DATA-LIBRARY] Failed to load categories from API. Using defaults.", categoriesError)
      }

      setParsingProgress(20)

      const response = await fetch("/api/statements/parse", {
        method: "POST",
        headers: {
          "X-Custom-Categories": JSON.stringify(currentCategories),
        },
        body: formData,
      })

      const contentType = response.headers.get("content-type") || ""
      const fileIdHeader = response.headers.get("X-File-Id")
      const categorizationError = response.headers.get("X-Categorization-Error")
      const categorizationWarning = response.headers.get("X-Categorization-Warning")

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`
        const responseText = await response.text()

        try {
          const errorData = JSON.parse(responseText)
          errorMessage = errorData.error || errorMessage
        } catch {
          errorMessage = responseText || errorMessage
        }

        throw new Error(errorMessage)
      }

      let responseText = ""

      if (response.body) {
        const reader = response.body.getReader()
        const contentLength = response.headers.get("content-length")
        const total = contentLength ? parseInt(contentLength, 10) : 0
        let received = 0
        const decoder = new TextDecoder()
        const chunks: string[] = []

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          chunks.push(chunk)
          received += value.length

          if (total > 0) {
            const downloadProgress = (received / total) * 65
            setParsingProgress(25 + downloadProgress)
          } else {
            const estimatedTotal = file.size * 1.2
            const estimatedProgress = Math.min(25 + (received / estimatedTotal) * 65, 90)
            setParsingProgress(estimatedProgress)
          }
        }

        responseText = chunks.join("")
      } else {
        setParsingProgress(60)
        responseText = await response.text()
        setParsingProgress(90)
      }

      setParsingProgress(95)

      if (contentType.includes("application/json")) {
        try {
          const data = JSON.parse(responseText)
          if (!data.parseable) {
            setParseError(data.message || "File format not supported for parsing")
            setIsParsing(false)
            setParsingProgress(0)
            return
          }
        } catch {
          throw new Error("Invalid response from server")
        }
      }

      const csv = responseText
      setParsingProgress(100)

      const lines = csv.trim().split("\n")
      const count = lines.length > 1 ? lines.length - 1 : 0

      setParsedCsv(csv)
      setFileId(fileIdHeader)
      setTransactionCount(count)

      if (categorizationWarning === "true" && categorizationError) {
        const decodedError = decodeURIComponent(categorizationError)
        console.warn("AI categorization failed:", decodedError)
        toast.warning("Categorization Warning", {
          description: `AI categorization failed. All transactions defaulted to "Other". Error: ${decodedError.substring(0, 100)}`,
          duration: 10000,
        })
      }
    } catch (error) {
      setParsingProgress(0)
      console.error("Parse error:", error)
      const errorMessage =
        error instanceof Error ? error.message : "Failed to parse file. Please try again."
      setParseError(errorMessage)

      if (errorMessage.includes("DEMO_USER_ID") || errorMessage.includes("Authentication")) {
        toast.error("Configuration Error", {
          description: "Please configure DEMO_USER_ID in your environment variables.",
          duration: 10000,
        })
      } else if (errorMessage.includes("No transactions found")) {
        toast.error("No Transactions Found", {
          description: "The file was parsed but no transactions were detected. Please check the file format.",
          duration: 8000,
        })
      } else if (errorMessage.includes("Failed to parse") || errorMessage.includes("Parsing quality")) {
        toast.error("Parse Error", {
          description: errorMessage,
          duration: 8000,
        })
      } else {
        toast.error("Upload Error", {
          description: errorMessage,
          duration: 8000,
        })
      }
      setParsingProgress(0)
    } finally {
      setIsParsing(false)
    }
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    dragCounterRef.current = 0

    const files = Array.from(e.dataTransfer.files)
    if (files && files.length > 0) {
      await parseFile(files[0], { parseMode: "auto" })
    }
  }, [parseFile])

  const handleAiReparse = useCallback(async () => {
    if (!droppedFile) {
      toast.error("Missing file", {
        description: "Please drop a file before reparsing with AI.",
        duration: 6000,
      })
      return
    }

    setIsAiReparseOpen(false)
    setIsAiReparsing(true)
    try {
      await parseFile(droppedFile, { parseMode: "ai", aiContext: aiReparseContext })
    } finally {
      setIsAiReparsing(false)
    }
  }, [aiReparseContext, droppedFile, parseFile])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i]
  }

  const handleConfirm = async () => {
    if (!droppedFile || !parsedCsv || !fileId) {
      toast.error("Missing data", {
        description: "Please wait for the file to be parsed before confirming.",
      })
      return
    }

    setIsImporting(true)
    setImportProgress(0)

    const progressInterval = setInterval(() => {
      setImportProgress((prev) => {
        if (prev >= 90) return prev
        return prev + 10
      })
    }, 200)

    try {
      const extension = droppedFile.name.split(".").pop()?.toLowerCase() ?? "other"
      const rawFormat = extension === "pdf" ? "pdf" :
        extension === "csv" ? "csv" :
          (extension === "xls" || extension === "xlsx") ? "xlsx" : "other"

      const response = await fetch("/api/statements/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          csv: parsedCsv,
          statementMeta: {
            bankName: "Unknown",
            sourceFilename: droppedFile.name,
            rawFormat: rawFormat as "pdf" | "csv" | "xlsx" | "xls" | "other",
            fileId: fileId,
          },
        }),
      })

      clearInterval(progressInterval)
      setImportProgress(95)

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`
        const responseText = await response.text()

        try {
          const errorData = JSON.parse(responseText)

          // Check for transaction limit exceeded
          if (response.status === 403 && errorData.code === 'LIMIT_EXCEEDED') {
            clearInterval(progressInterval)
            setImportProgress(0)
            setIsImporting(false)

            setTransactionLimitData({
              code: 'LIMIT_EXCEEDED',
              plan: errorData.plan || 'free',
              cap: errorData.limit || 500,
              used: errorData.currentCount || 0,
              remaining: errorData.remaining || 0,
              incomingCount: errorData.attempting,
              message: errorData.message,
              upgradePlans: errorData.upgradePlans
            })
            setIsTransactionLimitDialogOpen(true)
            return
          }

          errorMessage = errorData.error || errorMessage
        } catch {
          errorMessage = responseText || errorMessage
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      setImportProgress(100)

      toast.success("File Imported Successfully", {
        description: `${data.inserted} transactions imported from ${droppedFile.name}`,
      })
      if (data.skippedInvalidDates) {
        toast.warning("Some rows were skipped", {
          description: `${data.skippedInvalidDates} transaction(s) had missing or invalid dates and were not imported.`,
        })
      }

      setIsDialogOpen(false)
      setDroppedFile(null)
      setParsedCsv(null)
      setFileId(null)
      setTransactionCount(0)
      setParseError(null)
      setImportProgress(0)

      await fetchLibraryData()
    } catch (error) {
      clearInterval(progressInterval)
      console.error("Import error:", error)
      toast.error("Import Failed", {
        description:
          error instanceof Error
            ? error.message
            : "Failed to import transactions. Please try again.",
      })
      setImportProgress(0)
    } finally {
      setIsImporting(false)
    }
  }

  const handleCancel = () => {
    if (csvRegenerationTimerRef.current) {
      clearTimeout(csvRegenerationTimerRef.current)
      csvRegenerationTimerRef.current = null
    }
    setIsDialogOpen(false)
    setDroppedFile(null)
    setParsedCsv(null)
    setFileId(null)
    setTransactionCount(0)
    setParseError(null)
  }

  useEffect(() => {
    return () => {
      if (csvRegenerationTimerRef.current) {
        clearTimeout(csvRegenerationTimerRef.current)
      }
    }
  }, [])

  const handleAddCategory = async () => {
    const trimmedName = newCategoryName.trim()
    if (!trimmedName) {
      toast.error("Please enter a category name")
      return
    }

    // Generate temporary ID for optimistic update
    const optimisticId = `temp-${Date.now()}`

    // Optimistic update - add to UI immediately
    setCategories(prev => [...prev, {
      id: optimisticId as any,
      name: trimmedName,
      color: '#94a3b8', // Slate color for pending
      createdAt: new Date().toISOString(),
      transactionCount: 0,
      totalSpend: 0,
      totalAmount: 0
    }])

    try {
      setAddCategoryLoading(true)
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: trimmedName }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))

        // Rollback optimistic update
        setCategories(prev => prev.filter(c => String(c.id) !== optimisticId))

        // Check for category limit exceeded
        if (response.status === 403 && errorData.code === 'CATEGORY_LIMIT_EXCEEDED') {
          console.log('[DEBUG] Category limit error data:', errorData)
          console.log('[DEBUG] upgradePlans:', errorData.upgradePlans)

          setCategoryLimitData({
            code: 'CATEGORY_LIMIT_EXCEEDED',
            type: 'transaction',
            plan: errorData.plan || 'free',
            transactionCap: errorData.capacity?.transactionCap,
            receiptCap: errorData.capacity?.receiptCap,
            transactionUsed: errorData.capacity?.transactionUsed,
            receiptUsed: errorData.capacity?.receiptUsed,
            transactionRemaining: errorData.capacity?.transactionRemaining,
            receiptRemaining: errorData.capacity?.receiptRemaining,
            message: errorData.message,
            upgradePlans: errorData.upgradePlans
          })
          setIsCategoryLimitDialogOpen(true)
          setAddCategoryLoading(false)
          return
        }

        throw new Error(errorData.error || "Failed to add category")
      }

      const created = await response.json()

      // Replace optimistic item with real data
      setCategories(prev => prev.map(c =>
        String(c.id) === optimisticId
          ? {
            id: created.id,
            name: created.name,
            color: created.color,
            createdAt: new Date().toISOString(),
            transactionCount: 0,
            totalSpend: 0,
            totalAmount: 0
          }
          : c
      ))

      // Reset form
      setNewCategoryName("")
      setNewCategoryTier("Wants")
      setAddCategoryDialogOpen(false)

      // Persist the chosen tier locally for Needs vs Wants classification
      saveCategoryTier(created.name ?? trimmedName, newCategoryTier)

      // Track category created
      safeCapture('category_created', {
        category_name: created.name ?? trimmedName,
        category_tier: newCategoryTier,
      })

      toast.success(`Category "${created.name}" added`)
    } catch (error) {
      // Rollback optimistic update on any error
      setCategories(prev => prev.filter(c => String(c.id) !== optimisticId))

      console.error("[Add Category] Error:", error)
      const message = error instanceof Error ? error.message : "Failed to add category"
      toast.error(message)
    } finally {
      setAddCategoryLoading(false)
    }
  }

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return

    try {
      setDeleteCategoryLoading(true)
      const response = await fetch(`/api/categories/${categoryToDelete.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to delete category")
      }

      // Optimistic update - remove from local state immediately
      setCategories(prev => prev.filter(c => c.id !== categoryToDelete.id))

      // Reset state
      setCategoryToDelete(null)
      setDeleteCategoryDialogOpen(false)

      toast.success(`Category "${categoryToDelete.name}" deleted`)
    } catch (error) {
      console.error("[Delete Category] Error:", error)
      const message = error instanceof Error ? error.message : "Failed to delete category"
      toast.error(message)
    } finally {
      setDeleteCategoryLoading(false)
    }
  }

  const handleAddReceiptType = async () => {
    const trimmedName = newReceiptTypeName.trim()
    if (!trimmedName) {
      toast.error("Please enter a macronutrient type name")
      return
    }

    try {
      setAddReceiptTypeLoading(true)
      const response = await fetch("/api/receipt-categories/types", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: trimmedName }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to add receipt type")
      }

      await fetchLibraryData()

      setNewReceiptTypeName("")
      setAddReceiptTypeDialogOpen(false)

      toast.success(`Receipt type "${trimmedName}" added`)
    } catch (error) {
      console.error("[Add Receipt Type] Error:", error)
      const message = error instanceof Error ? error.message : "Failed to add receipt type"
      toast.error(message)
    } finally {
      setAddReceiptTypeLoading(false)
    }
  }

  const handleDeleteReceiptType = async () => {
    if (!receiptTypeToDelete) return

    try {
      setDeleteReceiptTypeLoading(true)
      const response = await fetch("/api/receipt-categories/types", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: receiptTypeToDelete.id }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to delete receipt type")
      }

      await fetchLibraryData()

      setReceiptTypeToDelete(null)
      setDeleteReceiptTypeDialogOpen(false)

      toast.success(`Receipt type "${receiptTypeToDelete.name}" deleted`)
    } catch (error) {
      console.error("[Delete Receipt Type] Error:", error)
      const message = error instanceof Error ? error.message : "Failed to delete receipt type"
      toast.error(message)
    } finally {
      setDeleteReceiptTypeLoading(false)
    }
  }

  const handleAddReceiptCategory = async () => {
    const trimmedName = newReceiptCategoryName.trim()
    if (!trimmedName) {
      toast.error("Please enter a receipt category name")
      return
    }

    const typeId = Number(newReceiptCategoryTypeId)
    if (!Number.isFinite(typeId)) {
      toast.error("Please select a macronutrient type")
      return
    }

    // Generate temporary ID for optimistic update
    const optimisticId = `temp-${Date.now()}`

    // Optimistic update - add to UI immediately  
    setReceiptCategories(prev => [...prev, {
      id: optimisticId as any,
      name: trimmedName,
      color: '#94a3b8',
      typeId: typeId,
      typeName: '',
      typeColor: null,
      broadType: 'Other',
      createdAt: new Date().toISOString(),
      transactionCount: 0,
      totalSpend: 0
    }])

    try {
      setAddReceiptCategoryLoading(true)
      const response = await fetch("/api/receipt-categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: trimmedName, typeId }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))

        // Rollback optimistic update
        setReceiptCategories(prev => prev.filter(c => String(c.id) !== optimisticId))

        // Check for category limit exceeded
        if (response.status === 403 && errorData.code === 'CATEGORY_LIMIT_EXCEEDED') {
          console.log('[DEBUG] Receipt category limit:', errorData)
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
            upgradePlans: errorData.upgradePlans
          })
          setIsCategoryLimitDialogOpen(true)
          setAddReceiptCategoryLoading(false)
          return
        }

        throw new Error(errorData.error || "Failed to add receipt category")
      }

      const newCategory = await response.json()

      // Replace optimistic item with real data
      setReceiptCategories(prev => prev.map(c =>
        String(c.id) === optimisticId
          ? {
            id: newCategory.id,
            name: newCategory.name,
            color: newCategory.color,
            typeId: newCategory.typeId || typeId,
            typeName: newCategory.typeName || '',
            typeColor: newCategory.typeColor || null,
            broadType: newCategory.broadType || 'Other',
            createdAt: new Date().toISOString(),
            transactionCount: 0,
            totalSpend: 0
          }
          : c
      ))

      setNewReceiptCategoryName("")
      setAddReceiptCategoryDialogOpen(false)

      toast.success(`Receipt category "${trimmedName}" added`)
    } catch (error) {
      // Rollback optimistic update on any error
      setReceiptCategories(prev => prev.filter(c => String(c.id) !== optimisticId))

      console.error("[Add Receipt Category] Error:", error)
      const message = error instanceof Error ? error.message : "Failed to add receipt category"
      toast.error(message)
    } finally {
      setAddReceiptCategoryLoading(false)
    }
  }

  const handleCreateDialogReceiptCategory = async () => {
    const trimmedName = newDialogReceiptCategoryName.trim()
    if (!trimmedName) {
      toast.error("Please enter a receipt category name")
      return
    }

    const typeId = Number(newDialogReceiptCategoryTypeId)
    if (!Number.isFinite(typeId)) {
      toast.error("Please select a macronutrient type")
      return
    }

    try {
      setIsCreatingReceiptCategory(true)
      const response = await fetch("/api/receipt-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          typeId: typeId,
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
            upgradePlans: errorData.upgradePlans
          })
          setIsCategoryLimitDialogOpen(true)
          setIsCreatingReceiptCategory(false)
          return
        }

        throw new Error(errorData.error || "Failed to add receipt category")
      }

      const newCategory = await response.json()

      // Refresh receipt categories in dialog
      const categoriesResponse = await fetch("/api/receipt-categories")
      if (categoriesResponse.ok) {
        const categoriesPayload = (await categoriesResponse.json()) as Array<{
          name?: string
          color?: string | null
          typeName?: string
          typeColor?: string | null
          type_name?: string
          type_color?: string | null
        }>
        const normalized = Array.isArray(categoriesPayload)
          ? categoriesPayload
            .map((category) => ({
              name: typeof category?.name === "string" ? category.name : "",
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
            }))
            .filter((category) => category.name.trim().length > 0)
          : []
        setDialogReceiptCategories(normalized)
      }

      setNewDialogReceiptCategoryName("")
      setIsCreateReceiptCategoryDialogOpen(false)

      toast.success(`Receipt category "${trimmedName}" added`)
    } catch (error: any) {
      const message = error?.message || "Failed to add receipt category"
      toast.error(message)
    } finally {
      setIsCreatingReceiptCategory(false)
    }
  }

  const handleDeleteReceiptCategory = async () => {
    if (!receiptCategoryToDelete) return

    try {
      setDeleteReceiptCategoryLoading(true)
      const response = await fetch("/api/receipt-categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: receiptCategoryToDelete.id }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to delete receipt category")
      }

      // Optimistic update - remove from local state immediately
      setReceiptCategories(prev => prev.filter(c => c.id !== receiptCategoryToDelete.id))

      setReceiptCategoryToDelete(null)
      setDeleteReceiptCategoryDialogOpen(false)

      toast.success(`Receipt category "${receiptCategoryToDelete.name}" deleted`)
    } catch (error) {
      console.error("[Delete Receipt Category] Error:", error)
      const message = error instanceof Error ? error.message : "Failed to delete receipt category"
      toast.error(message)
    } finally {
      setDeleteReceiptCategoryLoading(false)
    }
  }

  const isDefaultCategory = (categoryName: string): boolean => {
    return DEFAULT_CATEGORIES.includes(categoryName)
  }

  const isDefaultReceiptType = (typeName: string): boolean => {
    const key = typeName.trim().toLowerCase()
    return DEFAULT_RECEIPT_CATEGORY_TYPES.some((type) => type.name.toLowerCase() === key)
  }

  const isDefaultReceiptCategory = (categoryName: string): boolean => {
    const key = categoryName.trim().toLowerCase()
    return DEFAULT_RECEIPT_CATEGORIES.some((category) => category.name.toLowerCase() === key)
  }

  const uniqueCategoryOptions = useMemo(() => {
    const names = new Set<string>()
    categories.forEach((category) => names.add(category.name))
    statementTransactions.forEach((tx) => names.add(tx.category || "Other"))
    if (names.size === 0) {
      names.add("Other")
    }
    return Array.from(names)
  }, [categories, statementTransactions])

  const handleViewStatementTransactions = async (statement: Statement) => {
    setSelectedStatement(statement)
    setViewDialogOpen(true)
    setViewLoading(true)
    setStatementTransactions([])

    // Handle receipts differently
    if (statement.type === "Receipts" && statement.receiptId) {
      try {
        // Load receipt categories and types
        const [categoriesResponse, typesResponse] = await Promise.all([
          fetch("/api/receipt-categories"),
          fetch("/api/receipt-categories/types"),
        ])

        if (categoriesResponse.ok) {
          const categoriesPayload = (await categoriesResponse.json()) as Array<{
            name?: string
            color?: string | null
            typeName?: string
            typeColor?: string | null
            type_name?: string
            type_color?: string | null
          }>
          const normalized = Array.isArray(categoriesPayload)
            ? categoriesPayload
              .map((category) => ({
                name: typeof category?.name === "string" ? category.name : "",
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
              }))
              .filter((category) => category.name.trim().length > 0)
            : []
          setDialogReceiptCategories(normalized)
        }

        if (typesResponse.ok) {
          const typesPayload = (await typesResponse.json()) as Array<{
            id?: number
            name?: string
            color?: string | null
          }>
          const types = Array.isArray(typesPayload)
            ? typesPayload
              .map((type) => ({
                id: typeof type?.id === "number" ? type.id : 0,
                name: typeof type?.name === "string" ? type.name : "",
                color: typeof type?.color === "string" ? type.color : null,
              }))
              .filter((type) => type.id > 0 && type.name.trim().length > 0)
            : []
          setDialogReceiptCategoryTypes(types)
          if (types.length > 0) {
            setNewDialogReceiptCategoryTypeId((prev) => prev || String(types[0].id))
          }
        }

        const response = await fetch(`/api/receipts/${statement.receiptId}`)
        if (response.ok) {
          const data = await response.json()
          // Transform receipt transactions to match Transaction format
          const transactions = (data.transactions || []).map((rt: any) => ({
            id: rt.id,
            date: `${rt.receipt_date}T${rt.receipt_time}`,
            description: rt.description,
            amount: -Number(rt.total_price), // Negative for expenses
            balance: null,
            category: rt.category_name || "Uncategorized",
            receiptTransactionId: rt.id,
            isReceipt: true,
          }))
          setStatementTransactions(normalizeTransactions(transactions) as Transaction[])
        } else {
          console.error("Failed to fetch receipt transactions")
          setStatementTransactions([])
        }
      } catch (err) {
        console.error("Error fetching receipt transactions:", err)
        setStatementTransactions([])
      } finally {
        setViewLoading(false)
      }
      return
    }

    // Handle regular statements
    const statementId = statement.statementId ?? Number(statement.id)
    if (!statementId) {
      console.error("Missing statement ID")
      setViewLoading(false)
      return
    }

    try {
      const response = await fetch(`/api/statements/${statementId}/transactions`)
      if (response.ok) {
        const data = await response.json()
        setStatementTransactions(normalizeTransactions(data) as Transaction[])
      } else {
        console.error("Failed to fetch statement transactions")
        setStatementTransactions([])
      }
    } catch (err) {
      console.error("Error fetching statement transactions:", err)
      setStatementTransactions([])
    } finally {
      setViewLoading(false)
    }
  }

  const handleDeleteStatement = async () => {
    if (!statementToDelete) return

    // Handle receipts differently
    if (statementToDelete.type === "Receipts" && statementToDelete.receiptId) {
      setDeleteLoading(true)
      try {
        const response = await fetch(`/api/receipts/${statementToDelete.receiptId}`, {
          method: "DELETE",
        })
        if (response.ok) {
          // Track statement deleted
          safeCapture('statement_deleted', {
            statement_name: statementToDelete.name,
            statement_type: statementToDelete.type,
            is_receipt: true,
          })

          await fetchLibraryData()
          setDeleteDialogOpen(false)
          setStatementToDelete(null)
        } else {
          const errorData = await response.json().catch(() => ({}))
          alert(errorData.error || "Failed to delete receipt")
        }
      } catch (err) {
        console.error("Error deleting receipt:", err)
        alert(err instanceof Error ? err.message : "Failed to delete receipt")
      } finally {
        setDeleteLoading(false)
      }
      return
    }

    // Handle regular statements
    const statementId = statementToDelete.statementId ?? Number(statementToDelete.id)
    if (!statementId) return

    setDeleteLoading(true)
    try {
      const response = await fetch(`/api/statements/${statementId}`, {
        method: "DELETE",
      })
      if (response.ok) {
        // Track statement deleted
        safeCapture('statement_deleted', {
          statement_name: statementToDelete.name,
          statement_type: statementToDelete.type,
          is_receipt: false,
        })

        await fetchLibraryData()
        setDeleteDialogOpen(false)
        setStatementToDelete(null)
      } else {
        const errorData = await response.json().catch(() => ({}))
        alert(errorData.error || "Failed to delete statement")
      }
    } catch (err) {
      console.error("Error deleting statement:", err)
      alert(err instanceof Error ? err.message : "Failed to delete statement")
    } finally {
      setDeleteLoading(false)
    }
  }

  // Count custom categories (excluding defaults) using is_default flag
  const customCategoriesCount = useMemo(() => {
    // @ts-ignore - is_default exists in DB but not in type
    return categories.filter(cat => !cat.is_default).length
  }, [categories])

  const customReceiptCategoriesCount = useMemo(() => {
    // @ts-ignore - is_default exists in DB but not in type
    return receiptCategories.filter(cat => !cat.is_default).length
  }, [receiptCategories])

  // Total user-created categories (transaction + receipt)
  const totalUserCategories = useMemo(() => {
    return customCategoriesCount + customReceiptCategoriesCount
  }, [customCategoriesCount, customReceiptCategoriesCount])

  // Calculate total transactions (already includes receipt transactions from bundle API)
  const totalTransactionsCount = useMemo(() => {
    return transactions.length
  }, [transactions])

  const kpiCards = [
    {
      title: "Transactions Indexed",
      value: formatNumber(totalTransactionsCount),
      hint: latestTransactionDate
        ? `Last touch ${formatFreshness(latestTransactionDate).toLowerCase()}`
        : "Waiting for first sync",
      icon: IconRefresh,
      subtitle: "all transactions tracked",
    },
    {
      title: "Documents Archived",
      value: formatNumber(statements.length),
      hint:
        Object.keys(statementDistribution).length > 0
          ? `${Object.keys(statementDistribution).length} source${Object.keys(statementDistribution).length === 1 ? "" : "s"
          }`
          : "Upload a statement to unlock insights",
      icon: IconShieldCheck,
      subtitle: "documents captured",
    },
    {
      title: "Total User Categories",
      value: formatNumber(totalUserCategories),
      hint: "Total user-created categories (transaction + receipt combined).",
      icon: IconCategory,
      subtitle: "custom categories across all types",
    },
    {
      title: "Macronutrient Types",
      value: formatNumber(receiptCategoryTypes.length),
      hint: "Protein, Carbs, Fat, Mixed, None, Other",
      icon: IconFolders,
      subtitle: "classification types",
    },
    {
      title: "Total Spending/Income Categories",
      value: formatNumber(customCategoriesCount),
      hint: "User-created transaction categories (excluding defaults).",
      icon: IconCategory,
      subtitle: "custom categories created",
    },
    {
      title: "Receipt Categories",
      value: formatNumber(customReceiptCategoriesCount),
      hint: "User-created food categories (excluding defaults).",
      icon: IconFolders,
      subtitle: "custom food categories for AI",
    },
  ]

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72 - 15px)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div
          className="flex flex-1 flex-col relative"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* Dark overlay when dragging */}
          {isDragging && (
            <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity duration-300 pointer-events-none" />
          )}

          {/* Modern drop indicator with Card */}
          {isDragging && (
            <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
              <Card className="w-full max-w-md mx-4 border-2 border-dashed border-primary/50 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-300">
                <CardHeader className="text-center pb-4">
                  <div className="flex justify-center mb-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                      <div className="relative bg-primary/10 p-6 rounded-full border-2 border-primary/30">
                        <IconUpload className="w-12 h-12 text-primary animate-bounce" />
                      </div>
                    </div>
                  </div>
                  <CardTitle className="text-2xl text-primary">Drop your file here</CardTitle>
                  <CardDescription className="text-base mt-2">
                    Release to upload your file
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
          )}

          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <section className="px-4 lg:px-6">
                <div className="flex flex-col justify-between gap-4 rounded-3xl border bg-muted/30 px-6 py-6 lg:flex-row lg:items-center">
                  <div className="space-y-2">
                    <Badge variant="outline" className="gap-1 px-3 py-1 text-sm">
                      <IconDatabase className="size-4" />
                      Unified Library
                    </Badge>
                    <h1 className="text-3xl font-semibold tracking-tight">
                      Data Library
                    </h1>
                    <p className="text-muted-foreground max-w-2xl">
                      Live view of every dataset powered by your statements,
                      ledger, and AI interpretations. Tap into real backend
                      telemetry without leaving the dashboard.
                    </p>
                  </div>
                </div>
                {error && !error.toLowerCase().includes("authentication") && (
                  <div className="mt-4 flex items-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    <IconAlertTriangle className="size-4" />
                    <span>
                      {(() => {
                        // Try to parse JSON error messages
                        try {
                          const parsed = JSON.parse(error)
                          return parsed.error || parsed.message || "Something went wrong"
                        } catch {
                          // If not JSON, show as-is but clean up common technical messages
                          if (error.includes("DEMO_USER_ID")) {
                            return "Please sign in to access your data"
                          }
                          return error
                        }
                      })()}
                    </span>
                  </div>
                )}
              </section>

              <section className="grid gap-4 px-4 lg:grid-cols-4 lg:px-6">
                {kpiCards.map((card) => (
                  <Card key={card.title}>
                    <CardHeader className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <CardTitle>{card.title}</CardTitle>
                        <CardDescription>{card.hint}</CardDescription>
                      </div>
                      <Badge variant="outline" className="gap-1">
                        <card.icon className="size-4" />
                        Live
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      <div className="text-4xl font-semibold">{card.value}</div>
                      <p className="text-muted-foreground text-sm">
                        {card.subtitle}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </section>


              <section className="px-4 lg:px-6">
                <div className="grid gap-4 lg:grid-cols-2">
                  <Card className="lg:col-span-2">
                    <CardHeader className="flex flex-wrap items-center justify-between gap-2 pb-2">
                      <div className="flex items-center gap-2">
                        <CardTitle>Reports</CardTitle>
                        <Badge variant="secondary">
                          {filteredStatements.length}
                          {statements.length !== filteredStatements.length && ` of ${statements.length}`}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {uniqueReportTypes.length > 0 && (
                          <Select value={selectedReportType} onValueChange={setSelectedReportType}>
                            <SelectTrigger className="w-[160px]">
                              <SelectValue placeholder="All types" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All types</SelectItem>
                              {uniqueReportTypes.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Search */}
                      <div className="mb-4">
                        <div className="relative">
                          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                          <Input
                            placeholder="Search reports..."
                            value={reportsSearch}
                            onChange={(e) => setReportsSearch(e.target.value)}
                            className="pl-9 pr-9"
                          />
                          {reportsSearch && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                              onClick={() => setReportsSearch("")}
                            >
                              <IconX className="size-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="overflow-hidden rounded-lg border">
                        <Table>
                          <TableHeader className="bg-muted sticky top-0 z-10">
                            <TableRow>
                              <TableHead className="w-12">
                                <Checkbox
                                  checked={
                                    filteredStatements.length > 0 &&
                                    (() => {
                                      const startIndex = reportsPage * reportsPageSize
                                      const endIndex = startIndex + reportsPageSize
                                      const pageData = filteredStatements.slice(startIndex, endIndex)
                                      return pageData.length > 0 && pageData.every(s => selectedReportIds.has(s.id))
                                    })()
                                  }
                                  onCheckedChange={(checked) => {
                                    const startIndex = reportsPage * reportsPageSize
                                    const endIndex = startIndex + reportsPageSize
                                    const pageData = filteredStatements.slice(startIndex, endIndex)
                                    if (checked) {
                                      setSelectedReportIds(prev => {
                                        const next = new Set(prev)
                                        pageData.forEach(s => next.add(s.id))
                                        return next
                                      })
                                    } else {
                                      setSelectedReportIds(prev => {
                                        const next = new Set(prev)
                                        pageData.forEach(s => next.delete(s.id))
                                        return next
                                      })
                                    }
                                  }}
                                  aria-label="Select all"
                                />
                              </TableHead>
                              <TableHead>Report</TableHead>
                              <TableHead className="hidden md:table-cell">
                                Type
                              </TableHead>
                              <TableHead>Uploaded</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(() => {
                              const startIndex = reportsPage * reportsPageSize
                              const endIndex = startIndex + reportsPageSize
                              const pageData = filteredStatements.slice(startIndex, endIndex)

                              if (pageData.length === 0) {
                                return (
                                  <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24">
                                      <p className="text-sm text-muted-foreground">
                                        {reportsSearch
                                          ? "No reports match your search."
                                          : selectedReportType !== "all"
                                            ? `No ${selectedReportType} reports found.`
                                            : "No reports yet—upload a statement to populate this list."}
                                      </p>
                                    </TableCell>
                                  </TableRow>
                                )
                              }

                              return pageData.map((statement) => (
                                <TableRow key={statement.id}>
                                  <TableCell>
                                    <Checkbox
                                      checked={selectedReportIds.has(statement.id)}
                                      onCheckedChange={(checked) => {
                                        setSelectedReportIds(prev => {
                                          const next = new Set(prev)
                                          if (checked) {
                                            next.add(statement.id)
                                          } else {
                                            next.delete(statement.id)
                                          }
                                          return next
                                        })
                                      }}
                                      aria-label={`Select ${statement.name}`}
                                    />
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    {statement.name}
                                  </TableCell>
                                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                      <span
                                        className="inline-flex size-2 rounded-full"
                                        style={{
                                          backgroundColor:
                                            statement.type === "Receipts" ? "#10b981" :
                                              statement.type === "Income/Expenses" ? "#3b82f6" :
                                                "#6b7280",
                                        }}
                                      />
                                      <span>{statement.type}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {formatDateLabel(statement.date)}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() =>
                                          handleViewStatementTransactions(statement)
                                        }
                                        className="hover:bg-accent"
                                      >
                                        {viewLoading &&
                                          selectedStatement?.id === statement.id ? (
                                          <IconLoader2 className="size-4 animate-spin" />
                                        ) : (
                                          <IconEye className="size-4" />
                                        )}
                                        <span className="sr-only">View transactions</span>
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                          setStatementToDelete(statement)
                                          setDeleteDialogOpen(true)
                                        }}
                                        disabled={
                                          deleteLoading &&
                                          statementToDelete?.id === statement.id
                                        }
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                      >
                                        {deleteLoading &&
                                          statementToDelete?.id === statement.id ? (
                                          <IconLoader2 className="size-4 animate-spin" />
                                        ) : (
                                          <IconTrash className="size-4" />
                                        )}
                                        <span className="sr-only">Delete</span>
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))
                            })()}
                          </TableBody>
                        </Table>
                      </div>
                      {/* Pagination with rows per page */}
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <span>Rows per page:</span>
                          <Select
                            value={String(reportsPageSize)}
                            onValueChange={(value) => {
                              setReportsPageSize(Number(value))
                              setReportsPage(0)
                            }}
                          >
                            <SelectTrigger className="h-8 w-[70px]">
                              <SelectValue placeholder={reportsPageSize} />
                            </SelectTrigger>
                            <SelectContent side="top">
                              {[10, 20, 30, 50, 100].map((pageSize) => (
                                <SelectItem key={pageSize} value={String(pageSize)}>
                                  {pageSize}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className="ml-2">
                            {filteredStatements.length > 0
                              ? `${Math.min(reportsPage * reportsPageSize + 1, filteredStatements.length)}-${Math.min((reportsPage + 1) * reportsPageSize, filteredStatements.length)} of ${filteredStatements.length}`
                              : "0 of 0"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-8"
                            onClick={() => setReportsPage(0)}
                            disabled={reportsPage === 0}
                          >
                            <IconChevronsLeft className="size-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-8"
                            onClick={() => setReportsPage(Math.max(0, reportsPage - 1))}
                            disabled={reportsPage === 0}
                          >
                            <IconChevronLeft className="size-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-8"
                            onClick={() => setReportsPage(Math.min(Math.ceil(filteredStatements.length / reportsPageSize) - 1, reportsPage + 1))}
                            disabled={reportsPage >= Math.ceil(filteredStatements.length / reportsPageSize) - 1}
                          >
                            <IconChevronRight className="size-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-8"
                            onClick={() => setReportsPage(Math.ceil(filteredStatements.length / reportsPageSize) - 1)}
                            disabled={reportsPage >= Math.ceil(filteredStatements.length / reportsPageSize) - 1}
                          >
                            <IconChevronsRight className="size-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="lg:col-span-2">
                    <CardContent className="p-0">
                      <DataTable
                        data={[]}
                        transactions={transactions}
                      />
                    </CardContent>
                  </Card>
                  <Card className="lg:col-span-2">
                    <CardHeader className="flex flex-wrap items-center justify-between gap-2 pb-2">
                      <div className="flex items-center gap-2">
                        <CardTitle>Categories</CardTitle>
                        <Badge variant="secondary">
                          {filteredCategories.length}
                          {categories.length !== filteredCategories.length &&
                            ` of ${categories.length}`}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setAddCategoryDialogOpen(true)}
                      >
                        <IconPlus className="size-4 mr-1" />
                        Add Category
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {/* Search */}
                      <div className="mb-4">
                        <div className="relative">
                          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                          <Input
                            placeholder="Search categories..."
                            value={categorySearch}
                            onChange={(e) => setCategorySearch(e.target.value)}
                            className="pl-9 pr-9"
                          />
                          {categorySearch && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                              onClick={() => setCategorySearch("")}
                            >
                              <IconX className="size-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="overflow-hidden rounded-lg border">
                        <Table>
                          <TableHeader className="bg-muted sticky top-0 z-10">
                            <TableRow>
                              <TableHead className="w-12">
                                <Checkbox
                                  checked={
                                    filteredCategories.length > 0 &&
                                    (() => {
                                      const startIndex = categoryPage * categoryPageSize
                                      const endIndex = startIndex + categoryPageSize
                                      const pageData = filteredCategories.slice(startIndex, endIndex)
                                      return pageData.length > 0 && pageData.every(c => selectedCategoryIds.has(c.id))
                                    })()
                                  }
                                  onCheckedChange={(checked) => {
                                    const startIndex = categoryPage * categoryPageSize
                                    const endIndex = startIndex + categoryPageSize
                                    const pageData = filteredCategories.slice(startIndex, endIndex)
                                    if (checked) {
                                      setSelectedCategoryIds(prev => {
                                        const next = new Set(prev)
                                        pageData.forEach(c => next.add(c.id))
                                        return next
                                      })
                                    } else {
                                      setSelectedCategoryIds(prev => {
                                        const next = new Set(prev)
                                        pageData.forEach(c => next.delete(c.id))
                                        return next
                                      })
                                    }
                                  }}
                                  aria-label="Select all"
                                />
                              </TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead className="hidden md:table-cell">
                                Created
                              </TableHead>
                              <TableHead className="text-right">
                                Transactions
                              </TableHead>
                              <TableHead className="text-right">Spend</TableHead>
                              <TableHead className="text-right w-20">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(() => {
                              const startIndex = categoryPage * categoryPageSize
                              const endIndex = startIndex + categoryPageSize
                              const pageData = filteredCategories.slice(startIndex, endIndex)

                              if (pageData.length === 0) {
                                return (
                                  <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24">
                                      <p className="text-sm text-muted-foreground">
                                        {categorySearch
                                          ? "No categories match your search."
                                          : "No categories yet—tag transactions to build your taxonomy."}
                                      </p>
                                    </TableCell>
                                  </TableRow>
                                )
                              }

                              return pageData.map((category) => (
                                <TableRow key={category.id}>
                                  <TableCell>
                                    <Checkbox
                                      checked={selectedCategoryIds.has(category.id)}
                                      onCheckedChange={(checked) => {
                                        setSelectedCategoryIds(prev => {
                                          const next = new Set(prev)
                                          if (checked) {
                                            next.add(category.id)
                                          } else {
                                            next.delete(category.id)
                                          }
                                          return next
                                        })
                                      }}
                                      aria-label={`Select ${category.name}`}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <span
                                        className="inline-flex size-2.5 rounded-full"
                                        style={{
                                          backgroundColor:
                                            category.color ?? "hsl(var(--primary))",
                                        }}
                                      />
                                      <span className="font-medium">
                                        {category.name}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                                    {formatDateLabel(category.createdAt)}
                                  </TableCell>
                                  <TableCell className="text-right text-sm">
                                    {category.transactionCount}
                                  </TableCell>
                                  <TableCell className="text-right text-sm font-medium">
                                    {(() => {
                                      const amount = category.totalAmount ?? 0
                                      if (amount === 0) {
                                        return (
                                          <span className="text-muted-foreground">
                                            {formatCurrency(0)}
                                          </span>
                                        )
                                      }
                                      return (
                                        <span className={amount < 0 ? "text-red-500" : "text-green-500"}>
                                          {formatCurrency(amount)}
                                        </span>
                                      )
                                    })()}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {!isDefaultCategory(category.name) && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => {
                                          setCategoryToDelete(category)
                                          setDeleteCategoryDialogOpen(true)
                                        }}
                                      >
                                        <IconTrash className="size-4" />
                                        <span className="sr-only">Delete category</span>
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))
                            })()}
                          </TableBody>
                        </Table>
                      </div>
                      {/* Pagination with rows per page */}
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <span>Rows per page:</span>
                          <Select
                            value={String(categoryPageSize)}
                            onValueChange={(value) => {
                              setCategoryPageSize(Number(value))
                              setCategoryPage(0)
                            }}
                          >
                            <SelectTrigger className="h-8 w-[70px]">
                              <SelectValue placeholder={categoryPageSize} />
                            </SelectTrigger>
                            <SelectContent side="top">
                              {[10, 20, 30, 50, 100].map((pageSize) => (
                                <SelectItem key={pageSize} value={String(pageSize)}>
                                  {pageSize}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className="ml-2">
                            {filteredCategories.length > 0
                              ? `${Math.min(categoryPage * categoryPageSize + 1, filteredCategories.length)}-${Math.min((categoryPage + 1) * categoryPageSize, filteredCategories.length)} of ${filteredCategories.length}`
                              : "0 of 0"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-8"
                            onClick={() => setCategoryPage(0)}
                            disabled={categoryPage === 0}
                          >
                            <IconChevronsLeft className="size-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-8"
                            onClick={() => setCategoryPage(Math.max(0, categoryPage - 1))}
                            disabled={categoryPage === 0}
                          >
                            <IconChevronLeft className="size-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-8"
                            onClick={() => setCategoryPage(Math.min(Math.ceil(filteredCategories.length / categoryPageSize) - 1, categoryPage + 1))}
                            disabled={categoryPage >= Math.ceil(filteredCategories.length / categoryPageSize) - 1}
                          >
                            <IconChevronRight className="size-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-8"
                            onClick={() => setCategoryPage(Math.ceil(filteredCategories.length / categoryPageSize) - 1)}
                            disabled={categoryPage >= Math.ceil(filteredCategories.length / categoryPageSize) - 1}
                          >
                            <IconChevronsRight className="size-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="lg:col-span-2">
                    <CardHeader className="flex flex-wrap items-center justify-between gap-2 pb-2">
                      <div className="flex items-center gap-2">
                        <CardTitle>Receipt Macronutrient Types</CardTitle>
                        <Badge variant="secondary">
                          {filteredReceiptTypes.length}
                          {receiptCategoryTypes.length !== filteredReceiptTypes.length &&
                            ` of ${receiptCategoryTypes.length}`}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setAddReceiptTypeDialogOpen(true)}
                      >
                        <IconPlus className="size-4 mr-1" />
                        Add Type
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {/* Search */}
                      <div className="mb-4">
                        <div className="relative">
                          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                          <Input
                            placeholder="Search types..."
                            value={receiptTypeSearch}
                            onChange={(e) => setReceiptTypeSearch(e.target.value)}
                            className="pl-9 pr-9"
                          />
                          {receiptTypeSearch && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                              onClick={() => setReceiptTypeSearch("")}
                            >
                              <IconX className="size-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="overflow-hidden rounded-lg border">
                        <Table>
                          <TableHeader className="bg-muted sticky top-0 z-10">
                            <TableRow>
                              <TableHead className="w-12">
                                <Checkbox
                                  checked={
                                    filteredReceiptTypes.length > 0 &&
                                    (() => {
                                      const startIndex = receiptTypePage * receiptTypePageSize
                                      const endIndex = startIndex + receiptTypePageSize
                                      const pageData = filteredReceiptTypes.slice(startIndex, endIndex)
                                      return pageData.length > 0 && pageData.every(t => selectedReceiptTypeIds.has(t.id))
                                    })()
                                  }
                                  onCheckedChange={(checked) => {
                                    const startIndex = receiptTypePage * receiptTypePageSize
                                    const endIndex = startIndex + receiptTypePageSize
                                    const pageData = filteredReceiptTypes.slice(startIndex, endIndex)
                                    if (checked) {
                                      setSelectedReceiptTypeIds(prev => {
                                        const next = new Set(prev)
                                        pageData.forEach(t => next.add(t.id))
                                        return next
                                      })
                                    } else {
                                      setSelectedReceiptTypeIds(prev => {
                                        const next = new Set(prev)
                                        pageData.forEach(t => next.delete(t.id))
                                        return next
                                      })
                                    }
                                  }}
                                  aria-label="Select all"
                                />
                              </TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead className="hidden md:table-cell">Created</TableHead>
                              <TableHead className="text-right">Categories</TableHead>
                              <TableHead className="text-right">Items</TableHead>
                              <TableHead className="text-right">Spend</TableHead>
                              <TableHead className="text-right w-20">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(() => {
                              const startIndex = receiptTypePage * receiptTypePageSize
                              const endIndex = startIndex + receiptTypePageSize
                              const pageData = filteredReceiptTypes.slice(startIndex, endIndex)

                              if (pageData.length === 0) {
                                return (
                                  <TableRow>
                                    <TableCell colSpan={7} className="text-center h-24">
                                      <p className="text-sm text-muted-foreground">
                                        {receiptTypeSearch
                                          ? "No types match your search."
                                          : "No receipt types yet."}
                                      </p>
                                    </TableCell>
                                  </TableRow>
                                )
                              }

                              return pageData.map((type) => (
                                <TableRow key={type.id}>
                                  <TableCell>
                                    <Checkbox
                                      checked={selectedReceiptTypeIds.has(type.id)}
                                      onCheckedChange={(checked) => {
                                        setSelectedReceiptTypeIds(prev => {
                                          const next = new Set(prev)
                                          if (checked) {
                                            next.add(type.id)
                                          } else {
                                            next.delete(type.id)
                                          }
                                          return next
                                        })
                                      }}
                                      aria-label={`Select ${type.name}`}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <span
                                        className="inline-flex size-2.5 rounded-full"
                                        style={{
                                          backgroundColor:
                                            type.color ?? "hsl(var(--primary))",
                                        }}
                                      />
                                      <span className="font-medium">{type.name}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                                    {formatDateLabel(type.createdAt)}
                                  </TableCell>
                                  <TableCell className="text-right text-sm">
                                    {type.categoryCount}
                                  </TableCell>
                                  <TableCell className="text-right text-sm">
                                    {type.transactionCount}
                                  </TableCell>
                                  <TableCell className="text-right text-sm font-medium">
                                    {(() => {
                                      const amount = type.totalSpend ?? 0
                                      if (amount === 0) {
                                        return (
                                          <span className="text-muted-foreground">
                                            {formatCurrency(0)}
                                          </span>
                                        )
                                      }
                                      return (
                                        <span className={amount < 0 ? "text-red-500" : "text-green-500"}>
                                          {formatCurrency(amount)}
                                        </span>
                                      )
                                    })()}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {!isDefaultReceiptType(type.name) && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => {
                                          setReceiptTypeToDelete(type)
                                          setDeleteReceiptTypeDialogOpen(true)
                                        }}
                                      >
                                        <IconTrash className="size-4" />
                                        <span className="sr-only">Delete type</span>
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))
                            })()}
                          </TableBody>
                        </Table>
                      </div>
                      {/* Pagination with rows per page */}
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <span>Rows per page:</span>
                          <Select
                            value={String(receiptTypePageSize)}
                            onValueChange={(value) => {
                              setReceiptTypePageSize(Number(value))
                              setReceiptTypePage(0)
                            }}
                          >
                            <SelectTrigger className="h-8 w-[70px]">
                              <SelectValue placeholder={receiptTypePageSize} />
                            </SelectTrigger>
                            <SelectContent side="top">
                              {[10, 20, 30, 50, 100].map((pageSize) => (
                                <SelectItem key={pageSize} value={String(pageSize)}>
                                  {pageSize}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className="ml-2">
                            {filteredReceiptTypes.length > 0
                              ? `${Math.min(receiptTypePage * receiptTypePageSize + 1, filteredReceiptTypes.length)}-${Math.min((receiptTypePage + 1) * receiptTypePageSize, filteredReceiptTypes.length)} of ${filteredReceiptTypes.length}`
                              : "0 of 0"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-8"
                            onClick={() => setReceiptTypePage(0)}
                            disabled={receiptTypePage === 0}
                          >
                            <IconChevronsLeft className="size-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-8"
                            onClick={() => setReceiptTypePage(Math.max(0, receiptTypePage - 1))}
                            disabled={receiptTypePage === 0}
                          >
                            <IconChevronLeft className="size-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-8"
                            onClick={() => setReceiptTypePage(Math.min(Math.ceil(filteredReceiptTypes.length / receiptTypePageSize) - 1, receiptTypePage + 1))}
                            disabled={receiptTypePage >= Math.ceil(filteredReceiptTypes.length / receiptTypePageSize) - 1}
                          >
                            <IconChevronRight className="size-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-8"
                            onClick={() => setReceiptTypePage(Math.ceil(filteredReceiptTypes.length / receiptTypePageSize) - 1)}
                            disabled={receiptTypePage >= Math.ceil(filteredReceiptTypes.length / receiptTypePageSize) - 1}
                          >
                            <IconChevronsRight className="size-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="lg:col-span-2">
                    <CardHeader className="flex flex-wrap items-center justify-between gap-2 pb-2">
                      <div className="flex items-center gap-2">
                        <CardTitle>Receipt Categories</CardTitle>
                        <Badge variant="secondary">
                          {filteredReceiptCategories.length}
                          {receiptCategories.length !== filteredReceiptCategories.length &&
                            ` of ${receiptCategories.length}`}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (!newReceiptCategoryTypeId && receiptCategoryTypes.length > 0) {
                            setNewReceiptCategoryTypeId(String(receiptCategoryTypes[0].id))
                          }
                          setAddReceiptCategoryDialogOpen(true)
                        }}
                      >
                        <IconPlus className="size-4 mr-1" />
                        Add Receipt Category
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {/* Search */}
                      <div className="mb-4">
                        <div className="relative">
                          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                          <Input
                            placeholder="Search categories or types..."
                            value={receiptCategorySearch}
                            onChange={(e) => setReceiptCategorySearch(e.target.value)}
                            className="pl-9 pr-9"
                          />
                          {receiptCategorySearch && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                              onClick={() => setReceiptCategorySearch("")}
                            >
                              <IconX className="size-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="overflow-hidden rounded-lg border">
                        <Table>
                          <TableHeader className="bg-muted sticky top-0 z-10">
                            <TableRow>
                              <TableHead className="w-12">
                                <Checkbox
                                  checked={
                                    filteredReceiptCategories.length > 0 &&
                                    (() => {
                                      const startIndex = receiptCategoryPage * receiptCategoryPageSize
                                      const endIndex = startIndex + receiptCategoryPageSize
                                      const pageData = filteredReceiptCategories.slice(startIndex, endIndex)
                                      return pageData.length > 0 && pageData.every(c => selectedReceiptCategoryIds.has(c.id))
                                    })()
                                  }
                                  onCheckedChange={(checked) => {
                                    const startIndex = receiptCategoryPage * receiptCategoryPageSize
                                    const endIndex = startIndex + receiptCategoryPageSize
                                    const pageData = filteredReceiptCategories.slice(startIndex, endIndex)
                                    if (checked) {
                                      setSelectedReceiptCategoryIds(prev => {
                                        const next = new Set(prev)
                                        pageData.forEach(c => next.add(c.id))
                                        return next
                                      })
                                    } else {
                                      setSelectedReceiptCategoryIds(prev => {
                                        const next = new Set(prev)
                                        pageData.forEach(c => next.delete(c.id))
                                        return next
                                      })
                                    }
                                  }}
                                  aria-label="Select all"
                                />
                              </TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead className="hidden md:table-cell">Type</TableHead>
                              <TableHead className="hidden lg:table-cell">Created</TableHead>
                              <TableHead className="text-right">Items</TableHead>
                              <TableHead className="text-right">Spend</TableHead>
                              <TableHead className="text-right w-20">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(() => {
                              const startIndex = receiptCategoryPage * receiptCategoryPageSize
                              const endIndex = startIndex + receiptCategoryPageSize
                              const pageData = filteredReceiptCategories.slice(startIndex, endIndex)

                              if (pageData.length === 0) {
                                return (
                                  <TableRow>
                                    <TableCell colSpan={7} className="text-center h-24">
                                      <p className="text-sm text-muted-foreground">
                                        {receiptCategorySearch
                                          ? "No categories match your search."
                                          : "No receipt categories yet."}
                                      </p>
                                    </TableCell>
                                  </TableRow>
                                )
                              }

                              return pageData.map((category) => (
                                <TableRow key={category.id}>
                                  <TableCell>
                                    <Checkbox
                                      checked={selectedReceiptCategoryIds.has(category.id)}
                                      onCheckedChange={(checked) => {
                                        setSelectedReceiptCategoryIds(prev => {
                                          const next = new Set(prev)
                                          if (checked) {
                                            next.add(category.id)
                                          } else {
                                            next.delete(category.id)
                                          }
                                          return next
                                        })
                                      }}
                                      aria-label={`Select ${category.name}`}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <span
                                        className="inline-flex size-2.5 rounded-full"
                                        style={{
                                          backgroundColor:
                                            category.color ?? "hsl(var(--primary))",
                                        }}
                                      />
                                      <span className="font-medium">
                                        {category.name}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                      <span
                                        className="inline-flex size-2 rounded-full"
                                        style={{
                                          backgroundColor:
                                            category.typeColor ?? "hsl(var(--muted-foreground))",
                                        }}
                                      />
                                      <span>{category.typeName}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                                    {formatDateLabel(category.createdAt)}
                                  </TableCell>
                                  <TableCell className="text-right text-sm">
                                    {category.transactionCount}
                                  </TableCell>
                                  <TableCell className="text-right text-sm font-medium">
                                    {(() => {
                                      const amount = category.totalSpend ?? 0
                                      if (amount === 0) {
                                        return (
                                          <span className="text-muted-foreground">
                                            {formatCurrency(0)}
                                          </span>
                                        )
                                      }
                                      return (
                                        <span className={amount < 0 ? "text-red-500" : "text-green-500"}>
                                          {formatCurrency(amount)}
                                        </span>
                                      )
                                    })()}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {!isDefaultReceiptCategory(category.name) && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => {
                                          setReceiptCategoryToDelete(category)
                                          setDeleteReceiptCategoryDialogOpen(true)
                                        }}
                                      >
                                        <IconTrash className="size-4" />
                                        <span className="sr-only">Delete category</span>
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))
                            })()}
                          </TableBody>
                        </Table>
                      </div>
                      {/* Pagination with rows per page */}
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <span>Rows per page:</span>
                          <Select
                            value={String(receiptCategoryPageSize)}
                            onValueChange={(value) => {
                              setReceiptCategoryPageSize(Number(value))
                              setReceiptCategoryPage(0)
                            }}
                          >
                            <SelectTrigger className="h-8 w-[70px]">
                              <SelectValue placeholder={receiptCategoryPageSize} />
                            </SelectTrigger>
                            <SelectContent side="top">
                              {[10, 20, 30, 50, 100].map((pageSize) => (
                                <SelectItem key={pageSize} value={String(pageSize)}>
                                  {pageSize}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className="ml-2">
                            {filteredReceiptCategories.length > 0
                              ? `${Math.min(receiptCategoryPage * receiptCategoryPageSize + 1, filteredReceiptCategories.length)}-${Math.min((receiptCategoryPage + 1) * receiptCategoryPageSize, filteredReceiptCategories.length)} of ${filteredReceiptCategories.length}`
                              : "0 of 0"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-8"
                            onClick={() => setReceiptCategoryPage(0)}
                            disabled={receiptCategoryPage === 0}
                          >
                            <IconChevronsLeft className="size-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-8"
                            onClick={() => setReceiptCategoryPage(Math.max(0, receiptCategoryPage - 1))}
                            disabled={receiptCategoryPage === 0}
                          >
                            <IconChevronLeft className="size-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-8"
                            onClick={() => setReceiptCategoryPage(Math.min(Math.ceil(filteredReceiptCategories.length / receiptCategoryPageSize) - 1, receiptCategoryPage + 1))}
                            disabled={receiptCategoryPage >= Math.ceil(filteredReceiptCategories.length / receiptCategoryPageSize) - 1}
                          >
                            <IconChevronRight className="size-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-8"
                            onClick={() => setReceiptCategoryPage(Math.ceil(filteredReceiptCategories.length / receiptCategoryPageSize) - 1)}
                            disabled={receiptCategoryPage >= Math.ceil(filteredReceiptCategories.length / receiptCategoryPageSize) - 1}
                          >
                            <IconChevronsRight className="size-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </section>

              <Dialog
                open={viewDialogOpen}
                onOpenChange={(open) => {
                  setViewDialogOpen(open)
                  if (!open) {
                    setStatementTransactions([])
                    setSelectedStatement(null)
                  }
                }}
              >
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      Transactions — {selectedStatement?.name ?? "Statement"}
                    </DialogTitle>
                    <DialogDescription>
                      Detailed ledger entries sourced from this statement.
                    </DialogDescription>
                  </DialogHeader>
                  {viewLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <IconLoader2 className="size-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : statementTransactions.length ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead
                            onClick={() => {
                              setStatementTransactions((prev) =>
                                [...prev].sort((a, b) =>
                                  sortDirection === "asc"
                                    ? new Date(a.date).getTime() -
                                    new Date(b.date).getTime()
                                    : new Date(b.date).getTime() -
                                    new Date(a.date).getTime()
                                )
                              )
                              setSortDirection((prev) =>
                                prev === "asc" ? "desc" : "asc"
                              )
                            }}
                            className="cursor-pointer select-none"
                          >
                            Date
                          </TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {statementTransactions.map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDateLabel(tx.date)}
                            </TableCell>
                            <TableCell>{tx.description}</TableCell>
                            <TableCell>
                              {tx.isReceipt && tx.receiptTransactionId ? (
                                <Select
                                  value={tx.category || "__uncategorized__"}
                                  onValueChange={(value) => {
                                    if (value === "__create_new__") {
                                      setIsCreateReceiptCategoryDialogOpen(true)
                                      return
                                    }

                                    const previousCategory = tx.category
                                    const categoryName = value === "__uncategorized__" ? null : value

                                    // Update state immediately
                                    startTransition(() => {
                                      setStatementTransactions((prev) =>
                                        prev.map((item) =>
                                          item.id === tx.id
                                            ? { ...item, category: categoryName || "Uncategorized" }
                                            : item
                                        )
                                      )
                                    })

                                    // Update database
                                    fetch(
                                      `/api/receipt-transactions/${tx.receiptTransactionId}/category`,
                                      {
                                        method: "PATCH",
                                        headers: {
                                          "Content-Type": "application/json",
                                        },
                                        body: JSON.stringify({
                                          categoryName: categoryName,
                                        }),
                                      }
                                    )
                                      .then(async (response) => {
                                        if (!response.ok) {
                                          // Revert on error
                                          startTransition(() => {
                                            setStatementTransactions((prev) =>
                                              prev.map((item) =>
                                                item.id === tx.id
                                                  ? { ...item, category: previousCategory }
                                                  : item
                                              )
                                            )
                                          })
                                          const errorData = await response.json().catch(() => ({}))
                                          toast.error(errorData.error || "Failed to update category")
                                        } else {
                                          const updated = await response.json()
                                          // Update with returned category name
                                          startTransition(() => {
                                            setStatementTransactions((prev) =>
                                              prev.map((item) =>
                                                item.id === tx.id
                                                  ? { ...item, category: updated.categoryName || "Uncategorized" }
                                                  : item
                                              )
                                            )
                                          })
                                          // Track transaction category changed
                                          safeCapture('transaction_category_changed', {
                                            previous_category: previousCategory,
                                            new_category: updated.categoryName || categoryName,
                                            transaction_type: 'receipt',
                                          })
                                        }
                                      })
                                      .catch((err) => {
                                        // Revert on error
                                        startTransition(() => {
                                          setStatementTransactions((prev) =>
                                            prev.map((item) =>
                                              item.id === tx.id
                                                ? { ...item, category: previousCategory }
                                                : item
                                            )
                                          )
                                        })
                                        console.error("Error updating category:", err)
                                        toast.error("Error updating category")
                                      })
                                  }}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select category" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__uncategorized__">Uncategorized</SelectItem>
                                    {dialogReceiptCategories.map((category) => (
                                      <SelectItem key={category.name} value={category.name}>
                                        <span className="flex items-center gap-2">
                                          <span
                                            className="h-2 w-2 rounded-full border border-border/50"
                                            style={{
                                              backgroundColor: category.color ?? undefined,
                                              borderColor: category.color ?? undefined,
                                            }}
                                          />
                                          <span className="truncate">{category.name}</span>
                                          {category.typeName ? (
                                            <span className="ml-auto text-xs text-muted-foreground truncate">
                                              {category.typeName}
                                            </span>
                                          ) : null}
                                        </span>
                                      </SelectItem>
                                    ))}
                                    <Separator className="my-1" />
                                    <SelectItem
                                      value="__create_new__"
                                      onSelect={(e) => {
                                        e.preventDefault()
                                        setIsCreateReceiptCategoryDialogOpen(true)
                                      }}
                                    >
                                      <span className="flex items-center gap-2">
                                        <IconPlus className="h-3 w-3" />
                                        Create new category
                                      </span>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <CategorySelect
                                  value={tx.category}
                                  onValueChange={(value) => {
                                    // Update state in a transition so it doesn't block the Select from closing
                                    const previousCategory = tx.category
                                    startTransition(() => {
                                      setStatementTransactions((prev) =>
                                        prev.map((item) =>
                                          item.id === tx.id
                                            ? { ...item, category: value }
                                            : item
                                        )
                                      )
                                    })

                                    // Then update the database in the background (don't await)
                                    fetch(
                                      `/api/transactions/${tx.id}`,
                                      {
                                        method: "PATCH",
                                        headers: {
                                          "Content-Type": "application/json",
                                        },
                                        body: JSON.stringify({
                                          category: value,
                                        }),
                                      }
                                    )
                                      .then(async (response) => {
                                        if (!response.ok) {
                                          // Revert on error
                                          startTransition(() => {
                                            setStatementTransactions((prev) =>
                                              prev.map((item) =>
                                                item.id === tx.id
                                                  ? { ...item, category: previousCategory }
                                                  : item
                                              )
                                            )
                                          })
                                          const errorData = await response.json().catch(() => ({}))
                                          toast.error(errorData.error || "Failed to update category")
                                        } else {
                                          // Track transaction category changed
                                          safeCapture('transaction_category_changed', {
                                            previous_category: previousCategory,
                                            new_category: value,
                                            transaction_type: 'statement',
                                          })
                                        }
                                      })
                                      .catch((err) => {
                                        // Revert on error
                                        startTransition(() => {
                                          setStatementTransactions((prev) =>
                                            prev.map((item) =>
                                              item.id === tx.id
                                                ? { ...item, category: previousCategory }
                                                : item
                                            )
                                          )
                                        })
                                        console.error(
                                          "Error updating category:",
                                          err
                                        )
                                        toast.error("Error updating category")
                                      })
                                  }}
                                />
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(tx.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No transactions found for this statement.
                    </p>
                  )}
                </DialogContent>
              </Dialog>

              {/* Create Receipt Category Dialog (from transaction view) */}
              <Dialog
                open={isCreateReceiptCategoryDialogOpen}
                onOpenChange={(open) => {
                  setIsCreateReceiptCategoryDialogOpen(open)
                  if (!open) {
                    setNewDialogReceiptCategoryName("")
                    if (dialogReceiptCategoryTypes.length > 0) {
                      setNewDialogReceiptCategoryTypeId(String(dialogReceiptCategoryTypes[0].id))
                    }
                  }
                }}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Receipt Category</DialogTitle>
                    <DialogDescription>
                      Add a new category for receipt transactions.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="dialog-receipt-category-name">Category name</Label>
                      <Input
                        id="dialog-receipt-category-name"
                        placeholder="e.g., Fruits, Vegetables, Meat"
                        value={newDialogReceiptCategoryName}
                        onChange={(e) => setNewDialogReceiptCategoryName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !isCreatingReceiptCategory) {
                            e.preventDefault()
                            handleCreateDialogReceiptCategory()
                          }
                        }}
                        disabled={isCreatingReceiptCategory}
                        autoFocus
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Macronutrient type</Label>
                      <Select
                        value={newDialogReceiptCategoryTypeId}
                        onValueChange={setNewDialogReceiptCategoryTypeId}
                        disabled={isCreatingReceiptCategory}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {dialogReceiptCategoryTypes.map((type) => (
                            <SelectItem key={type.id} value={String(type.id)}>
                              {type.name}
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
                        setIsCreateReceiptCategoryDialogOpen(false)
                        setNewDialogReceiptCategoryName("")
                      }}
                      disabled={isCreatingReceiptCategory}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateDialogReceiptCategory}
                      disabled={
                        isCreatingReceiptCategory ||
                        !newDialogReceiptCategoryName.trim() ||
                        !newDialogReceiptCategoryTypeId
                      }
                    >
                      {isCreatingReceiptCategory ? (
                        <>
                          <IconLoader2 className="mr-2 size-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <AlertDialog
                open={deleteDialogOpen}
                onOpenChange={(open) => {
                  setDeleteDialogOpen(open)
                  if (!open) {
                    setStatementToDelete(null)
                  }
                }}
              >
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete report?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove{" "}
                      <span className="font-medium">
                        {statementToDelete?.name ?? "this report"}
                      </span>{" "}
                      and its transactions from Neon storage.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleteLoading}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={handleDeleteStatement}
                      disabled={deleteLoading}
                    >
                      {deleteLoading ? (
                        <>
                          <IconLoader2 className="mr-2 size-4 animate-spin" />
                          Deleting…
                        </>
                      ) : (
                        <>
                          <IconTrash className="mr-2 size-4" />
                          Delete
                        </>
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Dialog
                open={addCategoryDialogOpen}
                onOpenChange={setAddCategoryDialogOpen}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Category</DialogTitle>
                    <DialogDescription>
                      Create a new category for organizing your transactions.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col gap-4 py-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="category-name">Category Name</Label>
                      <Input
                        id="category-name"
                        placeholder="e.g., Entertainment, Travel, Healthcare"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !addCategoryLoading) {
                            e.preventDefault()
                            handleAddCategory()
                          }
                        }}
                        disabled={addCategoryLoading}
                        autoFocus
                      />
                    </div>
                    <div className="flex flex-col gap-2 text-sm">
                      <Label>Needs vs Wants grouping</Label>
                      <p className="text-xs text-muted-foreground">
                        Choose how this category should be treated in the Needs vs Wants chart.
                      </p>
                      <Select
                        value={newCategoryTier}
                        onValueChange={(value) =>
                          setNewCategoryTier(value as "Essentials" | "Mandatory" | "Wants")
                        }
                        disabled={addCategoryLoading}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select spending type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Essentials">Essentials (needs)</SelectItem>
                          <SelectItem value="Mandatory">Mandatory obligations</SelectItem>
                          <SelectItem value="Wants">Wants / discretionary</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setAddCategoryDialogOpen(false)
                        setNewCategoryName("")
                      }}
                      disabled={addCategoryLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddCategory}
                      disabled={addCategoryLoading || !newCategoryName.trim()}
                    >
                      {addCategoryLoading ? (
                        <>
                          <IconLoader2 className="mr-2 size-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <IconPlus className="mr-2 size-4" />
                          Add Category
                        </>
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <AlertDialog
                open={deleteCategoryDialogOpen}
                onOpenChange={(open) => {
                  setDeleteCategoryDialogOpen(open)
                  if (!open) {
                    setCategoryToDelete(null)
                  }
                }}
              >
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete category?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove{" "}
                      <span className="font-medium">
                        {categoryToDelete?.name ?? "this category"}
                      </span>
                      . Transactions using this category will have their category set to null.
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleteCategoryLoading}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={handleDeleteCategory}
                      disabled={deleteCategoryLoading}
                    >
                      {deleteCategoryLoading ? (
                        <>
                          <IconLoader2 className="mr-2 size-4 animate-spin" />
                          Deleting…
                        </>
                      ) : (
                        <>
                          <IconTrash className="mr-2 size-4" />
                          Delete
                        </>
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Dialog
                open={addReceiptTypeDialogOpen}
                onOpenChange={setAddReceiptTypeDialogOpen}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Receipt Type</DialogTitle>
                    <DialogDescription>
                      Create a macronutrient type for organizing grocery categories.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col gap-4 py-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="receipt-type-name">Type Name</Label>
                      <Input
                        id="receipt-type-name"
                        placeholder="e.g., Protein, Carbs, Fat"
                        value={newReceiptTypeName}
                        onChange={(e) => setNewReceiptTypeName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !addReceiptTypeLoading) {
                            e.preventDefault()
                            handleAddReceiptType()
                          }
                        }}
                        disabled={addReceiptTypeLoading}
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setAddReceiptTypeDialogOpen(false)
                        setNewReceiptTypeName("")
                      }}
                      disabled={addReceiptTypeLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddReceiptType}
                      disabled={addReceiptTypeLoading || !newReceiptTypeName.trim()}
                    >
                      {addReceiptTypeLoading ? (
                        <>
                          <IconLoader2 className="mr-2 size-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <IconPlus className="mr-2 size-4" />
                          Add Type
                        </>
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <AlertDialog
                open={deleteReceiptTypeDialogOpen}
                onOpenChange={(open) => {
                  setDeleteReceiptTypeDialogOpen(open)
                  if (!open) {
                    setReceiptTypeToDelete(null)
                  }
                }}
              >
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete receipt type?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove{" "}
                      <span className="font-medium">
                        {receiptTypeToDelete?.name ?? "this type"}
                      </span>
                      . Deleting a type that is used by receipt items may fail.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleteReceiptTypeLoading}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={handleDeleteReceiptType}
                      disabled={deleteReceiptTypeLoading}
                    >
                      {deleteReceiptTypeLoading ? (
                        <>
                          <IconLoader2 className="mr-2 size-4 animate-spin" />
                          Deleting…
                        </>
                      ) : (
                        <>
                          <IconTrash className="mr-2 size-4" />
                          Delete
                        </>
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Dialog
                open={addReceiptCategoryDialogOpen}
                onOpenChange={setAddReceiptCategoryDialogOpen}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Receipt Category</DialogTitle>
                    <DialogDescription>
                      Create a food category for categorizing receipt line items.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col gap-4 py-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="receipt-category-name">Category Name</Label>
                      <Input
                        id="receipt-category-name"
                        placeholder="e.g., Fruits, Vegetables, Meat"
                        value={newReceiptCategoryName}
                        onChange={(e) => setNewReceiptCategoryName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !addReceiptCategoryLoading) {
                            e.preventDefault()
                            handleAddReceiptCategory()
                          }
                        }}
                        disabled={addReceiptCategoryLoading}
                        autoFocus
                      />
                    </div>
                    <div className="flex flex-col gap-2 text-sm">
                      <Label>Macronutrient type</Label>
                      <Select
                        value={newReceiptCategoryTypeId}
                        onValueChange={setNewReceiptCategoryTypeId}
                        disabled={addReceiptCategoryLoading}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a type" />
                        </SelectTrigger>
                        <SelectContent>
                          {receiptCategoryTypes.map((type) => (
                            <SelectItem key={type.id} value={String(type.id)}>
                              {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setAddReceiptCategoryDialogOpen(false)
                        setNewReceiptCategoryName("")
                      }}
                      disabled={addReceiptCategoryLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddReceiptCategory}
                      disabled={
                        addReceiptCategoryLoading ||
                        !newReceiptCategoryName.trim() ||
                        !newReceiptCategoryTypeId
                      }
                    >
                      {addReceiptCategoryLoading ? (
                        <>
                          <IconLoader2 className="mr-2 size-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <IconPlus className="mr-2 size-4" />
                          Add Receipt Category
                        </>
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <AlertDialog
                open={deleteReceiptCategoryDialogOpen}
                onOpenChange={(open) => {
                  setDeleteReceiptCategoryDialogOpen(open)
                  if (!open) {
                    setReceiptCategoryToDelete(null)
                  }
                }}
              >
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete receipt category?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove{" "}
                      <span className="font-medium">
                        {receiptCategoryToDelete?.name ?? "this category"}
                      </span>
                      . Receipt items using this category will become uncategorized.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleteReceiptCategoryLoading}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={handleDeleteReceiptCategory}
                      disabled={deleteReceiptCategoryLoading}
                    >
                      {deleteReceiptCategoryLoading ? (
                        <>
                          <IconLoader2 className="mr-2 size-4 animate-spin" />
                          Deleting…
                        </>
                      ) : (
                        <>
                          <IconTrash className="mr-2 size-4" />
                          Delete
                        </>
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>

        {/* Modern Confirmation Dialog */}
        <Dialog open={isAiReparseOpen} onOpenChange={setIsAiReparseOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Reparse with AI</DialogTitle>
              <DialogDescription>
                Add any context that helps the parser (bank name, column meanings, or date format).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="ai-reparse-context-data-library">
                Context (optional)
              </label>
              <textarea
                id="ai-reparse-context-data-library"
                className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Example: Date column is DD/MM/YY, amounts are negative for debits."
                value={aiReparseContext}
                onChange={(event) => setAiReparseContext(event.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAiReparseOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAiReparse}
                disabled={isAiReparsing || !droppedFile}
              >
                {isAiReparsing ? "Reparsing..." : "Reparse with AI"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[95vw] lg:max-w-[1400px] w-full max-h-[90vh] flex flex-col p-0 gap-0">
            <div className="px-6 pt-6 pb-4 flex-shrink-0">
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <IconCircleCheck className="w-5 h-5 text-primary" />
                  </div>
                  <DialogTitle className="text-xl">Confirm File Upload</DialogTitle>
                </div>
                <DialogDescription className="text-base">
                  Review the file details below and confirm to proceed with the upload.
                </DialogDescription>
              </DialogHeader>
            </div>
            <Separator className="flex-shrink-0" />
            {droppedFile && (
              <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1 min-h-0">
                <Card className="border-2">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                          <IconFile className="w-8 h-8 text-primary" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 space-y-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground mb-1 break-words">
                            {droppedFile.name}
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {formatFileSize(droppedFile.size)}
                            </Badge>
                            {droppedFile.type && (
                              <Badge variant="outline" className="text-xs">
                                {droppedFile.type.split('/')[1]?.toUpperCase() || 'FILE'}
                              </Badge>
                            )}
                            {transactionCount > 0 && (
                              <Badge variant="default" className="text-xs">
                                {transactionCount} transactions
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Separator />
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">File Type</p>
                            <p className="font-medium">{droppedFile.type || "Unknown"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">File Size</p>
                            <p className="font-medium">{formatFileSize(droppedFile.size)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Parsing Status */}
                {isParsing && (
                  <Card className="border-2 border-primary/20 bg-primary/5">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <IconLoader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">Parsing file...</p>
                            <p className="text-xs text-muted-foreground">Extracting transactions and categorizing</p>
                          </div>
                          <span className="text-sm font-semibold text-primary flex-shrink-0">{Math.round(parsingProgress)}%</span>
                        </div>
                        <div className="w-full">
                          <Progress value={parsingProgress} className="w-full h-3" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Parse Error */}
                {parseError && !isParsing && (
                  <Card className="border-2 border-destructive/20 bg-destructive/5">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <IconAlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-destructive">Parse Error</p>
                          <p className="text-xs text-muted-foreground mt-1">{parseError}</p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsAiReparseOpen(true)}
                          disabled={!droppedFile || isAiReparsing}
                        >
                          Reparse with AI
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Import Progress */}
                {isImporting && (
                  <Card className="border-2 border-primary/20 bg-primary/5">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <IconLoader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">Importing transactions...</p>
                            <p className="text-xs text-muted-foreground">
                              Please wait while we import {transactionCount} transactions into the database
                            </p>
                          </div>
                          <span className="text-sm font-semibold text-primary flex-shrink-0">{Math.round(importProgress)}%</span>
                        </div>
                        <div className="w-full">
                          <Progress value={importProgress} className="w-full h-3" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Parsed CSV Preview */}
                {parsedCsv && !isParsing && !parseError && !isImporting && (
                  <Card className="border-2 overflow-hidden flex flex-col min-h-0 max-w-[1200px] w-full mx-auto">
                    <CardHeader className="flex-shrink-0 px-4 pt-4 pb-2">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <CardTitle className="text-sm">Preview ({transactionCount} transactions)</CardTitle>
                          <CardDescription className="text-xs">
                            Review and edit categories before importing
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleDeleteSelectedRows}
                            disabled={selectedParsedRowIds.size === 0}
                          >
                            Delete selected
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsAiReparseOpen(true)}
                            disabled={!droppedFile || isAiReparsing}
                          >
                            Reparse with AI
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 min-h-0 overflow-hidden">
                      <div className="h-full max-h-[500px] overflow-auto rounded-lg border">
                        <Table>
                          <TableHeader className="bg-muted sticky top-0 z-10">
                            <TableRow>
                              <TableHead className="w-12">
                                <Checkbox
                                  checked={parsedRows.length > 0 && selectedParsedRowIds.size === parsedRows.length}
                                  onCheckedChange={(checked) => handleSelectAllParsedRows(checked === true)}
                                  aria-label="Select all transactions"
                                />
                              </TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead className="w-12"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {parsedRows.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                  No transactions found
                                </TableCell>
                              </TableRow>
                            ) : (
                              parsedRows.map((row) => {
                                const amount = typeof row.amount === 'number' ? row.amount : parseFloat(row.amount) || 0
                                const category = row.category || 'Other'

                                return (
                                  <MemoizedTableRow
                                    key={row.id ?? `${row.date}-${row.description}`}
                                    row={row}
                                    amount={amount}
                                    category={category}
                                    isSelected={selectedParsedRowIds.has(row.id)}
                                    onSelectChange={(value) => handleToggleParsedRow(row.id, value)}
                                    onCategoryChange={(value) => handleCategoryChange(row.id, value)}
                                    onDelete={() => handleDeleteRow(row.id)}
                                    formatCurrency={formatCurrency}
                                  />
                                )
                              })
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
            <Separator className="flex-shrink-0" />
            <div className="px-6 py-4 flex-shrink-0">
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isImporting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirm}
                  className="gap-2"
                  disabled={isParsing || isAiReparsing || isImporting || !!parseError || !parsedCsv}
                >
                  {isImporting ? (
                    <>
                      <IconLoader2 className="w-4 h-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <IconUpload className="w-4 h-4" />
                      Import to Database
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

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
              window.location.href = '/billing'
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
              window.location.href = '/billing'
            }}
            onDeleteUnused={() => {
              setIsCategoryLimitDialogOpen(false)
              setCategoryLimitData(null)
              toast.info("Review your categories in the tables below")
            }}
          />
        )}
      </SidebarInset >
    </SidebarProvider >
  )
}
