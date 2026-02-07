"use client"

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react"
import {
    type DateFilterType,
    FALLBACK_DATE_FILTER,
    isValidDateFilterValue,
    normalizeDateFilterValue,
} from "@/lib/date-filter"
import { useUserPreferences } from "@/components/user-preferences-provider"

interface DateFilterContextType {
    filter: DateFilterType | null
    setFilter: (filter: DateFilterType | null) => void
    isReady: boolean // True when filter has been resolved from localStorage
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
    const [isReady, setIsReady] = useState(false)
    const { preferences, isServerSynced, updatePagePreferences } = useUserPreferences()
    const hasSyncedFromDb = useRef(false)

    // Load from localStorage on mount (instant display)
    useEffect(() => {
        if (typeof window === "undefined") return
        const stored = resolveStoredFilter()
        setFilterState((prev) => (prev === stored ? prev : stored))
        setIsReady(true) // Mark as ready after resolving from localStorage
        try {
            localStorage.setItem(DATE_FILTER_STORAGE_KEY, stored)
            localStorage.setItem(LEGACY_DATE_FILTER_STORAGE_KEY, stored)
        } catch (error) {
            console.error("Failed to sync date filter to localStorage:", error)
        }
    }, [])

    // Sync from DB when available (DB is source of truth)
    useEffect(() => {
        if (!isServerSynced || hasSyncedFromDb.current) return
        hasSyncedFromDb.current = true
        const dbFilter = preferences.settings?.date_filter
        if (dbFilter && isValidDateFilterValue(dbFilter)) {
            setFilterState((prev) => (prev === dbFilter ? prev : dbFilter))
        }
    }, [isServerSynced, preferences.settings?.date_filter])

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

            // Notify legacy listeners
            window.dispatchEvent(new CustomEvent("dateFilterChanged", { detail: nextFilter }))
        } catch (error) {
            console.error("Failed to save date filter to localStorage:", error)
        }
        updatePagePreferences("settings", { date_filter: nextFilter })
    }

    return (
        <DateFilterContext.Provider value={{ filter, setFilter, isReady }}>
            {children}
        </DateFilterContext.Provider>
    )
}
