import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react"
import { ChevronDown, ChevronRight, Info, X } from "lucide-react"

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
import { buildStatementParseQuality, type ParseQualitySummary } from "@/lib/parsing/statement-parse-quality"
import { groupItemsByDescription, getMostCommonValue } from "@/lib/grouping-utils"

export type StatementReviewRow = {
    id: number
    date: string
    time?: string
    description: string
    amount: number | string
    category?: string
    needsReview?: boolean
    reviewReason?: string | null
}

type StatementReviewDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    fileName: string | null
    parsedRows: StatementReviewRow[]
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

export function StatementReviewDialog({
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
}: StatementReviewDialogProps) {
    const { formatCurrency } = useCurrency()
    const [showReviewOnly, setShowReviewOnly] = useState(false)
    const wasOpenRef = useRef(false)

    // Side panel state
    const [sidePanelView, setSidePanelView] = useState<'review' | 'groups' | null>(null)
    const [expandedGroupKeys, setExpandedGroupKeys] = useState<Set<string>>(new Set())

    const reviewMeta = useMemo(() => {
        const map = new Map<number, { needsReview: boolean; reasons: string[] }>()
        let count = 0

        parsedRows.forEach((row) => {
            const reasons: string[] = []
            const dateValue = row.date?.trim() ?? ""
            const hasValidDate = /^\d{4}-\d{2}-\d{2}$/.test(dateValue)
            if (!hasValidDate) reasons.push("Missing/invalid date")

            const descriptionValue = row.description?.trim() ?? ""
            if (!descriptionValue) reasons.push("Missing description")

            const amountValue = typeof row.amount === "number" ? row.amount : Number.parseFloat(String(row.amount))
            if (!Number.isFinite(amountValue)) reasons.push("Missing amount")

            const categoryValue = row.category?.trim().toLowerCase() ?? ""
            if (!categoryValue || categoryValue === "other" || categoryValue === "uncategorized") {
                reasons.push("Uncategorized")
            }

            if (row.needsReview) {
                reasons.push(row.reviewReason || "Suggested review")
            }

            const needsReview = reasons.length > 0
            if (needsReview) count += 1
            map.set(row.id, { needsReview, reasons })
        })

        return { map, count }
    }, [parsedRows])

    useEffect(() => {
        if (open && !wasOpenRef.current) {
            setShowReviewOnly(false)
        }
        if (!open && wasOpenRef.current) {
            setShowReviewOnly(false)
        }
        wasOpenRef.current = open
    }, [open])

    const reviewQueueLabel = reviewMeta.count > 0 ? `Review queue (${reviewMeta.count})` : "Review queue"
    const visibleRows = sidePanelView === 'review'
        ? parsedRows.filter((row) => reviewMeta.map.get(row.id)?.needsReview)
        : parsedRows

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

    // Group transactions by description
    const groupedTransactions = useMemo(() => {
        return groupItemsByDescription(parsedRows)
    }, [parsedRows])

    const groupsWithMetadata = useMemo(() => {
        return groupedTransactions.map(group => ({
            ...group,
            totalAmount: group.items.reduce((sum, item) => {
                const amount = typeof item.amount === 'number' ? item.amount : parseFloat(String(item.amount)) || 0
                return sum + amount
            }, 0),
            commonCategory: getMostCommonValue(group.items, 'category') || 'Other',
        }))
    }, [groupedTransactions])

    const parseQualitySummary = parseQuality ?? buildStatementParseQuality({ rows: parsedRows })
    const parseQualityLabel = `${parseQualitySummary.level[0].toUpperCase()}${parseQualitySummary.level.slice(1)}`
    const parseQualityScore = parseQualitySummary.score
    const parseQualityReasons = parseQualitySummary.reasons
    const parseModeLabel = parseQualitySummary.parseMode === "ai" ? "AI parse" : null
    const qualityBadgeClass =
        parseQualitySummary.level === "high"
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
            : parseQualitySummary.level === "medium"
                ? "border-amber-500/40 bg-amber-500/10 text-amber-700"
                : "border-red-500/40 bg-red-500/10 text-red-700"
    const scoreBadgeClass = "border-border/60 bg-background text-muted-foreground"


    // Review Queue Panel Component
    function ReviewQueuePanel() {
        return (
            <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h3 className="font-semibold text-sm">Review Queue</h3>
                        <p className="text-xs text-muted-foreground">
                            {reviewMeta.count} transaction{reviewMeta.count !== 1 ? 's' : ''} need review
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setSidePanelView(null)}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-2">
                    {visibleRows.map((row) => {
                        const reviewInfo = reviewMeta.map.get(row.id)
                        const amount = typeof row.amount === 'number' ? row.amount : parseFloat(String(row.amount)) || 0
                        
                        return (
                            <div key={row.id} className="border rounded-lg p-3 bg-amber-50/60 dark:bg-amber-950/30">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium truncate">{row.description}</div>
                                        <div className="text-xs text-muted-foreground">{row.date}</div>
                                    </div>
                                    <div className={cn("font-medium text-sm", amount < 0 ? "text-red-500" : "text-green-500")}>
                                        {formatCurrency(amount)}
                                    </div>
                                </div>
                                {reviewInfo?.reasons && reviewInfo.reasons.length > 0 && (
                                    <div className="text-xs text-amber-700 dark:text-amber-400">
                                        {reviewInfo.reasons.join(" • ")}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        )
    }

    // Groups Panel Component
    function GroupsPanel() {
        return (
            <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h3 className="font-semibold text-sm">Grouped Transactions</h3>
                        <p className="text-xs text-muted-foreground">
                            {groupsWithMetadata.length} group{groupsWithMetadata.length !== 1 ? 's' : ''} found
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setSidePanelView(null)}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-2">
                    {groupsWithMetadata.map((group) => {
                        const isExpanded = expandedGroupKeys.has(group.key)
                        
                        return (
                            <div key={group.key} className="border rounded-lg p-3 space-y-2">
                                <div
                                    className="flex items-center gap-2 cursor-pointer"
                                    onClick={() => {
                                        const newSet = new Set(expandedGroupKeys)
                                        if (newSet.has(group.key)) {
                                            newSet.delete(group.key)
                                        } else {
                                            newSet.add(group.key)
                                        }
                                        setExpandedGroupKeys(newSet)
                                    }}
                                >
                                    {isExpanded ? (
                                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium truncate">{group.description}</span>
                                            <Badge variant="secondary" className="text-xs shrink-0">
                                                {group.count} items
                                            </Badge>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Total: {formatCurrency(group.totalAmount)}
                                        </div>
                                    </div>
                                </div>
                                
                                <CategorySelect
                                    value={group.commonCategory}
                                    onValueChange={(category) => {
                                        // Apply to all items in group
                                        group.items.forEach(item => onCategoryChange(item.id, category))
                                    }}
                                />
                                
                                {isExpanded && (
                                    <div className="pl-6 space-y-1 border-l-2 border-border/40 ml-2 mt-2">
                                        {group.items.map((item) => {
                                            const amount = typeof item.amount === 'number' ? item.amount : parseFloat(String(item.amount)) || 0
                                            return (
                                                <div key={item.id} className="text-xs text-muted-foreground flex justify-between gap-2">
                                                    <span>{item.date}</span>
                                                    <span className={cn(amount < 0 ? "text-red-500" : "text-green-500")}>
                                                        {formatCurrency(amount)}
                                                    </span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        )
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={cn(
                "border bg-background max-h-[90vh] overflow-hidden",
                sidePanelView 
                    ? "sm:max-w-[98vw] md:max-w-[1600px] lg:max-w-[1800px]"
                    : "sm:max-w-[95vw] md:max-w-[1400px]"
            )}>
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
                                    type="button"
                                    size="sm"
                                    variant={sidePanelView === 'review' ? "default" : "outline"}
                                    onClick={() => setSidePanelView(sidePanelView === 'review' ? null : 'review')}
                                    disabled={reviewMeta.count === 0}
                                >
                                    {reviewQueueLabel}
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={sidePanelView === 'groups' ? "default" : "outline"}
                                    onClick={() => setSidePanelView(sidePanelView === 'groups' ? null : 'groups')}
                                    disabled={groupsWithMetadata.length === 0}
                                >
                                    Group View ({groupsWithMetadata.length})
                                </Button>
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

                        {/* Parse Quality Insights */}
                        <div className="rounded-xl border border-border/60 bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
                            <div className="flex flex-wrap items-center gap-2 text-sm">
                                <span className="font-medium text-foreground">Parse quality</span>
                                <Badge variant="outline" className={qualityBadgeClass}>
                                    {parseQualityLabel}
                                </Badge>
                                {Number.isFinite(parseQualityScore) ? (
                                    <Badge variant="outline" className={scoreBadgeClass}>
                                        {parseQualityScore}%
                                    </Badge>
                                ) : null}
                                {parseModeLabel ? (
                                    <Badge variant="outline" className="border-sky-500/40 bg-sky-500/10 text-sky-700">
                                        {parseModeLabel}
                                    </Badge>
                                ) : null}
                                {fileName && (
                                    <Badge variant="outline" className="border-sky-500/40 bg-sky-500/10 text-sky-700">
                                        {fileName}
                                    </Badge>
                                )}
                            </div>
                            {parseQualityReasons.length > 0 && (
                                <div className="mt-1">
                                    Signals: {parseQualityReasons.join(" | ")}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Main content area with side panel */}


                    <div className="flex gap-4 flex-1 overflow-hidden">


                        {/* Left: Main table */}


                        <div className={cn(


                            "flex-1 overflow-y-auto overflow-x-hidden pt-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40",
                            !!sidePanelView ? "w-[70%]" : "w-full"
                        )}>
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
                                    visibleRows.map((row) => {
                                        const amount = typeof row.amount === "number" ? row.amount : parseFloat(String(row.amount)) || 0
                                        const category = row.category || "Other"
                                        const isSelected = selectedParsedRowIds.has(row.id)
                                        const reviewInfo = reviewMeta.map.get(row.id)
                                        const needsReview = Boolean(reviewInfo?.needsReview)
                                        const reviewHint = reviewInfo?.reasons.join(" | ")

                                        return (
                                            <TableRow
                                                key={row.id}
                                                className={cn(
                                                    needsReview
                                                        ? "bg-amber-50/60 dark:bg-amber-950/30"
                                                        : null
                                                )}
                                            >
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
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <div className="truncate" title={row.description}>
                                                            {row.description}
                                                        </div>
                                                        {needsReview ? (
                                                            <Badge
                                                                variant="outline"
                                                                title={reviewHint || "Review suggested"}
                                                                className="border-amber-300 text-amber-700 bg-amber-50/80"
                                                            >
                                                                Review
                                                            </Badge>
                                                        ) : null}
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
                        {sidePanelView === 'review' && visibleRows.length === 0 ? (
                            <div className="text-sm text-muted-foreground mt-4">
                                No transactions are flagged for review.
                            </div>
                        ) : null}
                    </div>
                    
                    {/* Right: Side panel */}
                    {sidePanelView && (
                        <div className="w-[30%] border-l border-border/60 pl-4 flex flex-col overflow-hidden">
                            {sidePanelView === 'review' ? (
                                <ReviewQueuePanel />
                            ) : (
                                <GroupsPanel />
                            )}
                        </div>
                    )}
                    </div>

                    <div className="pt-4 border-t border-border/60 flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                            {parsedRows.length > 0 && (
                                <>
                                    {showReviewOnly ? (
                                        <span>
                                            Showing {visibleRows.length} of {parsedRows.length} transaction(s)
                                        </span>
                                    ) : (
                                        <span>{parsedRows.length} transaction{parsedRows.length !== 1 ? "s" : ""} </span>
                                    )}
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
