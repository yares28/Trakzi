"use client"

import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import { flushSync } from "react-dom"
import { AppSidebar } from "@/components/app-sidebar"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { ChartCategoryFlow } from "@/components/chart-category-flow"
import { ChartSpendingFunnel } from "@/components/chart-spending-funnel"
import { ChartExpensesPie } from "@/components/chart-expenses-pie"
import { ChartTreeMap } from "@/components/analytics-advanced-charts"
import { DataTable } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { IconUpload, IconFile, IconCircleCheck, IconLoader2, IconAlertCircle, IconTrash } from "@tabler/icons-react"
import { toast } from "sonner"
import { parseCsvToRows } from "@/lib/parsing/parseCsvToRows"
import { rowsToCanonicalCsv } from "@/lib/parsing/rowsToCanonicalCsv"
import { TxRow } from "@/lib/types/transactions"
import { CategorySelect } from "@/components/category-select"
import { DEFAULT_CATEGORIES } from "@/lib/categories"
import { Progress } from "@/components/ui/progress"
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
  // Only re-render if the category or row id actually changed
  return (
    prevProps.category === nextProps.category &&
    prevProps.row.id === nextProps.row.id
  )
})

export default function Page() {
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

  // Transactions state for charts
  const [transactions, setTransactions] = useState<Array<{
    id: number
    date: string
    description: string
    amount: number
    balance: number | null
    category: string
  }>>([])

  // Date filter state
  const [dateFilter, setDateFilter] = useState<string | null>(null)

  // Calculate stats directly from transactions data
  const stats = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return {
        totalIncome: 0,
        totalExpenses: 0,
        savingsRate: 0,
        netWorth: 0,
        incomeChange: 0,
        expensesChange: 0,
        savingsRateChange: 0,
        netWorthChange: 0
      }
    }

    // Filter out savings category from expenses (as per previous requirement)
    const filteredTransactions = transactions.filter(tx => {
      const category = (tx.category || "").toLowerCase()
      return category !== "savings"
    })

    // Calculate current period stats (all transactions when no filter, or filtered)
    const currentIncome = filteredTransactions
      .filter(tx => tx.amount > 0)
      .reduce((sum, tx) => sum + tx.amount, 0)

    const currentExpenses = Math.abs(filteredTransactions
      .filter(tx => tx.amount < 0)
      .reduce((sum, tx) => sum + tx.amount, 0))

    const currentSavingsRate = currentIncome > 0 
      ? ((currentIncome - currentExpenses) / currentIncome) * 100 
      : 0

    // Get net worth from latest transaction balance
    const sortedByDate = [...transactions].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    const netWorth = sortedByDate.length > 0 && sortedByDate[0].balance !== null
      ? sortedByDate[0].balance 
      : 0

    // Calculate previous period for comparison (last 3 months vs previous 3 months)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const threeMonthsAgo = new Date(today)
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    const sixMonthsAgo = new Date(threeMonthsAgo)
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 3)

    const formatDate = (date: Date) => date.toISOString().split('T')[0]
    const threeMonthsAgoStr = formatDate(threeMonthsAgo)
    const sixMonthsAgoStr = formatDate(sixMonthsAgo)

    // Previous period transactions (3-6 months ago)
    const previousTransactions = filteredTransactions.filter(tx => {
      const txDate = tx.date.split('T')[0]
      return txDate >= sixMonthsAgoStr && txDate < threeMonthsAgoStr
    })

    const previousIncome = previousTransactions
      .filter(tx => tx.amount > 0)
      .reduce((sum, tx) => sum + tx.amount, 0)

    const previousExpenses = Math.abs(previousTransactions
      .filter(tx => tx.amount < 0)
      .reduce((sum, tx) => sum + tx.amount, 0))

    const previousSavingsRate = previousIncome > 0 
      ? ((previousIncome - previousExpenses) / previousIncome) * 100 
      : 0

    // Get previous period net worth
    const previousSorted = previousTransactions.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    const previousNetWorth = previousSorted.length > 0 && previousSorted[0].balance !== null
      ? previousSorted[0].balance 
      : 0

    // Calculate percentage changes
    const incomeChange = previousIncome > 0 
      ? ((currentIncome - previousIncome) / previousIncome) * 100 
      : (currentIncome > 0 ? 100 : 0)

    const expensesChange = previousExpenses > 0 
      ? ((currentExpenses - previousExpenses) / previousExpenses) * 100 
      : (currentExpenses > 0 ? 100 : 0)

    const savingsRateChange = previousSavingsRate !== 0 
      ? currentSavingsRate - previousSavingsRate 
      : (currentSavingsRate > 0 ? 100 : 0)

    const netWorthChange = previousNetWorth > 0 
      ? ((netWorth - previousNetWorth) / previousNetWorth) * 100 
      : (netWorth > 0 ? 100 : 0)

    return {
      totalIncome: currentIncome,
      totalExpenses: currentExpenses,
      savingsRate: currentSavingsRate,
      netWorth: netWorth,
      incomeChange: incomeChange,
      expensesChange: expensesChange,
      savingsRateChange: savingsRateChange,
      netWorthChange: netWorthChange
    }
  }, [transactions])

  // Fetch transactions for charts
  const fetchTransactions = useCallback(async () => {
    try {
      const url = dateFilter 
        ? `/api/transactions?filter=${encodeURIComponent(dateFilter)}`
        : "/api/transactions"
      console.log("[Dashboard] Fetching transactions from:", url)
      const response = await fetch(url)
      const data = await response.json()
      console.log("[Dashboard] Response status:", response.status)
      console.log("[Dashboard] Response data:", data)
      console.log("[Dashboard] Is array?", Array.isArray(data))
      console.log("[Dashboard] Data length:", Array.isArray(data) ? data.length : "N/A")
      
      if (response.ok) {
        if (Array.isArray(data)) {
          console.log(`[Dashboard] Setting ${data.length} transactions`)
          console.log("[Dashboard] First transaction:", data[0])
          setTransactions(data)
        } else {
          console.error("[Dashboard] Response is not an array:", data)
          if (data.error) {
            toast.error("API Error", {
              description: data.error,
              duration: 10000,
            })
          }
        }
      } else {
        console.error("Failed to fetch transactions: HTTP", response.status, data)
        // Don't set empty array on error - keep previous data
        if (response.status === 401) {
          toast.error("Authentication Error", {
            description: "Please configure DEMO_USER_ID in .env.local",
            duration: 10000,
          })
        } else {
          toast.error("API Error", {
            description: data.error || `HTTP ${response.status}`,
            duration: 8000,
          })
        }
      }
    } catch (error) {
      console.error("Error fetching transactions:", error)
      toast.error("Network Error", {
        description: "Failed to fetch transactions. Check your database connection.",
        duration: 8000,
      })
    }
  }, [dateFilter])

  // Fetch transactions on mount and when filter changes
  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  // Listen for date filter changes from SiteHeader
  useEffect(() => {
    const handleFilterChange = (event: CustomEvent) => {
      setDateFilter(event.detail)
    }

    window.addEventListener("dateFilterChanged", handleFilterChange as EventListener)
    
    // Load initial filter from localStorage
    const savedFilter = localStorage.getItem("dateFilter")
    if (savedFilter) {
      setDateFilter(savedFilter)
    }

    return () => {
      window.removeEventListener("dateFilterChanged", handleFilterChange as EventListener)
    }
  }, [])

  // Parse CSV when it changes
  useEffect(() => {
    if (parsedCsv) {
      const rows = parseCsvToRows(parsedCsv)
      // Add a unique ID to each row for the DataTable
      const rowsWithId: ParsedRow[] = rows.map((row, index) => ({
        ...row,
        id: index,
        // Ensure category is a string, not undefined
        category: row.category || undefined
      }))
      console.log(`[DASHBOARD] Parsed ${rowsWithId.length} rows with categories:`, 
        rowsWithId.slice(0, 3).map(r => ({ desc: r.description.substring(0, 30), cat: r.category }))
      )
      setParsedRows(rowsWithId)
    } else {
      setParsedRows([])
    }
  }, [parsedCsv])

  // Debounce timer for CSV regeneration
  const csvRegenerationTimerRef = useRef<NodeJS.Timeout | null>(null)
  const latestParsedRowsRef = useRef<ParsedRow[]>(parsedRows)

  // Keep ref in sync with parsedRows
  useEffect(() => {
    latestParsedRowsRef.current = parsedRows
  }, [parsedRows])

  const handleCategoryChange = useCallback((rowId: number, newCategory: string) => {
    // Use flushSync to force immediate DOM update for instant UI feedback
    flushSync(() => {
      setParsedRows((prevRows) => {
        const updatedRows = prevRows.map((row) => {
          if (row.id === rowId) {
            return { ...row, category: newCategory }
          }
          return row
        })
        // Update ref immediately
        latestParsedRowsRef.current = updatedRows
        return updatedRows
      })
    })

    // Debounce CSV regeneration to avoid expensive operations on every change
    if (csvRegenerationTimerRef.current) {
      clearTimeout(csvRegenerationTimerRef.current)
    }

    csvRegenerationTimerRef.current = setTimeout(() => {
      // Update the CSV string so it's ready for import
      // Remove the 'id' field before converting back to CSV
      const rowsForCsv = latestParsedRowsRef.current.map((row) => {
        const { id: _ignored, ...rest } = row
        void _ignored
        return rest as TxRow
      })
      const newCsv = rowsToCanonicalCsv(rowsForCsv)
      setParsedCsv(newCsv)
    }, 300) // Wait 300ms after last change before regenerating CSV
  }, [])

  const handleDeleteRow = useCallback((rowId: number) => {
    flushSync(() => {
      setParsedRows((prevRows) => {
        const updatedRows = prevRows.filter((row) => row.id !== rowId)
        // Update ref immediately
        latestParsedRowsRef.current = updatedRows
        // Update transaction count
        setTransactionCount(updatedRows.length)
        return updatedRows
      })
    })

    // Regenerate CSV after deletion
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
    }, 100) // Shorter delay for deletion
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

      // Track parsing progress based on actual CSV parsing stages
      // Stage 1: File upload (0-15%)
      setParsingProgress(5)
      
      try {
        // Parse the file
        const formData = new FormData()
        formData.append("file", file)
        formData.append("bankName", "Unknown")

        // Get current categories to send to API (fallback to defaults)
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
          console.warn("[DASHBOARD] Failed to load categories from API. Using defaults.", categoriesError)
        }
        
        // Stage 2: Uploading file (15-25%)
        setParsingProgress(20)
        
        const response = await fetch("/api/statements/parse", {
          method: "POST",
          headers: {
            "X-Custom-Categories": JSON.stringify(currentCategories),
          },
          body: formData,
        })

        // Check content type and headers first
        const contentType = response.headers.get("content-type") || ""
        const fileIdHeader = response.headers.get("X-File-Id")
        const categorizationError = response.headers.get("X-Categorization-Error")
        const categorizationWarning = response.headers.get("X-Categorization-Warning")

        if (!response.ok) {
          // Read response body once - try JSON first, fallback to text
          let errorMessage = `HTTP error! status: ${response.status}`
          const responseText = await response.text()

          try {
            const errorData = JSON.parse(responseText)
            errorMessage = errorData.error || errorMessage
          } catch {
            // If not JSON, use text as error message
            errorMessage = responseText || errorMessage
          }

          throw new Error(errorMessage)
        }

        // Stage 3: Server processing - track response stream progress (25-90%)
        // This reflects actual CSV parsing progress as data streams in
        let responseText = ""
        
        if (response.body) {
          const reader = response.body.getReader()
          const contentLength = response.headers.get("content-length")
          const total = contentLength ? parseInt(contentLength, 10) : 0
          let received = 0
          const decoder = new TextDecoder()
          const chunks: string[] = []

          // Read the stream and track progress based on actual bytes received
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            
            const chunk = decoder.decode(value, { stream: true })
            chunks.push(chunk)
            received += value.length
            
            // Update progress: 25% (upload) + 65% (processing/download) based on bytes received
            // This matches the actual CSV parsing progress as data streams in
            if (total > 0) {
              const downloadProgress = (received / total) * 65 // 65% of total progress
              setParsingProgress(25 + downloadProgress)
            } else {
              // If no content-length, estimate based on received bytes
              // Estimate total size based on file size (CSV output is usually similar to input)
              const estimatedTotal = file.size * 1.2 // CSV might be slightly larger
              const estimatedProgress = Math.min(25 + (received / estimatedTotal) * 65, 90)
              setParsingProgress(estimatedProgress)
            }
          }

          // Combine all chunks
          responseText = chunks.join("")
        } else {
          // Fallback: if no stream, read normally
          setParsingProgress(60)
          responseText = await response.text()
          setParsingProgress(90)
        }

        // Stage 4: Processing complete (90-100%)
        setParsingProgress(95)

        if (contentType.includes("application/json")) {
          // File is not parseable - it's a JSON response
          try {
            const data = JSON.parse(responseText)
            if (!data.parseable) {
              setParseError(data.message || "File format not supported for parsing")
              setIsParsing(false)
              setParsingProgress(0)
              return
            }
          } catch {
            // If JSON parsing fails, treat as parse error
            throw new Error("Invalid response from server")
          }
        }

        // File is parseable - use the CSV content we already read
        const csv = responseText
        setParsingProgress(100)

        // Debug: Log CSV to see if categories are present
        console.log("[DASHBOARD] Received CSV, length:", csv.length);
        const csvLines = csv.trim().split("\n");
        console.log("[DASHBOARD] CSV header:", csvLines[0]);
        console.log("[DASHBOARD] CSV first data row:", csvLines[1]);
        console.log("[DASHBOARD] CSV second data row:", csvLines[2]);
        
        // Check if category column exists
        const header = csvLines[0].toLowerCase();
        if (!header.includes('category')) {
          console.error("[DASHBOARD] ERROR: Category column missing from CSV header!");
        } else {
          console.log("[DASHBOARD] Category column found in CSV");
        }

        // Count transactions (lines minus header)
        const lines = csv.trim().split("\n")
        const count = lines.length > 1 ? lines.length - 1 : 0

        setParsedCsv(csv)
        setFileId(fileIdHeader)
        setTransactionCount(count)

        // Show warning if categorization failed
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

        // Show more specific error messages
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

    // Simulate progress during import
    const progressInterval = setInterval(() => {
      setImportProgress((prev) => {
        if (prev >= 90) return prev // Don't go to 100 until import completes
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

      // Reset state
      setIsDialogOpen(false)
      setDroppedFile(null)
      setParsedCsv(null)
      setFileId(null)
      setTransactionCount(0)
      setParseError(null)
      setImportProgress(0)

      // Refresh transactions after import (stats will be recalculated automatically)
      await fetchTransactions()
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
    // Clear any pending CSV regeneration
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

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (csvRegenerationTimerRef.current) {
        clearTimeout(csvRegenerationTimerRef.current)
      }
    }
  }, [])

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
              <SectionCards
                totalIncome={stats.totalIncome}
                totalExpenses={stats.totalExpenses}
                savingsRate={stats.savingsRate}
                netWorth={stats.netWorth}
                incomeChange={stats.incomeChange}
                expensesChange={stats.expensesChange}
                savingsRateChange={stats.savingsRateChange}
                netWorthChange={stats.netWorthChange}
              />
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive data={useMemo(() => {
                  // Filter out savings category
                  const filteredTransactions = transactions.filter(tx => {
                    const category = (tx.category || "").toLowerCase()
                    return category !== "savings"
                  })

                  // Group transactions by date first
                  const transactionsByDate = new Map<string, Array<{ amount: number }>>()
                  filteredTransactions.forEach(tx => {
                    const date = tx.date.split('T')[0]
                    if (!transactionsByDate.has(date)) {
                      transactionsByDate.set(date, [])
                    }
                    transactionsByDate.get(date)!.push({ amount: tx.amount })
                  })

                  // Sort dates chronologically
                  const sortedDates = Array.from(transactionsByDate.keys()).sort((a, b) => a.localeCompare(b))

                  // Calculate income by date (keep as is - daily income)
                  const incomeByDate = new Map<string, number>()
                  sortedDates.forEach(date => {
                    const dayTransactions = transactionsByDate.get(date)!
                    const dayIncome = dayTransactions
                      .filter(tx => tx.amount > 0)
                      .reduce((sum, tx) => sum + tx.amount, 0)
                    if (dayIncome > 0) {
                      incomeByDate.set(date, dayIncome)
                    }
                  })

                  // Calculate cumulative expenses (accumulate over time, reduced by income)
                  let cumulativeExpenses = 0
                  const cumulativeExpensesByDate = new Map<string, number>()
                  
                  sortedDates.forEach(date => {
                    const dayTransactions = transactionsByDate.get(date)!
                    
                    // Process all transactions for this day
                    dayTransactions.forEach(tx => {
                      if (tx.amount < 0) {
                        // Add expense to cumulative total
                        cumulativeExpenses += Math.abs(tx.amount)
                      } else if (tx.amount > 0) {
                        // Reduce cumulative expenses by income amount
                        cumulativeExpenses = Math.max(0, cumulativeExpenses - tx.amount)
                      }
                    })
                    
                    // Store the cumulative value at the end of this date
                    cumulativeExpensesByDate.set(date, cumulativeExpenses)
                  })

                  // Combine income and cumulative expenses by date
                  const result = sortedDates.map(date => ({
                    date,
                    desktop: incomeByDate.get(date) || 0,
                    mobile: cumulativeExpensesByDate.get(date) || 0
                  }))

                  return result
                }, [transactions])} />
              </div>
              <div className="px-4 lg:px-6">
                <ChartCategoryFlow data={useMemo(() => {
                  if (!transactions || transactions.length === 0) {
                    return []
                  }

                  // Group by category and month
                  const categoryMap = new Map<string, Map<string, number>>()
                  const allMonths = new Set<string>()
                  
                  // Categories to exclude (case-insensitive)
                  const excludedCategories = ['income', 'transfer income']
                  
                  transactions.forEach(tx => {
                    const category = tx.category || "Other"
                    // Filter out income and transfer income categories
                    if (excludedCategories.some(excluded => category.toLowerCase() === excluded.toLowerCase())) {
                      return
                    }
                    const date = new Date(tx.date)
                    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
                    
                    allMonths.add(monthKey)
                    
                    if (!categoryMap.has(category)) {
                      categoryMap.set(category, new Map())
                    }
                    const monthMap = categoryMap.get(category)!
                    const current = monthMap.get(monthKey) || 0
                    monthMap.set(monthKey, current + Math.abs(tx.amount))
                  })
                  
                  // Sort months chronologically
                  const sortedMonths = Array.from(allMonths).sort((a, b) => a.localeCompare(b))
                  
                  // Calculate totals per month for normalization
                  const monthTotals = new Map<string, number>()
                  sortedMonths.forEach(month => {
                    let total = 0
                    categoryMap.forEach((months) => {
                      total += months.get(month) || 0
                    })
                    monthTotals.set(month, total)
                  })
                  
                  // Normalize data: convert to percentages so each month sums to 100
                  // This ensures consistent bar widths across all time periods
                  return Array.from(categoryMap.entries())
                    .map(([category, months]) => ({
                      id: category,
                      data: sortedMonths.map(month => {
                        const value = months.get(month) || 0
                        const total = monthTotals.get(month) || 1
                        // Convert to percentage, with a minimum of 0.1% to ensure visibility
                        const percentage = total > 0 ? (value / total) * 100 : 0
                        return {
                          x: month,
                          y: Math.max(percentage, 0.1) // Minimum 0.1% to ensure thin bars are still visible
                        }
                      })
                    }))
                    .filter(series => series.data.some(() => {
                      // Check if the original value (before normalization) was > 0
                      const month = series.data.find(d => d.x === series.data.find(d => d.y > 0.1)?.x)?.x
                      if (!month) return false
                      const originalValue = categoryMap.get(series.id)?.get(month) || 0
                      return originalValue > 0
                    })) // Only include categories with at least one non-zero value
                }, [transactions])} />
              </div>
              {/* Funnel and Pie Charts Side by Side */}
              <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @3xl/main:grid-cols-2">
                <ChartSpendingFunnel data={useMemo(() => {
                  const totalIncome = transactions.filter(tx => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0)
                  
                  // Group expenses by category
                  const categoryMap = new Map<string, number>()
                  transactions.filter(tx => tx.amount < 0).forEach(tx => {
                    const category = tx.category || "Other"
                    const current = categoryMap.get(category) || 0
                    categoryMap.set(category, current + Math.abs(tx.amount))
                  })
                  
                  // Calculate total expenses and savings first
                  const totalExpenses = Array.from(categoryMap.values()).reduce((sum, amount) => sum + amount, 0)
                  const savings = totalIncome - totalExpenses
                  
                  // Filter categories to only include those larger than savings
                  // Sort categories by amount (descending) and filter
                  const maxCategories = 5
                  const sortedCategories = Array.from(categoryMap.entries())
                    .map(([category, amount]) => ({ category, amount }))
                    .sort((a, b) => b.amount - a.amount)
                    .filter(cat => cat.amount > savings) // Only show categories larger than savings
                    .slice(0, maxCategories)
                  
                  // Calculate remaining expenses (if we're not showing all categories)
                  const shownExpenses = sortedCategories.reduce((sum, cat) => sum + cat.amount, 0)
                  const remainingExpenses = totalExpenses - shownExpenses
                  
                  // Build the funnel data: Income -> Top Categories -> (Other if needed) -> Savings
                  const funnelData: Array<{ id: string; value: number; label: string }> = []
                  
                  // Add Income
                  if (totalIncome > 0) {
                    funnelData.push({ id: "income", value: totalIncome, label: "Income" })
                  }
                  
                  // Add top expense categories (only those larger than savings)
                  sortedCategories.forEach(cat => {
                    funnelData.push({
                      id: cat.category.toLowerCase().replace(/\s+/g, '-'),
                      value: cat.amount,
                      label: cat.category
                    })
                  })
                  
                  // Add "Other" category if there are remaining expenses and it's larger than savings
                  if (remainingExpenses > 0 && remainingExpenses > savings) {
                    funnelData.push({
                      id: "other",
                      value: remainingExpenses,
                      label: "Other"
                    })
                  }
                  
                  // Add Savings
                  if (savings > 0) {
                    funnelData.push({ id: "savings", value: savings, label: "Savings" })
                  }
                  
                  return funnelData.filter(item => item.value > 0)
                }, [transactions])} />
                <ChartExpensesPie data={useMemo(() => {
                  // Group expenses by category
                  const categoryMap = new Map<string, number>()
                  transactions.filter(tx => tx.amount < 0).forEach(tx => {
                    const category = tx.category || "Other"
                    const current = categoryMap.get(category) || 0
                    categoryMap.set(category, current + Math.abs(tx.amount))
                  })
                  
                  return Array.from(categoryMap.entries())
                    .map(([id, value]) => ({ id, label: id, value }))
                    .sort((a, b) => b.value - a.value)
                }, [transactions])} />
              </div>
              <div className="px-4 lg:px-6">
                <ChartTreeMap 
                  data={useMemo(() => {
                    const categoryMap = new Map<string, { total: number; subcategories: Map<string, number> }>()

                    const getSubCategoryLabel = (description?: string) => {
                      if (!description) return "Misc"
                      // Use first meaningful chunk of the description as a subcategory label
                      const delimiterSplit = description.split(/[-–|]/)[0] ?? description
                      const trimmed = delimiterSplit.trim()
                      return trimmed.length > 24 ? `${trimmed.slice(0, 21)}…` : (trimmed || "Misc")
                    }

                    transactions
                      .filter(tx => tx.amount < 0)
                      .forEach(tx => {
                        const category = tx.category || "Other"
                        const amount = Math.abs(tx.amount)
                        if (!categoryMap.has(category)) {
                          categoryMap.set(category, { total: 0, subcategories: new Map() })
                        }
                        const categoryEntry = categoryMap.get(category)!
                        categoryEntry.total += amount

                        const subCategory = getSubCategoryLabel(tx.description)
                        categoryEntry.subcategories.set(subCategory, (categoryEntry.subcategories.get(subCategory) || 0) + amount)
                      })

                    const maxSubCategories = 5

                    return {
                      name: "Expenses",
                      children: Array.from(categoryMap.entries())
                        .map(([name, { total, subcategories }]) => {
                          const sortedSubs = Array.from(subcategories.entries()).sort((a, b) => b[1] - a[1])
                          const topSubs = sortedSubs.slice(0, maxSubCategories)
                          const remainingTotal = sortedSubs.slice(maxSubCategories).reduce((sum, [, value]) => sum + value, 0)
                          const children = topSubs.map(([subName, loc]) => ({ name: subName, loc }))
                          if (remainingTotal > 0) {
                            children.push({ name: "Other", loc: remainingTotal })
                          }
                          return {
                            name,
                            children: children.length > 0 ? children : [{ name, loc: total }]
                          }
                        })
                        .sort((a, b) => {
                          const aTotal = a.children.reduce((sum, child) => sum + (child.loc || 0), 0)
                          const bTotal = b.children.reduce((sum, child) => sum + (child.loc || 0), 0)
                          return bTotal - aTotal
                        })
                    }
                  }, [transactions])}
                />
              </div>
              <DataTable 
                data={[]} 
                transactions={transactions}
              />
            </div>
          </div>
        </div>
      </SidebarInset>

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

              {/* Import Progress - Show during import */}
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

              {/* Parsed CSV Preview - Hide during import */}
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
    </SidebarProvider>
  )
}
