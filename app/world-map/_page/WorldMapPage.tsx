"use client"

import { useMemo, useState, useCallback } from "react"
import { useAuth } from "@clerk/nextjs"
import useSWR from "swr"

import type { WorldMapBundleResponse, VehicleData } from "@/lib/types/world-map"

import { WorldMapLayout } from "./components/WorldMapLayout"
import { SectionTitle } from "./components/SectionTitle"
import { WorldMapStatsCards } from "./components/StatsCards"
import { WorldMapChart, type CountryData } from "./components/WorldMapChart"
import { CountryCardsGrid } from "./components/CountryCardsGrid"
import { AddCountryButton } from "./components/AddCountryButton"
import { AddCountryDialog } from "./components/AddCountryDialog"
import { VehiclesStatsCards } from "./components/VehiclesStatsCards"
import { AddVehicleButton } from "./components/AddVehicleButton"
import { AddVehicleDialog } from "./components/AddVehicleDialog"
import { VehicleCardsGrid } from "./components/VehicleCardsGrid"
import { PropertyStatsCards } from "./components/PropertyStatsCards"
import { AddPropertyButton } from "./components/AddPropertyButton"
import { PropertyCardsGrid } from "./components/PropertyCardsGrid"
import { OtherStatsCards } from "./components/OtherStatsCards"
import { AddOtherButton } from "./components/AddOtherButton"
import { OtherCardsGrid } from "./components/OtherCardsGrid"

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


// Mock property stats (for Property section)
const PROPERTY_STATS = {
    count: 3,
    topName: "Main Home",
    topValue: 420000,
    totalValue: 830000,
    totalEquity: 520000,
}

// Mock other stats (for Other section)
const OTHER_STATS = {
    count: 3,
    topName: "Collectible A",
    topValue: 12500,
    totalValue: 24200,
    avgValue: 8067,
}

const INITIAL_VEHICLES: VehicleData[] = [
    { id: "1", name: "topviewcar2", brand: "—", vehicleType: "Car", year: 2024, priceBought: 19800, licensePlate: "", svgPath: "/topView/topviewcar2.svg", fuel: { linkedTransactionIds: [] }, maintenanceTransactionIds: [], insuranceTransactionIds: [], certificateTransactionIds: [] },
    { id: "2", name: "topviewcar6", brand: "—", vehicleType: "Car", year: 2024, priceBought: 19800, licensePlate: "", svgPath: "/topView/topviewcar6.svg", fuel: { linkedTransactionIds: [] }, maintenanceTransactionIds: [], insuranceTransactionIds: [], certificateTransactionIds: [] },
    { id: "3", name: "topviewcar7", brand: "—", vehicleType: "Car", year: 2024, priceBought: 19800, licensePlate: "", svgPath: "/topView/topviewcar7.svg", fuel: { linkedTransactionIds: [] }, maintenanceTransactionIds: [], insuranceTransactionIds: [], certificateTransactionIds: [] },
    { id: "4", name: "1bvYk01", brand: "—", vehicleType: "Car", year: 2024, priceBought: 19800, licensePlate: "", svgPath: "/topViewInterim/1bvYk01.svg", fuel: { linkedTransactionIds: [] }, maintenanceTransactionIds: [], insuranceTransactionIds: [], certificateTransactionIds: [] },
    { id: "5", name: "hgNqW01", brand: "—", vehicleType: "Car", year: 2024, priceBought: 19800, licensePlate: "", svgPath: "/topViewInterim/hgNqW01.svg", fuel: { linkedTransactionIds: [] }, maintenanceTransactionIds: [], insuranceTransactionIds: [], certificateTransactionIds: [] },
    { id: "6", name: "MEqPS01", brand: "—", vehicleType: "Car", year: 2024, priceBought: 19800, licensePlate: "", svgPath: "/topViewInterim/MEqPS01.svg", fuel: { linkedTransactionIds: [] }, maintenanceTransactionIds: [], insuranceTransactionIds: [], certificateTransactionIds: [] },
    { id: "7", name: "tGWsP01", brand: "—", vehicleType: "Car", year: 2024, priceBought: 19800, licensePlate: "", svgPath: "/topViewInterim/tGWsP01.svg", fuel: { linkedTransactionIds: [] }, maintenanceTransactionIds: [], insuranceTransactionIds: [], certificateTransactionIds: [] },
]

export default function WorldMapPage() {
    const { userId } = useAuth()
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [isAddVehicleDialogOpen, setIsAddVehicleDialogOpen] = useState(false)
    const [vehicles, setVehicles] = useState<VehicleData[]>(INITIAL_VEHICLES)

    // Vehicle stats derived from current vehicles list
    const vehicleStats = useMemo(() => {
        if (!vehicles.length) {
            return {
                count: 0,
                topName: "—",
                topValue: 0,
                totalValue: 0,
                monthlyCost: 0,
                totalFuel: 0,
                totalMaintenance: 0,
                totalInsurance: 0,
                totalLoanRemaining: 0,
            }
        }
        const sortedByValue = [...vehicles].sort((a, b) => b.priceBought - a.priceBought)
        const top = sortedByValue[0]
        const totalValue = vehicles.reduce((sum, v) => sum + v.priceBought, 0)
        const monthlyCost = vehicles.reduce((sum, v) => {
            if (!v.financing?.loanRemaining || v.financing.loanRemaining <= 0) return sum
            const rate = (v.financing.annualInterestRate ?? 0) / 100 / 12
            const principal = v.financing.loanRemaining
            const months = 36
            const monthly = rate > 0
                ? (principal * rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1)
                : principal / months
            return sum + monthly
        }, 0)
        const totalFuel = vehicles.reduce((sum, v) => sum + (v.fuelTotal ?? 0), 0)
        const totalMaintenance = vehicles.reduce((sum, v) => sum + (v.maintenanceTotal ?? 0), 0)
        const totalInsurance = vehicles.reduce((sum, v) => sum + (v.insuranceTotal ?? 0), 0)
        const totalLoanRemaining = vehicles.reduce(
            (sum, v) => sum + (v.financing?.loanRemaining ?? 0),
            0
        )
        const topName = top.brand && top.brand !== "—" ? `${top.brand} ${top.name}` : top.name
        return {
            count: vehicles.length,
            topName,
            topValue: top.priceBought,
            totalValue,
            monthlyCost: Math.round(monthlyCost),
            totalFuel,
            totalMaintenance,
            totalInsurance,
            totalLoanRemaining,
        }
    }, [vehicles])

    // Fetch world map data from bundle API (key includes userId so cache is per-user)
    const { data, isLoading, error, mutate } = useSWR<WorldMapBundleResponse>(
        userId ? ['/api/charts/world-map-bundle', userId] : null,
        ([url]) => fetcher(url),
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
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
            <div className="@container/main flex flex-1 flex-col gap-2 font-mono font-medium">
                <SectionTitle>Pokets</SectionTitle>
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

                    {/* Pokets Map Chart - big card */}
                    <div className="px-4 lg:px-6 min-h-[500px]">
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

                {/* Vehicles section */}
                <SectionTitle>Vehicles</SectionTitle>
                <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                    <VehiclesStatsCards
                        vehiclesCount={vehicleStats.count}
                        topVehicleName={vehicleStats.topName}
                        topVehicleValue={vehicleStats.topValue}
                        totalValue={vehicleStats.totalValue}
                        monthlyCost={vehicleStats.monthlyCost}
                        totalFuel={vehicleStats.totalFuel}
                        totalMaintenance={vehicleStats.totalMaintenance}
                        totalInsurance={vehicleStats.totalInsurance}
                        totalLoanRemaining={vehicleStats.totalLoanRemaining}
                    />
                    <div className="px-4 lg:px-6">
                        <AddVehicleButton
                            onClick={() => setIsAddVehicleDialogOpen(true)}
                            disabled={false}
                        />
                    </div>
                    <VehicleCardsGrid
                        vehicles={vehicles}
                        onVehiclesChange={setVehicles}
                        onOpenAddVehicle={() => setIsAddVehicleDialogOpen(true)}
                    />
                </div>

                {/* Property section */}
                <SectionTitle>Property</SectionTitle>
                <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                    <PropertyStatsCards
                        propertiesCount={PROPERTY_STATS.count}
                        topPropertyName={PROPERTY_STATS.topName}
                        topPropertyValue={PROPERTY_STATS.topValue}
                        totalValue={PROPERTY_STATS.totalValue}
                        totalEquity={PROPERTY_STATS.totalEquity}
                    />
                    <div className="px-4 lg:px-6">
                        <AddPropertyButton onClick={() => {}} disabled={false} />
                    </div>
                    <PropertyCardsGrid />
                </div>

                {/* Other section */}
                <SectionTitle>Other</SectionTitle>
                <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                    <OtherStatsCards
                        itemsCount={OTHER_STATS.count}
                        topItemName={OTHER_STATS.topName}
                        topItemValue={OTHER_STATS.topValue}
                        totalValue={OTHER_STATS.totalValue}
                        avgValue={OTHER_STATS.avgValue}
                    />
                    <div className="px-4 lg:px-6">
                        <AddOtherButton onClick={() => {}} disabled={false} />
                    </div>
                    <OtherCardsGrid />
                </div>
            </div>

            {/* Add Country Dialog */}
            <AddCountryDialog
                open={isAddDialogOpen}
                onOpenChange={setIsAddDialogOpen}
                existingCountries={existingCountries}
                onSuccess={handleAddSuccess}
            />

            {/* Add Vehicle Dialog */}
            <AddVehicleDialog
                open={isAddVehicleDialogOpen}
                onOpenChange={setIsAddVehicleDialogOpen}
                onSuccess={(vehicle) => {
                    setVehicles((prev) => [...prev, vehicle])
                }}
            />
        </WorldMapLayout>
    )
}
