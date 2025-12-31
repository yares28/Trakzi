"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
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
    const [filter, setFilterState] = useState<DateFilterType | null>(null)

    // Load filter from localStorage on mount
    useEffect(() => {
        if (typeof window === "undefined") return

        try {
            // First check if user has an active filter
            const stored = localStorage.getItem(DATE_FILTER_STORAGE_KEY)
            if (stored && stored !== "null") {
                setFilterState(stored)
                return
            }

            // If no active filter, load user's default preference from settings
            const defaultTimePeriod = localStorage.getItem("default-time-period")
            if (defaultTimePeriod && defaultTimePeriod !== "all") {
                setFilterState(defaultTimePeriod)
            } else {
                // Fall back to last 6 months for new users or users who had "all" selected
                setFilterState("last6months")
            }
        } catch (error) {
            console.error("Failed to load date filter from localStorage:", error)
            // On error, default to last6months
            setFilterState("last6months")
        }
    }, [])

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
