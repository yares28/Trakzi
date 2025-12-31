import { Info } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { CategorySelect } from "@/components/category-select"
import { useCurrency } from "@/components/currency-provider"
import { IconTrash } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

export type CsvReviewRow = {
    id: number
    date: string
    time?: string
    description: string
    amount: number | string
    category?: string
}

type CsvReviewDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    fileName: string | null
    parsedRows: CsvReviewRow[]
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

export function CsvReviewDialog({
    open,
    onOpenChange,
    fileName,
    parsedRows,
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
}: CsvReviewDialogProps) {
    const { formatCurrency } = useCurrency()

    // Calculate category breakdown
    const categoryTotals = new Map<string, number>()
    let categoryTotalSpend = 0

    for (const row of parsedRows) {
        const amount = typeof row.amount === "number" ? row.amount : parseFloat(String(row.amount)) || 0
        if (amount >= 0) continue // Only count negative amounts (expenses)
        const category = row.category?.trim() || "Uncategorized"
        const value = Math.abs(amount)
        categoryTotalSpend += value
        categoryTotals.set(category, (categoryTotals.get(category) || 0) + value)
    }

    const categoryBreakdown = Array.from(categoryTotals.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([category, amount]) => ({
            category,
            percentage: categoryTotalSpend > 0 ? (amount / categoryTotalSpend) * 100 : 0,
        }))

    const transactionCount = parsedRows.length
    const selectedCount = selectedParsedRowIds.size

    // Calculate parse quality based on data completeness
    const hasCategories = parsedRows.some(row => row.category && row.category !== "Other")
    const hasDescriptions = parsedRows.every(row => row.description && row.description.trim().length > 0)
    const hasDates = parsedRows.every(row => row.date && row.date.trim().length > 0)
    const hasAmounts = parsedRows.every(row => {
        const amt = typeof row.amount === "number" ? row.amount : parseFloat(String(row.amount))
        return !isNaN(amt)
    })

    let parseQuality: "high" | "medium" | "low" = "low"
    let parseQualityReasons: string[] = []

    if (hasDates && hasAmounts && hasDescriptions && hasCategories) {
        parseQuality = "high"
        parseQualityReasons.push("Complete data", "Auto-categorized")
    } else if (hasDates && hasAmounts && hasDescriptions) {
        parseQuality = "medium"
        parseQualityReasons.push("Missing categories")
    } else {
        parseQuality = "low"
        if (!hasDates) parseQualityReasons.push("Missing dates")
        if (!hasAmounts) parseQualityReasons.push("Missing amounts")
        if (!hasDescriptions) parseQualityReasons.push("Missing descriptions")
    }

    const parseQualityLabel = `${parseQuality[0].toUpperCase()}${parseQuality.slice(1)}`
    const qualityBadgeClass =
        parseQuality === "high"
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
            : parseQuality === "medium"
                ? "border-amber-500/40 bg-amber-500/10 text-amber-700"
                : "border-red-500/40 bg-red-500/10 text-red-700"

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="border bg-background sm:max-w-[95vw] md:max-w-[1400px] max-h-[90vh] overflow-hidden">
                <div className="flex flex-col max-h-[85vh] overflow-hidden">
                    <div className="flex flex-col gap-3 pb-4 border-b border-border/60">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold tracking-tight">Review Transactions</h2>
                            <p className="text-sm text-muted-foreground mt-2">
                                Review and adjust categories before importing to your database.
                            </p>
                            {fileName && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    File: {fileName}
                                </p>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-foreground">
                                    {transactionCount} transaction{transactionCount !== 1 ? "s" : ""}
                                </span>
                                {selectedCount > 0 && (
                                    <Badge variant="outline" className="text-xs">
                                        {selectedCount} selected
                                    </Badge>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 rounded-full hover:bg-primary/10"
                                            aria-label="View category percentages"
                                        >
                                            <Info className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-64" align="end">
                                        <div className="space-y-3">
                                            <div className="space-y-1">
                                                <p className="text-sm font-semibold">Category breakdown</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Percent of total spending in this file.
                                                </p>
                                            </div>
                                            {categoryBreakdown.length > 0 ? (
                                                <div className="max-h-64 space-y-2 overflow-auto pr-1">
                                                    {categoryBreakdown.map((item) => (
                                                        <div key={item.category} className="flex items-center justify-between gap-3 text-xs">
                                                            <span className="font-medium text-foreground">{item.category}</span>
                                                            <span className="text-muted-foreground">{item.percentage.toFixed(1)}%</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-muted-foreground">
                                                    No spending categories detected yet.
                                                </p>
                                            )}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={onDeleteSelectedRows}
                                    disabled={selectedCount === 0 || isImporting}
                                >
                                    Delete selected
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto overflow-x-hidden pt-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40">
                        <Table className="w-full">
                            <TableHeader className="bg-muted sticky top-0 z-10">
                                <TableRow>
                                    <TableHead className="w-12">
                                        <Checkbox
                                            checked={parsedRows.length > 0 && selectedParsedRowIds.size === parsedRows.length}
                                            onCheckedChange={(checked) => onSelectAll(checked === true)}
                                            aria-label="Select all transactions"
                                        />
                                    </TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead className="w-12"></TableHead>
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
                                        const amount = typeof row.amount === "number" ? row.amount : parseFloat(String(row.amount)) || 0
                                        const category = row.category || "Other"
                                        const isSelected = selectedParsedRowIds.has(row.id)

                                        return (
                                            <TableRow key={row.id}>
                                                <TableCell className="w-12">
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onCheckedChange={(checked) => onToggleRow(row.id, checked === true)}
                                                        aria-label="Select transaction"
                                                    />
                                                </TableCell>
                                                <TableCell className="w-28 flex-shrink-0">
                                                    <div className="flex flex-col">
                                                        <span>{row.date}</span>
                                                        {row.time ? (
                                                            <span className="text-xs text-muted-foreground">{row.time}</span>
                                                        ) : null}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="min-w-[350px] max-w-[600px]">
                                                    <div className="truncate" title={row.description}>
                                                        {row.description}
                                                    </div>
                                                </TableCell>
                                                <TableCell className={cn("text-right font-medium w-24 flex-shrink-0", amount < 0 ? "text-red-500" : "text-green-500")}>
                                                    {formatCurrency(amount)}
                                                </TableCell>
                                                <TableCell className="w-[140px] flex-shrink-0">
                                                    <CategorySelect
                                                        value={category}
                                                        onValueChange={(value) => onCategoryChange(row.id, value)}
                                                    />
                                                </TableCell>
                                                <TableCell className="w-12 flex-shrink-0">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => onDeleteRow(row.id)}
                                                        disabled={isImporting}
                                                    >
                                                        <IconTrash className="h-4 w-4" />
                                                        <span className="sr-only">Delete</span>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="pt-4 border-t border-border/60 flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                            {parsedRows.length > 0 && (
                                <>
                                    <span>{parsedRows.length} transaction{parsedRows.length !== 1 ? "s" : ""} </span>
                                </>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                onClick={onCancel}
                                disabled={isImporting}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={onCommitImport}
                                disabled={isImporting || parsedRows.length === 0}
                            >
                                {isImporting ? `Importing... ${Math.round(importProgress)}%` : "Import to Database"}
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
