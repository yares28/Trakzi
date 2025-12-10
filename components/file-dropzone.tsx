"use client"

import { useState, useCallback } from "react"
import { cn } from "@/lib/utils"

interface FileDropzoneProps {
  className?: string
  onFilesSelected?: (files: File[]) => void
}

export function FileDropzone({ className, onFilesSelected }: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
    }
  }, [])

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = Array.from(e.dataTransfer.files)
      if (files && files.length > 0) {
        onFilesSelected?.(files)
      }
    },
    [onFilesSelected]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      if (files && files.length > 0) {
        onFilesSelected?.(files)
      }
    },
    [onFilesSelected]
  )

  const handleClick = () => {
    document.getElementById("file-upload-input")?.click()
  }

  return (
    <div
      className={cn(
        "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 bg-muted/10 hover:border-muted-foreground/50",
        className
      )}
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <div className="flex flex-col items-center gap-2">
        <svg
          className={cn(
            "w-12 h-12 transition-colors",
            isDragging ? "text-primary" : "text-muted-foreground/50"
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        <div className="text-sm text-muted-foreground">
          {isDragging ? (
            <span className="font-semibold text-primary">Drop files here</span>
          ) : (
            <>
              <span className="font-semibold">Click to upload</span> or drag and drop
            </>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Upload your files here
        </p>
      </div>
      <input
        id="file-upload-input"
        type="file"
        className="hidden"
        multiple
        onChange={handleFileInput}
      />
    </div>
  )
}








