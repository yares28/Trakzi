import type { DragEvent } from "react"

const RECEIPT_FILE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "webp",
  "heic",
  "heif",
  "pdf",
])

export function isSupportedReceiptFile(file: File) {
  const mime = (file.type || "").toLowerCase()
  if (mime.startsWith("image/")) return true
  if (mime === "application/pdf") return true
  const extension = file.name.split(".").pop()?.toLowerCase() ?? ""
  return RECEIPT_FILE_EXTENSIONS.has(extension)
}

export function receiptUploadFileKey(file: File) {
  return `${file.name}::${file.size}::${file.lastModified}`
}

export function stripFileExtension(filename: string) {
  const lastDot = filename.lastIndexOf(".")
  return lastDot > 0 ? filename.slice(0, lastDot) : filename
}

export function defaultReceiptProjectName(files: File[]) {
  if (files.length === 1) return stripFileExtension(files[0].name)
  if (files.length > 1) return `Receipt batch (${files.length} files)`
  return ""
}

export function isFileDragEvent(event: DragEvent) {
  const types = Array.from(event.dataTransfer.types || [])
  return types.includes("Files")
}
