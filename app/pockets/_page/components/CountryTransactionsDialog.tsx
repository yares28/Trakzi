"use client"

import { memo } from "react"
import useSWR from "swr"
import ReactCountryFlag from "react-country-flag"

import { useCurrency } from "@/components/currency-provider"
import { getCountryCode } from "@/lib/data/country-codes"
import type { CountryTransactionsResponse } from "@/lib/types/pockets"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

interface CountryTransactionsDialogProps {
    instanceId: number | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export const CountryTransactionsDialog = memo(function CountryTransactionsDialog({
    instanceId,
    open,
    onOpenChange,
}: CountryTransactionsDialogProps) {
    const { formatCurrency } = useCurrency()

    // Fetch transactions when dialog opens
    const { data, isLoading, error } = useSWR<CountryTransactionsResponse>(
        open && instanceId ? `/api/pockets/transactions?instance_id=${instanceId}` : null,
        fetcher
    )

    const countryCode = data?.country ? getCountryCode(data.country) : null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {countryCode ? (
                            <ReactCountryFlag
                                countryCode={countryCode}
                                svg
                                style={{
                                    width: "1.5em",
                                    height: "1.5em",
                                }}
                                title={data?.country || undefined}
                                aria-label={data?.country ? `Flag of ${data.country}` : undefined}
                            />
                        ) : (
                            <span className="text-2xl">🌍</span>
                        )}
                        <span>{data?.label || data?.country || 'Transactions'}</span>
                    </DialogTitle>
                </DialogHeader>

                {/* Total */}
                {data && !isLoading && (
                    <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm text-muted-foreground">Total Spent</span>
                        <span className="text-lg font-semibold">
                            {formatCurrency(data.total)}
                        </span>
                    </div>
                )}

                {/* Transactions List */}
                <ScrollArea className="flex-1 -mx-6 px-6">
                    {isLoading ? (
                        <div className="space-y-3 py-4">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-3 w-20" />
                                    </div>
                                    <Skeleton className="h-5 w-16" />
                                </div>
                            ))}
                        </div>
                    ) : error ? (
                        <div className="py-8 text-center text-muted-foreground">
                            Failed to load transactions
                        </div>
                    ) : data?.transactions.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">
                            No transactions found
                        </div>
                    ) : (
                        <div className="space-y-1 py-4">
                            {data?.transactions.map((tx) => (
                                <div
                                    key={tx.id}
                                    className="flex items-center justify-between py-2 hover:bg-muted/50 rounded-md px-2 -mx-2"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">
                                            {tx.description}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span>{tx.tx_date}</span>
                                            {tx.category_name && (
                                                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                                    {tx.category_name}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <span className={`text-sm font-medium tabular-nums ml-4 ${
                                        tx.amount < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                                    }`}>
                                        {formatCurrency(tx.amount, { showSign: true })}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
})

CountryTransactionsDialog.displayName = "CountryTransactionsDialog"
