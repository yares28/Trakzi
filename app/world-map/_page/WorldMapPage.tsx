"use client"

import { useMemo, useState, useCallback } from "react"
import useSWR from "swr"

import type { WorldMapBundleResponse } from "@/lib/types/world-map"

import { WorldMapLayout } from "./components/WorldMapLayout"
import { WorldMapStatsCards } from "./components/StatsCards"
import { WorldMapChart, type CountryData } from "./components/WorldMapChart"
import { CountryCardsGrid } from "./components/CountryCardsGrid"
import { AddCountryButton } from "./components/AddCountryButton"
import { AddCountryDialog } from "./components/AddCountryDialog"

// Mock countries for testing (3 cards)
const MOCK_COUNTRIES: CountryData[] = [
    { id: "Brazil", instance_id: 1, label: "Brazil", value: 2500 },
    { id: "China", instance_id: 2, label: "China", value: 4200 },
    { id: "Indonesia", instance_id: 3, label: "Indonesia", value: 8900 },
]

const fetcher = (url: string) => fetch(url).then(res => {
    if (!res.ok) throw new Error('Failed to fetch')
    return res.json()
})

export default function WorldMapPage() {
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

    // Fetch world map data from bundle API
    const { data, isLoading, error, mutate } = useSWR<WorldMapBundleResponse>(
        '/api/charts/world-map-bundle',
        fetcher,
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000, // 30 seconds
        }
    )

    // Calculate stats from the bundle data (or mock data)
    const stats = useMemo(() => {
        const countries = data?.countries ?? []
        const useMock = countries.length === 0
        const activeCountries = useMock ? MOCK_COUNTRIES : countries

        // Find top country from active data
        const sortedByValue = [...activeCountries].sort((a, b) => b.value - a.value)
        const topCountry = sortedByValue[0]

        // For domestic spend, we could use a configured "home" country
        const domesticName = "USA" // TODO: Make configurable per user
        const domesticSpend = activeCountries.find(c => c.id === domesticName)?.value ?? 0

        // Total abroad = everything except domestic
        const totalAbroad = activeCountries
            .filter(c => c.id !== domesticName)
            .reduce((sum, c) => sum + c.value, 0)

        return {
            countriesCount: useMock ? MOCK_COUNTRIES.length : (data?.stats.totalCountries ?? 0),
            topCountrySpend: topCountry?.value ?? 0,
            topCountryName: topCountry?.id ?? "—",
            totalSpendAbroad: totalAbroad,
            domesticSpend: domesticSpend,
        }
    }, [data])

    // No longer need to exclude countries - users can add same country multiple times
    const existingCountries: string[] = []

    // Handle successful country addition
    const handleAddSuccess = useCallback(() => {
        // Revalidate the data
        mutate()
    }, [mutate])

    // Map data for the chart - use mock data if no real data exists
    const { chartData, isMockData } = useMemo(() => {
        const realData = data?.countries ?? []
        const useMock = realData.length === 0
        return {
            chartData: useMock ? MOCK_COUNTRIES : realData,
            isMockData: useMock,
        }
    }, [data])

    // Handle country deletion - refresh data
    const handleCountryDeleted = useCallback(() => {
        mutate()
    }, [mutate])

    return (
        <WorldMapLayout>
            <div className="@container/main flex flex-1 flex-col gap-2">
                <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                    {/* Stats Cards - 4 top bars like analytics */}
                    <WorldMapStatsCards
                        countriesCount={stats.countriesCount}
                        topCountrySpend={stats.topCountrySpend}
                        topCountryName={stats.topCountryName}
                        totalSpendAbroad={stats.totalSpendAbroad}
                        domesticSpend={stats.domesticSpend}
                        isLoading={isLoading}
                    />

                    {/* World Map Chart - big card */}
                    <div className="px-4 lg:px-6">
                        <WorldMapChart
                            data={chartData}
                            isLoading={isLoading}
                        />
                    </div>

                    {/* Add Country Button */}
                    <div className="px-4 lg:px-6">
                        <AddCountryButton
                            onClick={() => setIsAddDialogOpen(true)}
                            disabled={isLoading}
                        />
                    </div>

                    {/* Country Cards Grid */}
                    <CountryCardsGrid
                        countries={chartData}
                        isLoading={isLoading}
                        onAddCountry={() => setIsAddDialogOpen(true)}
                        onCountryDeleted={handleCountryDeleted}
                        isMockData={isMockData}
                    />
                </div>
            </div>

            {/* Add Country Dialog */}
            <AddCountryDialog
                open={isAddDialogOpen}
                onOpenChange={setIsAddDialogOpen}
                existingCountries={existingCountries}
                onSuccess={handleAddSuccess}
            />
        </WorldMapLayout>
    )
}
