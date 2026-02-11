import { useCallback, useEffect, useRef, useState } from "react"
import { flushSync } from "react-dom"

import { clearResponseCache } from "@/lib/request-deduplication"
import { parseCsvToRows } from "@/lib/parsing/parseCsvToRows"
import { buildStatementParseQuality, type ParseQualitySummary } from "@/lib/parsing/statement-parse-quality"
import { rowsToCanonicalCsv } from "@/lib/parsing/rowsToCanonicalCsv"
import { DEFAULT_CATEGORIES } from "@/lib/categories"
import { safeCapture } from "@/lib/posthog-safe"
import { toast } from "sonner"
import { TxRow } from "@/lib/types/transactions"

import type { ParsedRow } from "../types"
import { clearAnalyticsCache } from "@/app/analytics/_page/cache"
import { isFileDragEvent } from "../utils/file-dnd"
import { useCategoryPreferences } from "./useCategoryPreferences"

type UseStatementImportOptions = {
  refreshAnalyticsData: () => Promise<void> | void
}

export function useStatementImport({ refreshAnalyticsData }: UseStatementImportOptions) {
  // Statement drop-to-import state
  const [isDragging, setIsDragging] = useState(false)
  const [droppedFile, setDroppedFile] = useState<File | null>(null)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [parsingProgress, setParsingProgress] = useState(0)
  const [parsedCsv, setParsedCsv] = useState<string | null>(null)
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [parseQuality, setParseQuality] = useState<ParseQualitySummary | null>(null)
  const [fileId, setFileId] = useState<string | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [isAiReparseOpen, setIsAiReparseOpen] = useState(false)
  const [aiReparseContext, setAiReparseContext] = useState("")
  const [isAiReparsing, setIsAiReparsing] = useState(false)
  const [selectedParsedRowIds, setSelectedParsedRowIds] = useState<Set<number>>(new Set())
  const [transactionCount, setTransactionCount] = useState<number>(0)
  const [projectName, setProjectName] = useState<string>("")
  const dragCounterRef = useRef(0)
  const csvRegenerationTimerRef = useRef<NodeJS.Timeout | null>(null)
  const latestParsedRowsRef = useRef<ParsedRow[]>([])

  const { schedulePreferenceUpdate, resetPreferenceUpdates } = useCategoryPreferences()

  // Parse CSV when it changes
  useEffect(() => {
    if (parsedCsv) {
      const rows = parseCsvToRows(parsedCsv)
      const rowsWithId: ParsedRow[] = rows.map((row, index) => ({
        ...row,
        id: index,
        category: row.category || undefined,
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
            const keepReview = Boolean(row.needsReview)
            return {
              ...row,
              category: newCategory,
              needsReview: keepReview,
              reviewReason: keepReview ? row.reviewReason ?? null : null,
            }
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

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLElement>) => {
    if (!isFileDragEvent(e)) return
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current++
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLElement>) => {
    if (!isFileDragEvent(e)) return
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLElement>) => {
    if (!isFileDragEvent(e)) return
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const parseFile = useCallback(async (file: File, options?: { parseMode?: "auto" | "ai"; aiContext?: string }) => {
    const parseMode = options?.parseMode ?? "auto"
    const aiContext = options?.aiContext?.trim()
    const fileType = file.type || file.name.split(".").pop()?.toLowerCase() || "unknown"

    // Track file import started
    safeCapture("file_import_started", {
      file_name: file.name,
      file_size: file.size,
      file_type: fileType,
      parse_mode: parseMode,
    })

    let parseSucceeded = false
    const uploadReceiptFallback = async (): Promise<boolean> => {
      try {
        const formData = new FormData()
        formData.append("files", file)

        const response = await fetch("/api/receipts/upload", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          if (response.status === 403 && errorData?.code === "LIMIT_EXCEEDED") {
            toast.error("Transaction Limit Reached", {
              description: errorData.message || "You've reached your transaction limit. Upgrade for more capacity.",
              duration: 8000,
              action: {
                label: "Upgrade",
                onClick: () => { window.location.href = "/billing" },
              },
            })
            return false
          }

          const errorMessage = errorData?.error || "Failed to upload receipt."
          setParseError(errorMessage)
          toast.error("Receipt Upload Failed", {
            description: errorMessage,
            duration: 8000,
          })
          return false
        }

        const payload = await response.json()
        const receipts = Array.isArray(payload?.receipts) ? payload.receipts : []
        const rejected = Array.isArray(payload?.rejected) ? payload.rejected : []

        if (receipts.length === 0) {
          const rejectionMessage = rejected.length > 0
            ? rejected.map((entry: { fileName?: string; reason?: string }) => {
                const name = entry?.fileName || "Receipt"
                const reason = entry?.reason || "Failed to upload"
                return `${name}: ${reason}`
              }).join(" | ")
            : "No receipts were uploaded."
          setParseError(rejectionMessage)
          toast.error("Receipt Upload Failed", {
            description: rejectionMessage,
            duration: 8000,
          })
          return false
        }

        if (rejected.length > 0) {
          const rejectedMessage = rejected.map((entry: { fileName?: string; reason?: string }) => {
            const name = entry?.fileName || "Receipt"
            const reason = entry?.reason || "Failed to upload"
            return `${name}: ${reason}`
          }).join(" | ")
          toast.warning("Some receipts were skipped", {
            description: rejectedMessage,
            duration: 8000,
          })
        }

        toast.success("Receipt uploaded", {
          description: "Receipt added to your Data Library.",
        })

        clearResponseCache()
        clearAnalyticsCache()
        window.dispatchEvent(new CustomEvent("transactionsUpdated"))
        await refreshAnalyticsData()

        setIsUploadDialogOpen(false)
        setDroppedFile(null)
        setParsedCsv(null)
        setParseQuality(null)
        setFileId(null)
        setTransactionCount(0)
        setParseError(null)
        setSelectedParsedRowIds(new Set())
        setParsingProgress(0)
        return true
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to upload receipt."
        setParseError(errorMessage)
        toast.error("Receipt Upload Failed", {
          description: errorMessage,
          duration: 8000,
        })
        return false
      }
    }
    try {
      setIsParsing(true)
      setParsingProgress(0)
      setParseError(null)
      setParsedCsv(null)
      setParseQuality(null)
      setFileId(null)
      setTransactionCount(0)
      setSelectedParsedRowIds(new Set())
      resetPreferenceUpdates()

      const isImage = file.type.startsWith("image/") || /\.(png|jpg|jpeg|webp|heic|heif)$/i.test(file.name)
      if (isImage) {
        await uploadReceiptFallback()
        return
      }

      setParsingProgress(5)

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
        console.warn("[ANALYTICS] Failed to load categories from API. Using defaults.", categoriesError)
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
      const parseModeHeader = response.headers.get("X-Parse-Mode")
      const parseQualityHeader = response.headers.get("X-Parse-Quality")
      const parseQualityScoreHeader = response.headers.get("X-Parse-Quality-Score")
      const parseQualityReasonsHeader = response.headers.get("X-Parse-Quality-Reasons")
      const categorizationError = response.headers.get("X-Categorization-Error")
      const categorizationWarning = response.headers.get("X-Categorization-Warning")

      void fileIdHeader
      void categorizationError
      void categorizationWarning

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`
        let errorCode: string | null = null
        const responseText = await response.text()

        try {
          const errorData = JSON.parse(responseText)
          errorMessage = errorData.error || errorMessage
          errorCode = typeof errorData.code === "string" ? errorData.code : null
        } catch {
          errorMessage = responseText || errorMessage
        }

        if (errorCode === "NOT_A_STATEMENT") {
          const receiptUploaded = await uploadReceiptFallback()
          if (receiptUploaded) {
            return
          }
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

      setParsedCsv(csv)
      setIsParsing(false)
      setParsingProgress(0)

      const parseModeUsed = parseModeHeader === "ai"
        ? "ai"
        : parseModeHeader === "auto"
          ? "auto"
          : null
      const parsed = parseCsvToRows(csv, { returnDiagnostics: true })
      const rowsWithId = parsed.rows.map((row, index) => ({
        ...row,
        id: index,
        category: row.category || undefined,
      }))
      setParsedRows(rowsWithId)
      setTransactionCount(rowsWithId.length)
      const fallbackQuality = buildStatementParseQuality({
        rows: parsed.rows,
        diagnostics: parsed.diagnostics,
        parseMode: parseModeUsed,
      })
      const parsedLevel = parseQualityHeader === "high" || parseQualityHeader === "medium" || parseQualityHeader === "low"
        ? parseQualityHeader
        : null
      const parsedScore = parseQualityScoreHeader ? Number.parseInt(parseQualityScoreHeader, 10) : NaN
      let parsedReasons: string[] = []
      if (parseQualityReasonsHeader) {
        try {
          const decoded = decodeURIComponent(parseQualityReasonsHeader)
          const parsedList = JSON.parse(decoded)
          if (Array.isArray(parsedList)) {
            parsedReasons = parsedList.filter((item) => typeof item === "string")
          }
        } catch {
          // Ignore malformed header
        }
      }
      setParseQuality({
        level: parsedLevel ?? fallbackQuality.level,
        score: Number.isFinite(parsedScore) ? parsedScore : fallbackQuality.score,
        reasons: parsedReasons.length > 0 ? parsedReasons : fallbackQuality.reasons,
        parseMode: parseModeUsed ?? undefined,
      })

      const idHeader = response.headers.get("X-File-Id")
      if (idHeader) {
        setFileId(idHeader)
      }

      if (response.headers.get("X-Categorization-Warning")) {
        toast.warning("Categorization Warning", {
          description: "Some transactions may have inaccurate categories.",
          duration: 8000,
        })
      }

      // Mark as successful
      parseSucceeded = true
    } catch (error) {
      console.error("Parsing error:", error)
      const errorMessage = error instanceof Error
        ? error.message
        : "Failed to parse the file. Please try again."
      setParseError(errorMessage)

      if (errorMessage.includes("Unauthorized") || errorMessage.includes("Authentication")) {
        toast.error("Authentication Error", {
          description: "Please sign in to continue.",
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

      // After successful parse, close upload dialog and open review dialog
      if (parseSucceeded) {
        setIsUploadDialogOpen(false)
        setIsReviewDialogOpen(true)
      }
    }
  }, [refreshAnalyticsData, resetPreferenceUpdates])

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLElement>) => {
    if (!isFileDragEvent(e)) return
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    dragCounterRef.current = 0

    const files = Array.from(e.dataTransfer.files)
    if (files && files.length > 0) {
      const file = files[0]
      setDroppedFile(file)
      setIsUploadDialogOpen(true)
      // Auto-fill project name with filename (without extension)
      const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "")
      setProjectName(fileNameWithoutExt)
      // Don't parse yet - user will click "Parse file" button
    }
  }, [])

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

  const handleConfirm = useCallback(async () => {
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
      const rawFormat = extension === "pdf" ? "pdf"
        : extension === "csv" ? "csv"
          : (extension === "xls" || extension === "xlsx") ? "xlsx" : "other"

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
          if (response.status === 403 && errorData.code === "LIMIT_EXCEEDED") {
            clearInterval(progressInterval)
            setImportProgress(0)
            setIsImporting(false)

            toast.error("Transaction Limit Reached", {
              description: errorData.message || "You've reached your transaction limit. Upgrade for more capacity.",
              duration: 8000,
              action: {
                label: "Upgrade",
                onClick: () => { window.location.href = "/billing" },
              },
            })
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

      // Track file import completed
      safeCapture("file_import_completed", {
        file_name: droppedFile.name,
        file_size: droppedFile.size,
        file_type: droppedFile.type || droppedFile.name.split(".").pop()?.toLowerCase() || "unknown",
        transaction_count: data.inserted,
      })

      setIsReviewDialogOpen(false)
      setDroppedFile(null)
      setParsedCsv(null)
      setParseQuality(null)
      setFileId(null)
      setTransactionCount(0)
      setParseError(null)
      setImportProgress(0)

      // Clear all caches and notify charts that data has changed
      clearResponseCache()
      clearAnalyticsCache()
      window.dispatchEvent(new CustomEvent("transactionsUpdated"))

      // Refresh analytics data after import
      await refreshAnalyticsData()
    } catch (error) {
      clearInterval(progressInterval)
      console.error("Import error:", error)
      const errorMessage = error instanceof Error
        ? error.message
        : "Failed to import transactions. Please try again."
      toast.error("Import Failed", {
        description: errorMessage,
      })

      // Track file import failed during import
      safeCapture("file_import_failed", {
        file_name: droppedFile.name,
        file_size: droppedFile.size,
        file_type: droppedFile.type || droppedFile.name.split(".").pop()?.toLowerCase() || "unknown",
        error_message: errorMessage,
        stage: "import",
        transaction_count: transactionCount,
      })

      setImportProgress(0)
    } finally {
      setIsImporting(false)
    }
  }, [droppedFile, parsedCsv, fileId, refreshAnalyticsData, transactionCount])

  const handleCancelUpload = useCallback(() => {
    if (csvRegenerationTimerRef.current) {
      clearTimeout(csvRegenerationTimerRef.current)
      csvRegenerationTimerRef.current = null
    }
    setIsUploadDialogOpen(false)
    setDroppedFile(null)
    setParsedCsv(null)
    setParseQuality(null)
    setFileId(null)
    setTransactionCount(0)
    setParseError(null)
  }, [])

  const handleCancelReview = useCallback(() => {
    if (csvRegenerationTimerRef.current) {
      clearTimeout(csvRegenerationTimerRef.current)
      csvRegenerationTimerRef.current = null
    }
    setIsReviewDialogOpen(false)
    setDroppedFile(null)
    setParsedCsv(null)
    setParseQuality(null)
    setFileId(null)
    setTransactionCount(0)
    setParseError(null)
  }, [])

  const handleFilesChange = useCallback((files: File[]) => {
    if (files.length > 0) {
      const file = files[0]
      setDroppedFile(file)
      // Auto-fill project name with filename (without extension)
      const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "")
      setProjectName(fileNameWithoutExt)
    }
  }, [])

  const handleContinueUpload = useCallback(async () => {
    if (!droppedFile) return
    await parseFile(droppedFile, { parseMode: "auto" })
  }, [droppedFile, parseFile])

  useEffect(() => {
    return () => {
      if (csvRegenerationTimerRef.current) {
        clearTimeout(csvRegenerationTimerRef.current)
      }
    }
  }, [])

  return {
    aiReparseContext,
    droppedFile,
    fileId,
    handleAiReparse,
    handleCancelReview,
    handleCancelUpload,
    handleCategoryChange,
    handleConfirm,
    handleContinueUpload,
    handleDeleteRow,
    handleDeleteSelectedRows,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleFilesChange,
    handleSelectAllParsedRows,
    handleToggleParsedRow,
    importProgress,
    isAiReparseOpen,
    isAiReparsing,
    isDragging,
    isImporting,
    isParsing,
    isReviewDialogOpen,
    isUploadDialogOpen,
    parseError,
    parsedCsv,
    parsedRows,
    parsingProgress,
    projectName,
    parseQuality,
    selectedParsedRowIds,
    setAiReparseContext,
    setIsAiReparseOpen,
    setIsReviewDialogOpen,
    setIsUploadDialogOpen,
    setProjectName,
    transactionCount,
  }
}
