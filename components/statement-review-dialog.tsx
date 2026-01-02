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

    // State
    const [isGroupsView, setIsGroupsView] = useState(false)
    const [showReviewOnly, setShowReviewOnly] = useState(false)
    const [expandedGroupKeys, setExpandedGroupKeys] = useState<Set<string>>(new Set())
    const groupsPanelScrollRef = useRef<HTMLDivElement>(null)

    // Reset state on open
    useEffect(() => {
        if (open) {
            setIsGroupsView(false)
            setShowReviewOnly(false)
            setExpandedGroupKeys(new Set())
        }
    }, [open])

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



    const reviewQueueLabel = reviewMeta.count > 0 ? `Review queue (${reviewMeta.count})` : "Review queue"
    const visibleRows = useMemo(() => {
        let rows = parsedRows
        if (showReviewOnly) {
            rows = rows.filter(row => reviewMeta.map.get(row.id)?.needsReview)
        }
        return rows
    }, [parsedRows, showReviewOnly, reviewMeta])

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


    // Groups Panel Component
    function GroupsPanel() {
        return (
            <div className="flex flex-col h-full bg-muted/10 border-l border-border/60">
                <div className="flex items-center justify-between p-4 border-b border-border/40 bg-muted/20">
                    <div>
                        <h3 className="font-semibold text-sm flex items-center gap-2">
                            Grouped Transactions
                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                                {groupsWithMetadata.length}
                            </Badge>
                        </h3>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-full text-muted-foreground hover:bg-background"
                        onClick={() => setIsGroupsView(false)}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <div
                    ref={groupsPanelScrollRef}
                    className="flex-1 overflow-y-auto p-3 space-y-3 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40"
                >
                    {groupsWithMetadata.map((group) => {
                        const isExpanded = expandedGroupKeys.has(group.key)

                        return (
                            <div key={group.key} className={cn(
                                "border rounded-xl bg-background shadow-sm transition-all overflow-hidden",
                                isExpanded ? "border-primary/20 ring-1 ring-primary/5 shadow-md" : "hover:shadow-md hover:border-border/80"
                            )}>
                                <div className="flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors">
                                    <div
                                        className="cursor-pointer select-none shrink-0"
                                        onClick={() => {
                                            const scrollTop = groupsPanelScrollRef.current?.scrollTop ?? 0
                                            const newSet = new Set(expandedGroupKeys)
                                            if (newSet.has(group.key)) {
                                                newSet.delete(group.key)
                                            } else {
                                                newSet.add(group.key)
                                            }
                                            setExpandedGroupKeys(newSet)
                                            requestAnimationFrame(() => {
                                                if (groupsPanelScrollRef.current) {
                                                    groupsPanelScrollRef.current.scrollTop = scrollTop
                                                }
                                            })
                                        }}
                                    >
                                        {isExpanded ? (
                                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                        ) : (
                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2 mb-0.5">
                                            <span className="font-medium text-sm truncate text-foreground">{group.description}</span>
                                            <span className="text-xs font-mono text-muted-foreground tabular-nums">
                                                {formatCurrency(group.totalAmount)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge className="text-[10px] h-4 px-1 rounded-sm font-normal text-white dark:text-black">
                                                {group.count} items
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                                        <CategorySelect
                                            value={group.commonCategory}
                                            onValueChange={(category) => {
                                                group.items.forEach(item => onCategoryChange(item.id, category))
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className={cn(
                                    "border-t border-border/40 bg-muted/20 transition-all duration-300 ease-in-out",
                                    isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"
                                )}>
                                    <div className="p-3 space-y-1.5 pl-1">
                                        {group.items.map((item) => {
                                            const amount = typeof item.amount === 'number' ? item.amount : parseFloat(String(item.amount)) || 0
                                            return (
                                                <div key={item.id} className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-background/80">
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <span className="text-muted-foreground font-mono text-[10px] shrink-0">{item.date}</span>
                                                        <span className="text-muted-foreground/90 truncate">{item.description}</span>
                                                    </div>
                                                    <span className={cn("font-medium ml-2 tabular-nums shrink-0", amount < 0 ? "text-red-500" : "text-emerald-500")}>
                                                        {formatCurrency(amount)}
                                                    </span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
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
                "border bg-background max-h-[90vh] overflow-hidden [&>button]:hidden",
                isGroupsView
                    ? "sm:max-w-[98vw] md:max-w-[1600px] lg:max-w-[1800px]"
                    : "sm:max-w-[95vw] md:max-w-[1400px]"
            )}>
                <div className="flex flex-col max-h-[85vh] overflow-hidden">
                    {/* Modern Glassmorphic Header */}
                    <div className="flex-none flex flex-col gap-4 p-6 pb-4 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">
                                    Review Transactions
                                </h2>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {fileName ? (
                                        <span className="flex items-center gap-2">
                                            {fileName}
                                            <span className="w-1 h-1 rounded-full bg-border" />
                                            {transactionCount} transactions
                                        </span>
                                    ) : (
                                        "Review and adjust categories before importing."
                                    )}
                                </p>
                            </div>

                            {/* Top Actions */}
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={onCancel}
                                    className="h-8 w-8 rounded-full"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Modern Toolbar */}
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            {/* Left: View Toggles & Selection */}
                            <div className="flex items-center gap-3">
                                <div className="flex items-center p-1 bg-muted/50 rounded-full border border-border/50">
                                    <Button
                                        variant={showReviewOnly ? "secondary" : "ghost"}
                                        size="sm"
                                        onClick={() => setShowReviewOnly(!showReviewOnly)}
                                        disabled={reviewMeta.count === 0}
                                        className={cn(
                                            "h-7 rounded-full px-3 text-xs font-medium transition-all",
                                            showReviewOnly && "bg-background shadow-sm text-foreground ring-1 ring-border/50"
                                        )}
                                    >
                                        Review Queue
                                        {reviewMeta.count > 0 && (
                                            <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500/10 text-[9px] text-amber-600 font-bold">
                                                {reviewMeta.count}
                                            </span>
                                        )}
                                    </Button>
                                    <div className="w-px h-3 bg-border/50 mx-1" />
                                    <Button
                                        variant={isGroupsView ? "secondary" : "ghost"}
                                        size="sm"
                                        onClick={() => setIsGroupsView(!isGroupsView)}
                                        disabled={groupsWithMetadata.length === 0}
                                        className={cn(
                                            "h-7 rounded-full px-3 text-xs font-medium transition-all",
                                            isGroupsView && "bg-background shadow-sm text-foreground ring-1 ring-border/50"
                                        )}
                                    >
                                        Groups
                                        <span className="ml-1.5 text-[9px] text-muted-foreground">
                                            {groupsWithMetadata.length}
                                        </span>
                                    </Button>
                                </div>

                                {selectedCount > 0 && (
                                    <>
                                        <div className="w-px h-4 bg-border" />
                                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
                                            <Badge variant="secondary" className="text-xs h-7 px-2.5 rounded-full font-normal">
                                                {selectedCount} selected
                                            </Badge>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={onDeleteSelectedRows}
                                                disabled={isImporting}
                                                className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10 text-xs rounded-full"
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Right: Insights & Settings */}
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/30 border border-border/40 text-xs text-muted-foreground">
                                    <span className={cn(
                                        "w-2 h-2 rounded-full",
                                        parseQualitySummary.level === "high" ? "bg-emerald-500" :
                                            parseQualitySummary.level === "medium" ? "bg-amber-500" : "bg-red-500"
                                    )} />
                                    <span>Quality: {parseQualityScore}%</span>
                                </div>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                            <Info className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-72 p-0 rounded-xl" align="end">
                                        <div className="p-4 border-b border-border/50 bg-muted/10">
                                            <h4 className="font-semibold text-sm">Parse Quality</h4>
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {parseQualityReasons.map((reason, i) => (
                                                    <Badge key={i} variant="outline" className="text-[10px] bg-background/50">
                                                        {reason}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="p-4 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-semibold text-sm">Breakdown</h4>
                                                <span className="text-xs text-muted-foreground">By spend</span>
                                            </div>
                                            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                                                {categoryBreakdown.map((item) => (
                                                    <div key={item.category} className="flex items-center justify-between text-xs">
                                                        <span className="text-foreground/80">{item.category}</span>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-primary/70 rounded-full"
                                                                    style={{ width: `${item.percentage}%` }}
                                                                />
                                                            </div>
                                                            <span className="w-8 text-right text-muted-foreground">{item.percentage.toFixed(0)}%</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                    </div>

                    {/* Main content area with side panel */}


                    <div className="flex gap-4 flex-1 overflow-hidden">


                        {/* Left: Main table */}


                        <div className={cn(
                            "flex-1 overflow-y-auto overflow-x-hidden pt-0 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40",
                            isGroupsView ? "w-[70%]" : "w-full"
                        )}>
                            <Table className="w-full relative">
                                <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur-sm">
                                    <TableRow className="border-b border-border/50 hover:bg-transparent">
                                        <TableHead className="w-12 pl-4">
                                            <Checkbox
                                                checked={parsedRows.length > 0 && selectedParsedRowIds.size === parsedRows.length}
                                                onCheckedChange={(checked) => onSelectAll(checked === true)}
                                                aria-label="Select all transactions"
                                            />
                                        </TableHead>
                                        <TableHead className="font-medium text-xs uppercase tracking-wider text-muted-foreground">Date</TableHead>
                                        <TableHead className="font-medium text-xs uppercase tracking-wider text-muted-foreground">Description</TableHead>
                                        <TableHead className="text-right font-medium text-xs uppercase tracking-wider text-muted-foreground">Amount</TableHead>
                                        <TableHead className="font-medium text-xs uppercase tracking-wider text-muted-foreground w-[160px]">Category</TableHead>
                                        <TableHead className="w-12"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {parsedRows.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
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
                                                        "group border-b border-border/40 transition-colors hover:bg-muted/30 data-[state=selected]:bg-muted",
                                                        needsReview && "bg-amber-500/5 hover:bg-amber-500/10"
                                                    )}
                                                    data-state={isSelected ? "selected" : undefined}
                                                >
                                                    <TableCell className="w-12 pl-4 relative">
                                                        {needsReview && (
                                                            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-amber-500 rounded-r-full" title={reviewHint} />
                                                        )}
                                                        <Checkbox
                                                            checked={isSelected}
                                                            onCheckedChange={(checked) => onToggleRow(row.id, checked === true)}
                                                            aria-label="Select transaction"
                                                        />
                                                    </TableCell>
                                                    <TableCell className="w-32 flex-shrink-0">
                                                        <div className="flex flex-col items-start gap-1">
                                                            <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground border-border/50 bg-background/50">
                                                                {row.date}
                                                            </Badge>
                                                            {row.time ? (
                                                                <span className="text-[10px] text-muted-foreground pl-1">{row.time}</span>
                                                            ) : null}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="min-w-[300px] max-w-[500px]">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <div className="truncate font-medium text-sm" title={row.description}>
                                                                {row.description}
                                                            </div>
                                                            {needsReview ? (
                                                                <div
                                                                    className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/10 text-amber-600 shrink-0"
                                                                    title={reviewHint || "Review suggested"}
                                                                >
                                                                    <Info className="w-3 h-3" />
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right w-28 flex-shrink-0">
                                                        <span className={cn(
                                                            "font-medium tabular-nums text-sm",
                                                            amount < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
                                                        )}>
                                                            {formatCurrency(amount)}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="w-[160px] flex-shrink-0">
                                                        <CategorySelect
                                                            value={category}
                                                            onValueChange={(value) => onCategoryChange(row.id, value)}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="w-12 flex-shrink-0 pr-4">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
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
                            {showReviewOnly && visibleRows.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm">
                                    <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                                        <Info className="w-6 h-6 text-emerald-500/50" />
                                    </div>
                                    <p>All clear! No transactions flagged for review.</p>
                                </div>
                            ) : null}
                        </div>

                        {/* Side Panel for Groups */}
                        {isGroupsView && (
                            <div className="w-[30%] min-w-[350px] max-w-[450px] animate-in slide-in-from-right-4 duration-300">
                                <GroupsPanel />
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
