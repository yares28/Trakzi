"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import {
    type DateFilterType,
    FALLBACK_DATE_FILTER,
    isValidDateFilterValue,
    normalizeDateFilterValue,
} from "@/lib/date-filter"

interface DateFilterContextType {
    filter: DateFilterType | null
    setFilter: (filter: DateFilterType | null) => void
}

const DateFilterContext = createContext<DateFilterContextType | undefined>(undefined)

const DATE_FILTER_STORAGE_KEY = "global-date-filter"
const LEGACY_DATE_FILTER_STORAGE_KEY = "dateFilter"
const DEFAULT_TIME_PERIOD_KEY = "default-time-period"

const resolveStoredFilter = (): DateFilterType => {
    if (typeof window === "undefined") return FALLBACK_DATE_FILTER

    try {
        const stored =
            localStorage.getItem(LEGACY_DATE_FILTER_STORAGE_KEY) ||
            localStorage.getItem(DATE_FILTER_STORAGE_KEY)
        if (isValidDateFilterValue(stored)) {
            return stored.trim()
        }

        const defaultTimePeriod = localStorage.getItem(DEFAULT_TIME_PERIOD_KEY)
        if (isValidDateFilterValue(defaultTimePeriod)) {
            return defaultTimePeriod.trim()
        }
    } catch (error) {
        console.error("Failed to load date filter from localStorage:", error)
    }

    return FALLBACK_DATE_FILTER
}

const normalizeFilter = (value: DateFilterType | null): DateFilterType => {
    return normalizeDateFilterValue(value, resolveStoredFilter())
}

export function useDateFilter() {
    const context = useContext(DateFilterContext)
    if (!context) {
        throw new Error("useDateFilter must be used within DateFilterProvider")
    }
    return context
}

export function DateFilterProvider({ children }: { children: ReactNode }) {
    const [filter, setFilterState] = useState<DateFilterType | null>(FALLBACK_DATE_FILTER)

    useEffect(() => {
        if (typeof window === "undefined") return
        const stored = resolveStoredFilter()
        setFilterState((prev) => (prev === stored ? prev : stored))
        try {
            localStorage.setItem(DATE_FILTER_STORAGE_KEY, stored)
            localStorage.setItem(LEGACY_DATE_FILTER_STORAGE_KEY, stored)
        } catch (error) {
            console.error("Failed to sync date filter to localStorage:", error)
        }
    }, [])

    useEffect(() => {
        if (typeof window === "undefined") return

        const handleFilterChange = (event: Event) => {
            const detail = (event as CustomEvent).detail as DateFilterType | null
            const next = normalizeFilter(detail)
            setFilterState((prev) => (prev === next ? prev : next))
        }

        window.addEventListener("dateFilterChanged", handleFilterChange as EventListener)
        return () => {
            window.removeEventListener("dateFilterChanged", handleFilterChange as EventListener)
        }
    }, [])

    const setFilter = (newFilter: DateFilterType | null) => {
        const nextFilter = normalizeFilter(newFilter)
        setFilterState(nextFilter)
        if (typeof window === "undefined") return
        try {
            localStorage.setItem(DATE_FILTER_STORAGE_KEY, nextFilter)
            localStorage.setItem(LEGACY_DATE_FILTER_STORAGE_KEY, nextFilter)
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
