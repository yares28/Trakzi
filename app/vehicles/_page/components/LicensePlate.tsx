"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

interface LicensePlateProps {
    initialValue?: string
    className?: string
    variant?: "default" | "honda" | "toyota" // Just in case we need specific variants later
}

export function LicensePlate({ initialValue = "TRK-001", className }: LicensePlateProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [value, setValue] = useState(initialValue)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus()
            inputRef.current.select()
        }
    }, [isEditing])

    const handleSave = () => {
        setIsEditing(false)
        // Ideally, this would trigger an onSave callback to persist to DB
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSave()
        }
        if (e.key === "Escape") {
            setIsEditing(false)
            setValue(initialValue) // Revert on escape if we wanted to be strict, or just keep curr value
        }
    }

    if (isEditing) {
        return (
            <div className={cn("inline-flex justify-center", className)}>
                <Input
                    ref={inputRef}
                    value={value}
                    onChange={(e) => setValue(e.target.value.toUpperCase())}
                    onBlur={handleSave}
                    onKeyDown={handleKeyDown}
                    className="h-8 w-28 text-center font-mono font-bold uppercase tracking-widest text-base shadow-sm border-2 border-black/80 rounded-md focus-visible:ring-offset-0 focus-visible:ring-1"
                    maxLength={8}
                />
            </div>
        )
    }

    return (
        <div
            onClick={() => setIsEditing(true)}
            className={cn(
                "cursor-pointer inline-flex items-center justify-center px-3 py-1 bg-white dark:bg-zinc-100 text-black border-[2px] border-black rounded-md shadow-sm transition-transform hover:scale-105 active:scale-95",
                className
            )}
            title="Click to edit license plate"
        >
            {/* Optional EU strip blue bar could go here, keeping it simple for now as requested */}
            <span className="font-mono font-bold tracking-widest text-sm sm:text-base whitespace-nowrap select-none">
                {value}
            </span>
        </div>
    )
}
