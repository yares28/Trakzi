"use client"

import { memo, useState, useCallback } from "react"
import { Globe, Plus } from "lucide-react"

import type { CountryTransactionsResponse } from "@/lib/types/pockets"
import type { CountryData } from "@/lib/types/pockets"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

import { CountryCard } from "./CountryCard"
import { CountryTransactionsDialog } from "./CountryTransactionsDialog"

const DISMISSED_TRAVEL_KEY = "trakzi-dismissed-travel-mocks"

function loadDismissedTravelMocks(): Set<string> {
    if (typeof window === "undefined") return new Set()
    try {
        const raw = localStorage.getItem(DISMISSED_TRAVEL_KEY)
        return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
    } catch {
        return new Set()
    }
}

export interface CountryCardsGridProps {
    countries: CountryData[]
    isLoading?: boolean
    onAddCountry?: () => void
    onCountryDeleted?: () => void
    isMockData?: boolean
}

export const CountryCardsGrid = memo(function CountryCardsGrid({
    countries,
    isLoading = false,
    onAddCountry,
    onCountryDeleted,
    isMockData = false,
}: CountryCardsGridProps) {
    const [selectedInstanceId, setSelectedInstanceId] = useState<number | null>(null)
    const [deletedMockCountries, setDeletedMockCountries] = useState<Set<string>>(loadDismissedTravelMocks)

    // Filter out deleted mock countries
    const visibleCountries = isMockData
        ? countries.filter(c => !deletedMockCountries.has(c.id))
        : countries

    const handleDeleteCountry = useCallback(async (instanceId: number, countryName: string) => {
        // For mock data, hide the card and persist to localStorage
        if (isMockData) {
            setDeletedMockCountries(prev => {
                const next = new Set([...prev, countryName])
                try { localStorage.setItem(DISMISSED_TRAVEL_KEY, JSON.stringify([...next])) } catch { /* noop */ }
                return next
            })
            // Notify parent so it re-syncs map data from localStorage
            onCountryDeleted?.()
            return
        }

        // For real data, delete the instance (transactions are automatically unlinked via ON DELETE SET NULL)
        try {
            const deleteRes = await fetch(`/api/pockets/instances?id=${instanceId}`, {
                method: 'DELETE',
            })

            if (!deleteRes.ok) {
                const errorData = await deleteRes.json()
                console.error("Failed to delete country instance", instanceId, errorData.error)
                return
            }

            // Notify parent to refresh data
            onCountryDeleted?.()
        } catch (err) {
            console.error("Error deleting country instance", err)
        }
    }, [isMockData, onCountryDeleted])

    // Loading state
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @md/main:grid-cols-2 @3xl/main:grid-cols-3">
                {[0, 1, 2].map((i) => (
                    <Card key={i} className="overflow-hidden animate-in fade-in duration-300" style={{ animationDelay: `${i * 80}ms`, animationFillMode: "both" }}>
                        <CardContent className="p-6">
                            <div className="flex flex-col items-center gap-4">
                                <Skeleton className="h-8 w-12 rounded" style={{ "--skeleton-delay": `${i * 80}ms` } as React.CSSProperties} />
                                <Skeleton className="h-5 w-24" style={{ "--skeleton-delay": `${i * 80 + 40}ms` } as React.CSSProperties} />
                                <Skeleton className="h-16 w-16 rounded-full" style={{ "--skeleton-delay": `${i * 80 + 80}ms` } as React.CSSProperties} />
                                <Skeleton className="h-8 w-20" style={{ "--skeleton-delay": `${i * 80 + 120}ms` } as React.CSSProperties} />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        )
    }

    // Empty state
    if (visibleCountries.length === 0) {
        return (
            <div className="px-4 lg:px-6">
                <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-14 text-center animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="relative">
                        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-border bg-[oklch(0.6716_0.1368_48.513/0.06)]">
                            <Globe className="h-9 w-9" style={{ color: "oklch(0.6716 0.1368 48.513)" }} />
                        </div>
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-border bg-card px-2.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                            MARKETS · OFFLINE
                        </div>
                    </div>
                    <div className="mt-1">
                        <h3 className="text-base font-semibold">No countries added yet</h3>
                        <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1.5">
                            Track your spending by country. Add a country and link your transactions to see where your money goes around the world.
                        </p>
                    </div>
                    {onAddCountry && (
                        <Button variant="outline" size="sm" onClick={onAddCountry}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add your first country
                        </Button>
                    )}
                </div>
            </div>
        )
    }

    return (
        <>
            <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @md/main:grid-cols-2 @3xl/main:grid-cols-3">
                {visibleCountries.map((country) => (
                    <CountryCard
                        key={`${country.instance_id}-${country.id}`}
                        instanceId={country.instance_id}
                        countryName={country.id}
                        label={country.label}
                        totalSpent={country.value}
                        onViewTransactions={() => setSelectedInstanceId(country.instance_id)}
                        onDeleteCountry={() => handleDeleteCountry(country.instance_id, country.id)}
                        onLabelUpdated={onCountryDeleted}
                    />
                ))}
            </div>

            {/* Transactions Dialog */}
            <CountryTransactionsDialog
                instanceId={selectedInstanceId}
                isMockData={isMockData}
                open={selectedInstanceId !== null}
                onOpenChange={(open) => {
                    if (!open) setSelectedInstanceId(null)
                }}
                onTransactionsLinked={onCountryDeleted}
            />
        </>
    )
})

CountryCardsGrid.displayName = "CountryCardsGrid"
