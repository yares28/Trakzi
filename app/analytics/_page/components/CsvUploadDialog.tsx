import { IconAlertCircle, IconCircleCheck, IconFile, IconLoader2, IconUpload } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"

import type { ParsedRow } from "../types"
import { CsvPreviewTable } from "./CsvPreviewTable"

type CsvUploadDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  droppedFile: File | null
  transactionCount: number
  parsedCsv: string | null
  parsedRows: ParsedRow[]
  selectedParsedRowIds: Set<number>
  isParsing: boolean
  parsingProgress: number
  parseError: string | null
  isImporting: boolean
  importProgress: number
  isAiReparsing: boolean
  onOpenAiReparse: () => void
  onDeleteSelectedRows: () => void
  onSelectAll: (value: boolean) => void
  onToggleRow: (rowId: number, value: boolean) => void
  onCategoryChange: (rowId: number, category: string) => void
  onDeleteRow: (rowId: number) => void
  onCancel: () => void
  onConfirm: () => void
}

export function CsvUploadDialog({
  open,
  onOpenChange,
  droppedFile,
  transactionCount,
  parsedCsv,
  parsedRows,
  selectedParsedRowIds,
  isParsing,
  parsingProgress,
  parseError,
  isImporting,
  importProgress,
  isAiReparsing,
  onOpenAiReparse,
  onDeleteSelectedRows,
  onSelectAll,
  onToggleRow,
  onCategoryChange,
  onDeleteRow,
  onCancel,
  onConfirm,
}: CsvUploadDialogProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i]
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                            {droppedFile.type.split("/")[1]?.toUpperCase() || "FILE"}
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
                      onClick={onOpenAiReparse}
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
                        onClick={onDeleteSelectedRows}
                        disabled={selectedParsedRowIds.size === 0}
                      >
                        Delete selected
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onOpenAiReparse}
                        disabled={!droppedFile || isAiReparsing}
                      >
                        Reparse with AI
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0 flex-1 min-h-0 overflow-hidden">
                  <div className="h-full max-h-[500px] overflow-auto rounded-lg border">
                    <CsvPreviewTable
                      parsedRows={parsedRows}
                      selectedParsedRowIds={selectedParsedRowIds}
                      onSelectAll={onSelectAll}
                      onToggleRow={onToggleRow}
                      onCategoryChange={onCategoryChange}
                      onDeleteRow={onDeleteRow}
                    />
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
              onClick={onCancel}
              disabled={isImporting}
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
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
  )
}
