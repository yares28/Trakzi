"use client"

import { createContext, useContext, useState, ReactNode } from "react"
import { type DateFilterType } from "@/components/date-filter"

interface DateFilterContextType {
    filter: DateFilterType | null
    setFilter: (filter: DateFilterType | null) => void
}

const DateFilterContext = createContext<DateFilterContextType | undefined>(undefined)

const DATE_FILTER_STORAGE_KEY = "global-date-filter"

export function useDateFilter() {
    const context = useContext(DateFilterContext)
    if (!context) {
        throw new Error("useDateFilter must be used within DateFilterProvider")
    }
    return context
}

export function DateFilterProvider({ children }: { children: ReactNode }) {
    // Initialize from localStorage synchronously (lazy initializer)
    // This prevents double fetch when filter loads after initial mount
    const [filter, setFilterState] = useState<DateFilterType | null>(() => {
        if (typeof window === "undefined") return null
        try {
            const stored = localStorage.getItem(DATE_FILTER_STORAGE_KEY)
            if (stored) {
                return stored === "null" ? null : stored
            }
        } catch (error) {
            console.error("Failed to load date filter from localStorage:", error)
        }
        return null
    })

    const setFilter = (newFilter: DateFilterType | null) => {
        setFilterState(newFilter)
        if (typeof window === "undefined") return
        try {
            if (newFilter === null) {
                localStorage.removeItem(DATE_FILTER_STORAGE_KEY)
            } else {
                localStorage.setItem(DATE_FILTER_STORAGE_KEY, newFilter)
            }
        } catch (error) {
            console.error("Failed to save date filter to localStorage:", error)
        }
    }

    return (
        <DateFilterContext.Provider value={{ filter, setFilter }}>
            {children}
        </DateFilterContext.Provider>
    )
}
