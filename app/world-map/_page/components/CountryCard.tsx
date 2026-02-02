"use client"

import { memo, useState, useCallback } from "react"
import { Eye, X, Loader2 } from "lucide-react"
import ReactCountryFlag from "react-country-flag"

import { useCurrency } from "@/components/currency-provider"
import { getCountryCode } from "@/lib/data/country-codes"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

import { CountryOutline } from "./CountryOutline"

// Countries with extreme aspect ratios that need larger render size
const LARGE_COUNTRIES = new Set(["Russia", "USA", "Canada", "Antarctica", "Indonesia", "China"])

export interface CountryCardProps {
    countryName: string
    totalSpent: number
    onViewTransactions: () => void
    onDeleteCountry?: () => Promise<void> | void
}

export const CountryCard = memo(function CountryCard({
    countryName,
    totalSpent,
    onViewTransactions,
    onDeleteCountry,
}: CountryCardProps) {
    const { formatCurrency } = useCurrency()
    const countryCode = getCountryCode(countryName)
    const [isDeleting, setIsDeleting] = useState(false)

    const handleDelete = useCallback(async () => {
        if (!onDeleteCountry || isDeleting) return
        setIsDeleting(true)
        try {
            await onDeleteCountry()
        } finally {
            setIsDeleting(false)
        }
    }, [onDeleteCountry, isDeleting])

    return (
        <Card className="@container/card relative overflow-hidden border bg-card shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-1 hover:scale-[1.01] group">
            {/* Hover actions: delete (top-right) */}
            {onDeleteCountry && (
                <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    aria-label={`Remove ${countryName} and unlink transactions`}
                    className="absolute right-2 top-2 z-10 h-8 w-8 rounded-full text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20"
                >
                    {isDeleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <X className="h-4 w-4" />
                    )}
                </Button>
            )}

            <div className="flex flex-col h-full p-3 pb-3">
                {/* Section 1: Flag + Country Name (centered) */}
                <div className="flex items-center justify-center gap-3 pb-2">
                    {countryCode ? (
                        <ReactCountryFlag
                            countryCode={countryCode}
                            svg
                            style={{
                                width: "1.5em",
                                height: "1.5em",
                            }}
                            title={countryName}
                            aria-label={`Flag of ${countryName}`}
                        />
                    ) : (
                        <span className="text-2xl">🌍</span>
                    )}
                    <span className="text-lg font-semibold truncate">{countryName}</span>
                </div>

                {/* Section 2: Country Outline (bigger, takes most space) */}
                <div className="flex-1 flex items-center justify-center py-6 text-muted-foreground min-h-[200px] overflow-hidden">
                    <div className="w-full h-full flex items-center justify-center max-w-[280px]">
                        <CountryOutline
                            countryName={countryName}
                            maxSize={LARGE_COUNTRIES.has(countryName) ? 280 : 200}
                            secondarySize={36}
                        />
                    </div>
                </div>

                {/* Section 3: Amount row */}
                <div className="mt-auto flex items-end justify-between pt-2 pr-1 pb-1">
                    <div className="text-left pr-2">
                        <div className="text-xs text-muted-foreground uppercase tracking-wide">
                            Total Spent
                        </div>
                        <div className="text-xl font-bold tabular-nums">
                            {formatCurrency(totalSpent, {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Hover action: view (bottom-right) */}
            <Button
                variant="ghost"
                size="icon-sm"
                className="absolute bottom-2 right-2 z-10 h-8 w-8 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground hover:bg-accent"
                onClick={onViewTransactions}
                aria-label={`View transactions for ${countryName}`}
            >
                <Eye className="h-4 w-4" />
            </Button>
        </Card>
    )
})

CountryCard.displayName = "CountryCard"
