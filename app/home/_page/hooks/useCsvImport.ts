import { useCallback, useEffect, useRef, useState } from "react"
import type { DragEvent } from "react"
import { flushSync } from "react-dom"

import { parseCsvToRows } from "@/lib/parsing/parseCsvToRows"
import { rowsToCanonicalCsv } from "@/lib/parsing/rowsToCanonicalCsv"
import { DEFAULT_CATEGORIES } from "@/lib/categories"
import { toast } from "sonner"
import type { TxRow } from "@/lib/types/transactions"

import type { ParsedRow } from "../types"
import { isFileDragEvent } from "../utils/file-dnd"
import { useCategoryPreferences } from "./useCategoryPreferences"

type UseCsvImportOptions = {
  fetchTransactions: (bypassCache?: boolean) => Promise<void> | void
}

export function useCsvImport({ fetchTransactions }: UseCsvImportOptions) {
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

  const { schedulePreferenceUpdate, resetPreferenceUpdates } =
    useCategoryPreferences()

  useEffect(() => {
    if (parsedCsv) {
      const rows = parseCsvToRows(parsedCsv)
      const rowsWithId: ParsedRow[] = rows.map((row, index) => ({
        ...row,
        id: index,
        category: row.category || undefined,
      }))
      setParsedRows(rowsWithId)
      setTransactionCount(rowsWithId.length)
    } else {
      setParsedRows([])
      setTransactionCount(0)
    }
  }, [parsedCsv])

  useEffect(() => {
    latestParsedRowsRef.current = parsedRows
  }, [parsedRows])

  const handleCategoryChange = useCallback(
    (rowId: number, newCategory: string) => {
      flushSync(() => {
        setParsedRows((prevRows) => {
          const updatedRows = prevRows.map((row) =>
            row.id === rowId ? { ...row, category: newCategory } : row
          )
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
        setParsedCsv(rowsToCanonicalCsv(rowsForCsv))
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
      setParsedCsv(rowsToCanonicalCsv(rowsForCsv))
    }, 100)
  }, [])

  const handleDeleteSelectedRows = useCallback(() => {
    if (selectedParsedRowIds.size === 0) return
    const selectedIds = new Set(selectedParsedRowIds)

    flushSync(() => {
      setParsedRows((prevRows) => {
        const updatedRows = prevRows.filter(
          (row) => !selectedIds.has(row.id)
        )
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
      setParsedCsv(rowsToCanonicalCsv(rowsForCsv))
    }, 100)
  }, [selectedParsedRowIds])

  const handleDragEnter = useCallback((e: DragEvent) => {
    if (!isFileDragEvent(e)) return
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current++
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: DragEvent) => {
    if (!isFileDragEvent(e)) return
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: DragEvent) => {
    if (!isFileDragEvent(e)) return
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
      resetPreferenceUpdates()

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
            const categoriesArray: Array<{ name?: string }> = Array.isArray(payload)
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
            "[Home] Failed to load categories from API. Using defaults.",
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
        const categorizationError = response.headers.get("X-Categorization-Error")
        const categorizationWarning =
          response.headers.get("X-Categorization-Warning")

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
          toast.warning("Categorization Warning", {
            description: `AI categorization failed. All transactions defaulted to "Other". Error: ${decodedError.substring(0, 100)}`,
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
    [resetPreferenceUpdates]
  )

  const handleDrop = useCallback(
    async (e: DragEvent) => {
      if (!isFileDragEvent(e)) return
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

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

            toast.error("Transaction Limit Reached", {
              description:
                errorData.message ||
                "You've reached your transaction limit. Upgrade for more capacity.",
              duration: 10000,
              action: {
                label: "Upgrade",
                onClick: () => {
                  window.location.href = "/billing"
                },
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

      setIsDialogOpen(false)
      setDroppedFile(null)
      setParsedCsv(null)
      setFileId(null)
      setTransactionCount(0)
      setParseError(null)
      setImportProgress(0)

      await fetchTransactions()
    } catch (error) {
      clearInterval(progressInterval)
      console.error("Import error:", error)
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to import transactions. Please try again."
      toast.error("Import Failed", {
        description: errorMessage,
      })
      setImportProgress(0)
    } finally {
      setIsImporting(false)
    }
  }, [droppedFile, parsedCsv, fileId, fetchTransactions])

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
    handleAiReparse,
    handleCancel,
    handleCategoryChange,
    handleConfirm,
    handleDeleteRow,
    handleDeleteSelectedRows,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleSelectAllParsedRows,
    handleToggleParsedRow,
    importProgress,
    isAiReparseOpen,
    isAiReparsing,
    isDialogOpen,
    isDragging,
    isImporting,
    isParsing,
    parseError,
    parsedCsv,
    parsedRows,
    parsingProgress,
    selectedParsedRowIds,
    setAiReparseContext,
    setIsAiReparseOpen,
    setIsDialogOpen,
    transactionCount,
    formatFileSize,
  }
}
