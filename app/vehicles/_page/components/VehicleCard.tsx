"use client"

import { memo, useState, useRef, useCallback, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { CarFrontSvg } from "./CarFrontSvg"

export interface VehicleCardProps {
    label: string
    totalSpent: number
    plateText?: string
}

export const VehicleCard = memo(function VehicleCard({
    label,
    totalSpent,
    plateText = "TYT-882",
}: VehicleCardProps) {
    const [plate, setPlate] = useState(plateText)
    const [editing, setEditing] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    const startEditing = useCallback(() => {
        setEditing(true)
    }, [])

    const stopEditing = useCallback(() => {
        setEditing(false)
        // Reset to default if user clears the field
        if (!plate.trim()) setPlate(plateText)
    }, [plate, plateText])

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter") {
                e.preventDefault()
                stopEditing()
            }
            if (e.key === "Escape") {
                setPlate(plateText)
                setEditing(false)
            }
        },
        [stopEditing, plateText]
    )

    useEffect(() => {
        if (editing && inputRef.current) {
            inputRef.current.focus()
            inputRef.current.select()
        }
    }, [editing])

    return (
        <Card className="relative overflow-hidden border bg-card text-card-foreground shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md group flex flex-col items-center px-4 py-3 gap-2">
            {/* Header */}
            <div className="w-full flex justify-between items-center">
                <div className="flex flex-col gap-0.5">
                    <h3 className="text-sm font-semibold tracking-tight leading-tight">{label}</h3>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider leading-none">Compact SUV</span>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider leading-none">Total Spent</span>
                    <span className="text-sm font-bold tabular-nums leading-tight">
                        ${totalSpent.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                </div>
            </div>

            {/* Car SVG — editable license plate rendered via foreignObject */}
            <div className="relative z-10 w-full flex justify-center">
                <CarFrontSvg
                    className="w-full max-w-[480px] h-auto text-primary drop-shadow-lg opacity-90 transition-transform duration-500 group-hover:scale-[1.03]"
                    plateSlot={
                        editing ? (
                            <input
                                ref={inputRef}
                                type="text"
                                value={plate}
                                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                                onBlur={stopEditing}
                                onKeyDown={handleKeyDown}
                                maxLength={10}
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    background: "white",
                                    border: "0.8px solid #1a1a1a",
                                    borderRadius: "1.5px",
                                    textAlign: "center",
                                    fontSize: "7px",
                                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                                    fontWeight: 700,
                                    letterSpacing: "0.12em",
                                    color: "#1a1a1a",
                                    padding: 0,
                                    margin: 0,
                                    outline: "none",
                                    boxSizing: "border-box",
                                }}
                            />
                        ) : (
                            <button
                                type="button"
                                onClick={startEditing}
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    background: "white",
                                    border: "0.8px solid #1a1a1a",
                                    borderRadius: "1.5px",
                                    textAlign: "center",
                                    fontSize: "7px",
                                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                                    fontWeight: 700,
                                    letterSpacing: "0.12em",
                                    color: "#1a1a1a",
                                    padding: 0,
                                    margin: 0,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    lineHeight: 1,
                                    boxSizing: "border-box",
                                }}
                            >
                                {plate}
                            </button>
                        )
                    }
                />
            </div>

            {/* Decorative background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        </Card>
    )
})

VehicleCard.displayName = "VehicleCard"
