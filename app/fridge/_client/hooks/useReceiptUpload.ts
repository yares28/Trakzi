import { useCallback, useLayoutEffect, useRef, useState } from "react"
import type { DragEvent } from "react"
import { toast } from "sonner"

import type { TransactionLimitExceededData } from "@/components/limits/transaction-limit-dialog"

import type { UploadedReceipt } from "../types"
import {
  defaultReceiptProjectName,
  isFileDragEvent,
  isSupportedReceiptFile,
  receiptUploadFileKey,
} from "../utils/file-dnd"

type UploadRejected = { fileName: string; reason: string }

type UploadResult = {
  receipts: UploadedReceipt[]
  rejected: UploadRejected[]
}

type UseReceiptUploadOptions = {
  onUploadComplete: (result: UploadResult) => void
  onLimitExceeded: (data: TransactionLimitExceededData) => void
}

export function useReceiptUpload({ onUploadComplete, onLimitExceeded }: UseReceiptUploadOptions) {
  const dragCounterRef = useRef(0)
  const [isDraggingUpload, setIsDraggingUpload] = useState(false)

  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [fileProgresses, setFileProgresses] = useState<Record<string, number>>({})
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [projectName, setProjectName] = useState("")
  const [projectNameEdited, setProjectNameEdited] = useState(false)

  const handleProjectNameChange = useCallback((next: string) => {
    setProjectName(next)
    setProjectNameEdited(true)
  }, [])

  const resetUploadState = useCallback(() => {
    setUploadFiles([])
    setFileProgresses({})
    setUploadError(null)
    setProjectName("")
    setProjectNameEdited(false)
  }, [])

  const handleUploadDialogOpenChange = useCallback(
    (open: boolean) => {
      setIsUploadDialogOpen(open)
      if (!open) {
        resetUploadState()
      }
    },
    [resetUploadState]
  )

  const handleUploadFilesChange = useCallback(
    (nextFiles: File[]) => {
      const supported = nextFiles.filter(isSupportedReceiptFile)
      if (supported.length !== nextFiles.length) {
        setUploadError("Some files were skipped (unsupported format).")
      } else {
        setUploadError(null)
      }

      setUploadFiles(supported)

      if (!projectNameEdited) {
        setProjectName(defaultReceiptProjectName(supported))
      }

      const nextProgresses: Record<string, number> = {}
      supported.forEach((file) => {
        nextProgresses[receiptUploadFileKey(file)] = fileProgresses[receiptUploadFileKey(file)] ?? 0
      })
      setFileProgresses(nextProgresses)
    },
    [fileProgresses, projectNameEdited]
  )

  const handleUploadDragEnter = useCallback(
    (event: DragEvent) => {
      if (!isFileDragEvent(event)) return
      event.preventDefault()
      dragCounterRef.current += 1
      setIsDraggingUpload(true)
    },
    []
  )

  const handleUploadDragLeave = useCallback(
    (event: DragEvent) => {
      if (!isFileDragEvent(event)) return
      event.preventDefault()
      dragCounterRef.current = Math.max(0, dragCounterRef.current - 1)
      if (dragCounterRef.current === 0) {
        setIsDraggingUpload(false)
      }
    },
    []
  )

  const handleUploadDragOver = useCallback((event: DragEvent) => {
    if (!isFileDragEvent(event)) return
    event.preventDefault()
  }, [])

  const handleUploadDrop = useCallback(
    (event: DragEvent) => {
      if (!isFileDragEvent(event)) return
      event.preventDefault()
      dragCounterRef.current = 0
      setIsDraggingUpload(false)

      const incoming = Array.from(event.dataTransfer.files || [])
      if (incoming.length === 0) return

      handleUploadFilesChange(incoming)
      setIsUploadDialogOpen(true)
    },
    [handleUploadFilesChange]
  )

  useLayoutEffect(() => {
    if (!isDraggingUpload) return

    const root = document.documentElement
    const body = document.body

    const previousRootOverflow = root.style.overflow
    const previousRootOverscrollBehavior = root.style.overscrollBehavior
    const previousBodyOverflow = body.style.overflow
    const previousBodyPaddingRight = body.style.paddingRight
    const previousDragAttribute = root.getAttribute("data-file-dragging")

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    root.style.overflow = "hidden"
    root.style.overscrollBehavior = "none"
    body.style.overflow = "hidden"
    root.setAttribute("data-file-dragging", "true")
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`
    }

    const preventScroll = (event: Event) => {
      event.preventDefault()
    }

    window.addEventListener("wheel", preventScroll, { passive: false, capture: true })
    window.addEventListener("touchmove", preventScroll, { passive: false, capture: true })

    return () => {
      window.removeEventListener("wheel", preventScroll, { capture: true } as AddEventListenerOptions)
      window.removeEventListener("touchmove", preventScroll, { capture: true } as AddEventListenerOptions)

      root.style.overflow = previousRootOverflow
      root.style.overscrollBehavior = previousRootOverscrollBehavior
      body.style.overflow = previousBodyOverflow
      body.style.paddingRight = previousBodyPaddingRight

      if (previousDragAttribute === null) {
        root.removeAttribute("data-file-dragging")
      } else {
        root.setAttribute("data-file-dragging", previousDragAttribute)
      }
    }
  }, [isDraggingUpload])

  const handleUploadContinue = useCallback(async () => {
    if (uploadFiles.length === 0) {
      setUploadError("Please select at least one receipt to upload.")
      return
    }

    setIsUploading(true)
    setUploadError(null)

    const initialProgress: Record<string, number> = {}
    uploadFiles.forEach((file) => {
      initialProgress[receiptUploadFileKey(file)] = 10
    })
    setFileProgresses(initialProgress)

    try {
      const formData = new FormData()
      uploadFiles.forEach((file) => {
        formData.append("files", file)
      })

      const response = await fetch("/api/receipts/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))

        if (response.status === 403 && errorData?.code === "LIMIT_EXCEEDED") {
          onLimitExceeded(errorData as TransactionLimitExceededData)
          handleUploadDialogOpenChange(false)
          return
        }

        throw new Error(errorData?.error || "Failed to upload receipts")
      }

      const payload = await response.json()
      const receipts = Array.isArray(payload?.receipts) ? payload.receipts : []
      const rejected = Array.isArray(payload?.rejected) ? payload.rejected : []

      const normalizedReceipts: UploadedReceipt[] = receipts.map((receipt: any) => ({
        receiptId: String(receipt.receiptId ?? ""),
        status: String(receipt.status ?? "pending"),
        fileId: String(receipt.fileId ?? ""),
        fileName: String(receipt.fileName ?? ""),
        storeName: receipt.storeName ?? null,
        receiptDate: receipt.receiptDate ?? null,
        receiptTime: receipt.receiptTime ?? null,
        totalAmount: Number(receipt.totalAmount ?? 0),
        currency: String(receipt.currency ?? "EUR"),
        languageOverride: receipt.languageOverride ?? null,
        languageDetected: receipt.languageDetected ?? null,
        languageSource: receipt.languageSource ?? undefined,
        warnings: Array.isArray(receipt.warnings) ? receipt.warnings : undefined,
        meta: receipt.meta ?? undefined,
        transactions: Array.isArray(receipt.transactions)
          ? receipt.transactions.map((tx: any, index: number) => ({
              id: String(tx.id ?? `${receipt.receiptId ?? "receipt"}-${index}`),
              description: String(tx.description ?? ""),
              quantity: Number(tx.quantity ?? 1),
              pricePerUnit: Number(tx.pricePerUnit ?? 0),
              totalPrice: Number(tx.totalPrice ?? 0),
              categoryName: tx.categoryName ?? null,
              aiCategoryRaw: tx.aiCategoryRaw ?? null,
              aiCategoryResolved: tx.aiCategoryResolved ?? null,
              heuristicCategory: tx.heuristicCategory ?? null,
              needsReview: Boolean(tx.needsReview),
              reviewReason: tx.reviewReason ?? null,
              categoryConfidence: typeof tx.categoryConfidence === "number" ? tx.categoryConfidence : undefined,
              confidenceSource: tx.confidenceSource ?? null,
            }))
          : [],
      }))

      const nextProgress: Record<string, number> = {}
      uploadFiles.forEach((file) => {
        nextProgress[receiptUploadFileKey(file)] = 100
      })
      setFileProgresses(nextProgress)

      onUploadComplete({ receipts: normalizedReceipts, rejected })
      handleUploadDialogOpenChange(false)
    } catch (error) {
      console.error("Upload error:", error)
      const message = error instanceof Error ? error.message : "Failed to upload receipts"
      setUploadError(message)
      toast.error(message)
    } finally {
      setIsUploading(false)
    }
  }, [handleUploadDialogOpenChange, onLimitExceeded, onUploadComplete, uploadFiles])

  return {
    isDraggingUpload,
    isUploadDialogOpen,
    uploadFiles,
    fileProgresses,
    uploadError,
    isUploading,
    projectName,
    handleProjectNameChange,
    handleUploadDialogOpenChange,
    handleUploadFilesChange,
    handleUploadContinue,
    handleUploadDragEnter,
    handleUploadDragLeave,
    handleUploadDragOver,
    handleUploadDrop,
  }
}
