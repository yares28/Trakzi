"use client"

import { memo, useState, useCallback, useMemo, useEffect } from "react"
import useSWR from "swr"
import { Car, Loader2, Search, X, CalendarIcon } from "lucide-react"
import { format } from "date-fns"

import { useCurrency } from "@/components/currency-provider"
import { formatDateForDisplay } from "@/lib/date"
import type { 
    PocketLinkedTransaction,
    PocketUnlinkedResponse,
} from "@/lib/types/pockets"
import { POCKET_TAB_CATEGORIES, resolveCategoryKey } from "@/lib/types/pockets"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"

interface VehicleTransactionsResponse {
    pocket_id: number
    vehicle_name: string
    transactions: PocketLinkedTransaction[]
    total: number
}

interface VehicleTransactionsDialogProps {
    pocketId: number | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onTransactionsLinked?: () => void
}

const fetcher = async (url: string) => {
    const res = await fetch(url)

    if (!res.ok) {
        let message = "Failed to load transactions"

        try {
            const data = await res.json()
            if (data?.error && typeof data.error === "string") {
                message = data.error
            }
        } catch {
            // ignore JSON parsing errors and use default message
        }

        throw new Error(message)
    }

    return res.json()
}

// Determine which tab a transaction belongs to based on its category
function getTabForCategory(categoryName: string | null): string {
    if (!categoryName) return "general"
    
    const categoryMap: Record<string, string> = {
        "Fuel": "fuel",
        "Car Maintenance": "maintenance",
        "Insurance": "insurance",
        "Taxes & Fees": "insurance", // Insurance tab for vehicle
        "Car Certificate": "certificate",
        "Car Loan": "financing",
        "Parking/Tolls": "parking",
    }
    
    return categoryMap[categoryName] || "general"
}

export const VehicleTransactionsDialog = memo(function VehicleTransactionsDialog({
    pocketId,
    open,
    onOpenChange,
    onTransactionsLinked,
}: VehicleTransactionsDialogProps) {
    const { formatCurrency } = useCurrency()
    const [selectedTransactions, setSelectedTransactions] = useState<Set<number>>(new Set())
    const [searchFilter, setSearchFilter] = useState("")
    const [categoryFilter, setCategoryFilter] = useState<string>("all")
    const [startDate, setStartDate] = useState<Date | undefined>(undefined)
    const [endDate, setEndDate] = useState<Date | undefined>(undefined)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Fetch linked transactions for this vehicle
    const { data: linkedData, isLoading: isLoadingLinked, mutate: mutateLinked, error: linkedError } = useSWR<VehicleTransactionsResponse>(
        open && pocketId ? `/api/pockets/vehicle-transactions?pocket_id=${pocketId}` : null,
        fetcher
    )

    // Fetch unlinked vehicle transactions
    const { data: unlinkedData, isLoading: isLoadingUnlinked, error: unlinkedError } = useSWR<PocketUnlinkedResponse>(
        open && pocketId ? `/api/pockets/vehicle-unlinked?pocket_id=${pocketId}` : null,
        fetcher
    )

    // Initialize selected transactions with linked ones when data loads
    useEffect(() => {
        if (linkedData?.transactions && open) {
            const linkedIds = new Set(linkedData.transactions.map(tx => tx.id))
            setSelectedTransactions(linkedIds)
        }
    }, [linkedData?.transactions, open])

    // Combine transactions and sort by date (newest first)
    const allTransactions = useMemo(() => {
        const linked = linkedData?.transactions || []
        const unlinked = unlinkedData?.transactions || []
        const combined = [...linked, ...unlinked]
        
        // Sort by date descending (newest first), then by id descending as tiebreaker
        return combined.sort((a, b) => {
            const dateA = new Date(a.tx_date).getTime()
            const dateB = new Date(b.tx_date).getTime()
            if (dateB !== dateA) {
                return dateB - dateA
            }
            return b.id - a.id
        })
    }, [linkedData?.transactions, unlinkedData?.transactions])

    // Vehicle-specific categories that should appear in the filter
    const VEHICLE_CATEGORIES = [
        "Fuel",
        "Car Maintenance",
        "Insurance",
        "Taxes & Fees",
        "Car Certificate",
        "Car Loan",
        "Parking/Tolls",
    ]

    // Get unique categories from all transactions, filtered to vehicle-relevant ones
    // Only show categories that actually exist in the transactions
    const uniqueCategories = useMemo(() => {
        if (allTransactions.length === 0) return []
        const categories = new Set(
            allTransactions
                .map(tx => tx.category_name)
                .filter((name): name is string => !!name && VEHICLE_CATEGORIES.includes(name))
        )
        return Array.from(categories).sort((a, b) => {
            // Sort by VEHICLE_CATEGORIES order
            const indexA = VEHICLE_CATEGORIES.indexOf(a)
            const indexB = VEHICLE_CATEGORIES.indexOf(b)
            if (indexA === -1 && indexB === -1) return a.localeCompare(b)
            if (indexA === -1) return 1
            if (indexB === -1) return -1
            return indexA - indexB
        })
    }, [allTransactions])

    // Filter transactions by search, category, and date (maintains date sort)
    const filteredTransactions = useMemo(() => {
        return allTransactions.filter(tx => {
            // Search filter
            if (searchFilter) {
                const searchLower = searchFilter.toLowerCase()
                if (!tx.description.toLowerCase().includes(searchLower)) {
                    return false
                }
            }

            // Category filter
            if (categoryFilter !== "all") {
                if (tx.category_name !== categoryFilter) {
                    return false
                }
            }

            // Date filters
            if (startDate || endDate) {
                const txDate = new Date(tx.tx_date)
                if (startDate && txDate < startDate) {
                    return false
                }
                if (endDate) {
                    const endOfDay = new Date(endDate)
                    endOfDay.setHours(23, 59, 59, 999)
                    if (txDate > endOfDay) {
                        return false
                    }
                }
            }

            return true
        })
    }, [allTransactions, searchFilter, categoryFilter, startDate, endDate])

    // Toggle transaction selection
    const toggleTransaction = useCallback((id: number) => {
        setSelectedTransactions(prev => {
            const next = new Set(prev)
            if (next.has(id)) {
                next.delete(id)
            } else {
                next.add(id)
            }
            return next
        })
    }, [])

    // Check if all filtered transactions are selected
    const allSelected = useMemo(() => {
        if (filteredTransactions.length === 0) return false
        return filteredTransactions.every(tx => selectedTransactions.has(tx.id))
    }, [filteredTransactions, selectedTransactions])

    // Toggle all filtered transactions
    const toggleAll = useCallback(() => {
        if (allSelected) {
            // Deselect all filtered
            setSelectedTransactions(prev => {
                const next = new Set(prev)
                filteredTransactions.forEach(tx => next.delete(tx.id))
                return next
            })
        } else {
            // Select all filtered
            setSelectedTransactions(prev => {
                const next = new Set(prev)
                filteredTransactions.forEach(tx => next.add(tx.id))
                return next
            })
        }
    }, [allSelected, filteredTransactions])

    // Clear all filters
    const clearFilters = useCallback(() => {
        setSearchFilter("")
        setCategoryFilter("all")
        setStartDate(undefined)
        setEndDate(undefined)
    }, [])

    // Handle submit - link new selections and unlink deselections
    const handleSubmit = async () => {
        if (!pocketId) return

        setIsSubmitting(true)
        setError(null)

        try {
            const originallyLinkedIds = new Set(linkedData?.transactions?.map(tx => tx.id) || [])
            
            // Transactions to link (selected but not originally linked)
            const toLink = Array.from(selectedTransactions).filter(id => !originallyLinkedIds.has(id))
            
            // Transactions to unlink (originally linked but not selected)
            const toUnlink = Array.from(originallyLinkedIds).filter(id => !selectedTransactions.has(id))

            // Link new transactions - group by tab based on category
            if (toLink.length > 0) {
                // Group transactions by tab
                const transactionsByTab = new Map<string, number[]>()
                
                for (const txId of toLink) {
                    const tx = allTransactions.find(t => t.id === txId)
                    if (tx) {
                        const tab = getTabForCategory(tx.category_name)
                        if (!transactionsByTab.has(tab)) {
                            transactionsByTab.set(tab, [])
                        }
                        transactionsByTab.get(tab)!.push(txId)
                    }
                }

                // Link each tab's transactions
                for (const [tab, txIds] of transactionsByTab.entries()) {
                    const linkResponse = await fetch('/api/pockets/item-links', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            pocket_id: pocketId,
                            tab,
                            transaction_ids: txIds
                        })
                    })

                    if (!linkResponse.ok) {
                        const errorData = await linkResponse.json()
                        throw new Error(errorData.error || `Failed to link transactions to ${tab}`)
                    }
                }
            }

            // Unlink deselected transactions
            if (toUnlink.length > 0) {
                const unlinkResponse = await fetch('/api/pockets/item-links', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        pocket_id: pocketId,
                        transaction_ids: toUnlink
                    })
                })

                if (!unlinkResponse.ok) {
                    const errorData = await unlinkResponse.json()
                    throw new Error(errorData.error || 'Failed to unlink transactions')
                }
            }

            // Refresh data
            mutateLinked()
            onTransactionsLinked?.()

            // Reset state and close
            setSelectedTransactions(new Set())
            clearFilters()
            onOpenChange(false)

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setIsSubmitting(false)
        }
    }

    // Reset state when dialog closes
    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            setSelectedTransactions(new Set())
            clearFilters()
            setError(null)
        }
        onOpenChange(newOpen)
    }

    const isLoading = isLoadingLinked || isLoadingUnlinked
    const fetchError = linkedError || unlinkedError
    const hasActiveFilters = searchFilter || categoryFilter !== "all" || startDate || endDate
    const hasChanges = useMemo(() => {
        if (!linkedData?.transactions) return false
        const originallyLinkedIds = new Set(linkedData.transactions.map(tx => tx.id))
        const currentlySelectedIds = selectedTransactions
        
        // Check if any linked transactions were deselected
        const anyUnlinked = Array.from(originallyLinkedIds).some(id => !currentlySelectedIds.has(id))
        // Check if any new transactions were selected
        const anyLinked = Array.from(currentlySelectedIds).some(id => !originallyLinkedIds.has(id))
        
        return anyUnlinked || anyLinked
    }, [linkedData?.transactions, selectedTransactions])

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
                <DialogHeader className="flex-shrink-0">
                    <DialogTitle className="flex items-center gap-2">
                        <Car className="h-5 w-5" />
                        <span>Manage Transactions for {linkedData?.vehicle_name || 'Vehicle'}</span>
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 flex-1 min-h-0 flex flex-col">
                    {/* Total */}
                    {linkedData && !isLoading && (
                        <div className="flex items-center justify-between py-2 border-b">
                            <span className="text-sm text-muted-foreground">Total Spent</span>
                            <span className="text-lg font-semibold">
                                {formatCurrency(linkedData.total)}
                            </span>
                        </div>
                    )}

                    {/* Filters Row */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by description..."
                                value={searchFilter}
                                onChange={(e) => setSearchFilter(e.target.value)}
                                className="pl-9 pr-9"
                            />
                            {searchFilter && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                                    onClick={() => setSearchFilter("")}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>

                        {/* Category Filter */}
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="w-full sm:w-[160px]">
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All categories</SelectItem>
                                {uniqueCategories.map((category) => (
                                    <SelectItem key={category} value={category}>
                                        {category}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Date Range */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="w-full sm:w-auto justify-start text-left font-normal"
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {startDate ? (
                                        endDate ? (
                                            <span className="truncate">
                                                {format(startDate, "MMM d")} - {format(endDate, "MMM d")}
                                            </span>
                                        ) : (
                                            format(startDate, "MMM d, yyyy")
                                        )
                                    ) : (
                                        <span className="text-muted-foreground">Date range</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <div className="flex flex-col sm:flex-row">
                                    <div className="p-3 border-b sm:border-b-0 sm:border-r">
                                        <p className="text-sm font-medium mb-2">Start Date</p>
                                        <Calendar
                                            mode="single"
                                            selected={startDate}
                                            onSelect={setStartDate}
                                            initialFocus
                                        />
                                    </div>
                                    <div className="p-3">
                                        <p className="text-sm font-medium mb-2">End Date</p>
                                        <Calendar
                                            mode="single"
                                            selected={endDate}
                                            onSelect={setEndDate}
                                            disabled={(date) => startDate ? date < startDate : false}
                                        />
                                    </div>
                                </div>
                                {(startDate || endDate) && (
                                    <div className="p-3 border-t">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setStartDate(undefined)
                                                setEndDate(undefined)
                                            }}
                                        >
                                            Clear dates
                                        </Button>
                                    </div>
                                )}
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Header with counts and actions */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                                {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
                                {allTransactions.length > 0 && filteredTransactions.length !== allTransactions.length && (
                                    <span> of {allTransactions.length}</span>
                                )}
                            </span>
                            {selectedTransactions.size > 0 && (
                                <Badge variant="secondary">
                                    {selectedTransactions.size} selected
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {hasActiveFilters && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearFilters}
                                    className="h-7 text-xs"
                                >
                                    Clear filters
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Transactions Table */}
                    <div className="flex-1 min-h-0 border rounded-md overflow-auto">
                        {isLoading ? (
                            <div className="p-4 space-y-3">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <div key={i} className="flex items-center gap-4">
                                        <Skeleton className="h-4 w-4" />
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-4 flex-1" />
                                        <Skeleton className="h-4 w-20" />
                                        <Skeleton className="h-5 w-16" />
                                    </div>
                                ))}
                            </div>
                        ) : fetchError ? (
                            <div className="py-8 text-center text-muted-foreground">
                                <p className="text-destructive text-sm">
                                    {fetchError instanceof Error ? fetchError.message : "Something went wrong loading transactions"}
                                </p>
                            </div>
                        ) : filteredTransactions.length === 0 ? (
                            <div className="py-8 text-center text-muted-foreground">
                                {hasActiveFilters
                                    ? "No transactions match your filters"
                                    : "No transactions available"}
                            </div>
                        ) : (
                            <Table>
                                <TableHeader className="bg-muted/50 sticky top-0 z-10">
                                    <TableRow>
                                        <TableHead className="w-12">
                                            <Checkbox
                                                checked={allSelected}
                                                onCheckedChange={toggleAll}
                                                aria-label="Select all"
                                            />
                                        </TableHead>
                                        <TableHead className="w-28">Date</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="text-right w-24">Amount</TableHead>
                                        <TableHead className="w-32">Category</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {/* All transactions sorted by date, visually distinguished by selection state */}
                                    {filteredTransactions.map((tx) => (
                                        <TransactionRow
                                            key={tx.id}
                                            transaction={tx}
                                            isSelected={selectedTransactions.has(tx.id)}
                                            onToggle={() => toggleTransaction(tx.id)}
                                            formatCurrency={formatCurrency}
                                            isLinked={selectedTransactions.has(tx.id)}
                                        />
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>

                    {/* Error message */}
                    {error && (
                        <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 dark:bg-destructive/20 p-3 rounded-md border border-destructive/20">
                            <span className="mt-0.5">⚠</span>
                            <span>{error}</span>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex-shrink-0">
                    <DialogClose asChild>
                        <Button variant="outline" disabled={isSubmitting}>
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button
                        onClick={handleSubmit}
                        disabled={!hasChanges || isSubmitting || !pocketId}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            "Save Changes"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
})

VehicleTransactionsDialog.displayName = "VehicleTransactionsDialog"

// Transaction row component
interface TransactionRowProps {
    transaction: PocketLinkedTransaction
    isSelected: boolean
    onToggle: () => void
    formatCurrency: (amount: number, options?: { showSign?: boolean }) => string
    isLinked: boolean
}

const TransactionRow = memo(function TransactionRow({
    transaction,
    isSelected,
    onToggle,
    formatCurrency,
    isLinked,
}: TransactionRowProps) {
    return (
        <TableRow
            className={`cursor-pointer hover:bg-muted/50 ${isLinked ? 'bg-muted/30' : ''}`}
            data-state={isSelected ? "selected" : undefined}
            onClick={onToggle}
        >
            <TableCell className="w-12">
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={onToggle}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Select transaction ${transaction.id}`}
                />
            </TableCell>
            <TableCell className="w-28 text-sm text-muted-foreground">
                {formatDateForDisplay(transaction.tx_date, "en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                })}
            </TableCell>
            <TableCell>
                <div className="truncate max-w-[300px]" title={transaction.description}>
                    {transaction.description}
                </div>
            </TableCell>
            <TableCell className={`text-right font-medium tabular-nums ${
                transaction.amount < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
            }`}>
                {formatCurrency(transaction.amount, { showSign: true })}
            </TableCell>
            <TableCell className="w-32">
                {transaction.category_name ? (
                    <Badge variant="outline" className="text-xs">
                        {transaction.category_name}
                    </Badge>
                ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                )}
            </TableCell>
        </TableRow>
    )
})

TransactionRow.displayName = "TransactionRow"
