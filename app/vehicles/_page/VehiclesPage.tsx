"use client"

import { useMemo } from "react"

import { Card } from "@/components/ui/card"

import { VehiclesLayout } from "./components/VehiclesLayout"
import { VehicleCardsGrid, type VehicleData } from "./components/VehicleCardsGrid"

// Mock vehicles for initial display
const MOCK_VEHICLES: VehicleData[] = [
    { id: "car-1", label: "Toyota Camry", totalSpent: 3200, variant: "svg" },
]

export default function VehiclesPage() {
    // Use mock data for now - can be replaced with SWR fetch later
    const vehicles = useMemo(() => MOCK_VEHICLES, [])

    return (
        <VehiclesLayout>
            <div className="@container/main flex flex-1 flex-col gap-2">
                <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                    {/* Big Top Card — placeholder for main vehicle content */}
                    <div className="px-4 lg:px-6 min-h-[500px]">
                        <Card className="relative bg-card text-card-foreground rounded-xl border shadow-sm min-w-0 h-full min-h-[500px] flex flex-col p-0 overflow-hidden">
                            <div className="flex-1 flex items-center justify-center text-muted-foreground">
                                <div className="flex flex-col items-center gap-4">
                                    <svg
                                        viewBox="0 0 256 256"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="currentColor"
                                        className="w-32 h-32 opacity-20"
                                    >
                                        <path d="M245,84c-1-2.3-3.5-3.6-6.9-3.6c-1,0-1.8,0.1-2,0.1c-0.7,0.1-9.5,1-14.4,1c-1.6,0-2.9,0.5-3.8,1.4c-1.8,1.9-1.6,5.2-1.4,8.3c0,0.9,0.1,1.8,0.1,2.6c0,2.1-1.1,3.2-2,3.8c-2.6-5.1-12.1-23.8-16.6-31.4c-4.8-8.1-49.2-9-68.1-9c-1.3,0-2,0-2,0c0,0-0.7,0-2,0c-5.9,0-21.1,0.1-35.8,1.2c-25.9,1.9-30.9,5.4-32.3,7.9c-4.5,7.6-14,26.3-16.6,31.4c-0.9-0.6-2-1.7-2-3.7c0-0.8,0-1.7,0.1-2.6c0.2-3.1,0.4-6.4-1.4-8.3c-0.9-1-2.2-1.4-3.8-1.4c-4.9,0-13.7-0.9-14.4-1c-0.2,0-1-0.1-2-0.1c-3.4,0-5.9,1.3-6.9,3.6c-1.2,2.8-1.3,5.4-0.1,7.7c1.5,2.9,5.1,5.1,10.6,6.3l2.8,0.6c8.1,1.8,10.6,2.5,11.1,4c-3.5,1.2-13.8,5.6-16.1,16.5c-2.6,12.2-2.6,53.7-2.6,55.4c0,0.3,0.1,6.8,4.2,9c0,0.1,0,0.2,0,0.3v7.8c0,3.9,3.3,7.2,7.2,7.2h36c4,0,7.2-3.2,7.2-7.2v-7.8c0-0.6-0.1-1.1-0.2-1.7c9.6,0.8,31.2,2.4,53.1,2.4c1.3,0,2.7,0,4,0c1.3,0,2.7,0,4,0c23.2,0,46.1-1.8,54.7-2.6c-0.1,0.6-0.3,1.2-0.3,1.8v7.8c0,3.9,3.3,7.2,7.2,7.2h36c4,0,7.2-3.2,7.2-7.2v-7.8c0-0.5,0-0.9-0.1-1.3c2.7-2.8,2.7-7.7,2.7-8c0-1.8,0-43.2-2.6-55.4c-2.3-10.9-12.6-15.3-16.1-16.5c0.4-1.5,3-2.2,11.1-4l2.8-0.6c5.5-1.3,9.1-3.4,10.6-6.3C246.3,89.4,246.3,86.8,245,84z" />
                                    </svg>
                                    <p className="text-lg font-medium">Vehicles Overview</p>
                                    <p className="text-sm text-muted-foreground/70">
                                        Your vehicle tracking dashboard will appear here
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Vehicle Cards Grid — 2 per row */}
                    <VehicleCardsGrid
                        vehicles={vehicles}
                        isLoading={false}
                    />
                </div>
            </div>
        </VehiclesLayout>
    )
}
