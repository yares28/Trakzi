"use client"

import { useCurrency } from "@/components/currency-provider"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface Transaction {
    id: string
    description: string
    total_amount: number
    currency: string
    uploaded_by: string
    uploader_name: string
    split_type: string
    created_at: string
}

interface RoomTransactionsProps {
    transactions: Transaction[]
}

export function RoomTransactions({ transactions }: RoomTransactionsProps) {
    const { formatCurrency } = useCurrency()

    if (transactions.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                <p>No transactions yet. Add a shared expense to get started.</p>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            <h2 className="text-lg font-semibold px-1">Recent Transactions</h2>
            <Card className="border-border/40 bg-white/5 dark:bg-black/20 backdrop-blur-xl rounded-3xl overflow-hidden">
                <CardContent className="p-0 divide-y divide-border/30">
                    {transactions.map(tx => (
                        <div key={tx.id} className="flex items-center justify-between px-6 py-4">
                            <div className="flex items-center gap-3 min-w-0">
                                <Avatar className="w-9 h-9 border border-border/50 shrink-0">
                                    <AvatarFallback className="text-[10px]">{tx.uploader_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                    <p className="font-medium text-sm truncate">{tx.description}</p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">{tx.uploader_name}</span>
                                        <Badge variant="outline" className="text-[10px] h-4">{tx.split_type}</Badge>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right shrink-0 ml-4">
                                <p className="font-semibold tabular-nums">{formatCurrency(tx.total_amount)}</p>
                                <p className="text-[10px] text-muted-foreground">
                                    {new Date(tx.created_at).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    )
}
