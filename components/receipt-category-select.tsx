"use client"

import { useState, useEffect, memo, useCallback, useMemo } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronDown } from "lucide-react"

interface ReceiptCategorySelectProps {
    value?: string  // category ID as string
    onValueChange: (categoryId: string, category: { id: number; name: string; typeId: number; typeName: string } | null) => void
}

interface ReceiptCategory {
    id: number
    name: string
    typeName: string
    typeId: number
}

export const ReceiptCategorySelect = memo(function ReceiptCategorySelect({
    value,
    onValueChange
}: ReceiptCategorySelectProps) {
    const [receiptCategories, setReceiptCategories] = useState<ReceiptCategory[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSelectOpen, setIsSelectOpen] = useState(false)
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

    // Local state for instant UI updates
    const [localValue, setLocalValue] = useState<string | undefined>(value)

    // Sync local value with prop value
    useEffect(() => {
        setLocalValue(value)
    }, [value])

    // Group categories by type
    const groupedCategories = useMemo(() => {
        const grouped = receiptCategories.reduce((acc, cat) => {
            if (!acc[cat.typeName]) {
                acc[cat.typeName] = []
            }
            acc[cat.typeName].push(cat)
            return acc
        }, {} as Record<string, ReceiptCategory[]>)

        return Object.entries(grouped).map(([typeName, categories]) => ({
            label: typeName,
            categories: categories.sort((a, b) => a.name.localeCompare(b.name))
        }))
    }, [receiptCategories])

    // Find which group contains the selected value
    const selectedValueGroup = useMemo(() => {
        if (!value) return null
        for (const group of groupedCategories) {
            if (group.categories.some((cat) => String(cat.id) === value)) {
                return group.label
            }
        }
        return null
    }, [value, groupedCategories])

    useEffect(() => {
        const loadCategories = async () => {
            try {
                setIsLoading(true)
                const response = await fetch("/api/receipt-categories")
                if (response.ok) {
                    const data = await response.json()
                    setReceiptCategories(data)

                    // Initialize all groups as closed
                    const initialOpen: Record<string, boolean> = {}
                    data.forEach((cat: ReceiptCategory) => {
                        if (!initialOpen.hasOwnProperty(cat.typeName)) {
                            initialOpen[cat.typeName] = false
                        }
                    })
                    setOpenGroups(initialOpen)
                }
            } catch (error) {
                console.error("Error fetching receipt categories:", error)
            } finally {
                setIsLoading(false)
            }
        }

        loadCategories()
    }, [])

    // Open the group containing the current value
    useEffect(() => {
        if (value && !isLoading && groupedCategories.length > 0) {
            setOpenGroups((prev) => {
                const next = { ...prev }
                // Find which group contains the current value
                for (const group of groupedCategories) {
                    if (group.categories.some((cat) => String(cat.id) === value)) {
                        next[group.label] = true
                        break
                    }
                }
                return next
            })
        }
    }, [value, groupedCategories, isLoading])

    const toggleGroup = useCallback((label: string) => {
        setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }))
    }, [])

    const handleValueChange = useCallback((newValue: string) => {
        // Update local state immediately for instant UI feedback
        setLocalValue(newValue)

        // Find the category object
        const category = receiptCategories.find(c => String(c.id) === newValue) || null

        // Call parent callback asynchronously
        setTimeout(() => {
            onValueChange(newValue, category)
        }, 0)
    }, [receiptCategories, onValueChange])

    return (
        <Select
            value={localValue}
            onValueChange={handleValueChange}
            open={isSelectOpen}
            onOpenChange={setIsSelectOpen}
            disabled={isLoading}
        >
            <SelectTrigger className="w-full">
                <SelectValue placeholder="Select receipt category" />
            </SelectTrigger>
            <SelectContent>
                {isLoading ? (
                    <div className="px-2 py-2 text-xs text-muted-foreground">
                        Loading categories...
                    </div>
                ) : (
                    <>
                        {/* Uncategorized option */}
                        <SelectItem value="none">Uncategorized</SelectItem>

                        {/* Grouped categories */}
                        {groupedCategories.map((group) => {
                            const isOpen = openGroups[group.label] ?? false
                            const containsSelectedValue = selectedValueGroup === group.label

                            return (
                                <div key={group.label} className="py-1">
                                    <button
                                        type="button"
                                        className="flex w-full items-center justify-between px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                                        onPointerDown={(event) => event.preventDefault()}
                                        onClick={() => toggleGroup(group.label)}
                                    >
                                        <span>{group.label}</span>
                                        <ChevronDown
                                            className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-0" : "-rotate-90"}`}
                                        />
                                    </button>
                                    {isOpen && (
                                        <div className="mt-1 space-y-0.5 pl-4">
                                            {group.categories.map((cat) => (
                                                <SelectItem key={cat.id} value={String(cat.id)}>
                                                    {cat.name}
                                                </SelectItem>
                                            ))}
                                        </div>
                                    )}
                                    {/* Always render the selected value's SelectItem, even if group is closed */}
                                    {!isOpen && containsSelectedValue && localValue && localValue !== "none" && (
                                        <SelectItem key={`${group.label}-${localValue}-hidden`} value={localValue} className="hidden">
                                            {group.categories.find(c => String(c.id) === localValue)?.name}
                                        </SelectItem>
                                    )}
                                </div>
                            )
                        })}
                    </>
                )}
            </SelectContent>
        </Select>
    )
})
