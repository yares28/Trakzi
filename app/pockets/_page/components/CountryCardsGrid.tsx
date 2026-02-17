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
    const [deletedMockCountries, setDeletedMockCountries] = useState<Set<string>>(new Set())

    // Filter out deleted mock countries
    const visibleCountries = isMockData
        ? countries.filter(c => !deletedMockCountries.has(c.id))
        : countries

    const handleDeleteCountry = useCallback(async (instanceId: number, countryName: string) => {
        // For mock data, just hide the card locally
        if (isMockData) {
            setDeletedMockCountries(prev => new Set([...prev, countryName]))
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
                {[1, 2, 3].map((i) => (
                    <Card key={i} className="overflow-hidden">
                        <CardContent className="p-6">
                            <div className="flex flex-col items-center gap-4">
                                <Skeleton className="h-8 w-12 rounded" />
                                <Skeleton className="h-5 w-24" />
                                <Skeleton className="h-16 w-16 rounded-full" />
                                <Skeleton className="h-8 w-20" />
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
                <Card className="flex flex-col items-center justify-center py-12">
                    <Globe className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground text-center mb-4">
                        No countries added yet
                    </p>
                    <p className="text-sm text-muted-foreground text-center mb-6 max-w-md">
                        Track your spending by country. Add a country and link your transactions to see where your money goes around the world.
                    </p>
                    {onAddCountry && (
                        <Button variant="outline" onClick={onAddCountry}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add your first country
                        </Button>
                    )}
                </Card>
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
