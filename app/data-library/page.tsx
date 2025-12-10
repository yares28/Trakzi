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
import { toast } from "sonner"
import { normalizeTransactions, cn } from "@/lib/utils"
import { parseCsvToRows } from "@/lib/parsing/parseCsvToRows"
import { rowsToCanonicalCsv } from "@/lib/parsing/rowsToCanonicalCsv"
import { TxRow } from "@/lib/types/transactions"
import { memo } from "react"

type ParsedRow = TxRow & { id: number }

// Memoized table row component to prevent unnecessary re-renders
const MemoizedTableRow = memo(function MemoizedTableRow({
  row,
  amount,
  balance,
  category,
  hasBalance,
  onCategoryChange,
  onDelete
}: {
  row: ParsedRow
  amount: number
  balance: number | null
  category: string
  hasBalance: boolean
  onCategoryChange: (value: string) => void
  onDelete: () => void
}) {
  return (
    <TableRow>
      <TableCell className="w-28 flex-shrink-0">
        {row.date}
      </TableCell>
      <TableCell className="min-w-[350px] max-w-[600px]">
        <div className="truncate" title={row.description}>
          {row.description}
        </div>
      </TableCell>
      <TableCell className={cn("text-right font-medium w-24 flex-shrink-0", amount < 0 ? "text-red-500" : "text-green-500")}>
        {amount.toFixed(2)}€
      </TableCell>
      <TableCell className="w-[140px] flex-shrink-0">
        <CategorySelect
          value={category}
          onValueChange={onCategoryChange}
        />
      </TableCell>
      {hasBalance && (
        <TableCell className="text-right w-32 flex-shrink-0">
          {balance !== null ? `${balance.toFixed(2)}€` : "-"}
        </TableCell>
      )}
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
    prevProps.row.id === nextProps.row.id
  )
})

type Transaction = {
  id: number
  date: string
  description: string
  amount: number
  balance: number | null
  category: string
}

type Statement = {
  id: string
  name: string
  type: string
  date: string
  reviewer: string
  statementId: number
  fileId: string | null
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
  new Date(input).toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
  })

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Math.abs(value) >= 1000 ? 0 : 2,
  }).format(value)

export default function DataLibraryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isPending, startTransition] = useTransition()
  const [statements, setStatements] = useState<Statement[]>([])
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [userFiles, setUserFiles] = useState<UserFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [viewLoading, setViewLoading] = useState(false)
  const [selectedStatement, setSelectedStatement] = useState<Statement | null>(null)
  const [statementTransactions, setStatementTransactions] = useState<
    {
      id: number
      date: string
      description: string
      amount: number
      balance: number | null
      category: string
    }[]
  >([])
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
  const [transactionCount, setTransactionCount] = useState<number>(0)
  const dragCounterRef = useRef(0)
  const csvRegenerationTimerRef = useRef<NodeJS.Timeout | null>(null)
  const latestParsedRowsRef = useRef<ParsedRow[]>([])

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

  const fetchLibraryData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [txRes, statsRes, stmtRes, catRes, filesRes] = await Promise.all([
        fetch("/api/transactions"),
        fetch("/api/stats"),
        fetch("/api/statements"),
        fetch("/api/categories"),
        fetch("/api/files"),
      ])

      if (!txRes.ok) {
        throw new Error(
          (await txRes.text()) || "Unable to load transactions dataset."
        )
      }
      if (!statsRes.ok) {
        throw new Error((await statsRes.text()) || "Stats pipeline unavailable.")
      }
      if (!stmtRes.ok) {
        throw new Error(
          (await stmtRes.text()) || "Failed to fetch statement archive."
        )
      }
      if (!catRes.ok) {
        throw new Error(
          (await catRes.text()) || "Unable to load category taxonomy."
        )
      }
      if (!filesRes.ok) {
        throw new Error(
          (await filesRes.text()) || "Unable to load raw file inventory."
        )
      }

      const [txData, statsData, stmtData, catData, filesData] =
        await Promise.all([
        txRes.json(),
        statsRes.json(),
        stmtRes.json(),
          catRes.json(),
          filesRes.json(),
        ])

      setTransactions(normalizeTransactions(txData))
      setStats(statsData)
      setStatements(stmtData)
      setCategories(catData)
      setUserFiles(filesData)
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
  }, [])

  const handleDeleteRow = useCallback((rowId: number) => {
    flushSync(() => {
      setParsedRows((prevRows) => {
        const updatedRows = prevRows.filter((row) => row.id !== rowId)
        latestParsedRowsRef.current = updatedRows
        setTransactionCount(updatedRows.length)
        return updatedRows
      })
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

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    dragCounterRef.current = 0

    const files = Array.from(e.dataTransfer.files)
    if (files && files.length > 0) {
      const file = files[0]
      setDroppedFile(file)
      setIsDialogOpen(true)
      setIsParsing(true)
      setParsingProgress(0)
      setParseError(null)
      setParsedCsv(null)
      setFileId(null)
      setTransactionCount(0)

      setParsingProgress(5)
      
      try {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("bankName", "Unknown")

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
        } else if (errorMessage.includes("Failed to parse")) {
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
    }
  }, [])

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
        const errorData = await response.json().catch(() => ({ error: "Failed to import" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setImportProgress(100)

      toast.success("File Imported Successfully", {
        description: `${data.inserted} transactions imported from ${droppedFile.name}`,
      })

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
        throw new Error(errorData.error || "Failed to add category")
      }

      const created = await response.json()
      
      // Refresh categories list
      await fetchLibraryData()
      
      // Reset form
      setNewCategoryName("")
      setNewCategoryTier("Wants")
      setAddCategoryDialogOpen(false)
      
      // Persist the chosen tier locally for Needs vs Wants classification
      saveCategoryTier(created.name ?? trimmedName, newCategoryTier)
      
      toast.success(`Category "${created.name}" added`)
    } catch (error) {
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

      // Refresh categories list
      await fetchLibraryData()
      
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

  const isDefaultCategory = (categoryName: string): boolean => {
    return DEFAULT_CATEGORIES.includes(categoryName)
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
        setStatementTransactions(normalizeTransactions(data))
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
    const statementId = statementToDelete.statementId ?? Number(statementToDelete.id)
    if (!statementId) return

    setDeleteLoading(true)
    try {
      const response = await fetch(`/api/statements/${statementId}`, {
        method: "DELETE",
      })
      if (response.ok) {
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

  const kpiCards = [
    {
      title: "Transactions Indexed",
      value: formatNumber(totalTransactions),
      hint: latestTransactionDate
        ? `Last touch ${formatFreshness(latestTransactionDate).toLowerCase()}`
        : "Waiting for first sync",
      icon: IconRefresh,
    },
    {
      title: "Documents Archived",
      value: formatNumber(statements.length),
      hint:
        Object.keys(statementDistribution).length > 0
          ? `${Object.keys(statementDistribution).length} source${
              Object.keys(statementDistribution).length === 1 ? "" : "s"
            }`
          : "Upload a statement to unlock insights",
      icon: IconShieldCheck,
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
                {error && (
                  <div className="mt-4 flex items-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    <IconAlertTriangle className="size-4" />
                    <span>{error}</span>
                  </div>
                )}
              </section>

              <section className="grid gap-4 px-4 lg:grid-cols-3 lg:px-6">
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
                        {card.title === "Transactions Indexed"
                          ? "synced ledger entries"
                          : "documents captured"}
                      </p>
                    </CardContent>
                  </Card>
                ))}
                <Card>
                  <CardHeader className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <CardTitle>User Categories</CardTitle>
                      <CardDescription>
                        Count pulled directly from your Neon categories table.
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="gap-1">
                      <IconCategory className="size-3.5" />
                      Live
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-semibold">
                      {formatNumber(categories.length)}
                    </div>
                    <p className="text-muted-foreground text-sm">
                      total categories synced from Neon
                    </p>
                  </CardContent>
                </Card>
              </section>


              <section className="px-4 lg:px-6">
                <div className="grid gap-4 lg:grid-cols-2">
                  <Card className="lg:col-span-2">
                    <CardHeader className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <CardTitle>Reports</CardTitle>
                        <CardDescription>
                          Latest statements synced from Neon storage.
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="gap-1">
                        <IconFolders className="size-3.5" />
                        {statements.length} total
                      </Badge>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Report</TableHead>
                            <TableHead className="hidden md:table-cell">
                              Type
                            </TableHead>
                            <TableHead>Uploaded</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {statements.length ? (
                            statements.slice(0, 6).map((statement) => (
                              <TableRow key={statement.id}>
                                <TableCell className="font-medium">
                                  {statement.name}
                                </TableCell>
                                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                                  {statement.type}
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
                          ) : (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center">
                                <p className="text-sm text-muted-foreground">
                                  No reports yet—upload a statement to populate this list.
                                </p>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
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
                    <CardHeader className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <CardTitle>Categories</CardTitle>
                        <CardDescription>
                          Full taxonomy pulled from Neon categories table.
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="gap-1">
                          <IconCategory className="size-3.5" />
                          {categories.length} total
                        </Badge>
                        <Button
                          size="sm"
                          onClick={() => setAddCategoryDialogOpen(true)}
                        >
                          <IconPlus className="size-4 mr-1" />
                          Add Category
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
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
                          {categories.length ? (
                            categories.map((category) => (
                              <TableRow key={category.id}>
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
                                    if (amount < 0) {
                                      // Expenses (negative) - show in red
                                      return (
                                        <span className="text-red-500">
                                          {formatCurrency(amount)}
                                        </span>
                                      )
                                    }
                                    // Income (positive) - show in green
                                    return (
                                      <span className="text-green-500">
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
                          ) : (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center">
                                <p className="text-sm text-muted-foreground">
                                  No categories yet—tag transactions to build your taxonomy.
                                </p>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
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
                          <TableHead className="text-right">Balance</TableHead>
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
                                        alert(errorData.error || "Failed to update category")
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
                                      alert("Error updating category")
                                    })
                                }}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(tx.amount)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {tx.balance !== null
                                ? formatCurrency(tx.balance)
                                : "—"}
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
            </div>
          </div>
        </div>

        {/* Modern Confirmation Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[95vw] lg:max-w-[1200px] w-full max-h-[90vh] flex flex-col p-0 gap-0">
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
                  <Card className="border-2 overflow-hidden flex flex-col min-h-0">
                    <CardHeader className="flex-shrink-0 px-4 pt-4 pb-2">
                      <CardTitle className="text-sm">Preview ({transactionCount} transactions)</CardTitle>
                      <CardDescription className="text-xs">
                        Review and edit categories before importing
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 min-h-0 overflow-hidden">
                      <div className="h-full max-h-[500px] overflow-auto relative">
                        <Table>
                          <TableHeader className="sticky top-0 z-20 bg-muted border-b">
                            <TableRow>
                              <TableHead className="sticky top-0 z-20 bg-muted">Date</TableHead>
                              <TableHead className="sticky top-0 z-20 bg-muted">Description</TableHead>
                              <TableHead className="sticky top-0 z-20 bg-muted text-right">Amount</TableHead>
                              <TableHead className="sticky top-0 z-20 bg-muted">Category</TableHead>
                              {parsedRows.some((row) => row.balance !== null && row.balance !== undefined) && (
                                <TableHead className="sticky top-0 z-20 bg-muted text-right">Balance</TableHead>
                              )}
                              <TableHead className="sticky top-0 z-20 bg-muted w-12"></TableHead>
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
                                const balance = row.balance !== null && row.balance !== undefined 
                                  ? (typeof row.balance === 'number' ? row.balance : parseFloat(row.balance)) 
                                  : null
                                const category = row.category || 'Other'
                                const hasBalance = parsedRows.some((r) => r.balance !== null && r.balance !== undefined)
                                
                                return (
                                  <MemoizedTableRow
                                    key={row.id ?? `${row.date}-${row.description}`}
                                    row={row}
                                    amount={amount}
                                    balance={balance}
                                    category={category}
                                    hasBalance={hasBalance}
                                    onCategoryChange={(value) => handleCategoryChange(row.id, value)}
                                    onDelete={() => handleDeleteRow(row.id)}
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
                  disabled={isParsing || isImporting || !!parseError || !parsedCsv}
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
      </SidebarInset>
    </SidebarProvider>
  )
}

