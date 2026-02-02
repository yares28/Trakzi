"use client"

import { memo, useState, useCallback, useMemo } from "react"
import useSWR from "swr"
import { Loader2, Search, X, CalendarIcon } from "lucide-react"
import { format } from "date-fns"

import { useCurrency } from "@/components/currency-provider"
import { formatDateForDisplay } from "@/lib/date"
import type { UnlinkedTransactionsResponse, CountryTransaction } from "@/lib/types/world-map"

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
import { Label } from "@/components/ui/label"
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

import { CountrySelect } from "./CountrySelect"

interface AddCountryDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    existingCountries: string[]
    onSuccess?: () => void
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export const AddCountryDialog = memo(function AddCountryDialog({
    open,
    onOpenChange,
    existingCountries,
    onSuccess,
}: AddCountryDialogProps) {
    const { formatCurrency } = useCurrency()

    const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
    const [selectedTransactions, setSelectedTransactions] = useState<Set<number>>(new Set())
    const [searchFilter, setSearchFilter] = useState("")
    const [categoryFilter, setCategoryFilter] = useState<string>("all")
    const [startDate, setStartDate] = useState<Date | undefined>(undefined)
    const [endDate, setEndDate] = useState<Date | undefined>(undefined)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Fetch ALL unlinked transactions (no limit)
    const { data, isLoading } = useSWR<UnlinkedTransactionsResponse>(
        open ? `/api/world-map/unlinked-transactions` : null,
        fetcher
    )

    // Get unique categories from transactions
    const uniqueCategories = useMemo(() => {
        if (!data?.transactions) return []
        const categories = new Set(
            data.transactions
                .map(tx => tx.category_name)
                .filter((name): name is string => !!name)
        )
        return Array.from(categories).sort()
    }, [data?.transactions])

    // Filter transactions by search, category, and date
    const filteredTransactions = useMemo(() => {
        if (!data?.transactions) return []

        return data.transactions.filter(tx => {
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
    }, [data?.transactions, searchFilter, categoryFilter, startDate, endDate])

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

    // Handle submit
    const handleSubmit = async () => {
        if (!selectedCountry || selectedTransactions.size === 0) return

        setIsSubmitting(true)
        setError(null)

        try {
            const response = await fetch('/api/world-map/links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    country_name: selectedCountry,
                    transaction_ids: Array.from(selectedTransactions)
                })
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to link transactions')
            }

            // Reset state and close
            setSelectedCountry(null)
            setSelectedTransactions(new Set())
            clearFilters()
            onOpenChange(false)
            onSuccess?.()

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setIsSubmitting(false)
        }
    }

    // Reset state when dialog closes
    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            setSelectedCountry(null)
            setSelectedTransactions(new Set())
            clearFilters()
            setError(null)
        }
        onOpenChange(newOpen)
    }

    const hasActiveFilters = searchFilter || categoryFilter !== "all" || startDate || endDate

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
                <DialogHeader className="flex-shrink-0">
                    <DialogTitle>Add Country</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 flex-1 min-h-0 flex flex-col">
                    {/* Country Select */}
                    <div className="space-y-2">
                        <Label htmlFor="country-select">Country</Label>
                        <CountrySelect
                            value={selectedCountry}
                            onSelect={setSelectedCountry}
                            excludeCountries={existingCountries}
                            placeholder="Search for a country..."
                        />
                    </div>

                    {/* Transaction Selection */}
                    {selectedCountry && (
                        <>
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
                                        {data?.transactions && filteredTransactions.length !== data.transactions.length && (
                                            <span> of {data.transactions.length}</span>
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
                                ) : filteredTransactions.length === 0 ? (
                                    <div className="p-12 text-center text-muted-foreground">
                                        {hasActiveFilters
                                            ? "No transactions match your filters"
                                            : "No unlinked transactions available"}
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
                                            {filteredTransactions.map((tx) => (
                                                <TransactionRow
                                                    key={tx.id}
                                                    transaction={tx}
                                                    isSelected={selectedTransactions.has(tx.id)}
                                                    onToggle={() => toggleTransaction(tx.id)}
                                                    formatCurrency={formatCurrency}
                                                />
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </div>
                        </>
                    )}

                    {/* Error message */}
                    {error && (
                        <div className="text-sm text-red-600 dark:text-red-400">
                            {error}
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
                        disabled={!selectedCountry || selectedTransactions.size === 0 || isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Adding...
                            </>
                        ) : (
                            `Add ${selectedTransactions.size > 0 ? `(${selectedTransactions.size})` : ''}`
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
})

AddCountryDialog.displayName = "AddCountryDialog"

// Transaction row component
interface TransactionRowProps {
    transaction: CountryTransaction
    isSelected: boolean
    onToggle: () => void
    formatCurrency: (amount: number, options?: { showSign?: boolean }) => string
}

const TransactionRow = memo(function TransactionRow({
    transaction,
    isSelected,
    onToggle,
    formatCurrency,
}: TransactionRowProps) {
    return (
        <TableRow
            className="cursor-pointer hover:bg-muted/50"
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
                {formatCurrency(transaction.amount)}
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
