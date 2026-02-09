"use client"

import type { ComponentType } from "react"
import { useMemo, useState, useCallback } from "react"
import { useAuth } from "@clerk/nextjs"
import useSWR from "swr"

import { MapPin, Car, Home, Package } from "lucide-react"

import { cn } from "@/lib/utils"
import type { PocketsBundleResponse, VehicleData } from "@/lib/types/pockets"

import { Badge } from "@/components/ui/badge"

import { WorldMapLayout } from "./components/WorldMapLayout"
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

// Mock countries for testing — Travel: Brazil, China, Indonesia only (GeoJSON countries)
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

export type PocketViewMode = "travel" | "garage" | "assets" | "other"

export default function WorldMapPage() {
    const { userId } = useAuth()
    const [pocketViewMode, setPocketViewMode] = useState<PocketViewMode>("travel")
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
    const { data, isLoading, error, mutate } = useSWR<PocketsBundleResponse>(
        userId ? ['/api/charts/pockets-bundle', userId] : null,
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

    const pocketTopCards: { mode: PocketViewMode; title: string; description: string; icon: ComponentType<{ className?: string }> }[] = [
        { mode: "travel", title: "Travel", description: "Countries and spend abroad. Add countries and track travel-related transactions.", icon: MapPin },
        { mode: "garage", title: "Garage", description: "Vehicles, fuel, maintenance, and financing. Manage your fleet in one place.", icon: Car },
        { mode: "assets", title: "Assets", description: "Property and real estate. Track equity and property-linked transactions.", icon: Home },
        { mode: "other", title: "Other", description: "Collectibles and other assets. Custom pockets beyond travel, garage, and property.", icon: Package },
    ]

    return (
        <WorldMapLayout>
            <div className="@container/main flex flex-1 flex-col gap-2 font-mono font-medium">
                {/* Top card – one visible per option (data-library style) */}
                <section className="px-4 lg:px-6">
                    <div className="flex flex-col justify-between gap-4 rounded-3xl border bg-muted/30 px-6 py-6 lg:flex-row lg:items-center">
                        {pocketTopCards
                            .filter(({ mode }) => mode === pocketViewMode)
                            .map(({ mode, title, description, icon: Icon }) => (
                                <div key={mode} className="space-y-2">
                                    <Badge variant="outline" className="gap-1 px-3 py-1 text-sm">
                                        <Icon className="size-4" />
                                        {title}
                                    </Badge>
                                    <h1 className="text-3xl font-semibold tracking-tight">
                                        {title}
                                    </h1>
                                    <p className="text-muted-foreground max-w-2xl">
                                        {description}
                                    </p>
                                </div>
                            ))}
                    </div>
                </section>

                {/* Switch: under top cards, over stats cards */}
                <section className="px-4 lg:px-6">
                    <div className="relative flex items-center justify-center py-2">
                        <div className="inline-flex items-center gap-1 p-1 rounded-full bg-muted/50 border">
                            <button
                                type="button"
                                onClick={() => setPocketViewMode("travel")}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                                    pocketViewMode === "travel"
                                        ? "bg-background text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground",
                                )}
                            >
                                Travel
                            </button>
                            <button
                                type="button"
                                onClick={() => setPocketViewMode("garage")}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                                    pocketViewMode === "garage"
                                        ? "bg-background text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground",
                                )}
                            >
                                Garage
                            </button>
                            <button
                                type="button"
                                onClick={() => setPocketViewMode("assets")}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                                    pocketViewMode === "assets"
                                        ? "bg-background text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground",
                                )}
                            >
                                Assets
                            </button>
                            <button
                                type="button"
                                onClick={() => setPocketViewMode("other")}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                                    pocketViewMode === "other"
                                        ? "bg-background text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground",
                                )}
                            >
                                Other
                            </button>
                        </div>
                    </div>
                </section>

                <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                    {/* Stats cards – contextual per pocket type */}
                    {pocketViewMode === "travel" && (
                        <WorldMapStatsCards
                            countriesCount={stats.countriesCount}
                            topCountrySpend={stats.topCountrySpend}
                            topCountryName={stats.topCountryName}
                            totalSpendAbroad={stats.totalSpendAbroad}
                            domesticSpend={stats.domesticSpend}
                            isLoading={isLoading}
                        />
                    )}
                    {pocketViewMode === "garage" && (
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
                    )}
                    {pocketViewMode === "assets" && (
                        <PropertyStatsCards
                            propertiesCount={PROPERTY_STATS.count}
                            topPropertyName={PROPERTY_STATS.topName}
                            topPropertyValue={PROPERTY_STATS.topValue}
                            totalValue={PROPERTY_STATS.totalValue}
                            totalEquity={PROPERTY_STATS.totalEquity}
                        />
                    )}
                    {pocketViewMode === "other" && (
                        <OtherStatsCards
                            itemsCount={OTHER_STATS.count}
                            topItemName={OTHER_STATS.topName}
                            topItemValue={OTHER_STATS.topValue}
                            totalValue={OTHER_STATS.totalValue}
                            avgValue={OTHER_STATS.avgValue}
                        />
                    )}

                    {/* Content per pocket type */}
                    {pocketViewMode === "travel" && (
                        <>
                            <div className="px-4 lg:px-6 min-h-[500px]">
                                <WorldMapChart
                                    data={chartData}
                                    isLoading={isLoading}
                                />
                            </div>
                            <div className="px-4 lg:px-6">
                                <AddCountryButton
                                    onClick={() => setIsAddDialogOpen(true)}
                                    disabled={isLoading}
                                />
                            </div>
                            <CountryCardsGrid
                                countries={chartData}
                                isLoading={isLoading}
                                onAddCountry={() => setIsAddDialogOpen(true)}
                                onCountryDeleted={handleCountryDeleted}
                                isMockData={isMockData}
                            />
                        </>
                    )}
                    {pocketViewMode === "garage" && (
                        <>
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
                        </>
                    )}
                    {pocketViewMode === "assets" && (
                        <>
                            <div className="px-4 lg:px-6">
                                <AddPropertyButton onClick={() => {}} disabled={false} />
                            </div>
                            <PropertyCardsGrid />
                        </>
                    )}
                    {pocketViewMode === "other" && (
                        <>
                            <div className="px-4 lg:px-6">
                                <AddOtherButton onClick={() => {}} disabled={false} />
                            </div>
                            <OtherCardsGrid />
                        </>
                    )}
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
