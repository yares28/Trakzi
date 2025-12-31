import { CsvReviewDialog, type CsvReviewRow } from "@/components/csv-review-dialog"
import type { ParseQualitySummary } from "@/lib/parsing/statement-parse-quality"

import type { ParsedRow } from "../types"

type CsvReviewDialogWrapperProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    fileName: string | null
    parsedRows: ParsedRow[]
    parseQuality?: ParseQualitySummary | null
    selectedParsedRowIds: Set<number>
    isImporting: boolean
    importProgress: number
    onSelectAll: (value: boolean) => void
    onToggleRow: (rowId: number, value: boolean) => void
    onCategoryChange: (rowId: number, category: string) => void
    onDeleteRow: (rowId: number) => void
    onDeleteSelectedRows: () => void
    onCommitImport: () => void
    onCancel: () => void
}

export function DataLibraryCsvReviewDialog({
    open,
    onOpenChange,
    fileName,
    parsedRows,
    parseQuality,
    selectedParsedRowIds,
    isImporting,
    importProgress,
    onSelectAll,
    onToggleRow,
    onCategoryChange,
    onDeleteRow,
    onDeleteSelectedRows,
    onCommitImport,
    onCancel,
}: CsvReviewDialogWrapperProps) {
    // Convert ParsedRow to CsvReviewRow
    const reviewRows: CsvReviewRow[] = parsedRows.map((row) => ({
        id: row.id,
        date: row.date,
        time: row.time || undefined,
        description: row.description,
        amount: row.amount,
        category: row.category,
    }))

    return (
        <CsvReviewDialog
            open={open}
            onOpenChange={onOpenChange}
            fileName={fileName}
            parsedRows={reviewRows}
            parseQuality={parseQuality}
            selectedParsedRowIds={selectedParsedRowIds}
            isImporting={isImporting}
            importProgress={importProgress}
            onSelectAll={onSelectAll}
            onToggleRow={onToggleRow}
            onCategoryChange={onCategoryChange}
            onDeleteRow={onDeleteRow}
            onDeleteSelectedRows={onDeleteSelectedRows}
            onCommitImport={onCommitImport}
            onCancel={onCancel}
        />
    )
}
