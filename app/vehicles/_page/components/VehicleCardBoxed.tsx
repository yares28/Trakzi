"use client"

import { memo } from "react"
import { Card } from "@/components/ui/card"
import { CarFrontSvg } from "./CarFrontSvg"
import { LicensePlate } from "./LicensePlate"

export interface VehicleCardBoxedProps {
    label: string
    totalSpent: number
}

export const VehicleCardBoxed = memo(function VehicleCardBoxed({
    label,
    totalSpent,
}: VehicleCardBoxedProps) {
    return (
        <Card className="@container/card relative overflow-hidden border bg-card/50 backdrop-blur-sm shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-1 hover:scale-[1.01] group h-full flex flex-col">
            {/* Background gradient/glow effect */}
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

            <div className="flex flex-col h-full p-5 gap-4">
                {/* Header: Label & Icon */}
                <div className="flex items-center justify-between z-10">
                    <div className="flex items-center gap-2">
                        <span className="text-xl p-2 bg-background rounded-full shadow-sm border">🚙</span>
                        <div className="flex flex-col">
                            <span className="font-bold text-lg leading-none tracking-tight">{label}</span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mt-1">Sedan</span>
                        </div>
                    </div>
                    {/* License Plate - Top Right for Honda Card */}
                    <LicensePlate initialValue="HND-420" className="scale-90 origin-right" />
                </div>

                {/* Car Visualization - BIGGER as requested */}
                <div className="flex-1 flex items-center justify-center py-2 min-h-[180px] relative">
                    {/* Background blob behind car */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-[280px] max-h-[280px] bg-gradient-to-tr from-muted/20 to-primary/5 rounded-full blur-xl -z-10" />

                    <CarFrontSvg className="w-full h-full max-w-[320px] max-h-[320px] drop-shadow-2xl transition-all duration-500 group-hover:scale-110 group-hover:drop-shadow-3xl" />
                </div>

                {/* Footer: Amount */}
                <div className="mt-auto pt-4 border-t border-border/50 flex items-end justify-between">
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Lifetime Spend</span>
                        <div className="text-2xl font-black tracking-tight tabular-nums">
                            ${totalSpent.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    )
})

VehicleCardBoxed.displayName = "VehicleCardBoxed"
