import { useCallback, useEffect, useRef, useState } from "react"
import type { DragEvent } from "react"
import { flushSync } from "react-dom"
import { toast } from "sonner"

import type { TransactionLimitExceededData } from "@/components/limits/transaction-limit-dialog"
import { DEFAULT_CATEGORIES } from "@/lib/categories"
import { parseCsvToRows } from "@/lib/parsing/parseCsvToRows"
import { rowsToCanonicalCsv } from "@/lib/parsing/rowsToCanonicalCsv"
import type { TxRow } from "@/lib/types/transactions"

import type { ParsedRow } from "../types"
import { isFileDragEvent } from "../utils/file-dnd"

type UseCsvImportOptions = {
  fetchLibraryData: () => Promise<void>
  onTransactionLimit: (data: TransactionLimitExceededData) => void
  schedulePreferenceUpdate: (entry: { description: string; category: string }) => void
  resetPreferenceQueue: () => void
}

export const useCsvImport = ({
  fetchLibraryData,
  onTransactionLimit,
  schedulePreferenceUpdate,
  resetPreferenceQueue,
}: UseCsvImportOptions) => {
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
  const [selectedParsedRowIds, setSelectedParsedRowIds] = useState<Set<number>>(
    new Set()
  )
  const [transactionCount, setTransactionCount] = useState<number>(0)

  const dragCounterRef = useRef(0)
  const csvRegenerationTimerRef = useRef<NodeJS.Timeout | null>(null)
  const latestParsedRowsRef = useRef<ParsedRow[]>([])

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

  useEffect(() => {
    latestParsedRowsRef.current = parsedRows
  }, [parsedRows])

  useEffect(() => {
    return () => {
      if (csvRegenerationTimerRef.current) {
        clearTimeout(csvRegenerationTimerRef.current)
      }
    }
  }, [])

  const handleCategoryChange = useCallback(
    (rowId: number, newCategory: string) => {
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

      const updatedRow = latestParsedRowsRef.current.find(
        (row) => row.id === rowId
      )
      if (updatedRow && updatedRow.description.trim() && newCategory.trim()) {
        schedulePreferenceUpdate({
          description: updatedRow.description,
          category: newCategory,
        })
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
    },
    [schedulePreferenceUpdate]
  )

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

  const handleSelectAllParsedRows = useCallback(
    (value: boolean) => {
      if (!value) {
        setSelectedParsedRowIds(new Set())
        return
      }
      setSelectedParsedRowIds(new Set(parsedRows.map((row) => row.id)))
    },
    [parsedRows]
  )

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

  const handleDragEnter = useCallback((e: DragEvent<HTMLElement>) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current++
    if (isFileDragEvent(e)) {
      setIsDragging(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: DragEvent<HTMLElement>) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: DragEvent<HTMLElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const parseFile = useCallback(
    async (
      file: File,
      options?: { parseMode?: "auto" | "ai"; aiContext?: string }
    ) => {
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
      resetPreferenceQueue()

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
            const categoriesArray: Array<{ name?: string }> = Array.isArray(
              payload
            )
              ? payload
              : []
            const names = categoriesArray
              .map((cat) => cat?.name)
              .filter(
                (name): name is string =>
                  typeof name === "string" && name.trim().length > 0
              )
            if (names.length > 0) {
              currentCategories = names
            }
          }
        } catch (categoriesError) {
          console.warn(
            "[DATA-LIBRARY] Failed to load categories from API. Using defaults.",
            categoriesError
          )
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
        const categorizationError = response.headers.get(
          "X-Categorization-Error"
        )
        const categorizationWarning = response.headers.get(
          "X-Categorization-Warning"
        )

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
              const estimatedProgress = Math.min(
                25 + (received / estimatedTotal) * 65,
                90
              )
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
            description: `AI categorization failed. All transactions defaulted to "Other". Error: ${decodedError.substring(
              0,
              100
            )}`,
            duration: 10000,
          })
        }
      } catch (error) {
        setParsingProgress(0)
        console.error("Parse error:", error)
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to parse file. Please try again."
        setParseError(errorMessage)

        if (
          errorMessage.includes("DEMO_USER_ID") ||
          errorMessage.includes("Authentication")
        ) {
          toast.error("Configuration Error", {
            description:
              "Please configure DEMO_USER_ID in your environment variables.",
            duration: 10000,
          })
        } else if (errorMessage.includes("No transactions found")) {
          toast.error("No Transactions Found", {
            description:
              "The file was parsed but no transactions were detected. Please check the file format.",
            duration: 8000,
          })
        } else if (
          errorMessage.includes("Failed to parse") ||
          errorMessage.includes("Parsing quality")
        ) {
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
    },
    [resetPreferenceQueue]
  )

  const handleDrop = useCallback(
    async (e: DragEvent<HTMLElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      dragCounterRef.current = 0

      const files = Array.from(e.dataTransfer.files)
      if (files && files.length > 0) {
        await parseFile(files[0], { parseMode: "auto" })
      }
    },
    [parseFile]
  )

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
      await parseFile(droppedFile, {
        parseMode: "ai",
        aiContext: aiReparseContext,
      })
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
      const rawFormat =
        extension === "pdf"
          ? "pdf"
          : extension === "csv"
          ? "csv"
          : extension === "xls" || extension === "xlsx"
          ? "xlsx"
          : "other"

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

          if (response.status === 403 && errorData.code === "LIMIT_EXCEEDED") {
            clearInterval(progressInterval)
            setImportProgress(0)
            setIsImporting(false)

            onTransactionLimit({
              code: "LIMIT_EXCEEDED",
              plan: errorData.plan || "free",
              cap: errorData.limit || 500,
              used: errorData.currentCount || 0,
              remaining: errorData.remaining || 0,
              incomingCount: errorData.attempting,
              message: errorData.message,
              upgradePlans: errorData.upgradePlans,
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
  }, [droppedFile, fetchLibraryData, fileId, onTransactionLimit, parsedCsv])

  const handleCancel = useCallback(() => {
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
  }, [])

  return {
    isDragging,
    setIsDragging,
    droppedFile,
    isDialogOpen,
    setIsDialogOpen,
    isParsing,
    isImporting,
    importProgress,
    parsingProgress,
    parsedCsv,
    parsedRows,
    fileId,
    parseError,
    isAiReparseOpen,
    setIsAiReparseOpen,
    aiReparseContext,
    setAiReparseContext,
    isAiReparsing,
    selectedParsedRowIds,
    transactionCount,
    handleCategoryChange,
    handleToggleParsedRow,
    handleSelectAllParsedRows,
    handleDeleteRow,
    handleDeleteSelectedRows,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleAiReparse,
    handleConfirm,
    handleCancel,
  }
}
