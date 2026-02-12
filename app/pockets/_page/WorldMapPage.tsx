"use client"

import type { ComponentType } from "react"
import { useMemo, useState, useCallback } from "react"
import { useAuth } from "@clerk/nextjs"
import useSWR from "swr"

import { MapPin, Car, Home, Package } from "lucide-react"

import { cn } from "@/lib/utils"
import type {
    PocketsBundleResponse,
    PocketItemWithTotals,
    VehicleMetadata,
    OwnedPropertyMetadata,
    RentedPropertyMetadata,
    VehicleData,
    UpdatePocketRequest,
} from "@/lib/types/pockets"

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
import {
    PropertyCardsGrid,
    type PropertyCardData,
    MOCK_PROPERTIES as INITIAL_PROPERTY_MOCKS,
} from "./components/PropertyCardsGrid"
import { OtherStatsCards } from "./components/OtherStatsCards"
import { AddOtherButton } from "./components/AddOtherButton"
import { OtherCardsGrid, type OtherCardData } from "./components/OtherCardsGrid"
import { AddPropertyDialog } from "./components/AddPropertyDialog"
import { AddOtherDialog } from "./components/AddOtherDialog"

// ─── Mock data (shown when no real data exists) ──────────────

const MOCK_COUNTRIES: CountryData[] = [
    { id: "Brazil", instance_id: 1, label: "Brazil", value: 2500 },
    { id: "China", instance_id: 2, label: "China", value: 4200 },
    { id: "Indonesia", instance_id: 3, label: "Indonesia", value: 8900 },
]

const fetcher = (url: string) => fetch(url).then(res => {
    if (!res.ok) throw new Error('Failed to fetch')
    return res.json()
})

const MOCK_VEHICLES: VehicleData[] = [
    {
        id: "mock-1",
        name: "topviewcar2",
        brand: "—",
        vehicleType: "Car",
        year: 2024,
        priceBought: 19800,
        licensePlate: "",
        svgPath: "/topView/topviewcar2.svg",
        fuel: { linkedTransactionIds: [] },
        maintenanceTransactionIds: [],
        insuranceTransactionIds: [],
        certificateTransactionIds: [],
        parkingTransactionIds: [],
    },
]

// ─── Adapters: PocketItemWithTotals → legacy UI types ────────

function pocketToVehicleData(pocket: PocketItemWithTotals): VehicleData {
    const meta = pocket.metadata as VehicleMetadata
    return {
        id: String(pocket.id),
        name: pocket.name,
        brand: meta.brand || "—",
        vehicleType: meta.vehicleType || "Car",
        year: meta.year || 0,
        priceBought: meta.priceBought || 0,
        licensePlate: meta.licensePlate || "",
        svgPath: pocket.svg_path || "/topView/topviewcar2.svg",
        fuel: {
            tankSizeL: meta.tankSizeL,
            fuelType: meta.fuelType,
            linkedTransactionIds: [],
        },
        maintenanceTransactionIds: [],
        insuranceTransactionIds: [],
        certificateTransactionIds: [],
        parkingTransactionIds: [],
        fuelTotal: pocket.totals.fuel ?? 0,
        maintenanceTotal: pocket.totals.maintenance ?? 0,
        insuranceTotal: pocket.totals.insurance ?? 0,
        certificateTotal: pocket.totals.certificate ?? 0,
        parkingTotal: pocket.totals.parking ?? 0,
        financing: meta.financing ? {
            upfrontPaid: meta.financing.upfrontPaid,
            annualInterestRate: meta.financing.annualInterestRate,
            loanRemaining: meta.financing.loanRemaining,
        } : undefined,
        nextMaintenanceDate: meta.nextMaintenanceDate,
        certificateEndDate: meta.certificateEndDate,
        insuranceRenewalDate: meta.insuranceRenewalDate,
    }
}

function pocketToPropertyData(pocket: PocketItemWithTotals): PropertyCardData {
    const meta = pocket.metadata as (OwnedPropertyMetadata | RentedPropertyMetadata)
    const isOwned = 'propertyType' in meta && meta.propertyType === 'owned'
    const ownedMeta = isOwned ? meta as OwnedPropertyMetadata : undefined

    return {
        id: String(pocket.id),
        label: pocket.name,
        value: ownedMeta?.estimatedValue ?? 0,
        svgPath: pocket.svg_path || "/property/houseplan1.svg",
        propertyType: isOwned ? "owned" : "rented",
        mortgageOriginalAmount: ownedMeta?.mortgage?.originalAmount,
        mortgageInterestRate: ownedMeta?.mortgage?.interestRate,
        mortgageLoanYears: ownedMeta?.mortgage?.loanYears,
        mortgageYearsPaid: ownedMeta?.mortgage?.yearsPaid,
        mortgageTotalPaid: pocket.totals.mortgage ?? 0,
    }
}

function pocketToOtherData(pocket: PocketItemWithTotals): OtherCardData {
    return {
        id: String(pocket.id),
        label: pocket.name,
        value: pocket.totalInvested,
    }
}

const MOCK_OTHER_ITEMS: OtherCardData[] = [
    { id: "mock-1", label: "Collectible A", value: 12500 },
    { id: "mock-2", label: "Electronics", value: 3200 },
    { id: "mock-3", label: "Artwork", value: 8500 },
]

// ─── Component ───────────────────────────────────────────────

export type PocketViewMode = "travel" | "garage" | "assets" | "other"

export default function WorldMapPage() {
    const { userId } = useAuth()
    const [pocketViewMode, setPocketViewMode] = useState<PocketViewMode>("travel")
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [isAddVehicleDialogOpen, setIsAddVehicleDialogOpen] = useState(false)
    const [isAddPropertyDialogOpen, setIsAddPropertyDialogOpen] = useState(false)
    const [isAddOtherDialogOpen, setIsAddOtherDialogOpen] = useState(false)
    const [propertyTypeToAdd, setPropertyTypeToAdd] = useState<"owned" | "rented">("owned")

    // Fetch all pockets data from bundle API
    const { data, isLoading, mutate } = useSWR<PocketsBundleResponse>(
        userId ? ['/api/charts/pockets-bundle', userId] : null,
        ([url]) => fetcher(url),
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 30000,
        }
    )

    // ─── Travel data ─────────────────────────────────────────
    const stats = useMemo(() => {
        const countries = data?.countries ?? []
        const useMock = countries.length === 0
        const activeCountries = useMock ? MOCK_COUNTRIES : countries

        const sortedByValue = [...activeCountries].sort((a, b) => b.value - a.value)
        const topCountry = sortedByValue[0]
        const domesticName = "USA"
        const domesticSpend = activeCountries.find(c => c.id === domesticName)?.value ?? 0
        const totalAbroad = activeCountries
            .filter(c => c.id !== domesticName)
            .reduce((sum, c) => sum + c.value, 0)

        return {
            countriesCount: useMock ? MOCK_COUNTRIES.length : (data?.stats?.travel?.totalCountries ?? 0),
            topCountrySpend: topCountry?.value ?? 0,
            topCountryName: topCountry?.id ?? "—",
            totalSpendAbroad: totalAbroad,
            domesticSpend,
        }
    }, [data])

    const { chartData, isMockData } = useMemo(() => {
        const realData = data?.countries ?? []
        const useMock = realData.length === 0
        return {
            chartData: useMock ? MOCK_COUNTRIES : realData,
            isMockData: useMock,
        }
    }, [data])

    // ─── Vehicle data (from bundle, with mock fallback) ──────
    const { vehicles, isVehicleMock } = useMemo(() => {
        const dbVehicles = data?.vehicles ?? []
        if (dbVehicles.length > 0) {
            return {
                vehicles: dbVehicles.map(pocketToVehicleData),
                isVehicleMock: false,
            }
        }
        return { vehicles: MOCK_VEHICLES, isVehicleMock: true }
    }, [data])

    const vehicleStats = useMemo(() => {
        const bundleStats = data?.stats?.garage
        if (bundleStats && bundleStats.totalVehicles > 0) {
            return {
                count: bundleStats.totalVehicles,
                topName: bundleStats.topVehicle?.name ?? "—",
                topValue: bundleStats.topVehicle?.value ?? 0,
                totalValue: bundleStats.totalInvested,
                monthlyCost: 0,
                totalFuel: 0,
                totalMaintenance: 0,
                totalInsurance: 0,
                totalLoanRemaining: 0,
            }
        }
        // Compute from current vehicles (mock or real)
        if (!vehicles.length) {
            return {
                count: 0, topName: "—", topValue: 0, totalValue: 0,
                monthlyCost: 0, totalFuel: 0, totalMaintenance: 0,
                totalInsurance: 0, totalLoanRemaining: 0,
            }
        }
        const sorted = [...vehicles].sort((a, b) => b.priceBought - a.priceBought)
        const top = sorted[0]
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
        const topName = top.brand && top.brand !== "—" ? `${top.brand} ${top.name}` : top.name
        return {
            count: vehicles.length,
            topName,
            topValue: top.priceBought,
            totalValue,
            monthlyCost: Math.round(monthlyCost),
            totalFuel: vehicles.reduce((sum, v) => sum + (v.fuelTotal ?? 0), 0),
            totalMaintenance: vehicles.reduce((sum, v) => sum + (v.maintenanceTotal ?? 0), 0),
            totalInsurance: vehicles.reduce((sum, v) => sum + (v.insuranceTotal ?? 0), 0),
            totalLoanRemaining: vehicles.reduce((sum, v) => sum + (v.financing?.loanRemaining ?? 0), 0),
        }
    }, [data, vehicles])

    // ─── Property data (from bundle, with mock fallback) ─────
    const { properties, isPropertyMock } = useMemo(() => {
        const dbProps = data?.properties ?? []
        if (dbProps.length > 0) {
            return {
                properties: dbProps.map(pocketToPropertyData),
                isPropertyMock: false,
            }
        }
        return { properties: INITIAL_PROPERTY_MOCKS, isPropertyMock: true }
    }, [data])

    const propertyStats = useMemo(() => {
        const bundleStats = data?.stats?.property
        if (bundleStats && bundleStats.totalProperties > 0) {
            return {
                count: bundleStats.totalProperties,
                topName: bundleStats.topProperty?.name ?? "—",
                topValue: bundleStats.topProperty?.value ?? 0,
                totalValue: bundleStats.totalValue,
                totalEquity: bundleStats.totalEquity,
            }
        }
        // Fallback from current properties
        const sorted = [...properties].sort((a, b) => b.value - a.value)
        return {
            count: properties.length,
            topName: sorted[0]?.label ?? "—",
            topValue: sorted[0]?.value ?? 0,
            totalValue: properties.reduce((sum, p) => sum + p.value, 0),
            totalEquity: Math.round(properties.reduce((sum, p) => sum + p.value, 0) * 0.6),
        }
    }, [data, properties])

    // ─── Other data (from bundle, with mock fallback) ────────
    const { otherItems, isOtherMock } = useMemo(() => {
        const dbOthers = data?.otherPockets ?? []
        if (dbOthers.length > 0) {
            return {
                otherItems: dbOthers.map(pocketToOtherData),
                isOtherMock: false,
            }
        }
        return { otherItems: MOCK_OTHER_ITEMS, isOtherMock: true }
    }, [data])

    // ─── Other stats ──────────────────────────────────────────
    const otherStats = useMemo(() => {
        const bundleStats = data?.stats?.other
        if (bundleStats && bundleStats.totalItems > 0) {
            return {
                count: bundleStats.totalItems,
                topName: bundleStats.topItem?.name ?? "—",
                topValue: bundleStats.topItem?.value ?? 0,
                totalValue: bundleStats.totalSpent,
                avgValue: bundleStats.totalItems > 0
                    ? Math.round(bundleStats.totalSpent / bundleStats.totalItems)
                    : 0,
            }
        }
        return {
            count: 3,
            topName: "Collectible A",
            topValue: 12500,
            totalValue: 24200,
            avgValue: 8067,
        }
    }, [data])

    // ─── Handlers ────────────────────────────────────────────
    const existingCountries: string[] = []

    const handleAddSuccess = useCallback(() => { mutate() }, [mutate])
    const handleCountryDeleted = useCallback(() => { mutate() }, [mutate])

    // Generic pocket remove via API (works for vehicle, property, other)
    const handlePocketRemove = useCallback(async (id: string) => {
        await fetch(`/api/pockets/items?id=${id}`, { method: 'DELETE' })
        mutate()
    }, [mutate])

    // Generic pocket rename via API
    const handlePocketRename = useCallback(async (id: string, newName: string) => {
        const body: UpdatePocketRequest = { name: newName }
        await fetch(`/api/pockets/items?id=${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })
        mutate()
    }, [mutate])

    // Vehicle update: name goes to top-level, other fields map to metadata
    const handleVehicleUpdate = useCallback(async (id: string, updates: Partial<VehicleData>) => {
        const body: UpdatePocketRequest = {}
        if (updates.name !== undefined) body.name = updates.name
        if (Object.keys(body).length > 0) {
            await fetch(`/api/pockets/items?id=${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
            mutate()
        }
    }, [mutate])

    // Property update: label→name, mortgage fields→metadata
    const handlePropertyUpdate = useCallback(async (id: string, updates: Partial<PropertyCardData>) => {
        const body: UpdatePocketRequest = {}
        if (updates.label !== undefined) body.name = updates.label
        // Map mortgage fields to OwnedPropertyMetadata.mortgage
        const hasMortgageFields =
            updates.mortgageOriginalAmount !== undefined ||
            updates.mortgageInterestRate !== undefined ||
            updates.mortgageLoanYears !== undefined ||
            updates.mortgageYearsPaid !== undefined
        if (hasMortgageFields) {
            body.metadata = {
                mortgage: {
                    ...(updates.mortgageOriginalAmount !== undefined && { originalAmount: updates.mortgageOriginalAmount }),
                    ...(updates.mortgageInterestRate !== undefined && { interestRate: updates.mortgageInterestRate }),
                    ...(updates.mortgageLoanYears !== undefined && { loanYears: updates.mortgageLoanYears }),
                    ...(updates.mortgageYearsPaid !== undefined && { yearsPaid: updates.mortgageYearsPaid }),
                },
            } as OwnedPropertyMetadata
        }
        if (body.name || body.metadata) {
            await fetch(`/api/pockets/items?id=${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
            mutate()
        }
    }, [mutate])

    // Property label update (shorthand for handlePropertyUpdate)
    const handlePropertyLabelUpdated = useCallback(async (id: string, newLabel: string) => {
        await handlePocketRename(id, newLabel)
    }, [handlePocketRename])

    const pocketTopCards: { mode: PocketViewMode; title: string; description: string; icon: ComponentType<{ className?: string }> }[] = [
        { mode: "travel", title: "Travel", description: "Countries and spend abroad. Add countries and track travel-related transactions.", icon: MapPin },
        { mode: "garage", title: "Garage", description: "Vehicles, fuel, maintenance, and financing. Manage your fleet in one place.", icon: Car },
        { mode: "assets", title: "Property", description: "Property and real estate. Track equity and property-linked transactions.", icon: Home },
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
                                Property
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
                            propertiesCount={propertyStats.count}
                            topPropertyName={propertyStats.topName}
                            topPropertyValue={propertyStats.topValue}
                            totalValue={propertyStats.totalValue}
                            totalEquity={propertyStats.totalEquity}
                        />
                    )}
                    {pocketViewMode === "other" && (
                        <OtherStatsCards
                            itemsCount={otherStats.count}
                            topItemName={otherStats.topName}
                            topItemValue={otherStats.topValue}
                            totalValue={otherStats.totalValue}
                            avgValue={otherStats.avgValue}
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
                                    disabled={isLoading}
                                />
                            </div>
                            <VehicleCardsGrid
                                vehicles={vehicles}
                                onRemove={handlePocketRemove}
                                onUpdate={handleVehicleUpdate}
                                onOpenAddVehicle={() => setIsAddVehicleDialogOpen(true)}
                            />
                        </>
                    )}
                    {pocketViewMode === "assets" && (
                        <>
                            <div className="px-4 lg:px-6">
                                <AddPropertyButton
                                    onAddOwned={() => {
                                        setPropertyTypeToAdd("owned")
                                        setIsAddPropertyDialogOpen(true)
                                    }}
                                    onAddRented={() => {
                                        setPropertyTypeToAdd("rented")
                                        setIsAddPropertyDialogOpen(true)
                                    }}
                                    disabled={isLoading}
                                />
                            </div>
                            <PropertyCardsGrid
                                properties={properties}
                                onRemove={handlePocketRemove}
                                onUpdate={handlePropertyUpdate}
                                onLabelUpdated={handlePropertyLabelUpdated}
                                onOpenAddProperty={() => {
                                    setPropertyTypeToAdd("owned")
                                    setIsAddPropertyDialogOpen(true)
                                }}
                            />
                        </>
                    )}
                    {pocketViewMode === "other" && (
                        <>
                            <div className="px-4 lg:px-6">
                                <AddOtherButton onClick={() => setIsAddOtherDialogOpen(true)} disabled={isLoading} />
                            </div>
                            <OtherCardsGrid
                                items={otherItems}
                                onRemove={handlePocketRemove}
                                onLabelUpdated={handlePocketRename}
                                onOpenAdd={() => setIsAddOtherDialogOpen(true)}
                            />
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

            {/* Add Vehicle Dialog — now calls API */}
            <AddVehicleDialog
                open={isAddVehicleDialogOpen}
                onOpenChange={setIsAddVehicleDialogOpen}
                onSuccess={() => mutate()}
            />

            {/* Add Property Dialog — now calls API */}
            <AddPropertyDialog
                open={isAddPropertyDialogOpen}
                onOpenChange={setIsAddPropertyDialogOpen}
                defaultPropertyType={propertyTypeToAdd}
                onAddProperty={() => mutate()}
            />

            {/* Add Other Dialog — now calls API */}
            <AddOtherDialog
                open={isAddOtherDialogOpen}
                onOpenChange={setIsAddOtherDialogOpen}
                onSuccess={() => mutate()}
            />
        </WorldMapLayout>
    )
}
