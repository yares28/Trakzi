"use client"

import { memo, useState, useCallback } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { CategorySelect } from "@/components/category-select"
import { cn } from "@/lib/utils"
import { useCurrency } from "@/components/currency-provider"
import { IconTrash, IconSparkles, IconLoader2, IconAlertTriangle } from "@tabler/icons-react"
import { TxRow } from "@/lib/types/transactions"
import { CsvDiagnostics } from "@/lib/parsing/parseCsvToRows"
import { toast } from "sonner"

type ParsedRow = TxRow & { id: number }

interface ParsingPreviewTableProps {
    rows: ParsedRow[]
    diagnostics?: CsvDiagnostics
    onCategoryChange: (rowId: number, newCategory: string) => void
    onDeleteRow: (rowId: number) => void
    onRowsUpdated?: (rows: ParsedRow[]) => void
    droppedFile?: File | null
    showAiReparse?: boolean
}

// Memoized table row component to prevent unnecessary re-renders
const MemoizedPreviewRow = memo(function MemoizedPreviewRow({
    row,
    onCategoryChange,
    onDelete,
    formatCurrency
}: {
    row: ParsedRow
    onCategoryChange: (value: string) => void
    onDelete: () => void
    formatCurrency: (amount: number) => string
}) {
    const amount = typeof row.amount === 'number' ? row.amount : parseFloat(String(row.amount)) || 0
    const category = row.category || 'Other'
    const hasValidDate = /^\d{4}-\d{2}-\d{2}$/.test(row.date || '')

    return (
        <TableRow className={cn(!hasValidDate && "bg-amber-50/50 dark:bg-amber-950/20")}>
            <TableCell className="w-28 flex-shrink-0">
                <div className="flex flex-col">
                    <span className={cn(!hasValidDate && "text-amber-600 dark:text-amber-400")}>
                        {row.date || <span className="text-muted-foreground italic">No date</span>}
                    </span>
                    {row.time && (
                        <span className="text-xs text-muted-foreground">{row.time}</span>
                    )}
                </div>
            </TableCell>
            <TableCell className="min-w-[350px] max-w-[600px]">
                <div className="truncate" title={row.description}>
                    {row.description || <span className="text-muted-foreground italic">No description</span>}
                </div>
            </TableCell>
            <TableCell className={cn(
                "text-right font-medium w-24 flex-shrink-0",
                amount < 0 ? "text-red-500" : "text-green-500"
            )}>
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
        prevProps.row.category === nextProps.row.category &&
        prevProps.row.id === nextProps.row.id
    )
})

export function ParsingPreviewTable({
    rows,
    diagnostics,
    onCategoryChange,
    onDeleteRow,
    onRowsUpdated,
    droppedFile,
    showAiReparse = true
}: ParsingPreviewTableProps) {
    const { formatCurrency } = useCurrency()
    const [isAiParsing, setIsAiParsing] = useState(false)
    const [aiContext, setAiContext] = useState("")
    const [showContextInput, setShowContextInput] = useState(false)

    const qualityScore = diagnostics?.parsingQuality?.overallScore ?? 100
    const needsAiAssist = diagnostics?.parsingQuality?.needsAiAssist ?? false
    const validDatePercent = diagnostics?.parsingQuality?.validDatePercent ?? 100

    const handleAiReparse = useCallback(async () => {
        if (!droppedFile) {
            toast.error("No file available for reparsing")
            return
        }

        setIsAiParsing(true)
        try {
            const formData = new FormData()
            formData.append("file", droppedFile)
            if (aiContext.trim()) {
                formData.append("userContext", aiContext.trim())
            }

            const response = await fetch("/api/statements/ai-parse", {
                method: "POST",
                body: formData
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || "AI parsing failed")
            }

            const csvText = await response.text()
            const confidence = response.headers.get("X-AI-Confidence")
            const suggestions = response.headers.get("X-AI-Suggestions")

            // Parse the CSV and update rows
            const { parseCsvToRows } = await import("@/lib/parsing/parseCsvToRows")
            const parsedRows = parseCsvToRows(csvText)
            const rowsWithId: ParsedRow[] = parsedRows.map((row, index) => ({
                ...row,
                id: index,
                category: row.category || undefined
            }))

            if (onRowsUpdated) {
                onRowsUpdated(rowsWithId)
            }

            toast.success(`AI parsed ${rowsWithId.length} transactions`, {
                description: suggestions || `Confidence: ${confidence}%`
            })

            setShowContextInput(false)
            setAiContext("")
        } catch (error: any) {
            console.error("[AI Reparse] Error:", error)
            toast.error("AI parsing failed", {
                description: error.message
            })
        } finally {
            setIsAiParsing(false)
        }
    }, [droppedFile, aiContext, onRowsUpdated])

    return (
        <div className="flex flex-col gap-3">
            {/* Quality indicator and AI reparse button */}
            {showAiReparse && (needsAiAssist || validDatePercent < 80) && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                    <IconAlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                            Parsing quality: {qualityScore}% ({validDatePercent}% valid dates)
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-500">
                            Some data may be missing. Try AI-assisted parsing for better results.
                        </p>
                    </div>

                    {!showContextInput ? (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowContextInput(true)}
                            disabled={isAiParsing || !droppedFile}
                            className="flex-shrink-0 gap-1"
                        >
                            <IconSparkles className="h-4 w-4" />
                            Reparse with AI
                        </Button>
                    ) : (
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <Input
                                placeholder="Optional: describe format..."
                                value={aiContext}
                                onChange={(e) => setAiContext(e.target.value)}
                                className="w-48 h-8 text-sm"
                                disabled={isAiParsing}
                            />
                            <Button
                                size="sm"
                                onClick={handleAiReparse}
                                disabled={isAiParsing}
                                className="gap-1"
                            >
                                {isAiParsing ? (
                                    <>
                                        <IconLoader2 className="h-4 w-4 animate-spin" />
                                        Parsing...
                                    </>
                                ) : (
                                    <>
                                        <IconSparkles className="h-4 w-4" />
                                        Parse
                                    </>
                                )}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setShowContextInput(false)
                                    setAiContext("")
                                }}
                                disabled={isAiParsing}
                            >
                                Cancel
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Transaction count badge */}
            <div className="flex items-center gap-2">
                <Badge variant="secondary">
                    {rows.length} transaction{rows.length !== 1 ? 's' : ''}
                </Badge>
                {diagnostics?.duplicatesDetected && diagnostics.duplicatesDetected > 0 && (
                    <Badge variant="outline" className="text-amber-600">
                        {diagnostics.duplicatesDetected} potential duplicate{diagnostics.duplicatesDetected !== 1 ? 's' : ''}
                    </Badge>
                )}
            </div>

            {/* Table - matching DataTable styling */}
            <div className="overflow-hidden rounded-lg border">
                <div className="h-full max-h-[500px] overflow-auto relative">
                    <Table>
                        <TableHeader className="sticky top-0 z-20 bg-muted border-b">
                            <TableRow>
                                <TableHead className="sticky top-0 z-20 bg-muted">Date</TableHead>
                                <TableHead className="sticky top-0 z-20 bg-muted">Description</TableHead>
                                <TableHead className="sticky top-0 z-20 bg-muted text-right">Amount</TableHead>
                                <TableHead className="sticky top-0 z-20 bg-muted">Category</TableHead>
                                <TableHead className="sticky top-0 z-20 bg-muted w-12"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        No transactions found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                rows.map((row) => (
                                    <MemoizedPreviewRow
                                        key={row.id ?? `${row.date}-${row.description}`}
                                        row={row}
                                        onCategoryChange={(value) => onCategoryChange(row.id, value)}
                                        onDelete={() => onDeleteRow(row.id)}
                                        formatCurrency={formatCurrency}
                                    />
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    )
}
