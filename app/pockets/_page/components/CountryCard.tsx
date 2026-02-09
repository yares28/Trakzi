"use client"

import { memo, useState, useCallback, useRef, useEffect } from "react"
import { Eye, X, Loader2, Pencil, Check, X as XIcon } from "lucide-react"
import ReactCountryFlag from "react-country-flag"

import { useCurrency } from "@/components/currency-provider"
import { getCountryCode } from "@/lib/data/country-codes"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

import { CountryOutline } from "./CountryOutline"

// Countries that need larger render size (extreme aspect ratio)
const LARGE_COUNTRIES = new Set(["Russia", "USA", "Canada", "Antarctica", "Indonesia", "China"])

// Extra-large for very small outlines
const EXTRA_LARGE_COUNTRIES = new Set(["Micronesia"])
const EXTRA_LARGE_SIZE = 320

// Monaco only — smallest outline, largest render
const MONACO_SIZE = 420

export interface CountryCardProps {
    instanceId: number   // country_instances.id
    countryName: string  // GeoJSON country name (for flag/outline)
    label: string        // Custom label to display (e.g., "Japan Trip 1")
    totalSpent: number
    onViewTransactions: () => void
    onDeleteCountry?: () => Promise<void> | void
    onLabelUpdated?: () => void  // Callback when label is updated
}

export const CountryCard = memo(function CountryCard({
    instanceId,
    countryName,
    label,
    totalSpent,
    onViewTransactions,
    onDeleteCountry,
    onLabelUpdated,
}: CountryCardProps) {
    const { formatCurrency } = useCurrency()
    const countryCode = getCountryCode(countryName)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [editedLabel, setEditedLabel] = useState(label)
    const [isSaving, setIsSaving] = useState(false)
    const [editError, setEditError] = useState<string | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    const handleDelete = useCallback(async () => {
        if (!onDeleteCountry || isDeleting) return
        setIsDeleting(true)
        try {
            await onDeleteCountry()
        } finally {
            setIsDeleting(false)
        }
    }, [onDeleteCountry, isDeleting])

    // Focus input when editing starts
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus()
            inputRef.current.select()
        }
    }, [isEditing])

    // Reset edited label when label prop changes (e.g., after successful update)
    useEffect(() => {
        if (!isEditing) {
            setEditedLabel(label)
            setEditError(null)
        }
    }, [label, isEditing])

    const handleStartEdit = useCallback(() => {
        setIsEditing(true)
        setEditedLabel(label)
        setEditError(null)
    }, [label])

    const handleCancelEdit = useCallback(() => {
        setIsEditing(false)
        setEditedLabel(label)
        setEditError(null)
    }, [label])

    const handleSaveEdit = useCallback(async () => {
        const trimmedLabel = editedLabel.trim()
        
        if (!trimmedLabel) {
            setEditError("Label cannot be empty")
            return
        }

        if (trimmedLabel === label) {
            setIsEditing(false)
            return
        }

        setIsSaving(true)
        setEditError(null)

        try {
            const response = await fetch(`/api/pockets/instances?id=${instanceId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ label: trimmedLabel })
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to update label')
            }

            setIsEditing(false)
            onLabelUpdated?.()
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to update label'
            setEditError(errorMessage)
        } finally {
            setIsSaving(false)
        }
    }, [editedLabel, label, instanceId, onLabelUpdated])

    return (
        <Card className="@container/card relative overflow-hidden border bg-card shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-1 hover:scale-[1.01] group">
            {/* Hover actions: delete (top-right) */}
            {onDeleteCountry && (
                <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    aria-label={`Remove ${label} and unlink transactions`}
                    className="absolute right-2 top-2 z-10 h-8 w-8 rounded-full text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20"
                >
                    {isDeleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <X className="h-4 w-4" />
                    )}
                </Button>
            )}

            <div className="flex flex-col h-full p-3 pb-3">
                {/* Section 1: Flag + Country Name (centered) */}
                <div className="flex items-center justify-center gap-2 pb-2 relative group/label">
                    {countryCode ? (
                        <ReactCountryFlag
                            countryCode={countryCode}
                            svg
                            style={{
                                width: "1.5em",
                                height: "1.5em",
                            }}
                            title={countryName}
                            aria-label={`Flag of ${countryName}`}
                        />
                    ) : (
                        <span className="text-2xl">🌍</span>
                    )}
                    {isEditing ? (
                        <div className="flex-1 flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1 w-full max-w-[200px]">
                                <Input
                                    ref={inputRef}
                                    value={editedLabel}
                                    onChange={(e) => {
                                        setEditedLabel(e.target.value)
                                        if (editError) setEditError(null)
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault()
                                            handleSaveEdit()
                                        } else if (e.key === 'Escape') {
                                            e.preventDefault()
                                            handleCancelEdit()
                                        }
                                    }}
                                    disabled={isSaving}
                                    maxLength={100}
                                    className={`text-lg font-semibold h-8 text-center ${
                                        editError ? "border-destructive focus-visible:ring-destructive" : ""
                                    }`}
                                    aria-invalid={!!editError}
                                    aria-describedby={editError ? "edit-error" : undefined}
                                />
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={handleSaveEdit}
                                    disabled={isSaving || !editedLabel.trim()}
                                    className="h-8 w-8 shrink-0"
                                    aria-label="Save label"
                                >
                                    {isSaving ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                                    )}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={handleCancelEdit}
                                    disabled={isSaving}
                                    className="h-8 w-8 shrink-0"
                                    aria-label="Cancel editing"
                                >
                                    <XIcon className="h-4 w-4 text-muted-foreground" />
                                </Button>
                            </div>
                            {editError && (
                                <div id="edit-error" className="text-xs text-destructive text-center max-w-[200px]">
                                    {editError}
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            <span className="text-lg font-semibold truncate flex-1 text-center" title={label}>
                                {label}
                            </span>
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={handleStartEdit}
                                className="h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover/label:opacity-100 hover:bg-accent"
                                aria-label={`Edit label for ${label}`}
                            >
                                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                        </>
                    )}
                </div>

                {/* Section 2: Country Outline (bigger, takes most space) */}
                <div className="flex-1 flex items-center justify-center py-6 text-muted-foreground min-h-[200px] overflow-hidden">
                    <div className="w-full h-full flex items-center justify-center max-w-[420px]">
                        <CountryOutline
                            countryName={countryName}
                            maxSize={
                                countryName === "Monaco"
                                    ? MONACO_SIZE
                                    : EXTRA_LARGE_COUNTRIES.has(countryName)
                                        ? EXTRA_LARGE_SIZE
                                        : LARGE_COUNTRIES.has(countryName)
                                            ? 280
                                            : 200
                            }
                            secondarySize={36}
                        />
                    </div>
                </div>

                {/* Section 3: Amount row */}
                <div className="mt-auto flex items-end justify-between pt-2 pr-1 pb-1">
                    <div className="text-left pr-2">
                        <div className="text-xs text-muted-foreground uppercase tracking-wide">
                            Total Spent
                        </div>
                        <div className="text-xl font-bold tabular-nums">
                            {formatCurrency(totalSpent, {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Hover action: view (bottom-right) */}
            <Button
                variant="ghost"
                size="icon-sm"
                className="absolute bottom-2 right-2 z-10 h-8 w-8 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground hover:bg-accent"
                onClick={onViewTransactions}
                aria-label={`View transactions for ${label}`}
            >
                <Eye className="h-4 w-4" />
            </Button>
        </Card>
    )
})

CountryCard.displayName = "CountryCard"
