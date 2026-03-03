"use client"

import { cn } from "@/lib/utils"
import { useCurrency } from "@/components/currency-provider"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"

interface Balance {
    user_id: string
    display_name: string
    net_balance: number
    total_paid: number
    total_owed: number
}

interface RoomBalancesProps {
    balances: Balance[]
}

export function RoomBalances({ balances }: RoomBalancesProps) {
    const { formatCurrency } = useCurrency()

    return (
        <div className="space-y-3">
            <h2 className="text-lg font-semibold px-1">Balances</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {balances.map(b => (
                    <Card key={b.user_id} className="p-4 flex items-center gap-3">
                        <Avatar className="w-10 h-10 border border-border/50">
                            <AvatarFallback className="text-xs">{b.display_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{b.display_name}</p>
                            <p className={cn(
                                "text-lg font-bold tabular-nums",
                                b.net_balance > 0 ? "text-emerald-500" :
                                b.net_balance < 0 ? "text-rose-500" :
                                "text-muted-foreground"
                            )}>
                                {formatCurrency(b.net_balance, { showSign: true })}
                            </p>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    )
}
