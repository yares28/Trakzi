"use client"

import { memo } from "react"
import { Car } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

import { VehicleCard } from "./VehicleCard"
import { VehicleCardBoxed } from "./VehicleCardBoxed"

export type VehicleCardVariant = "svg" | "boxed"

export interface VehicleData {
    id: string
    label: string
    totalSpent: number
    variant?: VehicleCardVariant
}

export interface VehicleCardsGridProps {
    vehicles: VehicleData[]
    isLoading?: boolean
}

export const VehicleCardsGrid = memo(function VehicleCardsGrid({
    vehicles,
    isLoading = false,
}: VehicleCardsGridProps) {
    // Loading state
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @md/main:grid-cols-2">
                {[1, 2].map((i) => (
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
    if (vehicles.length === 0) {
        return (
            <div className="px-4 lg:px-6">
                <Card className="flex flex-col items-center justify-center py-12">
                    <Car className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground text-center mb-4">
                        No vehicles added yet
                    </p>
                    <p className="text-sm text-muted-foreground text-center mb-6 max-w-md">
                        Track your vehicle spending. Add a vehicle to see how much you spend on each one.
                    </p>
                </Card>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @md/main:grid-cols-2">
            {vehicles.map((vehicle) =>
                vehicle.variant === "boxed" ? (
                    <VehicleCardBoxed
                        key={vehicle.id}
                        label={vehicle.label}
                        totalSpent={vehicle.totalSpent}
                    />
                ) : (
                    <VehicleCard
                        key={vehicle.id}
                        label={vehicle.label}
                        totalSpent={vehicle.totalSpent}
                    />
                )
            )}
        </div>
    )
})

VehicleCardsGrid.displayName = "VehicleCardsGrid"
