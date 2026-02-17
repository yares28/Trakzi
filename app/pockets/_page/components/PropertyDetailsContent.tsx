"use client"

import { memo, useState, useCallback, useEffect } from "react"
import { Loader2, ChevronDown, ChevronUp, ImageIcon } from "lucide-react"
import type { PropertyCardData } from "./PropertyCardsGrid"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const PROPERTY_SVG_OPTIONS = [
    { value: "/property/houseplan1.svg", label: "Plan 1 – Main home" },
    { value: "/property/houseplan2.svg", label: "Plan 2 – Apartment" },
    { value: "/property/houseplan3.svg", label: "Plan 3 – Rental" },
    { value: "/property/houseplan4.svg", label: "Plan 4 – Cabin" },
] as const

interface PropertyDetailsContentProps {
    property: PropertyCardData
    onUpdate: (updates: Partial<PropertyCardData>) => void
    onCancel: () => void
}

export const PropertyDetailsContent = memo(function PropertyDetailsContent({
    property,
    onUpdate,
    onCancel,
}: PropertyDetailsContentProps) {
    const [name, setName] = useState(property.label)
    const [value, setValue] = useState(property.value.toString())
    const [svgPath, setSvgPath] = useState(property.svgPath)
    const [isSaving, setIsSaving] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [isLayoutOpen, setIsLayoutOpen] = useState(false)

    useEffect(() => {
        setName(property.label)
        setValue(property.value.toString())
        setSvgPath(property.svgPath)
        setErrors({})
    }, [property])

    const validate = useCallback((): boolean => {
        const next: Record<string, string> = {}
        if (!name.trim()) next.name = "Name is required"
        const v = parseFloat(value)
        if (!value || isNaN(v) || v < 0) {
            next.value = "Enter a valid property value"
        }
        setErrors(next)
        return Object.keys(next).length === 0
    }, [name, value])

    const handleSave = useCallback(async () => {
        setErrors({})
        if (!validate()) return

        setIsSaving(true)

        try {
            const pocketId = parseInt(property.id, 10)
            if (isNaN(pocketId)) {
                throw new Error("Invalid property ID")
            }

            const numericValue = Math.round(parseFloat(value) || 0)

            const res = await fetch(`/api/pockets/items?id=${pocketId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    metadata: {
                        estimatedValue: numericValue,
                    },
                    svg_path: svgPath,
                }),
            })

            if (!res.ok) {
                const data = await res.json()
                setErrors({ name: data.error || 'Something went wrong updating this property' })
                return
            }

            onUpdate({
                label: name.trim(),
                value: numericValue,
                svgPath,
            })

            onCancel()
        } catch (err) {
            setErrors({ name: err instanceof Error ? err.message : 'Something went wrong updating this property' })
        } finally {
            setIsSaving(false)
        }
    }, [name, value, svgPath, property.id, validate, onUpdate, onCancel])

    return (
        <div className="flex h-full flex-col gap-4 overflow-y-auto">
            <div className="space-y-4">
                <div className="grid gap-2">
                    <Label htmlFor="property-details-name">Property name</Label>
                    <Input
                        id="property-details-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Main Home"
                        maxLength={100}
                        className={errors.name ? "border-destructive" : ""}
                    />
                    {errors.name && (
                        <p className="text-xs text-destructive">{errors.name}</p>
                    )}
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="property-details-value">Estimated value</Label>
                    <Input
                        id="property-details-value"
                        type="number"
                        min={0}
                        step={1000}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder="e.g. 420000"
                        className={errors.value ? "border-destructive" : ""}
                    />
                    {errors.value && (
                        <p className="text-xs text-destructive">{errors.value}</p>
                    )}
                </div>

                <div className="grid gap-2">
                    <button
                        type="button"
                        onClick={() => setIsLayoutOpen(!isLayoutOpen)}
                        className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 text-left transition-all hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <Label className="cursor-pointer font-medium">Layout</Label>
                        {isLayoutOpen ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                    </button>
                    {isLayoutOpen && (
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            {PROPERTY_SVG_OPTIONS.map((opt) => {
                                const isActive = svgPath === opt.value
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setSvgPath(opt.value)}
                                        className={cn(
                                            "relative aspect-[4/3] rounded-xl border bg-muted/40 p-3 transition-all",
                                            "hover:border-primary/50 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                            isActive && "border-primary bg-primary/5 shadow-sm",
                                        )}
                                        aria-pressed={isActive}
                                        aria-label={opt.label}
                                    >
                                        <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-[inherit]">
                                            <img
                                                src={opt.value}
                                                alt={opt.label}
                                                className="h-full w-full max-h-[80%] max-w-[80%] object-contain"
                                            />
                                        </div>
                                        <div className="pointer-events-none absolute inset-x-2 bottom-2 flex items-center gap-1 rounded-full bg-background/85 px-2 py-0.5 text-[11px] font-medium text-muted-foreground shadow-sm">
                                            <ImageIcon className="h-3 w-3" />
                                            <span className="truncate">{opt.label}</span>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Action buttons */}
            <div className="mt-auto flex gap-2 border-t pt-4">
                <Button
                    variant="outline"
                    onClick={onCancel}
                    disabled={isSaving}
                    className="flex-1"
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1"
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        "Save"
                    )}
                </Button>
            </div>
        </div>
    )
})

PropertyDetailsContent.displayName = "PropertyDetailsContent"
