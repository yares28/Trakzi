"use client"

import { ArrowDownToLine, Receipt, FileSpreadsheet, PenLine, MinusCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCurrency } from "@/components/currency-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface Balance {
    user_id: string
    display_name: string
    net_balance: number
    total_paid: number
    total_owed: number
    avatar_url?: string | null
}

interface SourceBreakdown {
    personal_import: { total: number; count: number }
    receipt: { total: number; count: number }
    statement: { total: number; count: number }
    manual: { total: number; count: number }
}

interface RoomBalancesProps {
    balances: Balance[]
    unattributedTotal?: number
    unattributedCount?: number
    sourceBreakdown?: SourceBreakdown
    onAttributeClick?: () => void
}

export function RoomBalances({
    balances,
    unattributedTotal = 0,
    unattributedCount = 0,
    sourceBreakdown,
    onAttributeClick,
}: RoomBalancesProps) {
    const { formatCurrency } = useCurrency()

    const sources = sourceBreakdown ? [
        { key: "personal_import", label: "Imported", icon: <ArrowDownToLine className="w-3.5 h-3.5" />, ...sourceBreakdown.personal_import },
        { key: "receipt", label: "Receipts", icon: <Receipt className="w-3.5 h-3.5" />, ...sourceBreakdown.receipt },
        { key: "statement", label: "Statements", icon: <FileSpreadsheet className="w-3.5 h-3.5" />, ...sourceBreakdown.statement },
        { key: "manual", label: "Manual", icon: <PenLine className="w-3.5 h-3.5" />, ...sourceBreakdown.manual },
    ].filter(s => s.count > 0) : []

    return (
        <div className="space-y-3">
            <h2 className="text-lg font-semibold px-1">Balances</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {balances.map(b => (
                    <Card key={b.user_id} className="p-4 flex flex-col items-center gap-2 text-center">
                        <Avatar className="w-11 h-11 border border-border/50">
                            {b.avatar_url && <AvatarImage src={b.avatar_url} alt={b.display_name} />}
                            <AvatarFallback className="text-xs">{b.display_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <p className="font-medium text-sm truncate w-full text-center">{b.display_name}</p>
                        <p className={cn(
                            "text-base font-bold tabular-nums",
                            b.net_balance > 0 ? "text-emerald-500" :
                            b.net_balance < 0 ? "text-rose-500" :
                            "text-muted-foreground"
                        )}>
                            {formatCurrency(b.net_balance, { showSign: true })}
                        </p>
                    </Card>
                ))}
            </div>

            {/* Unattributed card */}
            {unattributedCount > 0 && (
                <Card className="p-4 border-amber-500/30 bg-amber-500/5">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-amber-500/15 text-amber-500 flex items-center justify-center">
                                <MinusCircle className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="font-medium text-sm">Unattributed</p>
                                <p className="text-xs text-muted-foreground">
                                    {unattributedCount} transaction{unattributedCount !== 1 ? "s" : ""} · {formatCurrency(unattributedTotal)} total
                                </p>
                            </div>
                        </div>
                        {onAttributeClick && (
                            <Button variant="outline" size="sm" onClick={onAttributeClick} className="shrink-0 text-xs h-7">
                                Attribute Now →
                            </Button>
                        )}
                    </div>
                </Card>
            )}

            {/* Source breakdown */}
            {sources.length > 0 && (
                <div className="flex flex-wrap gap-3 px-1">
                    {sources.map(s => (
                        <div key={s.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="text-foreground/70">{s.icon}</span>
                            <span>{s.label}:</span>
                            <span className="font-medium text-foreground">{formatCurrency(s.total)}</span>
                            <span>({s.count})</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
